import fs from "fs";
import { Parser } from "./parser.js";
import { Tokenizer } from "./tokenizer.js";
const code = `
let x = 5
let y = 3 + 3
`;
const toks = new Tokenizer(code).parse();
const ast = new Parser(toks).startParse();
fs.writeFileSync("../out.json", JSON.stringify(ast));
