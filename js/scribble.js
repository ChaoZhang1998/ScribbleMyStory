let canvas;
let pg; // For resize window
let buffer; // For idea reload
let output; // For output
let record_btn, idea_btn, clear_btn, save_btn;
let message = document.querySelector('#message');
let tip = document.querySelector('#machine-speechbubble-primary');
let story_container = document.querySelector('#machine-story-primary');

let num_story = 0;

let counts = []; // Every Object drawing number
let objects = []; // Current drawing objects
let object_pointer; // Point current drawing object

let model_name; // Current drawing model name

let rec = [];

let model; // SketchRNN model, current drawing model
let strokePath; // The current "stroke" of the drawing
let x, y; // Current location of drawing
let txt_x = 0,
    txt_y = 0; // Current location of drawing

let previous_pen = 'down'; // Start by drawing

let min_x = 10000,
    max_x = 0,
    min_y = 10000,
    max_y = 0;
let bounding_box = {
    'left_top': [0, 0],
    'right_top': [0, 0],
    'left_bottom': [0, 0],
    'right_bottom': [0, 0]
};
let bounding_box_list = [];

let category;
let sky_object, air_object, floor_object;

let idea_state = false;

let speaker;

let recorder;
let is_recording = false;

function preload() {
    category = loadJSON("./js/category.json");
    // ml5.sketchRNN('flower');
}

function setup() {
    let b = document.getElementById("canvas-wrapper");
    let w = b.clientWidth;
    let h = b.clientHeight;
    console.log(w, h);

    canvas = createCanvas(w, h);
    canvas.parent('canvas-wrapper');

    pg = createGraphics(w, h);
    buffer = createGraphics(w, h);
    output = createGraphics(w, h);

    record_btn = select("#record-btn");
    clear_btn = select("#clear-btn");
    save_btn = select("#save-btn");

    speaker = new p5.Speech();
    speaker.setRate(1);

    background(255);
    pg.background(255);
    buffer.background(255);
    output.background(255);

    // console.log(category.AirObject);
    sky_object = category.SkyObject;
    air_object = category.AirObject;
    floor_object = category.FloorObject;

    recorder = new Recorder({
        sampleBits: 16, // 采样位数，支持 8 或 16，默认是16
        sampleRate: 16000, // 采样率，支持 11025、16000、22050、24000、44100、48000，根据浏览器默认值，我的chrome是48000
        numChannels: 1, // 声道，支持 1 或 2， 默认是1
    });
}

// A new stroke path
function gotStroke(err, s) {
    strokePath = s;
}

function idea() {
    clearTips();

    let item = model_list[Math.floor(Math.random() * model_list.length)];
    console.log(item);

    objects = [{
        "name": item,
        "num": 1,
        "pos": ""
    }];

    // objects = [{
    //     "name": 'flower',
    //     "num": 1,
    //     "pos": ""
    // }];

    rec.push({
        "type": 1,
        "models": [],
        "description": '',
        "objects": objects
    });

    idea_state = true;

    drawObjects();
}

function parseObjects(res) {
    let objects = [];
    let name = res.objects;
    let number = res.numbers;
    for (let i = 0; i < name.length; i++) {
        if (model_list.indexOf(name[i]) === -1) {
            continue;
        }

        let object = {};
        object.name = name[i];
        object.num = number[i];
        object.pos = "";
        
        objects.push(object);
    }

    return objects;
}

function drawObjects() {
    // drawDoolde(objects[0]);

    counts = [];
    for (i in objects) {
        counts.push(objects[i].num);
    }

    object_pointer = 0;
    model_name = objects[object_pointer].name;
    while(model_list.indexOf(model_name) === -1) {
        console.log("no model found.");

        object_pointer++;
        if (object_pointer >= objects.length) break;

        model_name = objects[object_pointer].name;
    }

    if (object_pointer < objects.length) {
        drawSingleObject(objects[object_pointer]);
    }
}

