import { optimize } from "./bf.js";
const X_SPACE = 25;
const Y_SPACE = 20;
const OP_X_SPACE = 15;
const ops = "+-<>[].".split("");
class Brainfuck {
    constructor(src) {
        this.mem = new Array(Math.pow(2, 16)).fill(0);
        this.ptr = 0;
        this.idx = 0;
        this.log = "";
        this.optimize = false;
        this.ops = src.split("");
    }
    exec(code, doOpt = false) {
        this.ops = code.split("").filter(c => ops.includes(c));
        this.mem = new Array(Math.pow(2, 16)).fill(0);
        this.idx = 0;
        this.ptr = 0;
        this.log = "";
        this.optimize = doOpt;
        if (this.optimize) {
            this.ops = optimize(this.ops.join("")); // Lie about type
        }
    }
    execute(steps) {
        let curSteps = 0;
        while (this.idx < this.ops.length && curSteps++ < steps) {
            const op = this.ops[this.idx++][0];
            switch (op) {
                case "+":
                    this.mem[this.ptr]++;
                    break;
                case "-":
                    this.mem[this.ptr]--;
                    break;
                case ">":
                    if (this.optimize) {
                        const amt = parseInt(this.ops[this.idx - 1].substring(1));
                        this.ptr += amt;
                    }
                    else {
                        this.ptr++;
                    }
                    break;
                case "<":
                    if (this.optimize) {
                        const amt = parseInt(this.ops[this.idx - 1].substring(1));
                        this.ptr -= amt;
                    }
                    else {
                        this.ptr--;
                    }
                    break;
                case ".":
                    console.log(this.mem[this.ptr]);
                    // this.log += String.fromCharCode(this.mem[this.ptr]);
                    // if (this.mem[this.ptr] == 13) {
                    // 	console.log(this.log);
                    // 	this.log = "";
                    // }
                    break;
                case "[":
                    if (this.mem[this.ptr] == 0)
                        this.branchPast();
                    break;
                case "]":
                    if (this.mem[this.ptr] != 0)
                        this.branchBack();
                    return;
            }
        }
    }
    branchPast() {
        let d = 1;
        while (d != 0)
            this.ops[this.idx++] == "[" ? d++ : this.ops[this.idx - 1] == "]" ? d-- : null;
    }
    branchBack() {
        let d = 1;
        // Oh god why am I fucking with idx so much
        this.idx -= 2;
        while (d != 0)
            this.ops[this.idx--] == "[" ? d-- : this.ops[this.idx + 1] == "]" ? d++ : null;
        this.idx++;
    }
}
const canvas = document.getElementById("main");
const ctx = canvas.getContext("2d");
const bf = new Brainfuck("");
// @ts-ignore
window.bf = bf;
function draw() {
    // setTimeout(() => requestAnimationFrame(draw), 200);
    requestAnimationFrame(draw);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px sans-serif";
    let x = X_SPACE * 1.5;
    let y = Y_SPACE * 1.5;
    for (let i = 0; i < 256; i++) {
        if (bf.ptr == i) {
            ctx.fillStyle = "#00ff00";
        }
        else {
            ctx.fillStyle = "#ffffff";
        }
        ctx.fillText(bf.mem[i].toString(), x, y);
        x += X_SPACE;
        if (x > canvas.width - X_SPACE * 2) {
            x = X_SPACE * 1.5;
            y += Y_SPACE;
        }
    }
    x = X_SPACE * 1.5;
    y += Y_SPACE * 5;
    for (let i = 0; i < bf.ops.length; i++) {
        if (bf.idx == i) {
            ctx.fillStyle = "#ff0000";
        }
        else {
            ctx.fillStyle = "#ffffff";
        }
        ctx.fillText(bf.ops[i], x, y);
        x += ctx.measureText(bf.ops[i]).width + 5;
        if (x > canvas.width - X_SPACE * 2) {
            x = X_SPACE * 1.5;
            y += Y_SPACE;
        }
    }
    bf.execute(1);
}
draw();
/*
bf.exec(`
+>+
[
[->+>+<<] double the value
>>[-<<+>>] move back into place
<<<[->>+<<] add last value
>>
]
`);
*/ 
