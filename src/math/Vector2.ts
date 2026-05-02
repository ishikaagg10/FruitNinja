export class Vector2 {
    constructor(public x: number, public y: number) {}

    add(v: Vector2) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v: Vector2) { return new Vector2(this.x - v.x, this.y - v.y); }
    mult(n: number) { return new Vector2(this.x * n, this.y * n); }
    mag() { return Math.hypot(this.x, this.y); }
    dist(v: Vector2) { return Math.hypot(this.x - v.x, this.y - v.y); }

    static lineIntersect(A: Vector2, B: Vector2, C: Vector2, D: Vector2): boolean {
        const ccw = (p1: Vector2, p2: Vector2, p3: Vector2) => 
            (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
        return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
    }
}