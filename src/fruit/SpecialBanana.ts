import { Particle } from "../physics/Particle";
import { Spring } from "../physics/Spring";
import { Vector2 } from "../math/Vector2";

export type BananaType = 'frenzy' | 'freeze' | 'double';

interface BananaConfig {
    color: string;
    innerColor: string;
    auraColor: string;
    label: string;
}

const BANANA_CONFIGS: Record<BananaType, BananaConfig> = {
    frenzy: {
        color: '#3366ff',
        innerColor: '#88bbff',
        auraColor: 'rgba(50,100,255,0.25)',
        label: 'FRENZY!',
    },
    freeze: {
        color: '#66ddff',
        innerColor: '#ccf4ff',
        auraColor: 'rgba(100,220,255,0.25)',
        label: 'TIME FREEZE!',
    },
    double: {
        color: '#44ff44',
        innerColor: '#bbffbb',
        auraColor: 'rgba(70,255,70,0.25)',
        label: 'DOUBLE POINTS!',
    },
};

export class SpecialBanana {
    public particles: Particle[] = [];
    public springs: Spring[] = [];
    public center: Particle;
    public alive = true;
    public sliced = false;
    public bananaType: BananaType;
    public config: BananaConfig;
    public readonly radius = 55;

    constructor(type: BananaType, cx: number, cy: number, vx: number, vy: number) {
        this.bananaType = type;
        this.config = BANANA_CONFIGS[type];

        const stiffness = 0.5;
        const segments = 14;

        this.center = new Particle(cx, cy);
        this.particles.push(this.center);

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const rx = 55;
            const ry = 26;
            const curveOffset = Math.sin(angle) * 12;
            const px = cx + Math.cos(angle) * rx;
            const py = cy + Math.sin(angle) * ry + curveOffset;
            this.particles.push(new Particle(px, py));
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
        const center = this.getCenterPos();
        const d = this.pointToSegDist(center, start, end);
        if (d < this.radius * 0.85) {
            this.sliced = true;
            return true;
        }
        return false;
    }

    private pointToSegDist(p: Vector2, a: Vector2, b: Vector2): number {
        const abx = b.x - a.x, aby = b.y - a.y;
        const apx = p.x - a.x, apy = p.y - a.y;
        const ab2 = abx * abx + aby * aby;
        if (ab2 === 0) return Math.hypot(apx, apy);
        let t = (apx * abx + apy * aby) / ab2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const center = this.getCenterPos();
        const cfg = this.config;
        const perimeter = this.particles.slice(1);
        const t = Date.now() * 0.004;

        ctx.save();

        const auraPulse = 0.7 + Math.sin(t) * 0.3;
        const auraR = this.radius * (1.6 + Math.sin(t * 1.3) * 0.2);
        const auraGrad = ctx.createRadialGradient(
            center.x, center.y, 0,
            center.x, center.y, auraR,
        );
        auraGrad.addColorStop(0, cfg.auraColor);
        auraGrad.addColorStop(1, 'transparent');
        ctx.globalAlpha = auraPulse;
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(center.x, center.y, auraR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (perimeter.length >= 3) {
            ctx.beginPath();
            const n = perimeter.length;
            for (let i = 0; i < n; i++) {
                const p0 = perimeter[(i - 1 + n) % n].pos;
                const p1 = perimeter[i].pos;
                const p2 = perimeter[(i + 1) % n].pos;
                const p3 = perimeter[(i + 2) % n].pos;
                if (i === 0) ctx.moveTo(p1.x, p1.y);
                ctx.bezierCurveTo(
                    p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
                    p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
                    p2.x, p2.y,
                );
            }
            ctx.closePath();

            const bodyGrad = ctx.createRadialGradient(
                center.x - 8, center.y - 5, 2,
                center.x, center.y, this.radius * 1.1,
            );
            bodyGrad.addColorStop(0, cfg.innerColor);
            bodyGrad.addColorStop(0.6, cfg.color);
            bodyGrad.addColorStop(1, cfg.color);
            ctx.fillStyle = bodyGrad;
            ctx.fill();

            ctx.strokeStyle = cfg.innerColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        const hlX = center.x - 10;
        const hlY = center.y - 6;
        const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, 14);
        hlGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
        hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hlGrad;
        ctx.beginPath();
        ctx.arc(hlX, hlY, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.85;
        if (this.bananaType === 'frenzy') {
            ctx.fillText('🍌', center.x, center.y);
        } else if (this.bananaType === 'freeze') {
            ctx.fillText('❄', center.x, center.y);
        } else {
            ctx.fillText('×2', center.x, center.y);
        }
        ctx.globalAlpha = 1;

        ctx.restore();
    }
}
