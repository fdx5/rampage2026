// Player-controlled monster: walk, jump, climb building sides, stand on roofs,
// punch in three directions, eat what's found in windows. Damage runs out ->
// shrinks back into a (naked) human who runs off screen.
import { W, GROUND, clamp, rand } from '../util.js';
import { drawMonster, drawHuman } from '../art/monsterArt.js';
import { audio } from '../audio.js';

const GRAV = 1700;
const WALK = 150;
const CLIMB = 125;
const JUMP = 660;
const REACH = 118;      // feet-to-hands height: how high above the feet a monster can hold on

export class Monster {
  constructor(kind, player, x) {
    this.kind = kind; this.player = player;
    this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0;
    this.face = x < W / 2 ? 1 : -1;
    this.state = 'ground';
    this.platform = null; this.bld = null; this.side = 0;
    this.health = 100;
    this.punchT = 0; this.punchDur = 0.26; this.punchDir = 'fwd'; this.punchCD = 0; this.punchDone = true;
    this.walkPhase = 0; this.climbPhase = 0;
    this.eatT = 0; this.eatDur = 1; this.afterEat = 'ground'; this.eatWhat = null; this.eatStage = 0;
    this.hurtT = 0; this.roarT = 0; this.invuln = 1.5;
    this.dyingT = 0; this.scale = 1;
    this.seed = rand(10);
  }

  get vulnerable() { return ['ground', 'air', 'climb', 'eat'].includes(this.state) && this.invuln <= 0; }
  get active() { return ['ground', 'air', 'climb', 'eat'].includes(this.state); }

  rect() { return { x: this.x - 27, y: this.y - 120, w: 54, h: 120 }; }

  hand() {
    const f = this.face;
    if (this.punchDir === 'up') return { x: this.x + f * 22, y: this.y - 160 };
    if (this.punchDir === 'down') return { x: this.x + f * 38, y: this.platform ? this.y + 16 : this.y - 8 };
    return { x: this.x + f * 60, y: this.y - 86 };
  }

  takeHit(dmg, world, knock = 0) {
    if (!this.vulnerable) return;
    this.health -= dmg;
    this.hurtT = 0.22; this.invuln = 0.12;
    if (knock && this.state === 'ground') this.x = clamp(this.x + knock, 20, W - 20);
    audio.play('hurt', { gap: 0.25, vol: 0.8 });
    if (this.health <= 0) this.die(world);
  }

  heal(n) { this.health = Math.min(100, this.health + n); }

  die(world) {
    this.health = 0;
    this.state = 'dying'; this.dyingT = 0; this.vy = Math.min(this.vy, 0);
    this.bld = null; this.platform = null; this.punchT = 0;
    audio.play('transform');
  }

  startClimb(b, side) {
    this.state = 'climb'; this.bld = b; this.side = side; this.platform = null;
    this.face = -side; this.vx = 0; this.vy = 0;
    this.y = clamp(this.y, b.top + REACH, GROUND - 2);
  }

  fall(vx = 0) { this.state = 'air'; this.platform = null; this.bld = null; this.vy = 0; this.vx = vx; }

  // Grab -> lift to mouth -> chomp, chomp -> gulp. `what` is the prey/item held in the fist.
  eat(world, heal, what) {
    if (this.state === 'air' || !what) {
      this.heal(heal); audio.play('eat');
      world.fx.popup(this.x, this.y - 130, `+${heal} HP`, '#7dff8a');
      return;
    }
    this.afterEat = this.state;
    this.state = 'eat'; this.eatDur = 0.95; this.eatT = this.eatDur;
    this.eatWhat = what; this.eatHeal = heal; this.eatStage = 0;
    if (what.type !== 'item') audio.play('scream', { vol: 0.7, gap: 0.3 });
  }

  updateEat(dt, world) {
    this.eatT -= dt;
    if (this.afterEat === 'climb' && !this.bld?.alive) { this.eatStage = 3; this.heal(this.eatHeal); this.fall(); return; }
    const e = 1 - this.eatT / this.eatDur;
    const mx = this.x + this.face * 40, my = this.y - 98;
    const isPrey = this.eatWhat.type !== 'item';
    if (this.eatStage === 0 && e >= 0.36) {
      this.eatStage = 1; audio.play('eat');
      world.fx.comic(mx + this.face * 18, my - 26, 'CHOMP!', '#ff3b2f');
      if (isPrey) world.fx.preyBits(mx, my, this.eatWhat.type);
      else world.fx.crumbs(mx, my);
    } else if (this.eatStage === 1 && e >= 0.6) {
      this.eatStage = 2; audio.play('eat', { gap: 0 });
      world.fx.comic(mx + this.face * 26, my - 40, 'CHOMP!', '#ff7a1f');
      world.fx.crumbs(mx, my);
    } else if (this.eatStage === 2 && e >= 0.84) {
      this.eatStage = 3; this.heal(this.eatHeal);
      audio.play('gulp', { vol: 0.8 });
      world.fx.comic(mx, my - 54, 'GULP!', '#5ee06a');
      world.fx.popup(this.x, this.y - 150, `+${this.eatHeal} HP`, '#7dff8a');
    }
    if (this.eatT <= 0) { this.state = this.afterEat; this.eatWhat = null; }
  }

