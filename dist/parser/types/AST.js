// export enum NodeType {
// 	varDeclare,
// 	varRefrence,
// 	prog,
// 	value,
// 	expression,
// 	assign
// }
export var NodeType;
(function (NodeType) {
    NodeType["varDeclare"] = "varDeclare";
    NodeType["varRefrence"] = "varRefrence";
    NodeType["prog"] = "prog";
    NodeType["value"] = "value";
    NodeType["expression"] = "expression";
    NodeType["assign"] = "assign";
})(NodeType || (NodeType = {}));