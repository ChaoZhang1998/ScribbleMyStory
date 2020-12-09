// The SketchRNN model
let model;
// Start by drawing
let previous_pen = 'down';
// Current location of drawing
let x, y;
// The current "stroke" of the drawing
let strokePath;

let canvas;

let count = 0;

// For when SketchRNN is fixed
function preload() {
    // See a list of all supported models: https://github.com/ml5js/ml5-library/blob/master/src/SketchRNN/models.js
    model = ml5.sketchRNN('flower');
}

function setup() {
    canvas = createCanvas(windowWidth, 2 * windowHeight / 3);
    canvas.parent('index-canvas');

    background(255);

    // run sketchRNN
    startDrawing();
}

function modelReady() {
    console.log('model loaded');
    startDrawing();
}

// Reset the drawing
function startDrawing() {
    background(255);
    // Start in the middle
    x = width / 2;
    y = 3 * height / 4;
    model.reset();
    // Generate the first stroke path
    model.generate(gotStroke);
}

async function draw() {
    // If something new to draw
    if (strokePath) {
        // If the pen is down, draw a line
        if (previous_pen == 'down') {
            stroke(0);
            strokeWeight(3.0);
            line(x, y, x + strokePath.dx / 3, y + strokePath.dy / 3);
        }
        // Move the pen
        x += strokePath.dx / 3;
        y += strokePath.dy / 3;
        // The pen state actually refers to the next stroke
        previous_pen = strokePath.pen;

        // If the drawing is complete
        if (strokePath.pen !== 'end') {
            strokePath = null;
            model.generate(gotStroke);
        } else {
            count++;
            if (count === 60) {
                startDrawing();
                count = 0;
            }   
        }
    }
}

// A new stroke path
function gotStroke(err, s) {
    strokePath = s;
}