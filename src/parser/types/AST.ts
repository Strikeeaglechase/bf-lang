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
	while = "while",
	if = "if",
	break = "break",
	typeDef = "typeDef"
}
// export enum VarType {
// 	single,
// 	singleArr,
// 	obj,
// 	objArr
// }

interface AST {
	type: NodeType;
}
export interface Value extends AST {
	type: NodeType.value,
	value: RawValue
}
interface VarDeclareBase extends AST {
	type: NodeType.varDeclare,
	valType: string;
	name: string;
	isArray: boolean;
	// size: number;
}
export interface SingleVarDeclare extends VarDeclareBase {
	value: AnyAST;
	isArray: false;
}
export interface ArrayVarDeclare extends VarDeclareBase {
	length: number;
	isArray: true;
}
export type VarDeclare = SingleVarDeclare | ArrayVarDeclare;
export interface VarRef extends AST {
	type: NodeType.varRefrence,
	name: string;
	path: string[];
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
	path: string[]
}
export interface FunctionDef extends AST {
	type: NodeType.functionDef;
	name: string;
	args: VarDeclare[];
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
export interface If extends AST {
	type: NodeType.if;
	condition: AnyAST;
	inside: AnyAST[];
}
export interface TypeDef extends AST {
	type: NodeType.typeDef;
	name: string;
	fields: { name: string; type: string; }[];
}
export type AnyAST = VarDeclare | VarRef | Prog | Value | Expression | Assign | FunctionDef | FunctionRef | Return | While | If | TypeDef;