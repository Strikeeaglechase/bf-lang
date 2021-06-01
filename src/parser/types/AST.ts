export type RawValue = string | number | boolean;
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
	assign = "assign"
}
interface AST {
	type: NodeType;
}

export interface Value extends AST {
	type: NodeType.value,
	value: RawValue
}
export interface VarDeclare extends AST {
	type: NodeType.varDeclare,
	name: string;
	value: AnyAST;
}
export interface VarRef extends AST {
	type: NodeType.varRefrence,
	name: string;
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
}
export type AnyAST = VarDeclare | VarRef | Prog | Value | Expression | Assign;