import { Meta, VarDef } from "compiler.js";
import { Op, optimize } from "./bf.js";
// @ts-ignore
import { meta as metadata } from "./meta.js"
const meta: Meta = JSON.parse(metadata);
const X_SPACE = 25;
const Y_SPACE = 20;
const ops = "+-<>[].!".split("");
let doExec = true;
let numCalcs = 0;
class Brainfuck {
	ops: Op[];
	mem: number[] = new Array(2 ** 16).fill(0);
	ptr: number = 0;
	idx: number = 0;
	log: string = "";
	optimize = false;
	constructor(src: string) {
		this.ops = src.split("") as Op[];
	}
	exec(code: string, doOpt = false) {
		this.ops = code.split("") as Op[];// .filter(c => ops.includes(c)) as Op[];
		this.mem = new Array(2 ** 16).fill(0);
		this.idx = 0;
		this.ptr = 0;
		this.log = "";
		this.optimize = doOpt;
		if (this.optimize) {
			this.ops = optimize(this.ops.join("")) as Op[]; // Lie about type
		}
		numCalcs = 0;
	}
	execute() {
		let op = "";
		while (!ops.includes(op)) {
			const base = this.ops[this.idx++];
			if (!base) break;
			op = base[0];
		}
		if (!op) return;
		numCalcs++;
		switch (op) {
			case "+": this.mem[this.ptr]++; break;
			case "-": this.mem[this.ptr]--; if (this.mem[this.ptr] < 0) this.mem[this.ptr] = 0; break;
			case ">":
				if (this.optimize) {
					const amt = parseInt(this.ops[this.idx - 1].substring(1));
					this.ptr += amt;
				} else {
					this.ptr++;
				}
				break;
			case "<":
				if (this.optimize) {
					const amt = parseInt(this.ops[this.idx - 1].substring(1));
					this.ptr -= amt;
				} else {
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
			case "[": if (this.mem[this.ptr] == 0) this.branchPast(); break;
			case "]": if (this.mem[this.ptr] != 0) this.branchBack(); return;
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
		const compilerLoc = meta.idxs.find(idx => idx.codeIndex == this.idx - 1);
		if (compilerLoc && compilerLoc.memAddr != this.ptr) {
			// console.log(`Code idx: ${this.idx} => C: ${compilerLoc.memAddr}, R: ${this.ptr}`);
			// doExec = false;
		}
	}
	branchPast() {
		let d = 1;
		while (d != 0) this.ops[this.idx++] == "[" ? d++ : this.ops[this.idx - 1] == "]" ? d-- : null;
	}
	branchBack() {
		let d = 1;
		// Oh god why am I fucking with idx so much
		this.idx -= 2;
		while (d != 0) this.ops[this.idx--] == "[" ? d-- : this.ops[this.idx + 1] == "]" ? d++ : null;
		this.idx++;
	}
}
const canvas = document.getElementById("main") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const bf = new Brainfuck("");
// @ts-ignore
window.bf = bf;
function findPart(idx: number) {
	const part = meta.parts.find(part => {
		return idx >= part.start && idx < (part.end != null ? part.end : Infinity);
	});
	if (part) { return part }
	return { color: "#ffffff" }
}
function drawMem(x: number, y: number): number {
	let lines = 3;
	let curArrs: VarDef[] = [];
	for (let i = 0; i < 256; i++) {
		let xStep = X_SPACE;
		if (bf.ptr == i) {
			ctx.fillStyle = "#00ff00";
		} else {
			ctx.fillStyle = findPart(i).color;
		}
		ctx.fillText(bf.mem[i].toString(), x, y);

		// Check if there are vars/arrs
		meta.frames.forEach((frame, idx) => {
			const varDef = frame.scope.vars.find(v => v.idx == i);
			if (varDef) {
				ctx.fillText(varDef.name, x, y + Y_SPACE * (idx + 1));
				xStep = Math.max(xStep, ctx.measureText(varDef.name).width + 10);
			}
			if (varDef && varDef.isArray) {
				curArrs[idx] = varDef;
				ctx.fillText(varDef.name, x, y + Y_SPACE * (idx + 1))
				xStep = Math.max(xStep, ctx.measureText(varDef.name).width);
			}
			if (curArrs[idx] && i >= (curArrs[idx].idx + curArrs[idx].length * (curArrs[idx].type.size + 2)) + 3) curArrs[idx] = null;
			if (curArrs[idx] && (i - curArrs[idx].idx - 5) % (curArrs[idx].type.size + 2) == 0) {
				const index = ((i - curArrs[idx].idx) - 5) / (curArrs[idx].type.size + 2);
				if (index >= 0) ctx.fillText(index.toString(), x, y + 20);
			}
		});


		x += xStep;
		if (x > canvas.width - X_SPACE * 2) {
			x = X_SPACE * 1.5;
			y += Y_SPACE * (meta.frames.length + 1) + 10;
			if (--lines == 0) break;
		}
	}
	return y;
}
function draw() {
	// setTimeout(() => requestAnimationFrame(draw), 200);
	requestAnimationFrame(draw);
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = "24px sans-serif"

	let x = X_SPACE * 1.5;
	let y = Y_SPACE * 1.5;
	y = drawMem(x, y);

	y += Y_SPACE;
	ctx.fillText(numCalcs.toString(), X_SPACE * 1.5, y);
	if (doExec) for (let i = 0; i < 1; i++) bf.execute();

	x = X_SPACE * 1.5;
	y += Y_SPACE * 5;
	for (let i = 0; i < bf.ops.length; i++) {
		if (bf.idx == i) {
			ctx.fillStyle = "#ff0000";
		} else {
			ctx.fillStyle = "#ffffff";
		}
		ctx.fillText(bf.ops[i], x, y);
		x += ctx.measureText(bf.ops[i]).width + 5;
		if (x > canvas.width - X_SPACE * 2) {
			x = X_SPACE * 1.5;
			y += Y_SPACE;
		}
	}
}
draw();
bf.exec(`>>>>>>>>>>>>>>>>>>>>[-]+++++<<<<<<[-]>>>>>>[-<<<<<<+>>>>>>][-]+++++++<<<<<<<[-]>>>>>>>[-<<<<<<<+>>>>>>>][-]>><<<<<<<<[->>+>+<<<][-]>>[-<<+>>]>>>>>>[-]<<<<<[->>>>>+<<<<<]>>>>>><<<<<<<<<<[->>>+>+<<<<][-]>>>[-<<<+>>>]>>>>>>>[-]<<<<<<[->>>>>>+<<<<<<]>>>[-]>>[-<<+>>]>[-<<<+>>>]<<<<<<<<<<<[-]>>>>>>>>[-<<<<<<<<+>>>>>>>>]`);
console.log(meta);
document.addEventListener("keydown", (e) => {
	if (e.key == " ") {
		bf.execute();
	}
	if (e.key == "Enter") doExec = true;
});