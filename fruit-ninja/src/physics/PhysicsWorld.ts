import { Particle } from "./Particle";
import { Spring } from "./Spring";
import { Vector2 } from "../math/Vector2";

export class PhysicsWorld {
    public particles: Particle[] = [];
    public springs: Spring[] = [];
    private gravity = new Vector2(0, 0.4);
    private friction = 0.99;
    private bounce = 0.8;

    constructor(private width: number, private height: number) {}

    // Creates a circular soft-body "Fruit"
    createFruit(cx: number, cy: number, radius: number, segments: number, stiffness: number) {
        const centerParticle = new Particle(cx, cy);
        this.particles.push(centerParticle);

        const startIndex = this.particles.length;

        // Create perimeter particles
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            this.particles.push(new Particle(px, py));
        }

        // Connect springs
        for (let i = 0; i < segments; i++) {
            const current = startIndex + i;
            const next = startIndex + ((i + 1) % segments);
            
            // Perimeter spring
            this.springs.push(new Spring(this.particles[current], this.particles[next], stiffness));
            // Spoke spring (connects to center)
            this.springs.push(new Spring(this.particles[current], centerParticle, stiffness));
        }
    }

    // Slicing: Removes springs intersected by the swipe line
    slice(start: Vector2, end: Vector2) {
        for (let i = this.springs.length - 1; i >= 0; i--) {
            const s = this.springs[i];
            if (Vector2.lineIntersect(start, end, s.p1.pos, s.p2.pos)) {
                this.springs.splice(i, 1); // Cut the spring!
            }
        }
    }

    update() {
        for (const p of this.particles) {
            if (p.pinned) continue;
            
            const vx = (p.pos.x - p.oldPos.x) * this.friction;
            const vy = (p.pos.y - p.oldPos.y) * this.friction;

            p.oldPos.x = p.pos.x;
            p.oldPos.y = p.pos.y;

            p.pos.x += vx + this.gravity.x;
            p.pos.y += vy + this.gravity.y;

            // Floor collision
            if (p.pos.y > this.height - 10) {
                p.pos.y = this.height - 10;
                p.oldPos.y = p.pos.y + vy * this.bounce;
                p.pos.x = p.oldPos.x + vx * 0.5; // Floor friction
            }
        }

        for (let i = 0; i < 5; i++) {
            for (const s of this.springs) s.resolve();
        }
    }
}