import { Vector2 } from "../math/Vector2";
import { Fruit } from "../fruit/Fruit";
import { FRUIT_TYPES } from "../fruit/FruitType";
import { Bomb } from "../fruit/Bomb";
import { SpecialBanana } from "../fruit/SpecialBanana";
import { JuiceParticle } from "../effects/JuiceParticle";
import { ScorePopup } from "../effects/ScorePopup";
import { SplashMark } from "../effects/SplashMark";
import { BladeTrail } from "../effects/BladeTrail";
import { FruitSpawner } from "./FruitSpawner";

type GameState = 'start' | 'playing' | 'over';

/**
 * Game orchestrates the full Fruit Ninja experience:
 *  - State machine (start → playing → over)
 *  - Spawning fruits on parabolic arcs from the bottom of the screen
 *  - Bombs that end the game if sliced
 *  - 60-second countdown timer
 *  - Detecting swipe input and slicing soft-body fruits
 *  - Scoring, miss tracking, and difficulty scaling
 *  - Rendering all objects and visual effects
 */
export class Game {
    // Canvas
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private bladeCanvas: HTMLCanvasElement;
    private bctx: CanvasRenderingContext2D;
    private W = 0;
    private H = 0;

    // State
    private state: GameState = 'start';
    private score = 0;
    private gameStartTime = 0;
    private readonly GAME_DURATION = 60; // seconds
    private timeRemaining = 60;
    private gameOverReason = '';

    // Objects
    private fruits: Fruit[] = [];
    private bombs: Bomb[] = [];
    private bananas: SpecialBanana[] = [];
    private juiceParticles: JuiceParticle[] = [];
    private scorePopups: ScorePopup[] = [];
    private splashMarks: SplashMark[] = [];
    private bladeTrail = new BladeTrail();
    private spawner = new FruitSpawner();

    // Active powerups
    private freezeUntil = 0;       // timestamp when freeze ends
    private doubleUntil = 0;       // timestamp when double points ends
    private frenzyQueued = false;   // triggers a burst of fruits next frame

    // Physics constants — low gravity for big floaty arcs
    private gravity = new Vector2(0, 0.12);
    private friction = 0.995;

    // Input
    private isSwiping = false;
    private swipePrev: Vector2 | null = null;

    // DOM
    private scoreEl: HTMLElement;
    private uiEl: HTMLElement;
    private startScreen: HTMLElement;
    private gameOverScreen: HTMLElement;
    private finalScoreEl: HTMLElement;
    private timerEl: HTMLElement;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.bladeCanvas = document.getElementById('blade-canvas') as HTMLCanvasElement;
        this.bctx = this.bladeCanvas.getContext('2d')!;

