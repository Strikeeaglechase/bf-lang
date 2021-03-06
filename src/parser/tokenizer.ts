import { Stream } from "./stream.js";
// enum TokenType {
// 	value,
// 	punctuation,
// 	keyword,
// 	name,
// 	break
// }
enum TokenType {
	value = "value",
	punctuation = "punctuation",
	keyword = "keyword",
	name = "name",
	break = "break"
}
interface Token {
	type: TokenType,
	value: string | number;
	index: number;
}
const filterChars = ["\t", "\r"];
const puncToks = ["<", ">", "=", "==", "!=", "<=", "=>", "(", ")", "{", "}", "&&", "||", "+", "-", "*", ",", "[", "]", "."];
const keywords = ["if", "let", "func", "ret", "while", "break", "type"];
class Tokenizer {
	stream: Stream<string>;
	constructor(input: string) {
		this.stream = new Stream(input.split("").filter(c => !filterChars.includes(c)));
	}
	parse(): Stream<Token> {
		const tokens: Token[] = [];
		while (!this.stream.end()) {
			const char = this.stream.next();
			const punctuation = this.getPunc();
			if (char == "/" && this.stream.peak() == "/") {
				while (!this.stream.end() && this.stream.next() != "\n");
			} else if (punctuation) {
				tokens.push({ type: TokenType.punctuation, value: punctuation, index: this.stream.idx });
			} else if (char == "\n") {
				tokens.push({ type: TokenType.break, value: null, index: this.stream.idx });
			} else if (!isNaN(parseInt(char))) {
				// Have start of number, get the rest of it and push token
				tokens.push({ type: TokenType.value, value: this.getNumber(), index: this.stream.idx });
			} else if (char != " ") {
				// Char is keyword?
				let word = char;
				while (
					!puncToks.some(pt => pt[0] == this.stream.peak()) &&
					this.stream.peak() != " " &&
					this.stream.peak() != "\n" &&
					!this.stream.end()
				) {
					word += this.stream.next();
				}
				if (keywords.some(kw => kw == word)) {
					tokens.push({ type: TokenType.keyword, value: word, index: this.stream.idx });
				} else {
					tokens.push({ type: TokenType.name, value: word, index: this.stream.idx });
				}
			}
		}
		return new Stream<Token>(tokens);
	}
	getPunc(): string {
		const char = this.stream.cur();
		// For the one character punctuation
		// Check two char punctuations
		const punc = char + this.stream.peak();
		const hasMatch = puncToks.includes(punc);
		if (hasMatch) {
			this.stream.next();
			return punc;
		}
		const hasExactMatch = puncToks.includes(char);
		if (hasExactMatch) {
			return char;
		}
	}
	getString(): string {
		let str = "";
		while (!this.stream.end()) {
			const next = this.stream.next();
			if (next == "\"") break;
			str += next;
		}
		return str;
	}
	getNumber(): number {
		let numStr = this.stream.cur();
		while (!this.stream.end()) {
			const nextVal = this.stream.peak();
			if (isNaN(parseInt(nextVal))) break;
			numStr += this.stream.next();
		}
		return parseInt(numStr);
	}
}
export { Tokenizer, Token, TokenType, puncToks, keywords };
