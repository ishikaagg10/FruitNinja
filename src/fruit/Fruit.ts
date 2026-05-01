import { Particle } from "../physics/Particle";
import { Spring } from "../physics/Spring";
import { Vector2 } from "../math/Vector2";
import type { FruitType } from "./FruitType";

/**
 * A Fruit is a circular soft-body object built from a ring of perimeter
 * particles connected by springs to each other and to a central particle.
 *
 * Slicing works by detecting line-segment intersections between the swipe
 * and every spring; intersected springs are removed, causing the soft body
 * to fracture. This is a simplified form of peridynamics-style fracture:
 * bonds (springs) that are "cut" by an external force are permanently
 * destroyed, and the remaining connected components drift apart under
 * gravity.
 */
export class Fruit {
    public particles: Particle[] = [];
    public springs: Spring[] = [];
    public center: Particle;
    public sliced = false;
    public alive = true;
    public scored = false;
    public missed = false;
    public initialSpringCount: number;

    constructor(
        public type: FruitType,
        cx: number,
        cy: number,
        vx: number,
        vy: number,
    ) {
        const { radius, segments } = type;
        const stiffness = 0.5;

        // Center particle
        this.center = new Particle(cx, cy);
        this.particles.push(this.center);

        // Perimeter particles arranged in a circle
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            this.particles.push(new Particle(px, py));
        }

        // Springs: perimeter ring + spoke springs to center
        for (let i = 0; i < segments; i++) {
            const cur = 1 + i;
            const nxt = 1 + ((i + 1) % segments);
            this.springs.push(new Spring(this.particles[cur], this.particles[nxt], stiffness));
            this.springs.push(new Spring(this.particles[cur], this.center, stiffness));
        }
        this.initialSpringCount = this.springs.length;

