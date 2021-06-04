import { optimize } from "./bf.js";
// @ts-ignore
import { meta as metadata } from "./meta.js";
const meta = JSON.parse(metadata);
const X_SPACE = 25;
const Y_SPACE = 50;
const ops = "+-<>[].!".split("");
let doExec = true;
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
        this.ops = code.split(""); // .filter(c => ops.includes(c)) as Op[];
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
            let op = "";
            while (!ops.includes(op)) {
                const base = this.ops[this.idx++];
                if (!base)
                    break;
                op = base[0];
            }
            if (!op)
                break;
            switch (op) {
                case "+":
                    this.mem[this.ptr]++;
                    break;
                case "-":
                    this.mem[this.ptr]--;
                    if (this.mem[this.ptr] < 0)
                        this.mem[this.ptr] = 0;
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
                case "!":
                    doExec = false;
                    let str = "";
                    while (this.ops[this.idx] != "!") {
                        str += this.ops[this.idx];
                        this.idx++;
                    }
                    this.idx++;
                    console.log(str);
                    break;
            }
        }
        const compilerLoc = meta.idxs.find(idx => idx.codeIndex == this.idx - 1);
        if (compilerLoc && compilerLoc.memAddr != this.ptr) {
            console.log(`Code idx: ${this.idx} => C: ${compilerLoc.memAddr}, R: ${this.ptr}`);
            // doExec = false;
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
function findPart(idx) {
    const part = meta.parts.find(part => {
        return idx >= part.start && idx < (part.end != null ? part.end : Infinity);
    });
    if (part) {
        return part;
    }
    return { color: "#ffffff" };
}
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
    let lines = 3;
    let curArr = null;
    for (let i = 0; i < 256; i++) {
        if (bf.ptr == i) {
            ctx.fillStyle = "#00ff00";
        }
        else {
            ctx.fillStyle = findPart(i).color;
        }
        ctx.fillText(bf.mem[i].toString(), x, y);
        const varDef = meta.vars.find(v => v.idx == i);
        if (varDef) {
            ctx.fillText(varDef.name, x, y + 20);
        }
        const arrDef = meta.arrs.find(a => a.idx == i);
        if (arrDef) {
            curArr = arrDef;
            ctx.fillText(arrDef.name, x, y + 20);
        }
        if (curArr && i >= (curArr.idx + curArr.len * 3) + 3)
            curArr = null;
        if (curArr && (i - curArr.idx - 5) % 3 == 0) {
            const idx = ((i - curArr.idx) - 5) / 3;
            if (idx >= 0)
                ctx.fillText(idx.toString(), x, y + 20);
        }
        x += X_SPACE;
        if (x > canvas.width - X_SPACE * 2) {
            x = X_SPACE * 1.5;
            y += Y_SPACE;
            if (--lines == 0)
                break;
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
    if (doExec)
        bf.execute(1);
}
draw();
console.log(meta);
document.addEventListener("keydown", (e) => {
    if (e.key == " ") {
        bf.execute(1);
    }
    if (e.key == "Enter")
        doExec = true;
});
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
