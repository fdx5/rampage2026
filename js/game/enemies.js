// The National Guard and city traffic: helicopters, tanks, street soldiers and cars.
import { W, GROUND, H, rand, clamp, pick } from '../util.js';
import { drawHelicopter, drawTank, drawCar, drawGroundSoldier, drawBullet } from '../art/propArt.js';
import { audio } from '../audio.js';

const ROAD_Y = GROUND + 58;

export class Helicopter {
  constructor(world) {
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.x = this.face > 0 ? -80 : W + 80;
    this.y = rand(120, 300);
    this.vx = 0; this.vy = 0; this.tilt = 0;
    this.hp = 1; this.fireT = rand(1.5, 2.5); this.life = rand(14, 22);
    this.dead = false; this.score = 500;
  }
  hitTest(x, y) { return Math.abs(x - this.x) < 40 && Math.abs(y - this.y) < 26; }
  update(dt, world) {
    this.life -= dt;
    const tgt = world.nearestMonster(this.x, this.y);
    let tx, ty;
    if (this.life < 0 || !tgt) { tx = this.face > 0 ? W + 200 : -200; ty = this.y - 40; }
    else {
      const side = this.x < tgt.x ? -1 : 1;
      tx = tgt.x + side * 210; ty = clamp(tgt.y - 120, 110, 430);
      this.face = tgt.x > this.x ? 1 : -1;
    }
    const ax = clamp((tx - this.x) * 1.4 - this.vx * 1.2, -260, 260);
    const ay = clamp((ty - this.y) * 1.4 - this.vy * 1.4, -200, 200);
    this.vx += ax * dt; this.vy += ay * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.tilt = clamp(this.vx / 900, -0.25, 0.25) * this.face;
    if (this.life < 0 && (this.x < -150 || this.x > W + 150)) this.dead = true;
    this.fireT -= dt;
    if (tgt && this.fireT <= 0 && this.life > 0 && Math.abs(tgt.x - this.x) < 420) {
      this.fireT = rand(1.3, 2.2) / world.diff;
      world.fireAt(this.x + this.face * 30, this.y + 10, 380, 3, 'bullet', 520);
    }
  }
  destroy(world) {
    this.dead = true;
    world.fx.explosion(this.x, this.y, 1.2);
    audio.play('explode');
  }
  draw(ctx, t) { drawHelicopter(ctx, this, t); }
}

export class Tank {
  constructor(world) {
    this.vdir = Math.random() < 0.5 ? 1 : -1;
    this.face = this.vdir;
    this.x = this.vdir > 0 ? -70 : W + 70;
    this.y = ROAD_Y;
    this.stopX = rand(120, W - 120);
    this.aim = 0.6; this.fireT = rand(2, 3); this.dead = false; this.score = 500;
  }
  hitTest(x) { return Math.abs(x - this.x) < 52; }
  update(dt, world) {
    const moving = Math.abs(this.x - this.stopX) > 4;
    if (moving) this.x += Math.sign(this.stopX - this.x) * 70 * dt;
    const tgt = world.nearestMonster(this.x, this.y);
    if (tgt) {
      this.face = tgt.x > this.x ? 1 : -1;
      const dx = Math.abs(tgt.x - this.x), dy = this.y - 34 - (tgt.y - 70);
      this.aim += (clamp(Math.atan2(dy, dx), 0.15, 1.35) - this.aim) * dt * 3;
      this.fireT -= dt;
      if (!moving && this.fireT <= 0) {
        this.fireT = rand(2.6, 3.8) / world.diff;
        const sp = 430;
        const bx = this.x + this.face * (4 + Math.cos(this.aim) * 54), by = this.y - 34 - Math.sin(this.aim) * 54;
        world.bullets.push({ x: bx, y: by, vx: Math.cos(this.aim) * sp * this.face, vy: -Math.sin(this.aim) * sp, dmg: 7, kind: 'shell', g: 0 });
        world.fx.sparks(bx, by, 6, '#ffcf6b');
        audio.play('tankShot');
      }
    }
    if (!tgt && Math.random() < dt * 0.2) this.stopX = this.vdir > 0 ? W + 200 : -200;
    if (this.x < -150 || this.x > W + 150) this.dead = true;
  }
  destroy(world) { this.dead = true; world.fx.explosion(this.x, this.y - 30, 1.3); audio.play('explode'); }
  draw(ctx, t) { drawTank(ctx, this, t); }
}