        // Apply initial velocity using Verlet integration:
        // velocity = pos - oldPos, so oldPos = pos - velocity
        for (const p of this.particles) {
            p.oldPos.x = p.pos.x - vx;
            p.oldPos.y = p.pos.y - vy;
        }
    }

    /** Average position of all particles (approximate center of mass). */
    getCenterPos(): Vector2 {
        let sx = 0, sy = 0;
        for (const p of this.particles) {
            sx += p.pos.x;
            sy += p.pos.y;
        }
        return new Vector2(sx / this.particles.length, sy / this.particles.length);
    }

    /** Verlet integration step + spring constraint solving. */
    update(gravity: Vector2, friction: number): void {
        // Verlet integration
        for (const p of this.particles) {
            if (p.pinned) continue;
            const vx = (p.pos.x - p.oldPos.x) * friction;
            const vy = (p.pos.y - p.oldPos.y) * friction;
            p.oldPos.x = p.pos.x;
            p.oldPos.y = p.pos.y;
            p.pos.x += vx + gravity.x;
            p.pos.y += vy + gravity.y;
        }

        // Iterative constraint solving (Gauss-Seidel)
        for (let i = 0; i < 4; i++) {
            for (const s of this.springs) s.resolve();
        }
    }

    /**
     * Attempt to slice this fruit along the line segment (start → end).
     * Any spring whose endpoints straddle the swipe line is destroyed.
     * Returns true if at least one spring was cut.
     */
    slice(start: Vector2, end: Vector2): boolean {
        let cut = false;
        for (let i = this.springs.length - 1; i >= 0; i--) {
            const s = this.springs[i];
            if (Vector2.lineIntersect(start, end, s.p1.pos, s.p2.pos)) {
                this.springs.splice(i, 1);
                cut = true;
            }
        }

        if (cut && !this.sliced) {
            this.sliced = true;
            // Push the two halves apart along the swipe normal
            const mid = this.getCenterPos();
            const dir = end.sub(start);
            const len = dir.mag() || 1;
            const nx = -dir.y / len;
            const ny = dir.x / len;
            for (const p of this.particles) {
                const side = (p.pos.x - mid.x) * nx + (p.pos.y - mid.y) * ny;
                const push = side > 0 ? 1 : -1;
                p.pos.x += nx * push * 3;
                p.pos.y += ny * push * 3;
            }
        }

        return cut;
    }

    /** Draw the fruit onto a canvas context. */
    draw(ctx: CanvasRenderingContext2D): void {
        const type = this.type;
        const center = this.getCenterPos();
        const r = type.radius;

        if (!this.sliced) {
            this.drawWhole(ctx, center, r);
        } else {
            this.drawSliced(ctx, center, r);
        }
    }

    /** Draw an intact fruit with skin gradient, highlight, shadow, and per-fruit details. */
    private drawWhole(ctx: CanvasRenderingContext2D, center: Vector2, r: number): void {
        const type = this.type;
        const perimeter = this.particles.slice(1);
        if (perimeter.length === 0) return;

        ctx.save();

        // ── Drop shadow ──
        ctx.beginPath();
        this.traceSmoothOutline(ctx, perimeter);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.filter = 'blur(6px)';
        ctx.save();
        ctx.translate(3, 5);
        ctx.fill();
        ctx.restore();
        ctx.filter = 'none';

        // ── Skin fill with radial gradient ──
        ctx.beginPath();
        this.traceSmoothOutline(ctx, perimeter);
        ctx.closePath();

        const skinGrad = ctx.createRadialGradient(
            center.x - r * 0.25, center.y - r * 0.3, r * 0.1,
            center.x, center.y, r * 1.05,
        );
        skinGrad.addColorStop(0, type.color);
        skinGrad.addColorStop(0.7, type.color);
        skinGrad.addColorStop(1, type.colorDark);
        ctx.fillStyle = skinGrad;
        ctx.fill();

        // ── Per-fruit texture details ──
        ctx.save();
        ctx.beginPath();
        this.traceSmoothOutline(ctx, perimeter);
        ctx.closePath();
        ctx.clip();

        if (type.name === 'watermelon') {
            // Dark green stripes
            ctx.strokeStyle = 'rgba(20, 100, 30, 0.35)';
            ctx.lineWidth = 4;
            for (let i = -3; i <= 3; i++) {
                ctx.beginPath();
                const offset = i * r * 0.28;
                ctx.moveTo(center.x + offset, center.y - r * 1.2);
                // Slight curve for organic feel
                ctx.quadraticCurveTo(
                    center.x + offset + 4, center.y,
                    center.x + offset - 2, center.y + r * 1.2,
                );
                ctx.stroke();
            }
        } else if (type.name === 'orange') {
            // Dimpled texture
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2 + (i % 3) * 0.5;
                const dist = r * (0.3 + Math.random() * 0.55);
                const dx = center.x + Math.cos(angle) * dist;
                const dy = center.y + Math.sin(angle) * dist;
                ctx.beginPath();
                ctx.arc(dx, dy, 1.5 + Math.random(), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type.name === 'apple') {
            // Red-to-yellow gradient blush
            const blush = ctx.createRadialGradient(
                center.x + r * 0.3, center.y + r * 0.4, 0,
                center.x + r * 0.3, center.y + r * 0.4, r * 0.8,
            );
            blush.addColorStop(0, 'rgba(200, 180, 30, 0.3)');
            blush.addColorStop(1, 'rgba(200, 180, 30, 0)');
            ctx.fillStyle = blush;
            ctx.fillRect(center.x - r, center.y - r, r * 2, r * 2);
        } else if (type.name === 'kiwi') {
            // Fuzzy texture dots
            ctx.fillStyle = 'rgba(160, 120, 70, 0.2)';
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * r * 0.9;
                ctx.beginPath();
                ctx.arc(
                    center.x + Math.cos(angle) * dist,
                    center.y + Math.sin(angle) * dist,
                    0.8 + Math.random() * 0.8, 0, Math.PI * 2,
                );
                ctx.fill();
            }
        } else if (type.name === 'grape') {
            // Subtle secondary sphere for 3D cluster look
            const grape2 = ctx.createRadialGradient(
                center.x + r * 0.2, center.y - r * 0.15, r * 0.05,
                center.x + r * 0.2, center.y - r * 0.15, r * 0.6,
            );
            grape2.addColorStop(0, 'rgba(180, 100, 210, 0.35)');
            grape2.addColorStop(1, 'rgba(180, 100, 210, 0)');
            ctx.fillStyle = grape2;
            ctx.fillRect(center.x - r, center.y - r, r * 2, r * 2);
        }
        ctx.restore();

        // ── Specular highlight (top-left) ──
        ctx.beginPath();
        const hlX = center.x - r * 0.28;
        const hlY = center.y - r * 0.32;
        const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, r * 0.55);
        hlGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
        hlGrad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
        hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hlGrad;
        ctx.arc(hlX, hlY, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // ── Rim light (bottom edge) ──
        ctx.beginPath();
        const rimGrad = ctx.createRadialGradient(
            center.x, center.y + r * 0.6, 0,
            center.x, center.y + r * 0.6, r * 0.6,
        );
        rimGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
        rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rimGrad;
        ctx.arc(center.x, center.y + r * 0.6, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // ── Stem for apple/lemon/orange ──
        if (type.name === 'apple' || type.name === 'orange' || type.name === 'lemon') {
            ctx.strokeStyle = '#5c3a1e';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(center.x, center.y - r * 0.85);
            ctx.quadraticCurveTo(center.x + 3, center.y - r * 1.15, center.x + 1, center.y - r * 1.2);
            ctx.stroke();

            // Leaf for apple
            if (type.name === 'apple') {
                ctx.fillStyle = '#3a8c2a';
                ctx.beginPath();
                ctx.ellipse(center.x + 6, center.y - r * 1.05, 7, 4, 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /** Draw a sliced fruit showing cross-section with flesh, rind, seeds. */
    private drawSliced(ctx: CanvasRenderingContext2D, center: Vector2, r: number): void {
        const type = this.type;

        ctx.save();

        // Draw each remaining spring segment as a thick rind-colored line
        ctx.strokeStyle = type.colorDark;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (const s of this.springs) {
            ctx.beginPath();
            ctx.moveTo(s.p1.pos.x, s.p1.pos.y);
            ctx.lineTo(s.p2.pos.x, s.p2.pos.y);
            ctx.stroke();
        }

        // Draw each particle as a fleshy node with inner gradient
        for (const p of this.particles) {
            const nodeR = p === this.center ? 6 : 4;
            const grad = ctx.createRadialGradient(
                p.pos.x - 1, p.pos.y - 1, 0,
                p.pos.x, p.pos.y, nodeR,
            );
            grad.addColorStop(0, type.innerLight);
            grad.addColorStop(1, type.innerColor);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, nodeR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Seeds near center for watermelon/apple/kiwi/orange/lemon
        if (type.name === 'watermelon' || type.name === 'apple' ||
            type.name === 'kiwi' || type.name === 'orange' || type.name === 'lemon') {
            ctx.fillStyle = type.seedColor;
            const seedCount = type.name === 'watermelon' ? 6 :
                              type.name === 'kiwi' ? 10 : 3;
            const seedDist = type.name === 'kiwi' ? r * 0.25 : r * 0.35;
            const seedSize = type.name === 'kiwi' ? 1.2 : 2.5;
            for (let i = 0; i < seedCount; i++) {
                const angle = (i / seedCount) * Math.PI * 2 + 0.3;
                const sx = this.center.pos.x + Math.cos(angle) * seedDist;
                const sy = this.center.pos.y + Math.sin(angle) * seedDist;
                ctx.beginPath();
                ctx.ellipse(sx, sy, seedSize, seedSize * 0.6, angle, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Juice drip effect from center
        ctx.globalAlpha = 0.3;
        const dripGrad = ctx.createRadialGradient(
            this.center.pos.x, this.center.pos.y, 0,
            this.center.pos.x, this.center.pos.y, r * 0.5,
        );
        dripGrad.addColorStop(0, type.innerColor);
        dripGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = dripGrad;
        ctx.beginPath();
        ctx.arc(this.center.pos.x, this.center.pos.y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    /**
     * Trace a smooth curve through the perimeter particles using
     * Catmull-Rom → cubic Bezier conversion for organic shapes.
     */
    private traceSmoothOutline(ctx: CanvasRenderingContext2D, perimeter: Particle[]): void {
        const n = perimeter.length;
        if (n < 3) {
            ctx.moveTo(perimeter[0].pos.x, perimeter[0].pos.y);
            for (let i = 1; i < n; i++) ctx.lineTo(perimeter[i].pos.x, perimeter[i].pos.y);
            return;
        }

        // Catmull-Rom spline through closed loop
        for (let i = 0; i < n; i++) {
            const p0 = perimeter[(i - 1 + n) % n].pos;
            const p1 = perimeter[i].pos;
            const p2 = perimeter[(i + 1) % n].pos;
            const p3 = perimeter[(i + 2) % n].pos;

            if (i === 0) ctx.moveTo(p1.x, p1.y);

            // Convert Catmull-Rom to cubic Bezier control points
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
    }
}
