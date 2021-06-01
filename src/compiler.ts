import * as AST from "./parser/types/AST.js";
const VAR_SPACE_START = 0; // Where we can declare variables
const VAR_SPACE_LEN = 16; // This limits how many vars we can have

const COPY_STORE_START = VAR_SPACE_START + VAR_SPACE_LEN;
const COPY_STORE_LEN = 2; // A temp spot to handle copies

const MATH_TEMP_STORE = COPY_STORE_START + COPY_STORE_LEN; // Store for math ops (primary result typically)
const MATH_SEG_START = MATH_TEMP_STORE + 1; // Where to begin a free segment for math
const MATH_SIZE = 3;
const A_OFFSET = 1; // A/B values for math ops
const B_OFFSET = 2;
class Compiler {
	prog: AST.Prog;
	vars: { name: string, idx: number }[] = [];
	varIdx: number = VAR_SPACE_START;
	mathIdx: number = MATH_SEG_START;
	currentMemAddr: number = 0;
	code: string = "";
	constructor(prog: AST.Prog) {
		this.prog = prog;
	}
	compile() {
		let progIdx = 0;
		while (progIdx < this.prog.inside.length) {
			const tree = this.prog.inside[progIdx++];
			switch (tree.type) {
				case AST.NodeType.varDeclare: this.createVar(tree); break;
				case AST.NodeType.assign: this.setVar(tree); break;
			}
		}
		return this.code;
	}
	createVar(newVar: AST.VarDeclare) {
		const newVarDef = {
			name: newVar.name,
			idx: this.varIdx++
		};
		this.vars.push(newVarDef);
		// Need to assign default var value
		this.goto(MATH_TEMP_STORE);
		this.calcValue(newVar.value);
		this.move(MATH_TEMP_STORE, newVarDef.idx);
	}
	setVar(assignment: AST.Assign) {
		const varDef = this.vars.find(v => v.name == assignment.varName);
		this.goto(MATH_TEMP_STORE);
		this.calcValue(assignment.value);
		this.move(MATH_TEMP_STORE, varDef.idx);
	}
	calcValue(expr: AST.AnyAST) {
		switch (expr.type) {
			case AST.NodeType.value: this.makeValue(parseInt(expr.value.toString())); break;
			case AST.NodeType.varRefrence: this.getVarVal(expr.name); break;
			case AST.NodeType.expression: this.handleExpression(expr); break;
		}
	}
	handleExpression(expr: AST.Expression) {
		this.makeValue(0);
		const resultLoc = this.currentMemAddr;
		const A = this.mathIdx + A_OFFSET;
		const B = this.mathIdx + B_OFFSET;
		this.mathIdx += MATH_SIZE;

		this.goto(A);
		this.calcValue(expr.left);
		this.goto(B);
		this.calcValue(expr.right);

		switch (expr.op) {
			case "+":
				this.move(A, resultLoc);
				this.move(B, resultLoc, false);
				break;
			case "-":
				this.move(A, resultLoc);
				this.goto(B);
				this.code += `[-`;
				this.goto(resultLoc);
				this.code += `-`;
				this.goto(B);
				this.code += "]";
				break;
			case "*":
				this.goto(A);
				this.code += `[`;
				this.copy(B, resultLoc, false);
				this.goto(A);
				this.code += `-]`;
		}
		this.goto(resultLoc);
		this.mathIdx -= MATH_SIZE;
	}
	getVarVal(varName: string) {
		const locDef = this.vars.find(v => v.name == varName);
		this.copy(locDef.idx, this.currentMemAddr);
	}
	copy(src: number, dst: number, blank = true) {
		// Move value and duplicate
		this.goto(src);
		this.code += "[-";
		this.goto(COPY_STORE_START);
		this.code += "+>+<";
		this.goto(src);
		this.code += "]";

		// Move first back to org
		this.move(COPY_STORE_START, src);
		// Move second to dest
		this.move(COPY_STORE_START + 1, dst, blank);
	}
	// Assigns the value of the current mem loc
	makeValue(value: number) {
		this.note(`Make ${value}`);
		this.code += `[-]` // Set cell to zero
		this.code += `+`.repeat(value);
	}
	// Move value from one loc to another
	move(start: number, end: number, blank = true) {
		if (blank) {
			this.goto(end);
			this.makeValue(0);
		}
		this.goto(start);
		this.code += `[-`;
		this.goto(end);
		this.code += `+`;
		this.goto(start);
		this.code += `]`;
	}
	// Move pointer to a location
	goto(idx: number) {
		while (this.currentMemAddr != idx) {
			if (this.currentMemAddr < idx) {
				this.currentMemAddr++;
				this.code += ">";
			} else {
				this.currentMemAddr--;
				this.code += "<";
			}
		}
	}
	note(str: string) {
		const append = this.code[this.code.length - 1] == "\n" ? "" : "\n";
		this.code += `${append}| ${str} |\n`;
	}
}
export { Compiler };
