import { puncToks, TokenType } from "./tokenizer.js";
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
    constructor(input) {
        this.stream = input;
    }
    startParse() {
        const trees = [];
        while (!this.stream.end()) {
            trees.push(this.parse());
        }
        return {
            type: AST.NodeType.prog,
            inside: trees.filter(node => node != null) // Break lines are nulls
        };
    }
    parse() {
        if (this.stream.end())
            return;
        const token = this.stream.next();
        switch (token.type) {
            case TokenType.break: return null;
            case TokenType.keyword: return this.handleKeyword(token);
            case TokenType.value: return { type: AST.NodeType.value, value: token.value };
            case TokenType.name: return this.handleName(token);
            case TokenType.punctuation: return this.handlePunc(token);
        }
    }
    handlePunc(token) {
        if (token.value == "(") {
            return this.expression(this.parse()); // Maybe return expr from that
        }
        return null;
    }
    handleKeyword(token) {
        switch (token.value) {
            case "let":
                const name = this.stream.next().value;
                this.stream.next(); // Step past equal
                const value = this.parse();
                return {
                    type: AST.NodeType.varDeclare,
                    name: name.toString(),
                    value: this.expression(value)
                };
        }
        return;
    }
    handleName(token) {
        var _a, _b;
        const next = (_b = (_a = this.stream.peak()) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.toString();
        if (next == "=") {
            this.stream.next();
            return {
                type: AST.NodeType.assign,
                varName: token.value.toString(),
                value: this.expression(this.parse())
            };
        }
        else {
            return { type: AST.NodeType.varRefrence, name: token.value.toString() };
        }
    }
    expression(left, leftPrec = 0) {
        var _a, _b;
        let token = (_b = (_a = this.stream.peak()) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.toString();
        if (puncToks.includes(token)) {
            const tokPrec = PRECEDENCE[token];
            if (tokPrec > leftPrec) {
                this.stream.next();
                const right = this.expression(this.parse(), tokPrec);
                const ast = {
                    type: AST.NodeType.expression,
                    op: token,
                    left: left,
                    right: right
                };
                return this.expression(ast, leftPrec);
            }
        }
        return left;
    }
}
export { Parser };
