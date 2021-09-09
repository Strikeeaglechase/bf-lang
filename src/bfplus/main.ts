import { Meta, VarDef } from "../compiler.js";
// @ts-ignore
import { meta as metadata } from "../meta.js";
import { BFPlus } from "./bfplus.js";
import { Display } from "./display.js";

const meta: Meta = JSON.parse(metadata);
console.log(meta);

const X_SPACE = 25;
const Y_SPACE = 20;

const canvas = document.getElementById("main") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const display = new Display(ctx);
const bfPlus = new BFPlus(display);

// bfPlus.parse("+>+[<[->>+<<]>[->+>+<<]>>[-<<+>>]<]");
bfPlus.parse("+++++++[->+>>>+<<<<]")

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

		// Draw number
		let xStep = X_SPACE;
		if (bfPlus.ptr == i) {
			ctx.fillStyle = "#00ff00";
		} else {
			ctx.fillStyle = findPart(i).color;
		}
		ctx.fillText(bfPlus.mem[i].toString(), x, y);
		xStep = Math.max(xStep, ctx.measureText(bfPlus.mem[i].toString()).width + 10);


		// Check for vars
		meta.frames.forEach((frame, idx) => {
			const varDef = frame.scope.vars.find(v => v.idx == i);
			if (varDef) {
				ctx.fillText(varDef.name, x, y + Y_SPACE * (idx + 1))
				xStep = Math.max(xStep, ctx.measureText(varDef.name).width);
				if (varDef.isArray) {
					curArrs[idx] = varDef;
				}
			}


			const arr = curArrs[idx]
			if (arr && i >= (arr.idx + arr.length * (arr.type.size + 2)) + 3) curArrs[idx] = null;
			if (arr) {
				const subcell = (i - arr.idx - 5) % (arr.type.size + 2);
				const index = ((i - arr.idx) - 5) / (arr.type.size + 2);
				if (index >= 0 && subcell == 0) ctx.fillText(index.toString(), x, y + 20);
				const type = meta.types[arr.type.name];
				const name = type[subcell];
				if (name) {
					const dispName = name == "_prime" ? (subcell > 0 ? "P" : "") : name;
					ctx.fillText(dispName, x, y + 20);
				}
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

function drawCode(x: number, y: number): number {
	y += Y_SPACE;
	bfPlus.ops.forEach((op, idx) => {
		if (idx == bfPlus.idx) {
			ctx.fillStyle = "#ff0000"
		} else {
			ctx.fillStyle = "#ffffff";
		}
		ctx.fillText(op.type, x, y);
		ctx.fillText(op.value ? op.value.toString() : "", x, y + Y_SPACE);
		x += ctx.measureText(op.type).width + 10;
		if (x > canvas.width - X_SPACE * 2) {
			x = X_SPACE * 1.5;
			y += Y_SPACE * 2.5
		}
	});
	return y;
}

function clearCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = "16px sans-serif"
}

function draw() {
	setTimeout(() => requestAnimationFrame(draw), 200);
	// requestAnimationFrame(draw);
	clearCanvas();
	bfPlus.exec();

	let x = X_SPACE * 1.5;
	let y = Y_SPACE * 1.5;
	y = drawMem(x, y);
	// y = drawCode(x, y);
	display.draw(X_SPACE * 1.5, y, canvas.width - X_SPACE * 3, canvas.height - y - Y_SPACE);

}
draw();
// @ts-ignore
window.bf = bfPlus;
