import { PhysicsWorld } from "./physics/PhysicsWorld";
import { Vector2 } from "./math/Vector2";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const world = new PhysicsWorld(canvas.width, canvas.height);

world.createFruit(canvas.width / 2, 200, 100, 16, 0.5);

let isSwiping = false;
let swipeStart = new Vector2(0, 0);
let swipeCurrent = new Vector2(0, 0);

canvas.addEventListener("pointerdown", (e) => {
    isSwiping = true;
    swipeStart = new Vector2(e.clientX, e.clientY);
    swipeCurrent = new Vector2(e.clientX, e.clientY);
});

canvas.addEventListener("pointermove", (e) => {
    if (!isSwiping) return;
    swipeCurrent = new Vector2(e.clientX, e.clientY);
    world.slice(swipeStart, swipeCurrent);
    swipeStart = new Vector2(e.clientX, e.clientY);
});

canvas.addEventListener("pointerup", () => {
    isSwiping = false;
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.update();

    ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const s of world.springs) {
        ctx.moveTo(s.p1.pos.x, s.p1.pos.y);
        ctx.lineTo(s.p2.pos.x, s.p2.pos.y);
    }
    ctx.stroke();

    if (isSwiping) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(swipeStart.x, swipeStart.y);
        ctx.lineTo(swipeCurrent.x, swipeCurrent.y);
        ctx.stroke();
    }

    requestAnimationFrame(animate);
}

animate();