export type RawValue = number;
// export enum NodeType {
// 	varDeclare,
// 	varRefrence,
// 	prog,
// 	value,
// 	expression,
// 	assign
// }
export enum NodeType {
	varDeclare = "varDeclare",
	varRefrence = "varRefrence",
	prog = "prog",
	value = "value",
	expression = "expression",
	assign = "assign",
	functionDef = "funcDef",
	functionRef = "funcRef",
	return = "return",
	while = "while"
}
interface AST {
	type: NodeType;
}

export interface Value extends AST {
	type: NodeType.value,
	value: RawValue
}
interface VarDeclareBase extends AST {
	type: NodeType.varDeclare,
	name: string;
}
interface SingleVarDeclare extends VarDeclareBase {
	value: AnyAST;
	varType: "single";
}
interface ArrayVarDeclare extends VarDeclareBase {
	length: number;
	varType: "array";
}
export type VarDeclare = SingleVarDeclare | ArrayVarDeclare;
export interface VarRef extends AST {
	type: NodeType.varRefrence,
	name: string;
	idx?: AnyAST;
}
export interface Prog extends AST {
	type: NodeType.prog,
	inside: AnyAST[];
}
export interface Expression extends AST {
	type: NodeType.expression;
	left: AnyAST;
	right: AnyAST;
	op: string;
}
export interface Assign extends AST {
	type: NodeType.assign,
	varName: string;
	value: AnyAST;
	idx?: AnyAST;
}
export interface FunctionDef extends AST {
	type: NodeType.functionDef;
	name: string;
	args: string[];
	inside: AnyAST[];
}
export interface FunctionRef extends AST {
	type: NodeType.functionRef;
	name: string;
	args: AnyAST[];
}
export interface Return extends AST {
	type: NodeType.return;
	value: AnyAST;
}
export interface While extends AST {
	type: NodeType.while;
	condition: AnyAST;
	inside: AnyAST[];
}
export type AnyAST = VarDeclare | VarRef | Prog | Value | Expression | Assign | FunctionDef | FunctionRef | Return | While;