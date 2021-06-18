import { puncToks, TokenType } from "./tokenizer.js";
// import { AST } from "./types/AST.js";
import * as AST from "./types/AST.js";
const PRECEDENCE = {
    "=": 1,
    "||": 2,
    "&&": 3,
    "<": 7, ">": 7, "==": 7, "!=": 7,
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
        var _a;
        if (this.stream.end())
            return;
        if (((_a = this.stream.peak()) === null || _a === void 0 ? void 0 : _a.value) == ")")
            return;
        const token = this.stream.next();
        switch (token.type) {
            case TokenType.break: return null;
            case TokenType.keyword: return this.handleKeyword(token);
            case TokenType.value: return { type: AST.NodeType.value, value: parseInt(token.value.toString()) };
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
            case "let": return this.handleVarDef();
            case "func": return this.handleFuncDef();
            case "while": return this.handleWhileDef();
            case "if": return this.handleIfDef();
            case "type": return this.handleTypeDef();
            case "ret":
                return { type: AST.NodeType.return, value: this.expression(this.parse()) };
                ;
        }
    }
    handleTypeDef() {
        const name = this.stream.next();
        this.stream.next(); // Skip {
        this.stream.next(); // Skip break
        const fields = [];
        while (this.stream.peak().value != "}") {
            const type = this.stream.next().value.toString();
            const name = this.stream.next().value.toString();
            this.stream.next(); // Pass break
            fields.push({ type, name });
        }
        return {
            type: AST.NodeType.typeDef,
            name: name.value.toString(),
            fields: fields
        };
    }
    handleWhileDef() {
        this.stream.next(); // Skip '(';
        const condition = this.expression(this.parse());
        this.stream.next(); // Skip '{'
        const trees = [];
        while (this.stream.peak().value != "}") {
            trees.push(this.parse());
        }
        return {
            type: AST.NodeType.while,
            condition: condition,
            inside: trees.filter(node => node != null),
        };
    }
    handleIfDef() {
        this.stream.next(); // Skip '(';
        const condition = this.expression(this.parse());
        this.stream.next(); // Skip '{'
        const trees = [];
        while (this.stream.peak().value != "}") {
            trees.push(this.parse());
        }
        return {
            type: AST.NodeType.if,
            condition: condition,
            inside: trees.filter(node => node != null),
        };
    }
    handleVarDef() {
        const type = this.stream.next().value.toString();
        const name = this.stream.next().value;
        const nxt = this.stream.next(); // Get equal or bracket
        if (nxt.value == "[") {
            const len = parseInt(this.stream.next().value.toString());
            return {
                type: AST.NodeType.varDeclare,
                valType: type,
                length: len,
                name: name.toString(),
                isArray: true
            };
        }
        else {
            return {
                type: AST.NodeType.varDeclare,
                name: name.toString(),
                value: this.expression(this.parse()),
                valType: type,
                isArray: false
            };
        }
    }
    handleFuncDef() {
        const name = this.stream.next().value.toString();
        this.stream.next(); // Open parenth
        const args = [];
        while (this.stream.peak().value != ")") {
            const type = this.stream.next().value.toString();
            const name = this.stream.next().value.toString();
            const isArray = this.stream.peak().value.toString() == "[";
            if (isArray) {
                this.stream.next(); // Opening [
                const len = parseInt(this.stream.next().value.toString());
                this.stream.next(); // Closing ]
                args.push({
                    type: AST.NodeType.varDeclare,
                    name: name,
                    valType: type,
                    isArray: true,
                    length: len
                });
            }
            else {
                args.push({
                    type: AST.NodeType.varDeclare,
                    name: name,
                    valType: type,
                    isArray: false,
                    value: { type: AST.NodeType.value, value: 0 }
                });
            }
            const nxt = this.stream.next(); // Skip comma
            if (nxt.value == ")")
                break;
        }
        this.stream.next(); // Close parenth
        this.stream.next(); // Open braket
        const trees = [];
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
    handleFuncRef(ref) {
        this.stream.next();
        const args = [];
        while (this.stream.peak() && this.stream.peak().value != ")") {
            const val = this.parse();
            if (this.stream.peak().value == ")") {
                args.push(val);
                this.stream.next();
                break;
            }
            else {
                args.push(this.expression(val));
            }
            const nxt = this.stream.next(); // Comma 
            if (nxt.value == ")" || nxt.type == TokenType.break)
                break;
        }
        return {
            type: AST.NodeType.functionRef,
            name: ref.value.toString(),
            args: args
        };
    }
    handleArrRef(token) {
        var _a, _b, _c;
        this.stream.next();
        const idx = this.expression(this.parse());
        this.stream.next();
        let path = [];
        while (((_a = this.stream.peak()) === null || _a === void 0 ? void 0 : _a.value) == ".") {
            this.stream.next(); // Skip .
            path.push(this.stream.next().value.toString());
        }
        if (path.length == 0)
            path = ["_prime"];
        const nxt = (_c = (_b = this.stream.peak()) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c.toString();
        if (nxt == "=") {
            this.stream.next();
            return {
                type: AST.NodeType.assign,
                varName: token.value.toString(),
                idx: idx,
                value: this.expression(this.parse()),
                path: path
            };
        }
        return {
            type: AST.NodeType.varRefrence,
            name: token.value.toString(),
            idx: idx,
            path: path
        };
    }
    handleName(token) {
        var _a, _b, _c;
        // Path only applicable to vars, but if it exists we need to grab it
        let path = [];
        while (((_a = this.stream.peak()) === null || _a === void 0 ? void 0 : _a.value) == ".") {
            this.stream.next(); // Skip .
            path.push(this.stream.next().value.toString());
        }
        if (path.length == 0)
            path = ["_prime"];
        const next = (_c = (_b = this.stream.peak()) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c.toString();
        switch (next) {
            case "=":
                this.stream.next();
                return {
                    type: AST.NodeType.assign,
                    varName: token.value.toString(),
                    value: this.expression(this.parse()),
                    path: path
                };
            case "(": return this.handleFuncRef(token);
            case "[": return this.handleArrRef(token);
            default:
                return { type: AST.NodeType.varRefrence, name: token.value.toString(), path: path };
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
        // We are "parsing" the ) by dropping out of this expression
        // need to make sure that the expression one up is not poluted
        // by reparsing the parenth
        if (token == ")")
            this.stream.next();
        return left;
    }
}
export { Parser };
