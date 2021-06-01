import { Compiler } from "./compiler.js";
import fs from "fs";
import { Parser } from "./parser/parser.js";
import { Tokenizer } from "./parser/tokenizer.js";
const code = `
let x = 5 * ((4 + 3) * 2)
`;
const toks = new Tokenizer(code).parse();
const ast = new Parser(toks).startParse();
fs.writeFileSync("../out.json", JSON.stringify(ast));
const compiler = new Compiler(ast);
const bf = compiler.compile();
console.log(bf);
