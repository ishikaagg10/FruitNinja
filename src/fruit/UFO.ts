import { Vector2 } from "../math/Vector2";

export class UFO {
    public x: number;
    public y: number;
    public vx: number;
    public alive = true;
    public hit = false;
    public readonly width = 90;
    public readonly height = 45;
    private bobPhase: number;

    constructor(screenW: number, screenH: number) {
        const fromLeft = Math.random() > 0.5;
        this.x = fromLeft ? -this.width : screenW + this.width;
        this.y = 60 + Math.random() * (screenH * 0.3);
        this.vx = fromLeft ? (1.8 + Math.random() * 1.2) : -(1.8 + Math.random() * 1.2);
        this.bobPhase = Math.random() * Math.PI * 2;
    }

    update(screenW: number): void {
        this.x += this.vx;
        this.bobPhase += 0.04;

        if (this.vx > 0 && this.x > screenW + this.width + 20) this.alive = false;
        if (this.vx < 0 && this.x < -this.width - 20) this.alive = false;
    }

    getCenterPos(): Vector2 {
        const bobY = Math.sin(this.bobPhase) * 8;
        return new Vector2(this.x, this.y + bobY);
    }

    checkHit(a: Vector2, b: Vector2): boolean {
        const center = this.getCenterPos();
        const d = this.pointToSegDist(center, a, b);
        return d < this.width * 0.5;
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
        const t = Date.now() * 0.003;
        const bobY = Math.sin(this.bobPhase) * 8;
        const cx = this.x;
        const cy = this.y + bobY;

        ctx.save();

        const beamGrad = ctx.createLinearGradient(cx, cy + 15, cx, cy + 120);
        beamGrad.addColorStop(0, `rgba(120,255,120,${0.08 + Math.sin(t) * 0.04})`);
        beamGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + 15);
        ctx.lineTo(cx + 20, cy + 15);
        ctx.lineTo(cx + 55, cy + 120);
        ctx.lineTo(cx - 55, cy + 120);
        ctx.closePath();
        ctx.fill();

        const bodyGrad = ctx.createLinearGradient(cx, cy - 5, cx, cy + 18);
        bodyGrad.addColorStop(0, '#b0b0b8');
        bodyGrad.addColorStop(0.4, '#888890');
        bodyGrad.addColorStop(1, '#505058');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 8, this.width * 0.5, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(200,200,210,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6, this.width * 0.5 - 2, 12, 0, Math.PI, Math.PI * 2);
        ctx.stroke();

        const lightCount = 8;
        for (let i = 0; i < lightCount; i++) {
            const angle = (i / lightCount) * Math.PI * 2 + t * 2;
            const lx = cx + Math.cos(angle) * (this.width * 0.38);
            const ly = cy + 8 + Math.sin(angle) * 8;

            const hue = ((i / lightCount) * 360 + Date.now() * 0.2) % 360;
            const alpha = 0.6 + Math.sin(t * 3 + i) * 0.4;

            ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(lx, ly, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(lx, ly, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        const domeGrad = ctx.createRadialGradient(
            cx - 5, cy - 12, 2,
            cx, cy - 4, 22,
        );
        domeGrad.addColorStop(0, 'rgba(180,230,255,0.7)');
        domeGrad.addColorStop(0.5, 'rgba(100,180,220,0.4)');
        domeGrad.addColorStop(1, 'rgba(60,120,160,0.2)');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 4, 22, 18, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(150,200,230,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 4, 22, 18, 0, Math.PI, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(cx - 6, cy - 14, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();

        const eyeSpread = 6;
        const eyeY = cy - 8;
        ctx.fillStyle = `rgba(0,255,0,${0.6 + Math.sin(t * 2) * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx - eyeSpread, eyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + eyeSpread, eyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(0,255,0,0.15)`;
        ctx.beginPath();
        ctx.arc(cx - eyeSpread, eyeY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + eyeSpread, eyeY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    static drawAbductionOverlay(
        ctx: CanvasRenderingContext2D,
        W: number, H: number,
        progress: number,
    ): void {
        const t = Date.now() * 0.003;

        const intensity = progress < 0.1
            ? progress / 0.1
            : progress > 0.85
            ? (1 - progress) / 0.15
            : 1;

        ctx.save();

        ctx.fillStyle = `rgba(0, 15, 0, ${0.85 * intensity})`;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 0.15 * intensity;
        for (let i = 0; i < 20; i++) {
            const lineY = ((t * 80 + i * (H / 20)) % (H + 40)) - 20;
            const grad = ctx.createLinearGradient(0, lineY - 3, 0, lineY + 3);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.5, '#00ff44');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, lineY - 3, W, 6);
        }

        ctx.globalAlpha = 0.06 * intensity;
        for (let i = 0; i < 300; i++) {
            const nx = Math.random() * W;
            const ny = Math.random() * H;
            ctx.fillStyle = Math.random() > 0.5 ? '#00ff00' : '#003300';
            ctx.fillRect(nx, ny, 2, 2);
        }

        ctx.globalAlpha = 0.4 * intensity;
        const ufoCx = W / 2 + Math.sin(t * 0.7) * 40;
        const ufoCy = H * 0.3 + Math.sin(t * 0.5) * 20;

        const beamGrad = ctx.createLinearGradient(ufoCx, ufoCy + 20, ufoCx, H);
        beamGrad.addColorStop(0, `rgba(0,255,60,${0.25 * intensity})`);
        beamGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(ufoCx - 30, ufoCy + 20);
        ctx.lineTo(ufoCx + 30, ufoCy + 20);
        ctx.lineTo(ufoCx + W * 0.3, H);
        ctx.lineTo(ufoCx - W * 0.3, H);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.6 * intensity;
        ctx.fillStyle = '#113311';
        ctx.beginPath();
        ctx.ellipse(ufoCx, ufoCy + 10, 70, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a220a';
        ctx.beginPath();
        ctx.ellipse(ufoCx, ufoCy - 2, 28, 22, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = intensity;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + t * 3;
            const lx = ufoCx + Math.cos(angle) * 50;
            const ly = ufoCy + 10 + Math.sin(angle) * 10;
            const hue = (i * 60 + Date.now() * 0.3) % 360;
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.7)`;
            ctx.beginPath();
            ctx.arc(lx, ly, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 0.7 * intensity * (0.5 + Math.sin(t * 4) * 0.5);
        ctx.fillStyle = '#00ff44';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ABDUCTED', W / 2, H * 0.55);

        ctx.font = '16px monospace';
        ctx.globalAlpha = 0.5 * intensity;
        const secsLeft = Math.ceil(5 * (1 - progress));
        ctx.fillText(`Signal lost... ${secsLeft}s`, W / 2, H * 0.62);

        ctx.restore();
    }
}
