//=====================================================================
// file: plinko.js
// CS 4330
// 2024 FALL
// Armon Chanthavisouk
// Nov 4 2024
// desc: plinko!
//=====================================================================
// vertex shader code
const vsc = "attribute vec2 vpos;" +
"void main() {" +
"gl_Position = vec4(vpos, 0.0, 1.0);" +
"}";

// fragment shader code
const fsc = "precision mediump float;" +
"uniform vec4 v_color;" +
"void main() {" +
"gl_FragColor = v_color;" +
"}";

const N_DIM = 2;

// initialized with init_gl() function
let canvas;
let gl;
let gl_prog;
let unif_v_color;

let balls = []; // store ball properties
const GRAVITY = .002; // gravity acceleration
const PEG_RADIUS = 0.015; 
const BALL_RADIUS = 0.03;
const DAMPEN = 1.3; 
const MINSPEEDLIMIT = .002;
const B_IN = .25;
const B_OUT = .90;

let score = 0;


// Array to store peg positions
let pegs = [];


function reset_game() {
    score = 0;
    balls = [];
    document.getElementById("fi").innerText = `Score: ${score}`;
}

function draw_line(x1, y1, x2, y2) {
    let vdata = new Float32Array([x1, y1, x2, y2]);
    gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
    gl.drawArrays(gl.LINES, 0, 2);
}

function draw_boundary_walls() {
    let wall_color = [1, 1, 1, 1]; // White color for walls

    gl.uniform4f(unif_v_color, ...wall_color);

    draw_line(-B_IN, 1, -B_OUT, -1); 

    draw_line(B_IN, 1, B_OUT, -1); 
}

function draw_ball_catcher() {
    let basket_color = [0, 1, 0, 1];
    let num_baskets = 7;
    let basket_width = (2*B_OUT) / num_baskets; 
    let basket_height = 0.12; 

    gl.uniform4f(unif_v_color, ...basket_color);

    for (let i = 0; i < num_baskets; i++) {
        let x1 = -B_OUT + i * basket_width; // Left x
        let x2 = x1 + basket_width;    // Right x
        let y1 = -.99;                   // Bottom y
        let y2 = -1 + basket_height;   // Top y

        draw_line(x1, y1, x2, y1); // Bottom
        draw_line(x1, y1, x1, y2); // Left
        draw_line(x2, y1, x2, y2); // Right
        //draw_line(x1, y2, x2, y2); // Top
    }
}

function handle_ball_catcher(ball, ballIndex) {
    let num_baskets = 7; 
    let basket_width = (2 * B_OUT) / num_baskets;

    if (ball.y - ball.r <= -0.99) { 
        let basket_index = Math.floor((ball.x + B_OUT) / basket_width);
        if (basket_index >= 0 && basket_index < num_baskets) {
            let basket_scores = [100, 50, 20, 10, 20, 50, 100];
            score += basket_scores[basket_index];


            document.getElementById("fi").innerText = `Score: ${score}`;

            balls.splice(ballIndex, 1);
        }
    }
}

function createBasketScores() {
    const basketScores = [100, 50, 20, 10, 20, 50, 100]; 
    const canvas = document.getElementById('webgl_canvas');
    const scoresContainer = document.getElementById('basket-scores');

    // Clear previous scores
    scoresContainer.innerHTML = '';

    // Canvas properties
    const canvasRect = canvas.getBoundingClientRect();
    const numBaskets = basketScores.length;
    const basketWidth = (canvasRect.width - 2 * B_OUT) / numBaskets; 
    const basketHeight = 0.12;

    basketScores.forEach((score, i) => {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'basket-score';
        scoreDiv.textContent = score;

        // Calculate position for the center of each basket
        const x = canvasRect.left + B_OUT + i * basketWidth + basketWidth / 2; // Add B_OUT for boundaries
        const y = canvasRect.top + canvasRect.height - basketHeight - 20;  // Slightly above the bottom of the canvas

        // Set position
        scoreDiv.style.left = `${x}px`;
        scoreDiv.style.top = `${y}px`;

        scoresContainer.appendChild(scoreDiv);
    });
}

// Recalculate positions on window resize
window.addEventListener('resize', createBasketScores);

// Initialize scores on page load
createBasketScores();




function handle_wall_collision(ball) {
    let left_x1 = -B_OUT, left_y1 = -1;
    let left_x2 = -B_IN, left_y2 = 1; // Same as in draw_boundary_walls
    
    let right_x1 = B_OUT, right_y1 = -1;
    let right_x2 = B_IN, right_y2 = 1;

    // Calculate slopes and x-intercepts for both walls
    let left_slope = (left_y2 - left_y1) / (left_x2 - left_x1);
    let left_y_intercept = left_y1 - left_slope * left_x1;

    let right_slope = (right_y2 - right_y1) / (right_x2 - right_x1);
    let right_y_intercept = right_y1 - right_slope * right_x1;

     // Calculate the y-value of each wall for the ball's x-position
     let left_y_at_x = (left_slope * ball.x + left_y_intercept) - (3*BALL_RADIUS);
     let right_y_at_x = right_slope * ball.x + right_y_intercept - (3*BALL_RADIUS);

    // Left sloped wall collision
    if (ball.y >= left_y_at_x) {
        let normal_angle = Math.atan(left_slope); // Normal angle for the left wall
        reflect_velocity(ball, normal_angle); // Reflect ball's velocity
    }

    if (ball.y >= right_y_at_x) {
        let normal_angle = Math.atan(right_slope); // Normal angle for the left wall
        reflect_velocity(ball, normal_angle); // Reflect ball's velocity
    }

}