function drawSingleObject(object) {
    noLoop();
    let name = object.name;
    let pos = object.pos;

    let right_offset, left_offset;
    if (!pos) {
        right_offset = 0;
        left_offset = 0;
    } else if (pos === "left") {
        right_offset = -width / 2;
        left_offset = 0;
    } else if (pos === "right") {
        right_offset = 0;
        left_offset = width / 2;
    }

    if (sky_object.indexOf(name) != -1) {
        console.log("sky_object");
        x = random(width / 10 + left_offset, 9 * width / 10 + right_offset);
        y = random(height / 10, height / 4);
        while (is_in_bounding_box(x, y)) {
            x = random(width / 10 + left_offset, 9 * width / 10 + right_offset);
            y = random(height / 10, height / 4);
        }
        console.log(x, y);
    } else if (air_object.indexOf(name) != -1) {
        console.log("air_object");
        x = random(width / 10 + left_offset, 9 * width / 10 + right_offset);
        y = random(height / 4, height / 2);
        while (is_in_bounding_box(x, y)) {
            x = random(width / 10 + left_offset, 9 * width / 10 + right_offset);
            y = random(height / 4, height / 2);
        }
        console.log(x, y);
    } else if (floor_object.indexOf(name) != -1) {
        console.log("floor_object");
        x = random(width / 10 + left_offset, 9 * width / 10 + right_offset);
        y = random(height / 2, 9 * height / 10);
        while (is_in_bounding_box(x, y)) {
            x = random(width / 10 + left_offset, 9 * width / 10 + right_offset);
            y = random(height / 2, 9 * height / 10);
        }
        console.log(x, y);
    }

    model = ml5.sketchRNN(name, function () {
        rec[rec.length - 1].models.push(model);
        console.log(rec);

        // Generate the first stroke path
        model.reset();
        model.generate(gotStroke);
        loop();
    });
}

function is_in_bounding_box(x, y) {
    let s = false;
    console.log(bounding_box_list);
    if (bounding_box_list.length !== 0) {
        for (let i = 0; i < bounding_box_list.length; i++) {
            if (x >= bounding_box_list[i].left_top[0] &&
                x <= bounding_box_list[i].right_top[0] &&
                y >= bounding_box_list[i].left_top[1] &&
                y <= bounding_box_list[i].left_bottom[1]) {

                s = true;
            }
        }
    }

    return s;
}

function bubbleTips() {
    let txt = "I am " + model_name + ". Try to say something about me.";
    tip.textContent = txt;
    speaker.speak(txt);
}

function clearTips() {
    image(buffer, 0, 0);
    pg.image(buffer, 0, 0);

    let txt = "Get stuck? Try to press the IDEA button or ENTER!";
    tip.textContent = txt;
}

function appendStory(txt) {
    let p = document.createElement('p');
    let p_text = document.createTextNode(txt);
    p.appendChild(p_text);
    story_container.appendChild(p);
}

function clearStory() {
    while (story_container.hasChildNodes()) {
        story_container.removeChild(story_container.firstChild);
    }
}

function clearCanvas() {
    // console.log("clearCanvas");
    background(255);
    pg.background(255);
    buffer.background(255);
    output.background(255);

    clearTips();
    clearStory();

    current_text = null;
}

function saveDraw() {
    // console.log("saveDraw");
    clearTips();

    let date = new Date();
    let year = date.getFullYear()
    let month = (date.getMonth() + 1).toString()
    let day = date.getDate().toString();
    let file_name = "my_story" + "-" + year + "-" + month + "-" + day + "-" + num_story;

    loadImage("./qr/test.png", img => {
        output.image(img, width - 110, 10, 100, 100);

        output.fill(0);
        output.textSize(16);
        output.noStroke();
        output.text(year + "-" + month + "-" + day, width - 108, 130);

        let j = 0;
        for (let i = 0; i < rec.length; i++) {
            if (rec[i].description !== '') {
                output.text(rec[i].description, 20, 25 + 20 * j);
                j++;
            }
        }

        saveCanvas(output, file_name, "jpg");
    });

    output.image(buffer, 0, 0);
    num_story++;
}

