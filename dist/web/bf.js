const toOptimize = [">", "<"];
function optimize(str) {
    const ops = str.split("");
    const out = [];
    let cur = null;
    let count = 0;
    for (let i = 0; i < ops.length; i++) {
        if (toOptimize.includes(ops[i])) {
            if (ops[i] == cur) {
                count++;
            }
            else {
                if (cur)
                    out.push(cur + count);
                count = 1;
                cur = ops[i];
            }
        }
        else {
            if (cur)
                out.push(cur + count);
            out.push(ops[i]);
            cur = null;
            count = 0;
        }
    }
    return out;
}
class Brainfuck {
    constructor(src) {
        this.mem = new Array(Math.pow(2, 16)).fill(0);
        this.ptr = 0;
        this.idx = 0;
        this.log = "";
        this.ops = src.split("");
    }
    execute(idxBack) {
        while (this.idx < this.ops.length) {
            const op = this.ops[this.idx++];
            switch (op) {
                case "+":
                    this.mem[this.ptr]++;
                    break;
                case "-":
                    this.mem[this.ptr]--;
                    break;
                case ">":
                    this.ptr++;
                    break;
                case "<":
                    this.ptr--;
                    break;
                case ".":
                    this.log += String.fromCharCode(this.mem[this.ptr]);
                    if (this.mem[this.ptr] == 13) {
                        console.log(this.log);
                        this.log = "";
                    }
                    break;
                case "[":
                    if (this.mem[this.ptr] > 0)
                        this.execute(this.idx - 1);
                    else
                        this.branchPast();
                    break;
                case "]":
                    this.idx = idxBack;
                    return;
            }
        }
    }
    branchPast() {
        let d = 1;
        while (d != 0)
            this.ops[this.idx++] == "[" ? d++ : this.ops[this.idx - 1] == "]" ? d-- : null;
    }
}
// const bf = new Brainfuck("+[>+++[>+++<-]]");
// bf.execute();
// console.log(bf.mem);
export { optimize };
