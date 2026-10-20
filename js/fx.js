// Particle effects, score popups and screen shake.
import { rand, pick, GROUND } from './util.js';

export class FX {
  constructor() {
    this.parts = [];
    this.front = [];
    this.popups = [];
    this.shakeT = 0;
    this.shakeMag = 0;
    this.flash = 0;
  }

  shake(mag, t = 0.3) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, t); }

  debris(x, y, n, color, power = 1) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        k: 'chunk', x, y, vx: rand(-220, 220) * power, vy: rand(-380, -60) * power,
        s: rand(3, 9), r: rand(6), vr: rand(-12, 12), life: rand(0.8, 1.6), t: 0, color,
      });
    }
  }

  glass(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ k: 'glass', x, y, vx: rand(-200, 200), vy: rand(-300, 0), s: rand(2, 5), r: rand(6), vr: rand(-20, 20), life: rand(0.6, 1.2), t: 0 });
    }
  }

  dust(x, y, n, spread = 30, size = 1) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ k: 'dust', x: x + rand(-spread, spread), y: y + rand(-8, 8), vx: rand(-50, 50), vy: rand(-60, -10), s: rand(12, 26) * size, life: rand(0.9, 1.8), t: 0 });
    }
  }

  sparks(x, y, n, color = '#ffd36b') {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2), v = rand(80, 360);
      this.front.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.2, 0.5), t: 0, color });
    }
  }

  explosion(x, y, big = 1) {
    this.front.push({ k: 'boom', x, y, s: 40 * big, life: 0.55, t: 0 });
    this.sparks(x, y, 18 * big, '#ffb347');
    this.debris(x, y, 10 * big, '#3b3b3b', 1.2);
    for (let i = 0; i < 8 * big; i++) this.parts.push({ k: 'smoke', x: x + rand(-20, 20), y: y + rand(-20, 20), vx: rand(-30, 30), vy: rand(-80, -20), s: rand(14, 30) * big, life: rand(1, 2), t: 0 });
    this.shake(8 * big, 0.35);
    this.flash = Math.max(this.flash, 0.25 * big);
  }

  zap(x, y) {
    for (let i = 0; i < 6; i++) this.front.push({ k: 'bolt', x, y, a: rand(Math.PI * 2), len: rand(30, 60), life: 0.3, t: 0 });
  }

  // Comic-book burst ("CHOMP!", "GULP!") with a jagged starburst behind it.
  comic(x, y, text, color = '#ff3b2f') {
    this.popups.push({ x, y, text, color, t: 0, life: 0.75, comic: true, rot: rand(-0.25, 0.25) });
  }

  // Shoe, hat and scraps flung from a person being eaten.
  preyBits(x, y, type) {
    const cols = type === 'soldier' ? ['#3b5222', '#1a1a1a', '#4f6b2f'] : type === 'woman' ? ['#d42f3a', '#6a3412', '#1a1a1a'] : ['#e6c13a', '#2f4f8a', '#1a1a1a'];
    for (let i = 0; i < 5; i++) {
      this.front.push({ k: 'chunk', x, y, vx: rand(-160, 160), vy: rand(-360, -160), s: rand(4, 7), r: rand(6), vr: rand(-16, 16), life: rand(0.8, 1.3), t: 0, color: cols[i % 3] });
    }
    this.sparks(x, y, 8, '#fff6c8');
  }

  crumbs(x, y) {
    for (let i = 0; i < 7; i++) {
      this.front.push({ k: 'chunk', x, y, vx: rand(-120, 120), vy: rand(-220, -60), s: rand(2, 4), r: rand(6), vr: rand(-16, 16), life: rand(0.5, 0.9), t: 0, color: pick(['#f6dca6', '#d99a4a', '#ffffff']) });
    }
  }

  popup(x, y, text, color = '#ffe14d') {
    this.popups.push({ x, y, text: String(text), color, t: 0, life: 1.2 });
  }

  update(dt) {
    for (const list of [this.parts, this.front]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.t += dt;
        if (p.t >= p.life) { list.splice(i, 1); continue; }
        if (p.k === 'chunk' || p.k === 'glass') {
          p.vy += 1100 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          if (p.y > GROUND + 40) { p.y = GROUND + 40; p.vy *= -0.3; p.vx *= 0.6; }
        } else if (p.k === 'spark') {
          p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        } else if (p.k === 'dust' || p.k === 'smoke') {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.s += 22 * dt;
        }
      }
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t += dt; p.y -= 40 * dt;
      if (p.t >= p.life) this.popups.splice(i, 1);
    }
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.shakeT === 0) this.shakeMag = 0;
    this.flash = Math.max(0, this.flash - dt * 1.5);
  }

  shakeOffset() {
    if (!this.shakeT) return [0, 0];
    return [rand(-1, 1) * this.shakeMag, rand(-1, 1) * this.shakeMag];
  }

  drawBack(ctx) { this.drawList(ctx, this.parts); }

  drawFront(ctx) {
    this.drawList(ctx, this.front);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 26px "Bungee", "Black Han Sans", sans-serif';
    for (const p of this.popups) {
      if (p.comic) { this.drawComic(ctx, p); continue; }
      const a = 1 - Math.max(0, (p.t - 0.8) / 0.4);
      const sc = p.t < 0.12 ? 0.6 + p.t * 3.4 : 1;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.scale(sc, sc);
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(20,10,0,0.85)';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  drawComic(ctx, p) {
    const k = p.t / p.life;
    const sc = k < 0.15 ? 0.3 + (k / 0.15) * 0.9 : 1.2 - (k - 0.15) * 0.25;
    ctx.save();
    ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(sc, sc);
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, r = i % 2 ? 26 : 40;
      ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.85);
    }
    ctx.closePath();
    ctx.fillStyle = '#fff6b8'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a0a00'; ctx.stroke();
    ctx.font = '900 24px "Bungee", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = '#1a0a00'; ctx.strokeText(p.text, 0, 1);
    ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 1);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  drawList(ctx, list) {
    for (const p of list) {
      const k = p.t / p.life;
      if (p.k === 'chunk') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = p.color; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.7);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.2);
        ctx.restore();
      } else if (p.k === 'glass') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = 'rgba(190,230,255,0.9)';
        ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s, p.s); ctx.lineTo(-p.s, p.s * 0.5); ctx.fill();
        ctx.restore();
      } else if (p.k === 'dust') {
        ctx.globalAlpha = 0.55 * (1 - k);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
        g.addColorStop(0, 'rgba(214,200,176,1)'); g.addColorStop(1, 'rgba(214,200,176,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill();
      } else if (p.k === 'smoke') {
        ctx.globalAlpha = 0.5 * (1 - k);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
        g.addColorStop(0, 'rgba(60,58,64,1)'); g.addColorStop(1, 'rgba(60,58,64,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill();
      } else if (p.k === 'spark') {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = p.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else if (p.k === 'boom') {
        const r = p.s * (0.4 + k * 1.2);
        ctx.globalAlpha = 1 - k;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.35, 'rgba(255,170,60,0.9)'); g.addColorStop(1, 'rgba(200,40,10,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.k === 'bolt') {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#bff3ff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#5be0ff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        let x = p.x, y = p.y;
        for (let s = 0; s < 4; s++) {
          x += Math.cos(p.a) * p.len / 4 + rand(-8, 8); y += Math.sin(p.a) * p.len / 4 + rand(-8, 8);
          ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
  }
}

export const DEBRIS_COLORS = ['#6d6a63', '#8b7f6c', '#4c4a46', '#a0907a'];
export const randomDebrisColor = () => pick(DEBRIS_COLORS);