function draw() {
    record_btn.mousePressed();
    clear_btn.mousePressed(clearCanvas);
    save_btn.mousePressed(saveDraw);

    // If something new to draw
    if (strokePath) {
        // If the pen is down, draw a line
        if (previous_pen == 'down') {
            noFill();
            stroke(0);
            if (idea_state) {
                stroke('red');
            }
            strokeWeight(3);
            line(x, y, x + strokePath.dx / 3, y + strokePath.dy / 3);

            pg.noFill();
            pg.stroke(0);
            if (idea_state) {
                pg.stroke('red');
            }
            pg.strokeWeight(3);
            pg.line(x, y, x + strokePath.dx / 3, y + strokePath.dy / 3);

            buffer.noFill();
            buffer.stroke(0);
            buffer.strokeWeight(3);
            buffer.line(x, y, x + strokePath.dx / 3, y + strokePath.dy / 3);

            output.noFill();
            output.stroke(0);
            output.strokeWeight(3);
            output.line(x, y, x + strokePath.dx / 3, y + strokePath.dy / 3);
        }
        // Move the pen
        x += strokePath.dx / 3;
        y += strokePath.dy / 3;

        // Calcu the bounding box
        if (x >= max_x) {
            max_x = x;
            bounding_box.right_top[0] = x;
            bounding_box.right_bottom[0] = x;
        }
        if (x < min_x) {
            min_x = x;
            bounding_box.left_top[0] = x;
            bounding_box.left_bottom[0] = x;
        }
        if (y >= max_y) {
            max_y = y;
            bounding_box.left_bottom[1] = y;
            bounding_box.right_bottom[1] = y;
        }
        if (y < min_y) {
            min_y = y;
            bounding_box.left_top[1] = y;
            bounding_box.right_top[1] = y;
        }

        // The pen state actually refers to the next stroke
        previous_pen = strokePath.pen;

        // If the drawing is complete
        if (strokePath.pen !== 'end') {
            strokePath = null;
            model.generate(gotStroke);
        } else {
            strokePath = null;
            counts[object_pointer]--;
            if (counts[object_pointer] === 0) {
                object_pointer++;
                previous_pen = 'down';
                if (object_pointer < objects.length) {
                    model_name = objects[object_pointer].name;
                    while(model_list.indexOf(model_name) === -1) {
                        console.log("no model found.");
                
                        object_pointer++;
                        if (object_pointer >= objects.length) break;

                        model_name = objects[object_pointer].name;
                    }
                
                    if (object_pointer < objects.length) {
                        drawSingleObject(objects[object_pointer]);
                    }
                }
            } else {
                previous_pen = 'down';
                drawSingleObject(objects[object_pointer]);
            }

            if (idea_state) {
                bubbleTips();
                idea_state = false;
            }

            bounding_box_list.push(bounding_box);

            min_x = 10000;
            max_x = 0;
            min_y = 10000;
            max_y = 0;
            bounding_box = {
                'left_top': [0, 0],
                'right_top': [0, 0],
                'left_bottom': [0, 0],
                'right_bottom': [0, 0]
            };
        }
    }
}

function keyPressed() {
    if (keyCode === ENTER) {
        idea();
    }

    if (keyCode === TAB) {
        clearTips();
    }

    if (keyCode === 32) {
        if (!is_recording) {
            clearTips();
            recorder.start();
            is_recording = !is_recording;
        }
    }
}

function windowResized() {
    let b = document.getElementById("canvas-wrapper");
    let w = b.clientWidth;
    let h = b.clientHeight;
    // console.log(w, h);

    resizeCanvas(w, h);
    image(pg, 0, 0);
}

function keyReleased() {
    if (keyCode === 32) {
        if (is_recording) {
            recorder.stop();
            tmp = recorder.getWAVBlob();
            //console.log(tmp)
            //将blob转换为base64
            let reader = new FileReader();
            reader.readAsDataURL(tmp);
            //将base64数据命名为base64Data
            reader.onloadend = function () {
                base64data = reader.result;
                //console.log(base64data)
                $.post('https://papablog.xyz:5000/english', {
                    base64data
                }, function (res) {
                    console.log(res);
                    res = JSON.parse(res);

                    message.textContent = 'Voice Input: ' + res.text + '.';

                    appendStory(res.text);
                    objects = parseObjects(res);

                    rec.push({
                        "type": 0,
                        "models": [],
                        "description": res.text,
                        "objects": objects
                    });

                    drawObjects(objects);
                })
            }

            // recorder.downloadWAV('test');
            is_recording = !is_recording;
        }
    }
}