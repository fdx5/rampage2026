// One "day": a city block of buildings to level, plus everything trying to stop you.
import { W, H, rand, mulberry32, makeCanvas } from '../util.js';
import { Building } from './building.js';
import { Helicopter, Tank, Car, StreetSoldier, updateBullets, drawBullets } from './enemies.js';
import { renderBackdrop, renderForeground, Clouds } from '../art/sceneArt.js';
import { SEC_W } from '../art/buildingArt.js';
import { ITEM_INFO } from '../art/propArt.js';
import { FX } from '../fx.js';
import { audio } from '../audio.js';

const TODS = ['day', 'dusk', 'night'];

export class World {
  constructor(game, day) {
    this.game = game; this.day = day;
    this.diff = 1 + Math.min(1.6, (day - 1) * 0.1);
    const rng = mulberry32(day * 7919 + 17);
    this.tod = TODS[(day - 1) % 3];
    this.night = this.tod !== 'day';
    this.buildings = this.makeBuildings(rng);
    this.backdrop = renderBackdrop(this.tod, rng);
    this.foreground = renderForeground(this.tod, rng, this.buildings);
    this.clouds = new Clouds(rng, this.tod);
    this.vignette = makeVignette(this.night);
    this.fx = new FX();
    this.monsters = [];
    this.helis = []; this.tanks = []; this.cars = []; this.soldiers = []; this.bullets = [];
    this.heliT = rand(8, 14); this.tankT = rand(16, 26); this.carT = rand(2, 5); this.soldierT = rand(5, 9);
    this.cleared = false; this.clearT = 0; this.time = 0;
  }

  makeBuildings(rng) {
    let n = 2 + (rng() < 0.6 ? 1 : 0) + (this.day > 3 && rng() < 0.4 ? 1 : 0);
    const specs = [];
    for (let i = 0; i < n; i++) {
      const cols = 3 + Math.floor(rng() * 3);
      const maxF = Math.min(9, 6 + Math.floor(this.day / 2));
      specs.push({ cols, floors: 4 + Math.floor(rng() * (maxF - 3)) });
    }
    let total = specs.reduce((s, b) => s + b.cols * SEC_W, 0);
    while (total > W - 260) { const s = specs.pop(); total -= s.cols * SEC_W; }
    const free = W - 160 - total;
    const gaps = specs.map(() => 0.5 + rng());
    const gsum = gaps.reduce((a, b) => a + b, 0) + 0.5;
    let x = 80 + free * (0.25 / gsum);
    const styles = [0, 1, 2, 3, 4, 5].sort(() => rng() - 0.5);
    return specs.map((s, i) => {
      const b = new Building(Math.round(x), s.cols, s.floors, styles[i % 6], rng, this.night, Math.floor(rng() * 5));
      x += s.cols * SEC_W + free * (gaps[i] / gsum);
      return b;
    });
  }

  addMonster(m) { this.monsters.push(m); }

  liveMonsters() { return this.monsters.filter((m) => m.active); }

