class Stream {
    constructor(input) {
        this.source = input;
        this.idx = -1;
    }
    cur() {
        return this.source[this.idx];
    }
    next() {
        return this.source[++this.idx];
    }
    peak() {
        return this.source[this.idx + 1];
    }
    end() {
        return this.idx >= this.source.length - 1;
    }
    prev() {
        return this.source[this.idx - 1];
    }
}
export { Stream };
