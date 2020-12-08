let canvas;
let pg; // For resize window
let buffer; // For idea reload
let output; // For output
let record_btn, idea_btn, clear_btn, save_btn;
let message = document.querySelector('#message');
let tip = document.querySelector('#machine-speechbubble-primary');
let story_container = document.querySelector('#machine-story-primary');
let timer = document.querySelector('#clock-time');

let num_story = 0;

let recognition, speechRecognitionList;

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

function preload() {
    category = loadJSON("./js/category.json");
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
    // idea_btn = select("#idea-btn");
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
    all_object = sky_object.concat(air_object, floor_object);

    initialRec();
}

function initialRec() {
    // console.log("initialRec");
    var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
    var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;

    var grammar = '#JSGF V1.0;'

    recognition = new SpeechRecognition();
    speechRecognitionList = new SpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = function (event) {
        let last = event.results.length - 1;
        let command = event.results[last][0].transcript;
        message.textContent = 'Voice Input: ' + command + '.';

        appendStory(command + '.');
        objects = parseText(command);

        rec.push({
            "type": 0,
            "models": [],
            "description": command,
            "objects": objects
        });

        drawObjects(objects);
    };

    recognition.onspeechend = function () {
        recognition.stop();
    };

    recognition.onerror = function (event) {
        message.textContent = 'Error occurred in recognition: ' + event.error;
    }
}

function speech2text() {
    // console.log("speech2text");
    clearTips();
    recognition.start();
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

function drawObjects() {
    // drawDoolde(objects[0]);

    counts = [];
    for (i in objects) {
        counts.push(objects[i].num);
    }

    object_pointer = 0;
    model_name = objects[0].name;
    drawDoolde(objects[0]);
}

function drawDoolde(object) {
    noLoop();
    let name = object.name;
    let pos = object.pos;

    model = ml5.sketchRNN(name);
    rec[rec.length - 1].models.push(model);

    console.log(rec);

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

    // Generate the first stroke path
    model.reset();
    model.generate(gotStroke);
    loop();
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

    let txt = "Get stucked? Try to press the IDEA button or ENTER!";
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
    record_btn.mousePressed(speech2text);
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
                if (object_pointer < objects.length) {
                    model_name = objects[object_pointer].name;
                    previous_pen = 'down';

                    drawDoolde(objects[object_pointer]);
                } else {
                    previous_pen = 'down';
                }
            } else {
                previous_pen = 'down';
                drawDoolde(objects[object_pointer]);
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
        speech2text();
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