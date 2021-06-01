class Stream<T> {
	source: T[];
	idx: number;
	constructor(input: T[]) {
		this.source = input;
		this.idx = -1;
	}
	cur() { // Get value without incrementing 
		return this.source[this.idx];
	}
	next() { // Get value and increment
		return this.source[++this.idx];
	}
	peak() { // Get next value
		return this.source[this.idx + 1];
	}
	end() { // Check if reached end of stream
		return this.idx >= this.source.length - 1;
	}
	prev() {
		return this.source[this.idx - 1]
	}
}
export { Stream };