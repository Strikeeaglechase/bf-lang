var ItemType;
(function (ItemType) {
    ItemType[ItemType["point"] = 1] = "point";
})(ItemType || (ItemType = {}));
class Display {
    constructor(ctx) {
        this.items = [];
        this.colors = [
            { r: 0, g: 0, b: 0 },
            { r: 255, g: 255, b: 255 },
            { r: 255, g: 0, b: 0 },
            { r: 0, g: 255, b: 0 },
            { r: 0, g: 0, b: 255 },
        ];
        this.ctx = ctx;
    }
    add(type, x, y, arg0, arg1, color) {
        this.items.push({ type, x, y, arg0, arg1, color });
    }
    draw(x, y, w, h) {
        this.ctx.strokeStyle = `rgb(255,0,0)`;
        this.ctx.fillStyle = `rgb(0,0,0)`;
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeRect(x, y, w, h);
        this.items.forEach(item => {
            const color = this.colors[item.color];
            this.ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
            switch (item.type) {
                case ItemType.point:
                    this.ctx.fillRect(item.x + x, item.y + y, 1, 1);
                    break;
            }
        });
    }
    clear() {
        this.items = [];
    }
}
export { Display };
