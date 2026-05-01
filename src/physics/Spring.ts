import { Particle } from "./Particle";

export class Spring {
    public restLength: number;

    constructor(public p1: Particle, public p2: Particle, public stiffness: number) {
        this.restLength = p1.pos.dist(p2.pos);
    }

    resolve() {
        const dist = this.p1.pos.dist(this.p2.pos);
        if (dist === 0) return;

        // Hooke's Law approximation
        const difference = (this.restLength - dist) / dist;
        const offsetX = (this.p2.pos.x - this.p1.pos.x) * difference * 0.5 * this.stiffness;
        const offsetY = (this.p2.pos.y - this.p1.pos.y) * difference * 0.5 * this.stiffness;

        if (!this.p1.pinned) {
            this.p1.pos.x -= offsetX;
            this.p1.pos.y -= offsetY;
        }
        if (!this.p2.pinned) {
            this.p2.pos.x += offsetX;
            this.p2.pos.y += offsetY;
        }
    }
}