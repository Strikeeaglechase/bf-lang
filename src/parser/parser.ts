import { Stream } from "./stream.js";
import { puncToks, Token, TokenType } from "./tokenizer.js";
// import { AST } from "./types/AST.js";
import * as AST from "./types/AST.js";
const PRECEDENCE = {
	"=": 1,
	"||": 2,
	"&&": 3,
	"<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
	"+": 10, "-": 10,
	"*": 20
};
class Parser {
	stream: Stream<Token>;
	constructor(input: Stream<Token>) {
		this.stream = input;
	}
	startParse(): AST.Prog {
		const trees: AST.AnyAST[] = [];
		while (!this.stream.end()) {
			trees.push(this.parse());
		}
		return {
			type: AST.NodeType.prog,
			inside: trees.filter(node => node != null) // Break lines are nulls
		}
	}
	parse(): AST.AnyAST {
		if (this.stream.end()) return;
		const token = this.stream.next();
		switch (token.type) {
			case TokenType.break: return null;
			case TokenType.keyword: return this.handleKeyword(token);
			case TokenType.value: return { type: AST.NodeType.value, value: token.value };
			case TokenType.name: return this.handleName(token);
			case TokenType.punctuation: return this.handlePunc(token);
		}
	}
	handlePunc(token: Token): AST.AnyAST {
		if (token.value == "(") {
			return this.expression(this.parse()); // Maybe return expr from that
		}
		return null;
	}
	handleKeyword(token: Token): AST.AnyAST {
		switch (token.value) {
			case "let":
				const name = this.stream.next().value;
				this.stream.next(); // Step past equal
				const value = this.parse();
				return {
					type: AST.NodeType.varDeclare,
					name: name.toString(),
					value: this.expression(value)
				}
		}
		return;
	}
	handleName(token: Token): AST.AnyAST {
		const next = this.stream.peak()?.value?.toString();
		if (next == "=") {
			this.stream.next();
			return {
				type: AST.NodeType.assign,
				varName: token.value.toString(),
				value: this.expression(this.parse())
			}
		} else {
			return { type: AST.NodeType.varRefrence, name: token.value.toString() };
		}
	}
	expression(left: AST.AnyAST, leftPrec: number = 0): AST.AnyAST {
		let token = this.stream.peak()?.value?.toString();
		if (puncToks.includes(token)) {
			const tokPrec = PRECEDENCE[token];
			if (tokPrec > leftPrec) {
				this.stream.next();
				const right = this.expression(this.parse(), tokPrec);

				const ast: AST.Expression = {
					type: AST.NodeType.expression,
					op: token,
					left: left,
					right: right
				}
				return this.expression(ast, leftPrec);
			}
		}
		// We are "parsing" the ) by dropping out of this expression
		// need to make sure that the expression one up is not poluted
		// by reparsing the parenth
		if (token == ")") this.stream.next();
		return left;
	}
}
export { Parser };