import { Vector2 } from "../math/Vector2";

export class Particle {
    public pos: Vector2;
    public oldPos: Vector2;
    public pinned: boolean = false;

    constructor(x: number, y: number) {
        this.pos = new Vector2(x, y);
        this.oldPos = new Vector2(x, y);
    }
}