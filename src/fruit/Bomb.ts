import { Particle } from "../physics/Particle";
import { Spring } from "../physics/Spring";
import { Vector2 } from "../math/Vector2";

export class Bomb {
    public particles: Particle[] = [];
    public springs: Spring[] = [];
    public center: Particle;
    public alive = true;
    public sliced = false;
    public missed = false;
    public readonly radius = 30;

    constructor(cx: number, cy: number, vx: number, vy: number) {
        const segments = 10;
        const stiffness = 0.6;

        this.center = new Particle(cx, cy);
        this.particles.push(this.center);

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            this.particles.push(new Particle(
                cx + Math.cos(angle) * this.radius,
                cy + Math.sin(angle) * this.radius,
            ));
        }

        for (let i = 0; i < segments; i++) {
            const cur = 1 + i;
            const nxt = 1 + ((i + 1) % segments);
            this.springs.push(new Spring(this.particles[cur], this.particles[nxt], stiffness));
            this.springs.push(new Spring(this.particles[cur], this.center, stiffness));
        }

        for (const p of this.particles) {
            p.oldPos.x = p.pos.x - vx;
            p.oldPos.y = p.pos.y - vy;
        }
    }

    getCenterPos(): Vector2 {
        let sx = 0, sy = 0;
        for (const p of this.particles) { sx += p.pos.x; sy += p.pos.y; }
        return new Vector2(sx / this.particles.length, sy / this.particles.length);
    }

    update(gravity: Vector2, friction: number): void {
        for (const p of this.particles) {
            if (p.pinned) continue;
            const vx = (p.pos.x - p.oldPos.x) * friction;
            const vy = (p.pos.y - p.oldPos.y) * friction;
            p.oldPos.x = p.pos.x;
            p.oldPos.y = p.pos.y;
            p.pos.x += vx + gravity.x;
            p.pos.y += vy + gravity.y;
        }
        for (let i = 0; i < 4; i++) {
            for (const s of this.springs) s.resolve();
        }
    }

    checkSlice(start: Vector2, end: Vector2): boolean {
        for (const s of this.springs) {
            if (Vector2.lineIntersect(start, end, s.p1.pos, s.p2.pos)) {
                this.sliced = true;
                return true;
            }
        }
        return false;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const center = this.getCenterPos();
        const r = this.radius;
        const perimeter = this.particles.slice(1);

        ctx.save();

        const bodyGrad = ctx.createRadialGradient(
            center.x - r * 0.2, center.y - r * 0.25, r * 0.05,
            center.x, center.y, r * 1.05,
        );
        bodyGrad.addColorStop(0, '#4a4a4a');
        bodyGrad.addColorStop(0.6, '#2a2a2a');
        bodyGrad.addColorStop(1, '#111111');

        ctx.beginPath();
        if (perimeter.length >= 3) {
            const n = perimeter.length;
            for (let i = 0; i < n; i++) {
                const p0 = perimeter[(i - 1 + n) % n].pos;
                const p1 = perimeter[i].pos;
                const p2 = perimeter[(i + 1) % n].pos;
                const p3 = perimeter[(i + 2) % n].pos;
                if (i === 0) ctx.moveTo(p1.x, p1.y);
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            }
        }
        ctx.closePath();
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        ctx.beginPath();
        const hlX = center.x - r * 0.25;
        const hlY = center.y - r * 0.3;
        const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, r * 0.45);
        hlGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
        hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hlGrad;
        ctx.arc(hlX, hlY, r * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const sz = r * 0.3;
        ctx.beginPath();
        ctx.moveTo(center.x - sz, center.y - sz);
        ctx.lineTo(center.x + sz, center.y + sz);
        ctx.moveTo(center.x + sz, center.y - sz);
        ctx.lineTo(center.x - sz, center.y + sz);
        ctx.stroke();

        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y - r * 0.9);
        ctx.quadraticCurveTo(center.x + 6, center.y - r * 1.3, center.x + 2, center.y - r * 1.4);
        ctx.stroke();

        const t = Date.now() * 0.008;
        const sparkAlpha = 0.5 + Math.sin(t) * 0.5;
        ctx.beginPath();
        ctx.arc(center.x + 2, center.y - r * 1.4, 4, 0, Math.PI * 2);
        const sparkGrad = ctx.createRadialGradient(
            center.x + 2, center.y - r * 1.4, 0,
            center.x + 2, center.y - r * 1.4, 5,
        );
        sparkGrad.addColorStop(0, `rgba(255,200,50,${sparkAlpha})`);
        sparkGrad.addColorStop(0.5, `rgba(255,100,20,${sparkAlpha * 0.6})`);
        sparkGrad.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = sparkGrad;
        ctx.fill();

        ctx.restore();
    }
}
