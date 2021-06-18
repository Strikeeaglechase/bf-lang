import { Compiler } from "./compiler.js";
import fs from "fs";
import { Parser } from "./parser/parser.js";
import { Tokenizer } from "./parser/tokenizer.js";
const code = fs.readFileSync(`${process.cwd()}/../prog.txt`, "utf-8");
const toks = new Tokenizer(code).parse();
const ast = new Parser(toks).startParse();
fs.writeFileSync(`../out.json`, JSON.stringify(ast));
const compiler = new Compiler(ast);
try {
    const bf = compiler.compile();
    console.log(`BF: `);
    console.log(bf);
    fs.writeFileSync("./meta.js", `export const meta = '${JSON.stringify(compiler.exportMeta())}'`);
}
catch (e) {
    console.error(e);
}
// console.log(`Optimized BF: `);
// console.log(optimize(bf).join(""));
