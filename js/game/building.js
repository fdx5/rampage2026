// A destructible building: a grid of sections (columns x floors). Punching a
// section cracks it, a second punch knocks a hole. Enough damage and the
// building shakes, kicks up dust and sinks into the ground.
import { GROUND, W, rand, pick, chance } from '../util.js';
import { SEC_W, FLOOR_H, ROOF_PAD, SIDE_PAD, renderFacade, makeDamageShapes, windowRect, drawSectionDamage } from '../art/buildingArt.js';
import { drawWindowPerson, drawItem, ITEM_INFO } from '../art/propArt.js';
import { audio } from '../audio.js';

const ITEMS = Object.keys(ITEM_INFO);
const COLLAPSE_AT = 0.5;

export class Building {
  constructor(x, cols, floors, style, rng, night, sign) {
    this.x = x; this.cols = cols; this.floors = floors;
    this.w = cols * SEC_W; this.h = floors * FLOOR_H;
    this.style = style; this.night = night; this.sign = sign;
    this.doorCol = rng() < 0.85 ? Math.floor(cols / 2) : -1;
    this.secs = [];
    for (let i = 0; i < cols * floors; i++) this.secs.push({ dmg: 0, occ: null, shape: makeDamageShapes(rng) });
    this.state = 'standing';
    this.timer = 0; this.sink = 0; this.shakeX = 0;
    this.canvas = renderFacade(this, rng);
    this.spawnT = rand(0.5, 2);
  }

  get top() { return GROUND - this.h + this.sink; }
  get alive() { return this.state === 'standing' || this.state === 'shaking'; }
  sec(c, f) { return this.secs[f * this.cols + c]; }

  sectionAt(px, py) {
    if (!this.alive) return null;
    const lx = px - this.x, ly = py - this.top;
    if (lx < 0 || lx >= this.w || ly < 0 || ly >= this.h) return null;
    return { c: Math.floor(lx / SEC_W), f: this.floors - 1 - Math.floor(ly / FLOOR_H) };
  }

  sectionCenter(c, f) {
    return { x: this.x + (c + 0.5) * SEC_W, y: this.top + (this.floors - 1 - f + 0.5) * FLOOR_H };
  }

  windowWorld(c, f) {
    const r = windowRect(this, c, f);
    return { x: this.x + r.x, y: this.top + r.y, w: r.w, h: r.h };
  }

  damageRatio() {
    let d = 0;
    for (const s of this.secs) d += s.dmg >= 2 ? 1 : s.dmg * 0.35;
    return d / this.secs.length;
  }

  // Returns 'crack' | 'hole' | 'solid' (already a hole)
  hit(c, f, world) {
    const s = this.sec(c, f);
    if (s.dmg >= 2) return 'solid';
    s.dmg++;
    const p = this.sectionCenter(c, f);
    if (s.dmg === 1) {
      world.fx.glass(p.x, p.y, 8);
      world.fx.debris(p.x, p.y, 4, '#7d756a', 0.6);
    } else {
      world.fx.debris(p.x, p.y, 12, pick(['#7d756a', '#8a5a44', '#6b6f5a']), 1);
      world.fx.dust(p.x, p.y, 4, 16, 0.7);
    }
    if (this.state === 'standing' && this.damageRatio() >= COLLAPSE_AT) this.startCollapse(world);
    return s.dmg === 1 ? 'crack' : 'hole';
  }

  startCollapse(world) {
    this.state = 'shaking'; this.timer = 0;
    for (const s of this.secs) s.occ = null;
    audio.play('collapseStart');
    world.fx.dust(this.x + this.w / 2, GROUND - 6, 10, this.w / 2, 1.2);
  }

