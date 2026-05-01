/**
 * JuiceParticle: a small cosmetic particle emitted when a fruit is sliced.
 * Each particle has its own velocity, color, size, and lifetime.
 * These are purely visual and do not interact with the physics simulation.
 */
export class JuiceParticle {
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public life: number = 1;
    public decay: number;
    public size: number;
    public color: string;

    constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.color = color;

        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 3;
        this.decay = 0.015 + Math.random() * 0.02;
        this.size = 3 + Math.random() * 5;
    }

    update(): void {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // gravity on particles
        this.life -= this.decay;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    get dead(): boolean {
        return this.life <= 0;
    }
}