  nearestMonster(x, y) {
    let best = null, bd = Infinity;
    for (const m of this.monsters) {
      if (!m.active) continue;
      const d = Math.hypot(m.x - x, m.y - 60 - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  edgeNear(x, y) {
    for (const b of this.buildings) {
      if (!b.alive || y < b.top + 60) continue;
      if (Math.abs(x - b.x) < 30) return { b, side: -1 };
      if (Math.abs(x - (b.x + b.w)) < 30) return { b, side: 1 };
    }
    return null;
  }

  fireAt(x, y, speed, dmg, kind, range) {
    const m = this.nearestMonster(x, y);
    if (!m) return;
    const tx = m.x, ty = m.y - 70;
    const d = Math.hypot(tx - x, ty - y);
    if (d > range) return;
    this.bullets.push({ x, y, vx: ((tx - x) / d) * speed, vy: ((ty - y) / d) * speed, dmg, kind });
    audio.play('gunshot', { vol: 0.55, gap: 0.08 });
  }

  award(m, pts, x, y, color) {
    this.game.addScore(m.player, pts);
    this.fx.popup(x, y, pts, color);
  }

  resolvePunch(m) {
    const h = m.hand();
    // other monsters
    for (const o of this.monsters) {
      if (o === m || !o.active) continue;
      const r = o.rect();
      if (h.x > r.x - 8 && h.x < r.x + r.w + 8 && h.y > r.y && h.y < r.y + r.h) {
        o.takeHit(5, this, m.face * 26);
        audio.play('punchHit');
        this.fx.sparks(h.x, h.y, 8, '#fff');
        return;
      }
    }
    for (const hc of this.helis) {
      if (!hc.dead && hc.hitTest(h.x, h.y)) {
        hc.destroy(this); this.award(m, hc.score, hc.x, hc.y - 20); return;
      }
    }
    const onStreet = m.state === 'ground' && !m.platform;
    if (onStreet && m.punchDir !== 'up') {
      for (const s of this.soldiers) {
        if (!s.dead && s.hitTest(h.x)) {
          s.destroy(this); m.eat(this, 6, { type: 'soldier' }); this.award(m, s.score, s.x, s.y - 50); return;
        }
      }
      if (m.punchDir === 'down') {
        for (const v of [...this.cars, ...this.tanks]) {
          if (!v.dead && v.hitTest(h.x)) { v.destroy(this); this.award(m, v.score, v.x, v.y - 60); return; }
        }
      }
    }
    for (const b of this.buildings) {
      const s = b.sectionAt(h.x, h.y);
      if (!s) continue;
      const sec = b.sec(s.c, s.f);
      const r = b.windowWorld(s.c, s.f);
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (sec.occ) {
        const o = sec.occ; sec.occ = null;
        if (sec.dmg === 0) { sec.dmg = 1; this.fx.glass(cx, cy, 10); }
        this.consume(m, o, cx, cy);
        return;
      }
      const res = b.hit(s.c, s.f, this);
      if (res === 'crack') { audio.play('wallHit'); }
      else if (res === 'hole') { audio.play('punchHit'); audio.play('debris', { vol: 0.6 }); this.award(m, 50, cx, cy, '#ffffff'); }
      else { audio.play('wallHit', { vol: 0.5 }); }
      this.fx.shake(2, 0.08);
      return;
    }
    audio.play('punchWhiff', { vol: 0.5 });
  }

  consume(m, o, x, y) {
    if (o.type === 'man' || o.type === 'woman') {
      m.eat(this, 8, { type: o.type }); this.award(m, 1000, x, y - 10);
      return;
    }
    if (o.type === 'soldier') { m.eat(this, 6, { type: 'soldier' }); this.award(m, 500, x, y - 10); return; }
    const info = ITEM_INFO[o.item];
    if (info.cls === 'food') {
      m.eat(this, info.heal, { type: 'item', item: o.item }); this.award(m, info.score, x, y - 10, '#7dff8a');
      audio.play('food', { vol: 0.7 });
    } else if (info.cls === 'bonus') {
      this.award(m, info.score, x, y - 10, '#ffd84a'); audio.play('bonus');
      this.fx.sparks(x, y, 14, '#ffe36b');
    } else {
      m.takeHit(info.dmg, this);
      if (info.zap) { this.fx.zap(x, y); audio.play('zap'); }
      else if (info.boom) { this.fx.explosion(x, y, 0.8); audio.play('explode'); }
      else { audio.play('poison'); this.fx.popup(x, y - 10, info.label, '#ff6a5a'); }
    }
  }

  // Monster landed on the street: flatten whatever is under its feet.
  stomp(m) {
    for (const v of [...this.cars, ...this.soldiers]) {
      if (!v.dead && !v.crushed && Math.abs(v.x - m.x) < 46) {
        v.destroy(this);
        if (v instanceof StreetSoldier) m.eat(this, 4, { type: 'soldier' });
        this.award(m, v.score, v.x, v.y - 60);
      }
    }
  }

  onBuildingFalling(b) {
    for (const m of this.monsters) {
      if ((m.bld === b || m.platform === b) && m.active) { m.fall(m.side * 40); m.takeHit(4, this); }
    }
    this.fx.shake(6, 1.4);
  }

  onBuildingGone() {
    if (this.buildings.every((b) => b.state === 'gone')) {
      this.cleared = true; this.clearT = 0;
      audio.play('cityClear');
    }
  }

  spawnEnemies(dt) {
    const anyone = this.liveMonsters().length > 0;
    if (!anyone || this.cleared) return;
    const d = this.diff;
    if ((this.heliT -= dt) <= 0) {
      this.heliT = rand(11, 20) / d;
      if (this.helis.length < Math.min(3, 1 + Math.floor(this.day / 4))) this.helis.push(new Helicopter(this));
    }
    if (this.day >= 2 && (this.tankT -= dt) <= 0) {
      this.tankT = rand(18, 30) / d;
      if (this.tanks.length < 1 + Math.floor(this.day / 6)) this.tanks.push(new Tank(this));
    }
    if ((this.carT -= dt) <= 0) {
      this.carT = rand(5, 11);
      if (this.cars.length < 2) this.cars.push(new Car());
    }
    if ((this.soldierT -= dt) <= 0) {
      this.soldierT = rand(6, 12) / d;
      if (this.soldiers.length < Math.min(4, 1 + Math.floor(this.day / 3))) this.soldiers.push(new StreetSoldier());
    }
  }

  update(dt) {
    this.time += dt;
    this.clouds.update(dt);
    for (const b of this.buildings) b.update(dt, this);
    this.spawnEnemies(dt);
    for (const list of [this.helis, this.tanks, this.cars, this.soldiers]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].update(dt, this);
        if (list[i].dead) list.splice(i, 1);
      }
    }
    if (this.helis.length) audio.loop('heliLoop', 0.35); else audio.stop('heliLoop');
    if (this.cars.some((c) => c.type === 'police' && !c.crushed)) audio.loop('engineLoop', 0.25); else audio.stop('engineLoop');
    updateBullets(this, dt);
    this.fx.update(dt);
    if (this.cleared) this.clearT += dt;
  }

  draw(ctx) {
    const t = this.time;
    const [sx, sy] = this.fx.shakeOffset();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(this.backdrop, 0, 0);
    this.clouds.draw(ctx);
    for (const b of this.buildings) b.draw(ctx, t);
    ctx.drawImage(this.foreground, 0, 0);
    for (const h of this.helis) h.draw(ctx, t);
    this.fx.drawBack(ctx);
    const order = [...this.monsters].sort((a, b) => (a.state === 'climb') - (b.state === 'climb'));
    for (const m of order) m.draw(ctx, t);
    for (const s of this.soldiers) s.draw(ctx, t);
    for (const c of this.cars) c.draw(ctx, t);
    for (const k of this.tanks) k.draw(ctx, t);
    drawBullets(ctx, this);
    this.fx.drawFront(ctx);
    ctx.restore();
    ctx.drawImage(this.vignette, 0, 0);
    if (this.fx.flash > 0) {
      ctx.fillStyle = `rgba(255,240,210,${this.fx.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function makeVignette(night) {
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, night ? 'rgba(0,0,20,0.55)' : 'rgba(30,10,0,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  return cv;
}