  update(dt, inp, world) {
    this.hurtT -= dt; this.roarT -= dt; this.punchCD -= dt; this.invuln -= dt;

    if (this.state === 'dying') {
      this.dyingT += dt;
      if (this.y < GROUND) { this.vy += GRAV * dt; this.y = Math.min(GROUND, this.y + this.vy * dt); }
      this.scale = 1 - 0.6 * Math.min(1, this.dyingT / 1.4);
      if (this.dyingT > 1.8) {
        this.state = 'human'; this.y = GROUND; this.face = this.x < W / 2 ? -1 : 1;
        audio.play('humanFlee');
      }
      return;
    }
    if (this.state === 'human') {
      this.x += this.face * 95 * dt;
      if (this.x < -40 || this.x > W + 40) this.state = 'gone';
      return;
    }
    if (this.state === 'gone') return;

    if (this.state === 'eat') { this.updateEat(dt, world); return; }

    // punching
    if (this.punchT > 0) {
      this.punchT -= dt;
      if (!this.punchDone && this.punchT <= this.punchDur * 0.55) { this.punchDone = true; world.resolvePunch(this); }
    } else if (inp.punchPressed && this.punchCD <= 0) {
      if (this.state === 'climb') {
        if (inp.left) this.face = -1; else if (inp.right) this.face = 1;
      }
      this.punchDir = inp.up ? 'up' : inp.down ? 'down' : 'fwd';
      this.punchT = this.punchDur; this.punchCD = 0.3; this.punchDone = false;
    }

    const moveX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (this.state === 'ground') this.updateGround(dt, inp, moveX, world);
    else if (this.state === 'air') this.updateAir(dt, inp, moveX, world);
    else if (this.state === 'climb') this.updateClimb(dt, inp, world);
  }

  updateGround(dt, inp, moveX, world) {
    const punching = this.punchT > 0;
    this.vx = punching ? 0 : moveX * WALK;
    if (moveX && !punching) this.face = moveX;
    this.x = clamp(this.x + this.vx * dt, 24, W - 24);
    this.walkPhase += dt * 11 * (this.vx ? 1 : 0);
    const p = this.platform;
    if (p) {
      if (!p.alive) { this.fall(); return; }
      this.y = p.top;
      if (this.x < p.x + 4 || this.x > p.x + p.w - 4) {
        const side = this.x < p.x + p.w / 2 ? -1 : 1;
        if (inp.down) { this.y = p.top + REACH; this.startClimb(p, side); return; }
        this.fall(this.vx * 0.6); return;
      }
    }
    if (inp.jumpPressed) {
      this.state = 'air'; this.vy = -JUMP; this.vx = moveX * WALK * 1.15; this.platform = null;
      return;
    }
    if (!p && inp.up && !punching) {
      const e = world.edgeNear(this.x, this.y);
      if (e) { this.y = GROUND - 4; this.startClimb(e.b, e.side); }
    }
  }

  updateAir(dt, inp, moveX, world) {
    const prevY = this.y;
    this.vy += GRAV * dt;
    this.vx += (moveX * WALK - this.vx) * Math.min(1, dt * 2.5);
    if (moveX) this.face = moveX;
    this.x = clamp(this.x + this.vx * dt, 24, W - 24);
    this.y += this.vy * dt;
    if (inp.up) {
      const e = world.edgeNear(this.x, this.y);
      if (e) { this.startClimb(e.b, e.side); return; }
    }
    if (this.vy > 0) {
      for (const b of world.buildings) {
        if (!b.alive) continue;
        if (prevY <= b.top + 2 && this.y >= b.top && this.x > b.x + 4 && this.x < b.x + b.w - 4) {
          this.land(b.top, b, world); return;
        }
      }
    }
    if (this.y >= GROUND) this.land(GROUND, null, world);
  }

  land(y, platform, world) {
    const hard = this.vy > 900;
    this.y = y; this.vy = 0; this.state = 'ground'; this.platform = platform;
    world.fx.dust(this.x, y - 2, hard ? 8 : 4, 20, hard ? 1 : 0.6);
    if (hard) { world.fx.shake(5, 0.2); audio.play('land', { vol: 0.8 }); }
    if (!platform) world.stomp(this);
  }

  updateClimb(dt, inp, world) {
    const b = this.bld;
    if (!b || !b.alive) { this.fall(this.side * 80); return; }
    this.x = this.side < 0 ? b.x - 18 : b.x + b.w + 18;
    const away = this.side < 0 ? inp.left : inp.right;
    const toward = this.side < 0 ? inp.right : inp.left;
    if (away && this.punchT <= 0) this.face = this.side;
    if (toward) this.face = -this.side;
    const punching = this.punchT > 0;
    const moveY = punching ? 0 : (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    this.y += moveY * CLIMB * dt;
    this.climbPhase += Math.abs(moveY) * dt * 9;
    const minY = b.top + REACH;
    if (this.y <= minY) {
      this.y = minY;
      if (inp.up && !punching) {
        this.state = 'ground'; this.platform = b; this.bld = null; this.y = b.top;
        this.x = this.side < 0 ? b.x + 22 : b.x + b.w - 22; this.face = -this.side;
        return;
      }
    }
    if (this.y >= GROUND) { this.y = GROUND; this.state = 'ground'; this.bld = null; return; }
    if (inp.jumpPressed) {
      this.state = 'air'; this.vy = -JUMP * 0.75; this.vx = this.side * 210; this.face = this.side; this.bld = null;
    }
  }

  draw(ctx, time) {
    if (this.state === 'gone') return;
    if (this.state === 'human') { drawHuman(ctx, this.x, this.y, this.face, time, this.kind); return; }
    if (this.invuln > 0 && this.state !== 'dying' && Math.floor(time * 20) % 2) ctx.globalAlpha = 0.55;
    drawMonster(ctx, this, time);
    ctx.globalAlpha = 1;
  }
}
