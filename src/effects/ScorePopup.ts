/**
 * ScorePopup: a floating "+N" text that drifts upward and fades out
 * at the point where a fruit was sliced.
 */
export class ScorePopup {
    public life: number = 1;
    private decay: number = 0.02;

    constructor(
        public x: number,
        public y: number,
        public text: string,
        public color: string,
    ) {}

    update(): void {
        this.y -= 1.5;
        this.life -= this.decay;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${24 + (1 - this.life) * 12}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }

    get dead(): boolean {
        return this.life <= 0;
    }
}