function reflect_velocity(ball, normal_angle) {
    let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    let incident_angle = Math.atan2(ball.vy, ball.vx);
    let reflection_angle = 2 * normal_angle - incident_angle;

    ball.vx = speed * Math.cos(reflection_angle);
    ball.vy = speed * Math.sin(reflection_angle);
}



///*
// pyramid grid
function create_pegs(rows, spacing) {
    for (let i = 4; i < rows; i++) {
        let num_pegs = i + 1; // Increase number of pegs in each row
        for (let j = 0; j < num_pegs; j++) {
            let x = (j - (num_pegs - 1) / 2) * spacing; // Center the row horizontally
            let y = 1.55 - i * spacing * 1.5; // Adjust vertical spacing
            pegs.push({ x: x, y: y });
        }
    }
}
//*/

function create_gl_program() {
    let vs = gl.createShader(gl.VERTEX_SHADER);
    let fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, vsc);
    gl.shaderSource(fs, fsc);
    gl.compileShader(vs);
    gl.compileShader(fs);
    gl_prog = gl.createProgram();
    gl.attachShader(gl_prog, vs);
    gl.attachShader(gl_prog, fs);
    gl.linkProgram(gl_prog);
}

function init_gl() {
    canvas = document.getElementById("webgl_canvas");
    gl = canvas.getContext("webgl");
    create_gl_program();
    gl.useProgram(gl_prog);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    let attr_vpos = gl.getAttribLocation(gl_prog, "vpos");
    gl.enableVertexAttribArray(attr_vpos);
    gl.vertexAttribPointer(attr_vpos, N_DIM, gl.FLOAT, false, 0, 0);
    unif_v_color = gl.getUniformLocation(gl_prog, "v_color");

    // pryamid
    create_pegs(13, 0.13);
}

function draw_circle(x, y, r, filled = false) {
    let n = 30;
    let vdata = new Float32Array(n * N_DIM);
    for (let i = 0, d = 0; i < n; ++i, d += (360 / n)) {
        vdata[2 * i] = x + Math.cos(d * Math.PI / 180) * r;
        vdata[2 * i + 1] = y + Math.sin(d * Math.PI / 180) * r;
    }
    gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
    if (filled)
        gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
    else
        gl.drawArrays(gl.LINE_LOOP, 0, n);
}

function handle_mouse_down(event) {
    let r = canvas.getBoundingClientRect();
    let x = event.clientX - r.left;
    let y = event.clientY - r.top;
    x = 2 * x / canvas.width - 1;
    y = 1 - 2 * y / canvas.height;

    // Define boundary constraints
    const top_boundary = 1; // Top of the canvas
    const bottom_of_top_pegs = 1.55 - (4 * 0.13 * 1.5); 
    const left_wall = -B_IN;
    const right_wall = B_IN;

    // Check if click is valid
    if (y > bottom_of_top_pegs && x >= left_wall && x <= right_wall) {
        // Create a new ball with initial properties
        let ball = {
            x: x,
            y: y,
            r: BALL_RADIUS, // radius
            vy: 0, // initial vertical velocity
            vx: 0, // initial horizontal velocity
            color: [Math.random(), Math.random(), Math.random(), 1] // random color
        };
        balls.push(ball);
    }
}


function detect_collision(ball, peg) {
    let dx = ball.x - peg.x;
    let dy = ball.y - peg.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    //console.log(distance)
    return distance < ball.r + PEG_RADIUS;
}

function handle_collision(ball, peg) {
    // Reflect the ball's velocity 
    let dx = ball.x - peg.x;
    let dy = ball.y - peg.y;
    let angle = Math.atan2(dy, dx);

    // Add a small random perturbation to the angle
    let randomness = (Math.random() - 0.5) * 0.2; 
    angle += randomness;

    // Calculate the speed, ensuring it doesn't go below the minimum speed limit
    let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) / DAMPEN;
    if (speed < MINSPEEDLIMIT) speed = MINSPEEDLIMIT;

    // Reverse and slightly alter the velocity based on the new angle
    ball.vx = speed * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
}


function animate() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw boundary walls
    draw_boundary_walls();

    // Draw ball catcher
    draw_ball_catcher();

    // Draw pegs
    gl.uniform4f(unif_v_color, 1, 1, 1, 1); // Set color for pegs
    pegs.forEach(peg => {
        draw_circle(peg.x, peg.y, PEG_RADIUS, true);
    });

    // Update and draw balls
    for (let i = balls.length - 1; i >= 0; i--) {
        let ball = balls[i];

        // Apply gravity
        ball.vy -= GRAVITY;
        ball.y += ball.vy;
        ball.x += ball.vx;

        // Check for collisions with pegs
        pegs.forEach(peg => {
            if (detect_collision(ball, peg)) {
                handle_collision(ball, peg);
            }
        });

        // Check for sloped wall collisions
        handle_wall_collision(ball);

        // Check for ball catcher collision and update score
        handle_ball_catcher(ball, i);

        // Draw the ball
        if (balls.includes(ball)) {
            gl.uniform4f(unif_v_color, ...ball.color);
            draw_circle(ball.x, ball.y, ball.r, true);
        }
    }

    requestAnimationFrame(animate);
}



function main() {
    init_gl();
    canvas.addEventListener("mousedown", handle_mouse_down);
    animate();
}

main();