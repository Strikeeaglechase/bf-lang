import * as AST from "./parser/types/AST.js";
const VAR_SPACE_START = 0; // Where we can declare variables
const VAR_SPACE_LEN = 16; // This limits how many vars we can have

const COPY_STORE_START = VAR_SPACE_START + VAR_SPACE_LEN;
const COPY_STORE_LEN = 2; // A temp spot to handle copies

const ARR_IDX_SET_STORE = COPY_STORE_START + COPY_STORE_LEN; // Storate for arrays being written to
const IDX_TEMP_STORE = ARR_IDX_SET_STORE + 1 // Index for current array lookup
const MATH_TEMP_STORE = IDX_TEMP_STORE + 1; // Store for math ops (primary result typically)

const MATH_SEG_START = MATH_TEMP_STORE + 1; // Where to begin a free segment for math
const MATH_SEG_LEN = 16;
const MATH_SIZE = 3;
const A_OFFSET = 1; // A/B values for math ops
const B_OFFSET = 2;

const ARR_SEG_START = MATH_SEG_START + MATH_SEG_LEN;
const ARR_UNIT_SIZE = 3;
const ARR_PADDING = 3;
export interface VarDef {
	name: string;
	idx: number;
}
export interface ArrDef {
	name: string;
	idx: number;
	len: number;
}
export interface Meta {
	scopes: Scope[];
	idxs: { codeIndex: number, memAddr: number }[];
	parts: { name: string, start: number, end: number, color: string }[];
}
class Scope {
	parent: Scope;
	global: Scope;
	vars: VarDef[] = [];
	arrs: ArrDef[] = [];
	varIdx: number;
	arrIdx: number;
	constructor(global: Scope, parent: Scope, varIdx?: number, arrIdx?: number,) {
		this.global = global;
		this.varIdx = parent ? parent.varIdx : varIdx;
		this.arrIdx = parent ? parent.arrIdx : arrIdx;
	}
	defVar(def: AST.VarDeclare): VarDef {
		const newVarDef: VarDef = {
			name: def.name,
			idx: this.varIdx--
		};
		this.vars.push(newVarDef);
		return newVarDef;
	}
	defArr(def: AST.ArrayVarDeclare): ArrDef {
		const newArrDef: ArrDef = {
			name: def.name,
			idx: this.arrIdx,
			len: def.length
		}
		this.arrs.push(newArrDef);
		this.arrIdx += def.length * ARR_UNIT_SIZE + ARR_PADDING;
		return newArrDef;
	}
	getVar(varName: string): VarDef {
		const local = this.vars.find(v => v.name == varName);
		if (local) return local;
		if (this.global) return this.global.vars.find(v => v.name == varName);
		throw `Undefined variable "${varName}"`;
	}
	getArr(arrName: string): ArrDef {
		const local = this.arrs.find(v => v.name == arrName);
		if (local) return local;
		if (this.global) return this.global.arrs.find(v => v.name == arrName);
		throw `Undefined array "${arrName}"`;
	}
}
// Array: [ref_result, pad, pad] [value_move, indexer, cell]
//        header                 data
class Compiler {
	globalScope: Scope = new Scope(null, null, VAR_SPACE_START + VAR_SPACE_LEN - 1, ARR_SEG_START);
	scopes: Scope[] = [this.globalScope];

	mathIdx: number = MATH_SEG_START;
	funcs: AST.FunctionDef[] = [];
	stack: number[] = []; // Where function returns should put their value

	idxs: { codeIndex: number, memAddr: number }[] = []; // Debug info for bf executor
	allScopes: Scope[] = [this.globalScope];

