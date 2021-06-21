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
// @ts-ignore stfu typescript ik it dosn't exist thats why im setting it
Map.prototype.toJSON = function <T, V>(this: Map<T, V>) {
	let obj: Record<string, V> = {};
	this.forEach((val, key) => obj[key.toString()] = val);
	return obj;
}

export interface VarDef {
	name: string;
	idx: number;
	type: Type;
	isArray: boolean;
	length?: number;
}
export interface Meta {
	frames: Frame[];
	idxs: { codeIndex: number, memAddr: number }[];
	parts: { name: string, start: number, end: number, color: string }[];
	types: Record<string, string[]>
}
class Scope {
	parent: Scope;
	global: Scope;
	vars: VarDef[] = [];
	varIdx: number;
	arrIdx: number;
	compiler: Compiler;
	constructor(compiler: Compiler, global: Scope, parent: Scope, varIdx?: number, arrIdx?: number,) {
		this.compiler = compiler;
		this.global = global;
		this.varIdx = parent ? parent.varIdx : varIdx;
		this.arrIdx = parent ? parent.arrIdx : arrIdx;
	}
	defVar(def: AST.VarDeclare): VarDef {
		let newDef: VarDef;
		const type = this.compiler.types.get(def.valType);
		if (def.isArray) {
			newDef = {
				idx: this.arrIdx,
				isArray: true,
				length: def.length,
				name: def.name,
				type: type
			}
			this.arrIdx += 3 + def.length * (2 + type.size)
		} else {
			newDef = {
				idx: this.varIdx - type.size,
				isArray: false,
				name: def.name,
				type: type
			}
			this.varIdx -= type.size;
		}
		this.vars.push(newDef);
		return newDef;
	}
	getVar(varName: string): VarDef {
		const local = this.vars.find(v => v.name == varName);
		if (local) return local;
		if (this.global) return this.global.vars.find(v => v.name == varName);
		throw `Undefined variable "${varName}"`;
	}
	toJSON() {
		return {
			vars: this.vars,
			varIdx: this.varIdx,
			arrIdx: this.arrIdx
		}
	}
}
class Frame {
	scope: Scope;
	ret: number;
	constructor(scope: Scope, ret: number) {
		this.scope = scope;
		this.ret = ret;
	}
}
interface TypeKey { index: number, type: Type }
interface Type {
	name: string;
	keys: Map<string, TypeKey>;
	size: number;
}
// Array: [ref_result, pad, pad] [value_move, indexer, cell]
//        header                 data
const numType: Type = {
	name: "num",
	size: 1,
	keys: new Map([["_prime", { index: 0, type: null }]])
}
function isArr(maybeArr: AST.VarDeclare): maybeArr is AST.ArrayVarDeclare {
	return maybeArr.isArray
}
class Compiler {
	mathIdx: number = MATH_SEG_START;
	funcs: AST.FunctionDef[] = [];

	// -- Debug -- 
	idxs: { codeIndex: number, memAddr: number }[] = [];
	typeDefs: Record<string, string[]> = { "num": ["_prime"] };

	// -- Memory -- 
	globalScope: Scope = new Scope(this, null, null, VAR_SPACE_START + VAR_SPACE_LEN - 1, ARR_SEG_START);
	stack: Frame[] = [new Frame(this.globalScope, 0)]; // Where function returns should put their value
	frames: Frame[] = [this.stack[0]];
	types: Map<string, Type> = new Map([["num", numType]]);