        this.scoreEl = document.getElementById('score')!;
        this.uiEl = document.getElementById('ui')!;
        this.startScreen = document.getElementById('start-screen')!;
        this.gameOverScreen = document.getElementById('game-over')!;
        this.finalScoreEl = document.getElementById('final-score')!;
        this.timerEl = document.getElementById('timer')!;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindInput();
        this.loop();
    }

    private resize(): void {
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        this.canvas.width = this.W;
        this.canvas.height = this.H;
        this.bladeCanvas.width = this.W;
        this.bladeCanvas.height = this.H;
    }

    // ── Input ──────────────────────────────────────────────

    private bindInput(): void {
        const handler = (type: 'down' | 'move' | 'up', e: PointerEvent) => {
            e.preventDefault();
            if (type === 'down') this.onPointerDown(e.clientX, e.clientY);
            else if (type === 'move') this.onPointerMove(e.clientX, e.clientY);
            else this.onPointerUp();
        };

        for (const el of [this.canvas, this.startScreen, this.gameOverScreen]) {
            el.addEventListener('pointerdown', e => handler('down', e));
        }
        this.canvas.addEventListener('pointermove', e => handler('move', e));
        this.canvas.addEventListener('pointerup', e => handler('up', e));
        this.canvas.addEventListener('pointerleave', e => handler('up', e));
    }

    private onPointerDown(x: number, y: number): void {
        if (this.state !== 'playing') {
            this.startGame();
            return;
        }
        this.isSwiping = true;
        this.swipePrev = new Vector2(x, y);
        this.bladeTrail.add(x, y);
    }

    private onPointerMove(x: number, y: number): void {
        if (!this.isSwiping || this.state !== 'playing') return;
        const cur = new Vector2(x, y);
        this.bladeTrail.add(x, y);

        // Interpolate the swipe into small sub-segments so fast swipes
        // don't skip over fruits. Max step length ~15px.
        const prev = this.swipePrev!;
        const dx = cur.x - prev.x;
        const dy = cur.y - prev.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / 15));

        // Track fruits cut in this single move event for combo
        const cutThisMove: { fruit: Fruit; pos: Vector2 }[] = [];

        for (let s = 0; s < steps; s++) {
            const t0 = s / steps;
            const t1 = (s + 1) / steps;
            const a = new Vector2(prev.x + dx * t0, prev.y + dy * t0);
            const b = new Vector2(prev.x + dx * t1, prev.y + dy * t1);

            // Check bombs first
            for (const bomb of this.bombs) {
                if (!bomb.alive || bomb.sliced) continue;
                if (this.checkSliceOrProximity(bomb, a, b, bomb.radius)) {
                    bomb.sliced = true;
                    const c = bomb.getCenterPos();
                    for (let i = 0; i < 30; i++) {
                        this.juiceParticles.push(new JuiceParticle(c.x, c.y, '#ff4400'));
                    }
                    for (let i = 0; i < 20; i++) {
                        this.juiceParticles.push(new JuiceParticle(c.x, c.y, '#ffcc00'));
                    }
                    this.scorePopups.push(new ScorePopup(c.x, c.y, 'BOMB!', '#ff3333'));
                    this.gameOverReason = 'bomb';
                    this.endGame();
                    return;
                }
            }

            // Check bananas (powerups)
            for (const banana of this.bananas) {
                if (!banana.alive || banana.sliced) continue;
                if (banana.checkSlice(a, b)) {
                    banana.alive = false;
                    const c = banana.getCenterPos();

                    // Big sparkle burst in banana's color
                    for (let i = 0; i < 25; i++) {
                        this.juiceParticles.push(new JuiceParticle(c.x, c.y, banana.config.innerColor));
                    }
                    for (let i = 0; i < 15; i++) {
                        this.juiceParticles.push(new JuiceParticle(c.x, c.y, banana.config.color));
                    }
                    this.splashMarks.push(new SplashMark(c.x, c.y, banana.config.color, 45));

                    // Activate powerup
                    const now = Date.now();
                    if (banana.bananaType === 'frenzy') {
                        this.frenzyQueued = true;
                        this.scorePopups.push(new ScorePopup(c.x, c.y, 'FRENZY!', '#88bbff'));
                    } else if (banana.bananaType === 'freeze') {
                        this.freezeUntil = now + 5000; // 5 seconds
                        this.scorePopups.push(new ScorePopup(c.x, c.y, 'TIME FREEZE!', '#ccf4ff'));
                    } else if (banana.bananaType === 'double') {
                        this.doubleUntil = now + 8000; // 8 seconds
                        this.scorePopups.push(new ScorePopup(c.x, c.y, 'DOUBLE POINTS!', '#bbffbb'));
                    }
                }
            }

            // Check fruits
            for (const fruit of this.fruits) {
                if (!fruit.alive || fruit.scored) continue;
                const wasCut = this.checkSliceOrProximity(fruit, a, b, fruit.type.radius);
                if (wasCut) {
                    fruit.slice(a, b);
                    fruit.scored = true;
                    fruit.sliced = true;

                    const c = fruit.getCenterPos();
                    cutThisMove.push({ fruit, pos: c });

                    // Juice burst
                    for (let i = 0; i < 18; i++) {
                        this.juiceParticles.push(new JuiceParticle(c.x, c.y, fruit.type.innerColor));
                    }
                    for (let i = 0; i < 10; i++) {
                        this.juiceParticles.push(new JuiceParticle(c.x, c.y, fruit.type.color));
                    }

                    // Splash mark on the cutting board
                    this.splashMarks.push(new SplashMark(
                        c.x, c.y, fruit.type.innerColor, fruit.type.radius,
                    ));
                }
            }
        }

        // Score with combo bonus
        if (cutThisMove.length > 0) {
            const comboCount = cutThisMove.length;
            const isCombo = comboCount >= 2;
            const isDouble = Date.now() < this.doubleUntil;

            for (const { fruit, pos } of cutThisMove) {
                let pts = fruit.type.points;
                if (isCombo) pts *= 2;
                if (isDouble) pts *= 2;
                this.score += pts;
                this.scorePopups.push(
                    new ScorePopup(pos.x, pos.y, '+' + pts, fruit.type.innerColor),
                );
            }

            // Extra combo banner + bonus points
            if (isCombo) {
                const bonusPts = comboCount * 3;
                this.score += bonusPts;
                // Show combo popup near the midpoint of all cut fruits
                const midX = cutThisMove.reduce((s, c) => s + c.pos.x, 0) / comboCount;
                const midY = cutThisMove.reduce((s, c) => s + c.pos.y, 0) / comboCount;
                this.scorePopups.push(
                    new ScorePopup(midX, midY - 40,
                        `${comboCount}x COMBO +${bonusPts}`, '#ffdd44'),
                );
            }

            this.scoreEl.textContent = String(this.score);
        }

        this.swipePrev = cur;
    }

    /**
     * Checks if the swipe segment (a→b) hits the object, using both
     * spring-intersection AND proximity to the center as a fallback.
     * This ensures fast swipes that pass through the fruit still register.
     */
    private checkSliceOrProximity(
        obj: { springs: { p1: { pos: Vector2 }; p2: { pos: Vector2 } }[]; getCenterPos(): Vector2 },
        a: Vector2,
        b: Vector2,
        radius: number,
    ): boolean {
        // Method 1: spring intersection (original)
        for (const s of obj.springs) {
            if (Vector2.lineIntersect(a, b, s.p1.pos, s.p2.pos)) {
                return true;
            }
        }

        // Method 2: proximity — does the swipe line pass close to center?
        const center = obj.getCenterPos();
        const d = this.pointToSegmentDist(center, a, b);
        if (d < radius * 0.85) {
            return true;
        }

        return false;
    }

    /** Distance from point P to line segment AB. */
    private pointToSegmentDist(p: Vector2, a: Vector2, b: Vector2): number {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = p.x - a.x;
        const apy = p.y - a.y;
        const ab2 = abx * abx + aby * aby;
        if (ab2 === 0) return Math.hypot(apx, apy);
        let t = (apx * abx + apy * aby) / ab2;
        t = Math.max(0, Math.min(1, t));
        const cx = a.x + t * abx;
        const cy = a.y + t * aby;
        return Math.hypot(p.x - cx, p.y - cy);
    }

    private onPointerUp(): void {
        this.isSwiping = false;
        this.swipePrev = null;
    }

    // ── State transitions ─────────────────────────────────

    private startGame(): void {
        this.score = 0;
        this.fruits = [];
        this.bombs = [];
        this.bananas = [];
        this.juiceParticles = [];
        this.scorePopups = [];
        this.splashMarks = [];
        this.freezeUntil = 0;
        this.doubleUntil = 0;
        this.frenzyQueued = false;
        this.spawner.reset();
        this.gameStartTime = Date.now();
        this.timeRemaining = this.GAME_DURATION;
        this.gameOverReason = '';

        this.scoreEl.textContent = '0';
        this.timerEl.textContent = '1:00';

        this.uiEl.classList.remove('hidden');
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.state = 'playing';
    }

    private endGame(): void {
        this.state = 'over';
        this.uiEl.classList.add('hidden');
        this.finalScoreEl.textContent = String(this.score);

        const reasonEl = document.getElementById('game-over-reason')!;
        if (this.gameOverReason === 'bomb') {
            reasonEl.textContent = 'You sliced a bomb!';
        } else {
            reasonEl.textContent = 'Time\'s up!';
        }

        this.gameOverScreen.classList.remove('hidden');
    }

    // ── Update ─────────────────────────────────────────────

    private update(): void {
        if (this.state !== 'playing') return;

        const now = Date.now();
        const isFrozen = now < this.freezeUntil;

        // Timer — paused during freeze
        if (!isFrozen) {
            const elapsed = (now - this.gameStartTime) / 1000;
            this.timeRemaining = Math.max(0, this.GAME_DURATION - elapsed);
        } else {
            // Push start time forward so freeze doesn't eat game time
            this.gameStartTime += 1000 / 60; // ~1 frame worth
        }

        const mins = Math.floor(this.timeRemaining / 60);
        const secs = Math.ceil(this.timeRemaining % 60);
        this.timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        // Timer color: frozen = ice blue, low = red, normal = white
        if (isFrozen) {
            this.timerEl.style.color = '#66ddff';
        } else if (this.timeRemaining <= 10) {
            this.timerEl.style.color = '#ff3c3c';
        } else {
            this.timerEl.style.color = '';
        }

        if (this.timeRemaining <= 0) {
            this.gameOverReason = 'time';
            this.endGame();
            return;
        }

        // Frenzy burst — 100 fruits from all directions at once
        if (this.frenzyQueued) {
            this.frenzyQueued = false;

            for (let i = 0; i < 100; i++) {
                const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
                const side = Math.random();
                let x: number, y: number, vx: number, vy: number;

                if (side < 0.35) {
                    // Bottom
                    x = Math.random() * this.W;
                    y = this.H + type.radius + Math.random() * 60;
                    vx = (Math.random() - 0.5) * 7;
                    vy = -(7 + Math.random() * 7);
                } else if (side < 0.55) {
                    // Top
                    x = Math.random() * this.W;
                    y = -type.radius - Math.random() * 60;
                    vx = (Math.random() - 0.5) * 5;
                    vy = 2 + Math.random() * 4;
                } else if (side < 0.775) {
                    // Left
                    x = -type.radius - Math.random() * 60;
                    y = Math.random() * this.H * 0.7;
                    vx = 4 + Math.random() * 6;
                    vy = (Math.random() - 0.5) * 6;
                } else {
                    // Right
                    x = this.W + type.radius + Math.random() * 60;
                    y = Math.random() * this.H * 0.7;
                    vx = -(4 + Math.random() * 6);
                    vy = (Math.random() - 0.5) * 6;
                }

                this.fruits.push(new Fruit(type, x, y, vx, vy));
            }
        }

        // Spawn new fruits, bombs, and bananas
        const spawned = this.spawner.update(this.W, this.H, this.score);
        this.fruits.push(...spawned.fruits);
        this.bombs.push(...spawned.bombs);
        this.bananas.push(...spawned.bananas);

        // Update fruits
        for (const fruit of this.fruits) {
            if (!fruit.alive) continue;
            fruit.update(this.gravity, this.friction);
            const c = fruit.getCenterPos();
            if (c.y > this.H + 150) fruit.alive = false;
        }

        // Update bombs
        for (const bomb of this.bombs) {
            if (!bomb.alive) continue;
            bomb.update(this.gravity, this.friction);
            const c = bomb.getCenterPos();
            if (c.y > this.H + 150) bomb.alive = false;
        }

        // Update bananas
        for (const banana of this.bananas) {
            if (!banana.alive) continue;
            banana.update(this.gravity, this.friction);
            const c = banana.getCenterPos();
            if (c.y > this.H + 150) banana.alive = false;
        }

        // Clean up
        this.fruits = this.fruits.filter(
            f => f.alive || f.getCenterPos().y < this.H + 300,
        );
        this.bombs = this.bombs.filter(
            b => b.alive || b.getCenterPos().y < this.H + 300,
        );
        this.bananas = this.bananas.filter(b => b.alive);

        // Effects
        for (const j of this.juiceParticles) j.update();
        this.juiceParticles = this.juiceParticles.filter(j => !j.dead);

        for (const s of this.scorePopups) s.update();
        this.scorePopups = this.scorePopups.filter(s => !s.dead);

        for (const sp of this.splashMarks) sp.update();
        this.splashMarks = this.splashMarks.filter(sp => !sp.dead);

        this.bladeTrail.update();
    }

    // Cached wood background — generated once, redrawn from cache
    private bgCanvas: HTMLCanvasElement | null = null;
    private bgW = 0;
    private bgH = 0;

    /**
     * Generate a procedural dark wood cutting board texture matching
     * the classic Fruit Ninja look: vertical planks, deep brown color,
     * scratch/slice marks, knots, nail holes, heavy vignette.
     */
    private ensureBg(): void {
        if (this.bgCanvas && this.bgW === this.W && this.bgH === this.H) return;

        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = this.W;
        this.bgCanvas.height = this.H;
        this.bgW = this.W;
        this.bgH = this.H;

        const bx = this.bgCanvas.getContext('2d')!;
        const W = this.W;
        const H = this.H;

        // Use a seeded random so the bg is consistent
        const rand = (seed: number) => {
            const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
            return x - Math.floor(x);
        };

        // ── Base dark brown fill ──
        bx.fillStyle = '#4a3020';
        bx.fillRect(0, 0, W, H);

        // ── Vertical planks ──
        const plankCount = 4 + Math.floor(W / 350);
        const plankW = W / plankCount;

        for (let p = 0; p < plankCount; p++) {
            const px = p * plankW;

            // Each plank has a slightly different base hue
            const hueShift = rand(p * 7) * 15 - 7;
            const r = Math.round(74 + hueShift);
            const g = Math.round(48 + hueShift * 0.6);
            const b = Math.round(32 + hueShift * 0.4);

            // Plank base with vertical gradient variation
            const plankGrad = bx.createLinearGradient(px, 0, px, H);
            plankGrad.addColorStop(0, `rgb(${r - 5},${g - 3},${b - 2})`);
            plankGrad.addColorStop(0.3, `rgb(${r + 8},${g + 5},${b + 3})`);
            plankGrad.addColorStop(0.7, `rgb(${r},${g},${b})`);
            plankGrad.addColorStop(1, `rgb(${r - 8},${g - 5},${b - 3})`);
            bx.fillStyle = plankGrad;
            bx.fillRect(px, 0, plankW, H);

            // Vertical wood grain
            bx.globalAlpha = 0.08;
            for (let j = 0; j < 25; j++) {
                const gx = px + rand(p * 100 + j) * plankW;
                const drift = (rand(j * 31 + p) - 0.5) * 15;
                bx.strokeStyle = rand(j) > 0.5 ? '#2a1808' : '#6a5030';
                bx.lineWidth = 0.5 + rand(j * 3) * 2;
                bx.beginPath();
                bx.moveTo(gx, 0);
                for (let y = 0; y < H; y += 30) {
                    const wx = gx + Math.sin(y * 0.005 + p) * drift;
                    bx.lineTo(wx, y + 30);
                }
                bx.stroke();
            }
            bx.globalAlpha = 1;

            // Plank seam — dark gap + light edge
            if (p > 0) {
                bx.strokeStyle = '#1a0e05';
                bx.lineWidth = 2.5;
                bx.beginPath();
                bx.moveTo(px, 0);
                bx.lineTo(px, H);
                bx.stroke();

                bx.strokeStyle = 'rgba(100,75,50,0.15)';
                bx.lineWidth = 1;
                bx.beginPath();
                bx.moveTo(px + 2, 0);
                bx.lineTo(px + 2, H);
                bx.stroke();
            }
        }

        // ── Knots (2-4 darker ovals with rings) ──
        const knotCount = 2 + Math.floor(rand(42) * 3);
        for (let i = 0; i < knotCount; i++) {
            const kx = rand(i * 17 + 5) * W;
            const ky = rand(i * 23 + 11) * H;
            const kr = 12 + rand(i * 7) * 22;

            // Knot body
            bx.globalAlpha = 0.3;
            const knotGrad = bx.createRadialGradient(kx, ky, 0, kx, ky, kr);
            knotGrad.addColorStop(0, '#1a0e05');
            knotGrad.addColorStop(0.5, '#2a1a0a');
            knotGrad.addColorStop(1, 'transparent');
            bx.fillStyle = knotGrad;
            bx.beginPath();
            bx.ellipse(kx, ky, kr, kr * 0.7, rand(i) * 0.5, 0, Math.PI * 2);
            bx.fill();

            // Knot rings
            bx.globalAlpha = 0.1;
            bx.strokeStyle = '#3a2510';
            bx.lineWidth = 1;
            for (let ring = 0; ring < 3; ring++) {
                const rr = kr * (0.3 + ring * 0.25);
                bx.beginPath();
                bx.ellipse(kx, ky, rr, rr * 0.7, rand(i) * 0.5, 0, Math.PI * 2);
                bx.stroke();
            }
            bx.globalAlpha = 1;
        }

        // ── Scratch / slice marks ──
        const scratchCount = 5 + Math.floor(rand(99) * 6);
        for (let i = 0; i < scratchCount; i++) {
            const sx = rand(i * 13 + 3) * W;
            const sy = rand(i * 19 + 7) * H;
            const angle = rand(i * 31) * Math.PI - Math.PI / 2; // mostly vertical-ish
            const len = 30 + rand(i * 41) * 100;

            bx.save();
            bx.translate(sx, sy);
            bx.rotate(angle);

            // Dark scratch line
            bx.globalAlpha = 0.15 + rand(i * 53) * 0.15;
            bx.strokeStyle = '#1a0a02';
            bx.lineWidth = 1 + rand(i * 61) * 1.5;
            bx.lineCap = 'round';
            bx.beginPath();
            bx.moveTo(0, -len / 2);
            // Slightly curved scratch
            const curve = (rand(i * 71) - 0.5) * 20;
            bx.quadraticCurveTo(curve, 0, 0, len / 2);
            bx.stroke();

            // Light edge next to scratch (raised wood)
            bx.globalAlpha = 0.06;
            bx.strokeStyle = '#8a7050';
            bx.lineWidth = 0.5;
            bx.beginPath();
            bx.moveTo(1.5, -len / 2);
            bx.quadraticCurveTo(curve + 1.5, 0, 1.5, len / 2);
            bx.stroke();

            bx.restore();
        }

        // ── Nail holes (small dark circles on plank edges) ──
        for (let p = 0; p < plankCount; p++) {
            const px = p * plankW;
            // Top and bottom nails
            for (const ny of [25, H - 25]) {
                const nx = px + plankW - 15 + rand(p * 5 + ny) * 8;
                bx.globalAlpha = 0.4;
                bx.fillStyle = '#0e0804';
                bx.beginPath();
                bx.arc(nx, ny, 2.5, 0, Math.PI * 2);
                bx.fill();
                // Tiny highlight
                bx.globalAlpha = 0.1;
                bx.fillStyle = '#6a5535';
                bx.beginPath();
                bx.arc(nx - 0.5, ny - 0.5, 1, 0, Math.PI * 2);
                bx.fill();
            }
        }

        // ── Noise grain ──
        bx.globalAlpha = 0.03;
        for (let i = 0; i < 12000; i++) {
            bx.fillStyle = rand(i) > 0.5 ? '#000' : '#8a7050';
            bx.fillRect(rand(i * 3) * W, rand(i * 7) * H, 1, 1);
        }

        // ── Heavy vignette ──
        bx.globalAlpha = 1;
        const vig = bx.createRadialGradient(
            W / 2, H / 2, Math.min(W, H) * 0.2,
            W / 2, H / 2, Math.max(W, H) * 0.8,
        );
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(0.5, 'rgba(0,0,0,0.15)');
        vig.addColorStop(1, 'rgba(0,0,0,0.55)');
        bx.fillStyle = vig;
        bx.fillRect(0, 0, W, H);

        bx.globalAlpha = 1;
    }

    private draw(): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.W, this.H);

        // Wood cutting board background (cached)
        this.ensureBg();
        if (this.bgCanvas) {
            ctx.drawImage(this.bgCanvas, 0, 0);
        }

        // Splash marks (juice stains on the board, behind fruits)
        for (const sp of this.splashMarks) sp.draw(ctx);

        // Fruits
        for (const fruit of this.fruits) {
            if (!fruit.alive && fruit.getCenterPos().y > this.H + 100) continue;
            fruit.draw(ctx);
        }

        // Bombs
        for (const bomb of this.bombs) {
            if (!bomb.alive) continue;
            bomb.draw(ctx);
        }

        // Special bananas
        for (const banana of this.bananas) {
            if (!banana.alive) continue;
            banana.draw(ctx);
        }

        // Active powerup indicators
        const now = Date.now();
        let indicatorY = 60;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        if (now < this.freezeUntil) {
            const remaining = ((this.freezeUntil - now) / 1000).toFixed(1);
            ctx.fillStyle = '#66ddff';
            ctx.globalAlpha = 0.7 + Math.sin(now * 0.006) * 0.3;
            ctx.fillText(`❄ FREEZE ${remaining}s`, 24, indicatorY);
            ctx.globalAlpha = 1;
            indicatorY += 24;
        }
        if (now < this.doubleUntil) {
            const remaining = ((this.doubleUntil - now) / 1000).toFixed(1);
            ctx.fillStyle = '#44ff44';
            ctx.globalAlpha = 0.7 + Math.sin(now * 0.006) * 0.3;
            ctx.fillText(`×2 DOUBLE ${remaining}s`, 24, indicatorY);
            ctx.globalAlpha = 1;
        }

        // Juice particles
        for (const j of this.juiceParticles) j.draw(ctx);

        // Score popups
        for (const s of this.scorePopups) s.draw(ctx);

        // Blade trail (on overlay canvas)
        this.bctx.clearRect(0, 0, this.W, this.H);
        this.bladeTrail.draw(this.bctx);
    }

    // ── Main loop ──────────────────────────────────────────

    private loop = (): void => {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    };
}
