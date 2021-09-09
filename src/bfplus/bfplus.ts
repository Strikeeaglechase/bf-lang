import { Display } from "./display.js";

const MAX = 2 ** 16;

enum PlusOpType {
	// BF:
	left = "left",
	right = "right",
	add = "add",
	sub = "sub",
	loop_start = "loop_start",
	loop_end = "loop_end",
	print = "print",

	// BF Extend:
	draw = "draw",
	rand = "rand",

	// Optimize:
	zero = "zero",
	move_mult = "move_mult",
	move_copy = "move_copy"
}

interface PlusOp {
	type: PlusOpType;
	idx: number;
	value?: number;
	offset?: number;
}

interface Pattern {
	match: (PlusOpType | PlusOpType[])[],
	handle: (op: PlusOp, idx: number) => PlusOp[];
}

const reps = ["<", ">", "+", "-"]
class BFPlus {
	ops: PlusOp[] = [];
	mem: number[] = new Array(2 ** 16).fill(0);
	ptr: number = 0;
	idx: number = 0;

	patterns: Pattern[] = [{
		match: [PlusOpType.loop_start, PlusOpType.sub, PlusOpType.loop_end],
		handle: (op: PlusOp, idx: number) => {
			return [{ type: PlusOpType.zero, idx: idx }];
		}
	}, {
		match: [
			PlusOpType.loop_start,
			PlusOpType.sub,
			[PlusOpType.left, PlusOpType.right],
			PlusOpType.add,
			[PlusOpType.left, PlusOpType.right],
			PlusOpType.loop_end
		],
		handle: (op: PlusOp, idx: number) => {
			if (this.ops[idx + 1].value != 1 || this.ops[idx + 2].value != this.ops[idx + 4].value) return null;
			return [{
				type: PlusOpType.move_mult,
				value: this.ops[idx + 3].value,
				offset: this.ops[idx + 2].value * (this.ops[idx + 2].type == PlusOpType.right ? 1 : -1),
				idx: op.idx
			}];
		}
	}, {
		match: [
			PlusOpType.loop_start,
			PlusOpType.sub,
			[PlusOpType.left, PlusOpType.right],
			PlusOpType.add,
			[PlusOpType.left, PlusOpType.right],
			PlusOpType.add,
			[PlusOpType.left, PlusOpType.right],
			PlusOpType.loop_end
		],
		handle: (op: PlusOp, idx: number) => {
			const [, sub, shift1, add1, shift2, add2, ret] = this.ops.slice(idx)
			if (sub.value != 1 ||
				add1.value != 1 ||
				add2.value != 1 ||
				shift1.value + shift2.value != ret.value
			) return null;
			return [{
				type: PlusOpType.move_copy,
				value: shift1.value * (shift1.type == PlusOpType.right ? 1 : -1),
				offset: shift2.value * (shift2.type == PlusOpType.right ? 1 : -1),
				idx: op.idx
			}];
		}
	}]

	constructor(private display: Display) { }

	public parse(code: string) {
		this.reset();
		this.directParse(code);
		this.parsePatterns();
		this.joinLoops();
	}
	public reset() {
		this.mem = new Array(2 ** 16).fill(0);
		this.ptr = 0;
		this.idx = 0;
		this.ops = [];
	}
	public exec() {
		const op = this.ops[this.idx];
		if (!op) return;
		switch (op.type) {
			case PlusOpType.add:
				this.mem[this.ptr] += op.value;
				if (this.mem[this.ptr] > MAX) this.mem[this.ptr] = 0;
				break;
			case PlusOpType.sub:
				this.mem[this.ptr] -= op.value;
				if (this.mem[this.ptr] < 0) this.mem[this.ptr] = MAX;
				break;
			case PlusOpType.left:
				this.ptr -= op.value;
				break;
			case PlusOpType.right:
				this.ptr += op.value;
				break;
			case PlusOpType.loop_start:
				if (this.mem[this.ptr] == 0) this.idx = op.value;
				break;
			case PlusOpType.loop_end:
				if (this.mem[this.ptr] != 0) this.idx = op.value;
				break;
			case PlusOpType.zero:
				this.mem[this.ptr] = 0;
				break;
			case PlusOpType.move_mult:
				this.mem[this.ptr + op.offset] += this.mem[this.ptr] * op.value;
				this.mem[this.ptr] = 0;
				break;
			case PlusOpType.move_copy:
				this.mem[this.ptr + op.value] += this.mem[this.ptr];
				this.mem[this.ptr + op.value + op.offset] += this.mem[this.ptr];
				this.mem[this.ptr] = 0;
				break;
			case PlusOpType.rand:
				this.mem[this.ptr] = Math.floor(Math.random() * this.mem[this.ptr]);
				break;
		}
		this.idx++;
	}

	private directParse(code: string) {
		let curChar = "";
		let count = 0;
		for (let i = 0; i < code.length + 1; i++) {
			const char = code[i];
			if (char == curChar && reps.includes(char)) {
				count++;
			} else {
				switch (curChar) {
					case "+": this.ops.push({ type: PlusOpType.add, value: count, idx: i }); break;
					case "-": this.ops.push({ type: PlusOpType.sub, value: count, idx: i }); break;
					case "<": this.ops.push({ type: PlusOpType.left, value: count, idx: i }); break;
					case ">": this.ops.push({ type: PlusOpType.right, value: count, idx: i }); break;
					case "*": this.ops.push({ type: PlusOpType.rand, idx: i }); break;
					case "*": this.ops.push({ type: PlusOpType.draw, idx: i }); break;
					case "[": this.ops.push({ type: PlusOpType.loop_start, value: null, idx: i }); break;
					case "]": this.ops.push({ type: PlusOpType.loop_end, value: null, idx: i }); break;
				}
				curChar = char;
				count = 1;
			}
		}
	}
	private joinLoops() {
		const loops: PlusOp[] = [];
		this.ops.forEach((op, idx) => {
			switch (op.type) {
				case PlusOpType.loop_start:
					loops.push(op);
					break;
				case PlusOpType.loop_end:
					const start = loops.pop();
					op.value = this.ops.indexOf(start);
					start.value = idx;
					break;
			}
		})
	}
	private parsePatterns() {
		this.ops.forEach((op, idx) => {
			this.patterns.forEach(pattern => {
				const matches = this.patternMatch(idx, ...pattern.match);
				if (matches) {
					const replace = pattern.handle(op, idx);
					if (replace) this.ops.splice(idx, pattern.match.length, ...replace);
				}
			});
		});
	}
	private patternMatch(idx: number, ...args: (PlusOpType | PlusOpType[])[]) {
		if (idx > this.ops.length - args.length) return false;

		let valid = true;
		args.forEach((arg, i) => {
			// console.log({ arg, i, idx }, this.ops[idx + i]);
			if (Array.isArray(arg)) {
				if (!arg.includes(this.ops[idx + i].type)) valid = false
			} else {
				if (this.ops[idx + i].type != arg) valid = false
			}
		});

		return valid;
	}
}


export { BFPlus }