  spawnOccupant(world) {
    const free = [];
    this.secs.forEach((s, i) => { if (!s.occ) free.push(i); });
    if (!free.length) return;
    const i = pick(free), s = this.secs[i];
    const f = Math.floor(i / this.cols), c = i % this.cols;
    if (f === 0 && c === this.doorCol) return;
    const d = world.diff;
    if (s.dmg >= 2) {
      if (chance(0.7)) s.occ = { type: 'item', item: pick(ITEMS), t: 0, life: rand(4, 7) };
    } else if (chance(Math.min(0.5, 0.18 + 0.04 * (world.day - 1)))) {
      s.occ = { type: 'soldier', t: 0, life: rand(4, 7), fireT: rand(0.9, 1.6) / d };
    } else {
      s.occ = { type: chance(0.5) ? 'woman' : 'man', t: 0, life: rand(3.5, 6) };
    }
  }

  update(dt, world) {
    if (this.state === 'gone') return;
    if (this.state === 'standing') {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = rand(1.4, 3.2) / world.diff; this.spawnOccupant(world); }
      this.secs.forEach((s, i) => {
        const o = s.occ;
        if (!o) return;
        o.t += dt;
        if (o.t > o.life) { s.occ = null; return; }
        if (o.type === 'soldier') {
          o.fireT -= dt;
          if (o.fireT <= 0) {
            o.fireT = rand(1.5, 2.6) / world.diff;
            const f = Math.floor(i / this.cols), c = i % this.cols;
            const r = this.windowWorld(c, f);
            world.fireAt(r.x + r.w / 2, r.y + r.h / 2, 330, 2, 'bullet', 440);
          }
        }
      });
    } else if (this.state === 'shaking') {
      this.timer += dt;
      this.shakeX = Math.sin(this.timer * 70) * 3;
      if (Math.random() < dt * 20) world.fx.dust(this.x + Math.random() * this.w, GROUND - 4, 1, 4, 1);
      if (this.timer > 1.0) {
        this.state = 'falling'; this.timer = 0;
        audio.play('collapse');
        world.onBuildingFalling(this);
      }
    } else if (this.state === 'falling') {
      this.timer += dt;
      this.sink += (80 + this.timer * 160) * dt;
      this.shakeX = Math.sin(this.timer * 50) * 2.5;
      world.fx.shake(3, 0.1);
      if (Math.random() < dt * 40) world.fx.dust(this.x + Math.random() * this.w, GROUND - 6, 1, 6, 1.4);
      if (Math.random() < dt * 10) world.fx.debris(this.x + Math.random() * this.w, this.top, 1, '#6d6a63', 0.6);
      if (this.sink >= this.h) {
        this.state = 'gone';
        audio.play('collapseEnd');
        world.fx.dust(this.x + this.w / 2, GROUND - 8, 18, this.w / 2, 1.6);
        world.onBuildingGone(this);
      }
    }
  }

  draw(ctx, time) {
    if (this.state === 'gone') return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, GROUND + 1); ctx.clip();
    const ox = this.x + this.shakeX;
    ctx.drawImage(this.canvas, ox - SIDE_PAD, this.top - ROOF_PAD);
    if (this.beacon && Math.sin(time * 4 + this.x) > 0.3) {
      const bx = ox + this.beacon.x, by = this.top + this.beacon.y;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, 16);
      g.addColorStop(0, 'rgba(255,80,60,1)'); g.addColorStop(1, 'rgba(255,40,20,0)');
      ctx.fillStyle = g; ctx.fillRect(bx - 16, by - 16, 32, 32);
      ctx.globalCompositeOperation = 'source-over';
    }
    for (let f = 0; f < this.floors; f++) {
      for (let c = 0; c < this.cols; c++) {
        const s = this.sec(c, f);
        const sx = ox + c * SEC_W, sy = this.top + (this.floors - 1 - f) * FLOOR_H;
        if (s.dmg) drawSectionDamage(ctx, this, s, sx, sy, this.night);
        if (s.occ) {
          const r = this.windowWorld(c, f); r.x += this.shakeX;
          if (s.occ.type === 'item') drawItem(ctx, s.occ.item, r.x + r.w / 2, r.y + r.h / 2 + 4, time);
          else drawWindowPerson(ctx, r, s.occ.type, time, s.occ.t);
        }
      }
    }
    // dark band where the building meets the sidewalk
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(ox, GROUND - 4, this.w, 4);
    ctx.restore();
  }
}