	prog: AST.Prog;
	_currentMemAddr: number = 0;
	code: string = ""; // Result
	constructor(prog: AST.Prog) {
		this.prog = prog;
	}
	set currentMemAddr(n: number) {
		this._currentMemAddr = n;
		this.idxs.push({ codeIndex: this.code.length, memAddr: n });
	}
	get currentMemAddr() {
		return this._currentMemAddr;
	}
	get scope() {
		return this.scopes[this.scopes.length - 1];
	}
	exportMeta(): Meta {
		return {
			scopes: this.allScopes,
			idxs: this.idxs,
			parts: [
				{
					name: "vars",
					start: VAR_SPACE_START,
					end: VAR_SPACE_START + VAR_SPACE_LEN,
					color: "#2754e8"
				},
				{
					name: "copy",
					start: COPY_STORE_START,
					end: COPY_STORE_START + COPY_STORE_LEN,
					color: "#069c24"
				},
				{
					name: "stores",
					start: ARR_IDX_SET_STORE,
					end: MATH_TEMP_STORE + 1,
					color: "#ff00f7"
				},
				{
					name: "math",
					start: MATH_SEG_START,
					end: MATH_SEG_START + MATH_SEG_LEN,
					color: "#9ec70c"
				},
				{
					name: "array",
					start: ARR_SEG_START,
					end: Infinity,
					color: "#ffffff"
				}
			],
		}
	}
	compile() {
		let progIdx = 0;
		while (progIdx < this.prog.inside.length) {
			const tree = this.prog.inside[progIdx++];
			this.compileNode(tree);
		}
		return this.code;
	}
	compileNode(tree: AST.AnyAST) {
		switch (tree.type) {
			case AST.NodeType.varDeclare: this.createVar(tree); break;
			case AST.NodeType.assign: this.setVar(tree); break;
			case AST.NodeType.functionDef: this.defineFunc(tree); break;
			case AST.NodeType.functionRef: this.refrenceFunc(tree); break;
			case AST.NodeType.return: this.return(tree); break;
			case AST.NodeType.while: this.handleWhile(tree); break;
			case AST.NodeType.if: this.handleIf(tree); break;
		}
	}
	handleWhile(whileDef: AST.While) {
		this.goto(MATH_TEMP_STORE);
		this.calcValue(whileDef.condition);
		this.code += `[`;
		for (let i = 0; i < whileDef.inside.length; i++) this.compileNode(whileDef.inside[i]);
		this.goto(MATH_TEMP_STORE);
		this.calcValue(whileDef.condition);
		this.code += `]`;
	}
	handleIf(ifDef: AST.If) {
		this.goto(MATH_TEMP_STORE);
		this.calcValue(ifDef.condition);
		this.code += `[`;
		for (let i = 0; i < ifDef.inside.length; i++) this.compileNode(ifDef.inside[i]);
		this.goto(MATH_TEMP_STORE);
		this.code += `[-]]`;
	}
	return(ret: AST.Return) {
		this.goto(MATH_TEMP_STORE);
		this.calcValue(ret.value);
		this.move(MATH_TEMP_STORE, this.stack[this.stack.length - 1]);
	}
	defineFunc(funcDef: AST.FunctionDef) {
		this.funcs.push(funcDef);
	}
	refrenceFunc(ref: AST.FunctionRef) {
		const def = this.funcs.find(f => f.name == ref.name);
		// Push onto call stack
		this.stack.push(this.currentMemAddr);

		// Create scope and push onto scope arr
		const scope = new Scope(this.globalScope, this.scope);
		this.scopes.push(scope);
		this.allScopes.push(scope);
		def.args.forEach(arg => {
			scope.defVar({
				type: AST.NodeType.varDeclare,
				value: { type: AST.NodeType.value, value: 0 },
				name: arg,
				varType: "single"
			});
		});

		// Setup args
		def.args.forEach((arg, idx) => {
			const varDef = this.scope.getVar(arg);
			this.goto(MATH_TEMP_STORE);
			this.calcValue(ref.args[idx]);
			this.move(MATH_TEMP_STORE, varDef.idx);
		});
		let progIdx = 0;
		while (progIdx < def.inside.length) {
			const tree = def.inside[progIdx++];
			this.compileNode(tree);
			if (tree.type == AST.NodeType.return) break;
		}

		// Pop off stack elements
		this.scopes.pop();
		this.stack.pop();
	}
	createVar(newVar: AST.VarDeclare) {
		if (newVar.varType == "single") {
			const newVarDef = this.scope.defVar(newVar);
			// Need to assign default var value
			this.goto(MATH_TEMP_STORE);
			this.calcValue(newVar.value);
			this.move(MATH_TEMP_STORE, newVarDef.idx);
		} else {
			this.scope.defArr(newVar);
		}
	}
	setVar(assignment: AST.Assign) {
		if (assignment.idx) {
			// If there is an idx then is an array
			const arrDef = this.scope.getArr(assignment.varName);

			// @ts-ignore
			// this.debug(`${assignment.varName}[${assignment.idx.value}]=${assignment.value.value}`);
			// Compute and store index
			this.goto(MATH_TEMP_STORE);
			this.calcValue(assignment.idx);
			this.move(MATH_TEMP_STORE, ARR_IDX_SET_STORE);

			// Compute value (storing at MATH_TEMP_STORE)
			this.goto(MATH_TEMP_STORE);
			this.calcValue(assignment.value);

			// Move index into active indexing cell
			this.move(ARR_IDX_SET_STORE, IDX_TEMP_STORE);
			this.setArrayValue(arrDef.idx);
		} else {
			const varDef = this.scope.getVar(assignment.varName);
			this.goto(MATH_TEMP_STORE);
			this.calcValue(assignment.value);
			this.move(MATH_TEMP_STORE, varDef.idx);
		}
	}
	calcValue(expr: AST.AnyAST) {
		switch (expr.type) {
			case AST.NodeType.value: this.makeValue(parseInt(expr.value.toString())); break;
			case AST.NodeType.varRefrence: this.getVarVal(expr); break;
			case AST.NodeType.expression: this.handleExpression(expr); break;
			case AST.NodeType.functionRef: this.refrenceFunc(expr); break;
		}
	}
	prepCmpExpr(A: number, B: number, base: number) {
		this.goto(B + 1);
		const toClearL = 6 - (B - base); // How many cells to clear
		this.code += "[-]>".repeat(toClearL) + "<".repeat(toClearL);

		this.goto(base); // Set flag
		this.makeValue(1);

		this.move(A, base + 3, false);
		this.move(B, base + 4, false);
		// Add 1 to A and B to ensure they are non-zero
		this.goto(base + 3);
		this.code += "+";
		this.goto(base + 4);
		this.code += "+";
	}
	handleExpression(expr: AST.Expression) {
		this.makeValue(0);
		const resultLoc = this.currentMemAddr;
		const base = this.mathIdx;
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
				break;
			case ">":
				this.prepCmpExpr(A, B, base);
				this.code += `[-<-[>>]<]<<[>>]>[<+>[-]]<`; // Compute >
				this.currentMemAddr = base + 2;
				this.move(base + 2, resultLoc);
				break;
			case "<":
				this.prepCmpExpr(A, B, base);
				this.code += `[-<-[>>]<]<<[>>]>>[<<+>>[-]]<<`; // Compute <
				this.currentMemAddr = base + 2;
				this.move(base + 2, resultLoc);
				break;
			case "!=":
				this.prepCmpExpr(A, B, base);
				this.code += `[-<-[>>]<]<<[>>]>>[-<+>]<[<+>[-]]<`; // Compute !=
				this.currentMemAddr = base + 2;
				this.move(base + 2, resultLoc);
				break;
			case "==":
				this.prepCmpExpr(A, B, base);
				this.code += `[-<-[>>]<]<<[>>]>>[-<+>]<[<+>[-]]>[-]<<[->+<]>[>]<+<<[>]>`; // Compute ==
				this.currentMemAddr = base + 2;
				this.move(base + 2, resultLoc);
				break;
			case "&&":
				this.prepCmpExpr(A, B, base);
				this.code += "[[-]<<+>>]<[[-]<+>]<-[->+<]>[-<+>]<"; // Compute &&
				this.currentMemAddr = base + 2;
				this.move(base + 2, resultLoc);
				break;
			case "||":
				this.prepCmpExpr(A, B, base);
				this.code += "[[-]<<+>>]<[[-]<+>]<[[-]>+<]>[-<+>]<"; // Compute ||
				this.currentMemAddr = base + 2;
				this.move(base + 2, resultLoc);
				break;
		}
		this.goto(resultLoc);
		this.mathIdx -= MATH_SIZE;
	}
	getVarVal(ref: AST.VarRef) {
		if (!ref.idx) {
			const locDef = this.scope.getVar(ref.name);
			this.copy(locDef.idx, this.currentMemAddr);
		} else {
			// We have an idx, must be array
			const arrDef = this.scope.getArr(ref.name);
			const target = this.currentMemAddr;
			// Set IDX
			this.goto(MATH_TEMP_STORE);
			this.calcValue(ref.idx);
			this.move(MATH_TEMP_STORE, IDX_TEMP_STORE);
			this.fetchFromArray(arrDef.idx, target);
		}
	}
	// Assumes that IDX_TEMP_STORE has the array index offset
	fetchFromArray(arrIdx: number, dst: number) {
		this.move(IDX_TEMP_STORE, arrIdx + 4);
		this.goto(arrIdx + 4);

		this.code += `[-<<+<+>>>]`;	 // Copy idx
		this.code += `<<<[->>>+<<<]>>>`;	 // Put idx in pad and idxer
		this.code += `[[->>>+<<<]+>>>-]+`;	 // go to idx
		this.code += `>[-<<+>>]<`;	 // move value into hold
		this.code += `[-<[-<<<+>>>]<<]`;	 // shift back to start
		this.code += `>[->>+<<]`;	 // Move idx copy into idxer
		this.code += `<<[->+>+<<]`;	 // Copy value
		this.code += `>>[->+<]`;	 // Move value into val_cell
		this.code += `<[-<+>]`;	 // Shift other value into result
		this.code += `>>>[[->>>+<<<]<[->>>+<<<]>+>>>-]`;	 // Write out value
		this.code += `<[->>+<<]`;	 // Shift value into place
		this.code += `<<[-<<<]<`;	 // Move back to start

		this.currentMemAddr = arrIdx; // After all those ops this is where we end up
		this.move(arrIdx, dst); // Move result to out
	}
	// Assumes IDX_TEMP_STORE and MATH_TEMP_STORE are set
	setArrayValue(arrIdx: number) {
		this.move(MATH_TEMP_STORE, arrIdx + 3);
		this.move(IDX_TEMP_STORE, arrIdx + 4);
		this.goto(arrIdx + 4);

		this.code += "[[->>>+<<<]<[->>>+<<<]>+>>>-]" // Move to dst
		this.code += ">[-]<<[->>+<<]" // Zero and store
		this.code += "<<[-<<<]<" // Return to start

		this.currentMemAddr = arrIdx;
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
		this.code += `[-]` // Set cell to zero
		this.code += `+`.repeat(value);
	}
	// Move value from one loc to another
	move(start: number, end: number, blank = true) {
		if (start == end) return;
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
	debug(message: string) {
		this.code += `!${message}!`;
	}
}
export { Compiler };