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
		if (this.stream.peak()?.value == ")") return;
		const token = this.stream.next();
		switch (token.type) {
			case TokenType.break: return null;
			case TokenType.keyword: return this.handleKeyword(token);
			case TokenType.value: return { type: AST.NodeType.value, value: parseInt(token.value.toString()) };
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
			case "let": return this.handleVarDef();
			case "func": return this.handleFuncDef();
			case "ret": return { type: AST.NodeType.return, value: this.expression(this.parse()) };
		}
		return;
	}
	handleVarDef(): AST.VarDeclare {
		const name = this.stream.next().value;
		const nxt = this.stream.next(); // Get equal or bracket
		if (nxt.value == "[") {
			const len = parseInt(this.stream.next().value.toString());
			return {
				type: AST.NodeType.varDeclare,
				varType: "array",
				length: len,
				name: name.toString()
			}
		} else {
			return {
				type: AST.NodeType.varDeclare,
				name: name.toString(),
				value: this.expression(this.parse()),
				varType: "single"
			}
		}
	}
	handleFuncDef(): AST.FunctionDef {
		const name = this.stream.next().value.toString();
		this.stream.next(); // Open parenth
		const args: string[] = [];
		while (this.stream.peak().value != ")") {
			const nextArg = this.stream.next();
			args.push(nextArg.value.toString());
			const nxt = this.stream.next(); // Skip comma
			if (nxt.value == ")") break;
		}
		this.stream.next(); // Close parenth
		this.stream.next(); // Open braket
		const trees: AST.AnyAST[] = [];
		while (this.stream.peak().value != "}") {
			trees.push(this.parse());
		}
		return {
			type: AST.NodeType.functionDef,
			name: name,
			inside: trees.filter(node => node != null),
			args: args
		};
	}
	handleFuncRef(ref: Token): AST.FunctionRef {
		this.stream.next();
		const args: AST.AnyAST[] = [];
		while (this.stream.peak() && this.stream.peak().value != ")") {
			const val = this.parse();
			if (this.stream.peak().value == ")") {
				args.push(val);
				this.stream.next();
				break;
			} else {
				args.push(this.expression(val));
			}
			const nxt = this.stream.next(); // Comma 
			if (nxt.value == ")" || nxt.type == TokenType.break) break;
		}
		return {
			type: AST.NodeType.functionRef,
			name: ref.value.toString(),
			args: args
		};
	}
	handleArrRef(token: Token): AST.AnyAST {
		this.stream.next();
		const idx = this.expression(this.parse());
		this.stream.next();
		const nxt = this.stream.peak()?.value?.toString();
		if (nxt == "=") {
			this.stream.next();
			return {
				type: AST.NodeType.assign,
				varName: token.value.toString(),
				idx: idx,
				value: this.expression(this.parse())
			}
		}
		return {
			type: AST.NodeType.varRefrence,
			name: token.value.toString(),
			idx: idx
		}
	}
	handleName(token: Token): AST.AnyAST {
		const next = this.stream.peak()?.value?.toString();
		switch (next) {
			case "=":
				this.stream.next();
				return {
					type: AST.NodeType.assign,
					varName: token.value.toString(),
					value: this.expression(this.parse()),
				}
			case "(": return this.handleFuncRef(token);
			case "[": return this.handleArrRef(token);
			default:
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