import { Fruit } from "../fruit/Fruit";
import { Bomb } from "../fruit/Bomb";
import { SpecialBanana, type BananaType } from "../fruit/SpecialBanana";
import { UFO } from "../fruit/UFO";
import { FRUIT_TYPES } from "../fruit/FruitType";

export class FruitSpawner {
    private timer = 0;
    private pendingFruits: number[] = [];
    private pendingBombs: number[] = [];
    private frameCount = 0;

    private bananaSchedule: { type: BananaType; frame: number }[] = [];
    private bananasSpawned = new Set<BananaType>();

    private ufoFrame = 0;
    private ufoSpawned = false;

    getInterval(difficulty: number): number {
        return Math.max(40, 100 - difficulty * 6);
    }

    update(
        screenW: number,
        screenH: number,
        score: number,
    ): { fruits: Fruit[]; bombs: Bomb[]; bananas: SpecialBanana[]; ufos: UFO[] } {
        const difficulty = 1 + Math.floor(score / 8);
        const interval = this.getInterval(difficulty);
        const fruits: Fruit[] = [];
        const bombs: Bomb[] = [];
        const bananas: SpecialBanana[] = [];
        const ufos: UFO[] = [];

        this.frameCount++;

        for (let i = this.pendingFruits.length - 1; i >= 0; i--) {
            this.pendingFruits[i]--;
            if (this.pendingFruits[i] <= 0) {
                this.pendingFruits.splice(i, 1);
                fruits.push(this.createFruit(screenW, screenH));
            }
        }

        for (let i = this.pendingBombs.length - 1; i >= 0; i--) {
            this.pendingBombs[i]--;
            if (this.pendingBombs[i] <= 0) {
                this.pendingBombs.splice(i, 1);
                bombs.push(this.createBomb(screenW, screenH));
            }
        }

        for (const entry of this.bananaSchedule) {
            if (this.frameCount >= entry.frame && !this.bananasSpawned.has(entry.type)) {
                this.bananasSpawned.add(entry.type);
                bananas.push(this.createBanana(entry.type, screenW, screenH));
            }
        }

        if (this.frameCount >= this.ufoFrame && !this.ufoSpawned) {
            this.ufoSpawned = true;
            ufos.push(new UFO(screenW, screenH));
        }

        this.timer++;
        if (this.timer >= interval) {
            this.timer = 0;
            const count = 1 + Math.floor(Math.random() * Math.min(difficulty, 4));
            fruits.push(this.createFruit(screenW, screenH));
            for (let i = 1; i < count; i++) {
                this.pendingFruits.push(i * 10);
            }

            const bombChance = Math.min(0.4, 0.08 * difficulty);
            if (Math.random() < bombChance) {
                this.pendingBombs.push(Math.floor(Math.random() * 15));
            }
        }

        return { fruits, bombs, bananas, ufos };
    }

    private createFruit(screenW: number, screenH: number): Fruit {
        const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        const margin = 80;
        const x = margin + Math.random() * (screenW - margin * 2);
        const vy = -(10 + Math.random() * 4);
        const vx = (Math.random() - 0.5) * 4;

        return new Fruit(type, x, screenH + type.radius + 20, vx, vy);
    }

    private createBomb(screenW: number, screenH: number): Bomb {
        const margin = 100;
        const x = margin + Math.random() * (screenW - margin * 2);
        const vy = -(10 + Math.random() * 3);
        const vx = (Math.random() - 0.5) * 3;

        return new Bomb(x, screenH + 50, vx, vy);
    }

    private createBanana(type: BananaType, screenW: number, screenH: number): SpecialBanana {
        const margin = 150;
        const x = margin + Math.random() * (screenW - margin * 2);
        const vy = 1.5 + Math.random() * 1.5;
        const vx = (Math.random() - 0.5) * 2;

        return new SpecialBanana(type, x, -80, vx, vy);
    }

    reset(): void {
        this.timer = 0;
        this.frameCount = 0;
        this.pendingFruits = [];
        this.pendingBombs = [];
        this.bananasSpawned.clear();

        const allTypes: BananaType[] = ['frenzy', 'freeze', 'double'];
        for (let i = allTypes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTypes[i], allTypes[j]] = [allTypes[j], allTypes[i]];
        }
        const count = Math.random() < 0.5 ? 1 : 2;
        const chosen = allTypes.slice(0, count);

        this.bananaSchedule = [];
        if (chosen.length === 1) {
            const frame = Math.floor((900 + Math.random() * 1800));
            this.bananaSchedule.push({ type: chosen[0], frame });
        } else {
            const frame1 = Math.floor(600 + Math.random() * 900);
            const frame2 = Math.floor(2100 + Math.random() * 900);
            this.bananaSchedule.push({ type: chosen[0], frame: frame1 });
            this.bananaSchedule.push({ type: chosen[1], frame: frame2 });
        }

        this.ufoSpawned = false;
        this.ufoFrame = Math.floor(1200 + Math.random() * 1800);
    }
}
