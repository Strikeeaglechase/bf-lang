enum ItemType {
	point = 1
}
interface Item {
	x: number;
	y: number;
	arg0: number;
	arg1: number;
	color: number;
	type: ItemType;
}
class Display {
	ctx: CanvasRenderingContext2D;
	items: Item[] = [];
	colors: { r: number, g: number, b: number }[] = [
		{ r: 0, g: 0, b: 0 },
		{ r: 255, g: 255, b: 255 },
		{ r: 255, g: 0, b: 0 },
		{ r: 0, g: 255, b: 0 },
		{ r: 0, g: 0, b: 255 },
	];
	constructor(ctx: CanvasRenderingContext2D) {
		this.ctx = ctx;
	}
	add(type: ItemType, x: number, y: number, arg0: number, arg1: number, color: number) {
		this.items.push({ type, x, y, arg0, arg1, color });
	}
	draw(x: number, y: number, w: number, h: number) {
		this.ctx.strokeStyle = `rgb(255,0,0)`;
		this.ctx.fillStyle = `rgb(0,0,0)`;
		this.ctx.fillRect(x, y, w, h);
		this.ctx.strokeRect(x, y, w, h);
		this.items.forEach(item => {
			const color = this.colors[item.color];
			this.ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
			switch (item.type) {
				case ItemType.point: this.ctx.fillRect(item.x + x, item.y + y, 1, 1); break;
			}
		});
	}
	clear() {
		this.items = [];
	}
}

export { Display }