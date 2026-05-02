export class BladeTrail {
    private points: { x: number; y: number; age: number }[] = [];
    private maxAge = 8;

    add(x: number, y: number): void {
        this.points.push({ x, y, age: 0 });
    }

    update(): void {
        for (const p of this.points) p.age++;
        this.points = this.points.filter(p => p.age < this.maxAge);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.points.length < 2) return;

        for (let i = 1; i < this.points.length; i++) {
            const p0 = this.points[i - 1];
            const p1 = this.points[i];
            const alpha = 1 - p1.age / this.maxAge;
            const width = alpha * 5 + 1;

            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();

            ctx.strokeStyle = `rgba(200,220,255,${alpha * 0.3})`;
            ctx.lineWidth = width + 6;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        }
    }
}