	// -- Program --
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
	get frame() {
		return this.stack[this.stack.length - 1];
	}
	exportMeta(): Meta {
		return {
			frames: this.frames,
			types: this.typeDefs,
			idxs: [],// this.idxs,
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
			case AST.NodeType.typeDef: this.handleTypeDef(tree); break;
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
		this.move(MATH_TEMP_STORE, this.frame.ret);
	}
	handleTypeDef(def: AST.TypeDef) {
		let totalSize = 1;
		const keys = new Map<string, TypeKey>();
		const flatType: string[] = []; // Debug
		def.fields.forEach(field => {
			const type = this.types.get(field.type);
			keys.set(field.name, { type: type, index: totalSize });
			this.typeDefs[type.name].forEach((key, idx) => {
				if (type.name == "num") {
					flatType[totalSize + idx] = field.name;
				} else {
					flatType[totalSize + idx] = key;
				}
			});
			totalSize += type.size;
		});
		keys.set("_prime", { type: null, index: 0 });
		flatType[0] = "_prime";
		this.typeDefs[def.name] = flatType;
		this.types.set(def.name, {
			name: def.name,
			keys: keys,
			size: totalSize
		});
	}
	defineFunc(funcDef: AST.FunctionDef) {
		this.funcs.push(funcDef);
	}
	refrenceFunc(ref: AST.FunctionRef) {
		const def = this.funcs.find(f => f.name == ref.name);
		const prevScope = this.frame.scope;
		// Push onto call stack
		const scope = new Scope(this, this.globalScope, this.frame.scope);
		this.stack.push(new Frame(scope, this.currentMemAddr));
		this.frames.push(this.frame);

		def.args.forEach(arg => this.createVar(arg));

		// Setup args
		def.args.forEach((arg, idx) => {
			const varDef = this.frame.scope.getVar(arg.name);
			if (ref.args[idx].type == AST.NodeType.varRefrence) {
				const created = this.frame.scope.getVar(arg.name);
				const varRef = ref.args[idx] as AST.VarRef;
				if (varRef.idx != null || varRef.path.length > 0) {
					// Need to preform a copy
					// if (varRef.idx) { }
				} else {
					created.idx = prevScope.getVar(varRef.name).idx;
				}
			} else {
				this.goto(MATH_TEMP_STORE);
				this.calcValue(ref.args[idx]);
				this.move(MATH_TEMP_STORE, varDef.idx);
			}
		});
		let progIdx = 0;
		while (progIdx < def.inside.length) {
			const tree = def.inside[progIdx++];
			this.compileNode(tree);
			if (tree.type == AST.NodeType.return) break;
		}

		// Pop off stack elements
		this.stack.pop();
	}
	createVar(newVar: AST.VarDeclare) {
		const createdVar = this.frame.scope.defVar(newVar);
		if (!isArr(newVar)) {
			// Need to assign default var value
			this.goto(MATH_TEMP_STORE);
			this.calcValue(newVar.value);
			this.move(MATH_TEMP_STORE, createdVar.idx);
		} else {
			this.goto(createdVar.idx);
			// Lets just zero out *everything* 
			const totalLen = 3 + createdVar.length * (2 + createdVar.type.size);
			this.code += `>[-]`.repeat(totalLen);
			this.code += `<`.repeat(totalLen);
		}
	}
	copyFullVar(varDef: VarDef, refPath: string[], offset: number, dst: number) {
		const path = this.getOffsetFromPath(varDef.type, refPath);
		for (let idx = 0; idx < path.curType.size; idx++) {
			this.copy(varDef.idx + path.offset + idx, dst + offset + idx);
		}
	}
	copyArrObj(arrDef: VarDef): VarDef {
		const tempVar = this.frame.scope.defVar({
			type: AST.NodeType.varDeclare,
			isArray: false,
			name: "_temp",
			valType: arrDef.type.name,
			value: { type: AST.NodeType.value, value: 0 }
		});
		for (let idx = 0; idx < arrDef.type.size; idx++) {
			this.fetchFromArray(arrDef.idx, arrDef.type.size, idx, tempVar.idx + idx);
		}
		return tempVar;
	}
	setVar(assignment: AST.Assign) {
		const varDef = this.frame.scope.getVar(assignment.varName);
		const { offset } = this.getOffsetFromPath(varDef.type, assignment.path);
		if (assignment.idx != null) {
			// Compute and store index
			this.goto(MATH_TEMP_STORE);
			this.calcValue(assignment.idx);
			this.move(MATH_TEMP_STORE, ARR_IDX_SET_STORE);

			if (assignment.value.type == AST.NodeType.varRefrence) {
				let copyVarDef = this.frame.scope.getVar(assignment.value.name);
				if (assignment.value.idx != null) {
					this.goto(MATH_TEMP_STORE);
					this.calcValue(assignment.value.idx);
					this.move(MATH_TEMP_STORE, IDX_TEMP_STORE);
					copyVarDef = this.copyArrObj(copyVarDef)
				}
				const path = this.getOffsetFromPath(copyVarDef.type, assignment.value.path);
				this.move(ARR_IDX_SET_STORE, IDX_TEMP_STORE);
				for (let idx = 0; idx < path.curType.size; idx++) {
					this.copy(copyVarDef.idx + path.offset + idx, MATH_TEMP_STORE);
					this.setArrayValue(varDef.idx, varDef.type.size, offset + idx);
				}
			} else {
				// Compute value (storing at MATH_TEMP_STORE)
				this.goto(MATH_TEMP_STORE);
				this.calcValue(assignment.value);

				// Move index into active indexing cell
				this.move(ARR_IDX_SET_STORE, IDX_TEMP_STORE);
				this.setArrayValue(varDef.idx, varDef.type.size, offset);
			}
		} else {
			if (assignment.value.type == AST.NodeType.varRefrence) {
				// Assigment is direct var copy
				const copyVarDef = this.frame.scope.getVar(assignment.value.name);
				this.copyFullVar(copyVarDef, assignment.value.path, offset, varDef.idx);
			} else {
				this.goto(MATH_TEMP_STORE);
				this.calcValue(assignment.value);
				this.move(MATH_TEMP_STORE, varDef.idx + offset);
			}
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
	getOffsetFromPath(type: Type, path: string[]) {
		let offset = 0;
		let curType = type;
		path.forEach(item => {
			offset += curType.keys.get(item).index;
			curType = curType.keys.get(item).type;
		});
		return { offset, curType };
	}
	getVarVal(ref: AST.VarRef) {
		const varDef = this.frame.scope.getVar(ref.name);
		const { offset } = this.getOffsetFromPath(varDef.type, ref.path.length > 0 ? ref.path : ["_prime"]);
		if (ref.idx == null) {
			this.copy(varDef.idx, this.currentMemAddr);
		} else {
			// We have an idx, must be array
			const target = this.currentMemAddr;
			// Set IDX
			this.goto(MATH_TEMP_STORE);
			this.calcValue(ref.idx);
			this.move(MATH_TEMP_STORE, IDX_TEMP_STORE);
			this.fetchFromArray(varDef.idx, varDef.type.size, offset, target);
		}
	}
	// Assumes that IDX_TEMP_STORE has the array index offset
	fetchFromArray(arrIdx: number, arrUnitSize: number, objOffset: number, dst: number) {
		const offR = '>'.repeat(objOffset);
		const offL = '<'.repeat(objOffset);
		const szR = '>'.repeat(arrUnitSize);
		const szL = '<'.repeat(arrUnitSize);

		this.copy(IDX_TEMP_STORE, arrIdx + 4);
		this.goto(arrIdx + 4);

		this.code += `[-<<+<+>>>]`;	 									// Copy idx
		this.code += `<<<[->>>+<<<]>>>`;									// Put idx in pad and idxer
		this.code += `[->>${szR}+${szL}<<]${szR}>>-`; 				// First index out step
		this.code += `[[->>${szR}+${szL}<<]+${szR}>>-]+`;			// Remaining index out steps
		this.code += `>${offR}[-<<${offL}+${offR}>>]${offL}<`;	// move value into hold
		this.code += `[-<[-<<${szL}+${szR}>>]<${szL}]`;				// shift back to start
		this.code += `<<[->>+<<]`;	 										// Move idx copy into idxer
		this.code += `>[-<+<+>>]`;	 										// Copy value
		this.code += `<[->+<]`;	 											// Move value into val_cell
		this.code += `<[-<+>]`;	 											// Shift other value into result
		this.code += `>>>[[->>${szR}+${szL}<<]<[->>${szR}+${szL}<<]>+${szR}>>-]`; // Write out value
		this.code += `<[->>${offR}+${offL}<<]`;	 					// Shift value into place
		this.code += `<${szL}[-${szL}<<]${szR}<<`;	 				// Move back to start

		this.currentMemAddr = arrIdx; // After all those ops this is where we end up
		this.move(arrIdx, dst); // Move result to out
	}
	// Assumes IDX_TEMP_STORE and MATH_TEMP_STORE are set
	setArrayValue(arrIdx: number, arrUnitSize: number, objOffset: number) {
		const offR = '>'.repeat(objOffset);
		const offL = '<'.repeat(objOffset);
		const szR = '>'.repeat(arrUnitSize);
		const szL = '<'.repeat(arrUnitSize);

		this.move(MATH_TEMP_STORE, arrIdx + 3);
		this.copy(IDX_TEMP_STORE, arrIdx + 4);
		this.goto(arrIdx + 4);

		this.code += `[[->>${szR}+${szL}<<]<[->>${szR}+${szL}<<]>+${szR}>>-]` // Move to dst
		this.code += `>${offR}[-]${offL}<<[->>${offR}+${offL}<<]` // Zero and store
		this.code += `<${szL}[-${szL}<<]${szR}<<` // Return to start

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
