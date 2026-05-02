export class SplashMark {
    public life = 1;
    private decay: number;
    private blobs: { dx: number; dy: number; rx: number; ry: number; rot: number }[];

    constructor(
        public x: number,
        public y: number,
        public color: string,
        public radius: number,
    ) {
        this.decay = 0.004 + Math.random() * 0.003;

        const count = 4 + Math.floor(Math.random() * 4);
        this.blobs = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            this.blobs.push({
                dx: Math.cos(angle) * dist,
                dy: Math.sin(angle) * dist,
                rx: radius * (0.3 + Math.random() * 0.5),
                ry: radius * (0.15 + Math.random() * 0.3),
                rot: Math.random() * Math.PI,
            });
        }
    }

    update(): void {
        this.life -= this.decay;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = this.life * 0.45;
        ctx.fillStyle = this.color;
        for (const b of this.blobs) {
            ctx.beginPath();
            ctx.ellipse(this.x + b.dx, this.y + b.dy, b.rx, b.ry, b.rot, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    get dead(): boolean {
        return this.life <= 0;
    }
}
