import { Compiler } from "./compiler.js";
import fs from "fs";
import { Parser } from "./parser/parser.js";
import { Tokenizer } from "./parser/tokenizer.js";
const code = `
let x = 3
let y = 5
let z = x * y
`;
const toks = new Tokenizer(code).parse();
const ast = new Parser(toks).startParse();
fs.writeFileSync("../out.json", JSON.stringify(ast));
const compiler = new Compiler(ast);
const bf = compiler.compile();
console.log(`BF: `);
console.log(bf);
fs.writeFileSync("./meta.js", `export const meta = '${JSON.stringify(compiler.exportMeta())}'`);
// console.log(`Optimized BF: `);
// console.log(optimize(bf).join(""));