export class Car {
  constructor() {
    this.type = pick(['police', 'taxi', 'pickup', 'taxi']);
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.x = this.face > 0 ? -60 : W + 60;
    this.y = ROAD_Y + 8;
    this.v = rand(110, 190); this.dead = false; this.crushed = false; this.t = 0; this.score = 350;
  }
  hitTest(x) { return !this.crushed && Math.abs(x - this.x) < 50; }
  update(dt) {
    if (this.crushed) { this.t += dt; if (this.t > 1.2) this.dead = true; return; }
    this.x += this.face * this.v * dt;
    if (this.x < -120 || this.x > W + 120) this.dead = true;
  }
  destroy(world) {
    this.crushed = true;
    audio.play('crush');
    world.fx.debris(this.x, this.y - 20, 12, '#b9b9b9', 0.8);
    world.fx.sparks(this.x, this.y - 20, 10);
    setTimeout(() => audio.play('explode', { vol: 0.6 }), 250);
  }
  draw(ctx, t) { drawCar(ctx, this, t); }
}

export class StreetSoldier {
  constructor() {
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.x = this.face > 0 ? -20 : W + 20;
    this.y = GROUND + 16;
    this.fireT = rand(1, 2); this.aim = 0.8; this.moving = true; this.dead = false; this.score = 500;
    this.standAt = null;
  }
  hitTest(x) { return Math.abs(x - this.x) < 34; }
  update(dt, world) {
    const tgt = world.nearestMonster(this.x, this.y);
    if (tgt) {
      const dx = tgt.x - this.x;
      this.face = dx > 0 ? 1 : -1;
      const want = Math.abs(dx) > 260 || Math.abs(dx) < 120;
      this.moving = want;
      if (want) this.x += (Math.abs(dx) > 260 ? 1 : -1) * this.face * 80 * dt;
      this.aim = clamp(Math.atan2(this.y - 30 - (tgt.y - 70), Math.abs(dx)), 0, 1.4);
      this.fireT -= dt;
      if (!this.moving && this.fireT <= 0) {
        this.fireT = rand(1.6, 2.6) / world.diff;
        world.fireAt(this.x + this.face * 14, this.y - 28, 360, 2, 'bullet', 600);
      }
    } else {
      this.moving = true; this.x += this.face * 80 * dt;
    }
    this.x = clamp(this.x, -40, W + 40);
  }
  destroy(world) { this.dead = true; }
  draw(ctx, t) { drawGroundSoldier(ctx, this, t); }
}

export function updateBullets(world, dt) {
  const list = world.bullets;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.vy += (b.g || 0) * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H) { list.splice(i, 1); continue; }
    if (b.kind === 'shell' && b.y > GROUND + 40) { world.fx.explosion(b.x, b.y, 0.5); list.splice(i, 1); continue; }
    for (const m of world.monsters) {
      if (!m.vulnerable) continue;
      const r = m.rect();
      if (b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h) {
        m.takeHit(b.dmg, world);
        if (b.kind === 'shell') { world.fx.explosion(b.x, b.y, 0.6); audio.play('explode', { vol: 0.7 }); }
        else world.fx.sparks(b.x, b.y, 5);
        list.splice(i, 1);
        break;
      }
    }
  }
}

export function drawBullets(ctx, world) { for (const b of world.bullets) drawBullet(ctx, b); }
