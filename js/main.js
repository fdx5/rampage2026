// RAMPAGE 2026 — entry point, scene flow and player management.
import { W, H, mulberry32, clamp } from './util.js';
import { Input } from './input.js';
import { audio, SFX } from './audio.js';
import { CITIES, HEADLINES, SFX_CODES } from './data.js';
import { World } from './game/world.js';
import { Monster } from './game/monster.js';
import { renderBackdrop } from './art/sceneArt.js';
import { drawHUD, drawTitle, drawNews, drawGameOver, drawPause, drawSoundTest, MENU_RECTS } from './ui.js';
import { loadSave, writeSave } from './save.js';
import { REAL, loadRealAssets } from './art/realAssets.js';
import { KINDS } from './art/monsterArt.js';

const KIND_ORDER = ['george', 'lizzie', 'ralph'];
const SPAWN_X = [150, W - 150, W / 2];
const CONTINUE_TIME = 10;

// Reverse map for the sound test labels.
const SFX_LABELS = {};
for (const [name, v] of Object.entries(SFX)) for (const c of [].concat(v)) SFX_LABELS[c] = SFX_LABELS[c] ? SFX_LABELS[c] + '/' + name : name;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input();
    this.scene = 'title';
    this.sceneT = 0;
    this.time = 0;
    this.day = 1;
    this.hiscore = Number(safeGet('rampage2026.hi') || 0);
    this.players = KIND_ORDER.map((kind) => ({ kind, joined: false, score: 0, monster: null, contT: 0 }));
    this.setP1Kind(KIND_ORDER.includes(safeGet('rampage2026.p1kind')) ? safeGet('rampage2026.p1kind') : 'george', false);
    this.titleBackdrop = renderBackdrop('night', mulberry32(42));
    this.paused = false;
    this.soundTest = { sel: 0, playing: null, src: null };
    this.save = loadSave();
    this.menu = { sel: this.save ? 2 : 1, stage: this.save?.day ?? 1 };
    this.taps = [];
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.taps.push({ x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
    });
    this.resize();
    addEventListener('resize', () => this.resize());
    const unlock = () => audio.unlock();
    addEventListener('keydown', unlock); addEventListener('pointerdown', unlock); addEventListener('touchstart', unlock); addEventListener('touchend', unlock);
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = Math.min(innerWidth / W, innerHeight / H);
    this.canvas.style.width = `${W * s}px`;
    this.canvas.style.height = `${H * s}px`;
    this.canvas.width = Math.round(W * s * dpr);
    this.canvas.height = Math.round(H * s * dpr);
    this.scale = (W * s * dpr) / W;
  }

  get cityName() { return CITIES[(this.day - 1) % CITIES.length]; }

  addScore(i, pts) { this.players[i].score += pts; }

  setScene(s) { this.scene = s; this.sceneT = 0; }

  // Player 1 picks any monster; players 2 and 3 get the remaining two in order.
  setP1Kind(kind, announce = true) {
    this.players[0].kind = kind;
    const rest = KIND_ORDER.filter((k) => k !== kind);
    this.players[1].kind = rest[0];
    this.players[2].kind = rest[1];
    safeSet('rampage2026.p1kind', kind);
    if (announce) audio.play('roar', { gap: 0.15 });
  }

  cycleP1Kind(d) {
    const i = KIND_ORDER.indexOf(this.players[0].kind);
    this.setP1Kind(KIND_ORDER[(i + d + KIND_ORDER.length) % KIND_ORDER.length]);
  }

  joinPlayer(i) {
    const p = this.players[i];
    audio.play('coin');
    if (!p.joined) { p.joined = true; p.score = 0; }
    p.contT = 0; p.out = false;
    if (this.scene === 'play') this.spawn(i);
  }

  spawn(i) {
    const p = this.players[i];
    const m = new Monster(p.kind, i, SPAWN_X[i]);
    m.roarT = 1;
    p.monster = m;
    this.world.addMonster(m);
    audio.play('roar', { gap: 0.3 });
  }

  // mode: 'new' | 'continue' | 'stage'
  startGame(mode = 'new', day = 1) {
    const sv = this.save;
    this.players[0].joined = true;
    for (const p of this.players) { p.score = 0; p.monster = null; p.contT = 0; p.out = false; }
    this.day = day;
    if (mode === 'continue' && sv) {
      this.day = sv.day;
      sv.players.forEach((sp, i) => {
        if (sp.joined) this.players[i].joined = true;
        this.players[i].score = sp.score;
        if (KIND_ORDER.includes(sp.kind)) this.players[i].kind = sp.kind;   // keep the monsters you played with
      });
    }
    audio.play('join');
    this.toNews();
  }

  toNews() {
    audio.stopAll();
    this.save = writeSave(this);    // checkpoint: every day is a stage you can resume
    const r = mulberry32(this.day * 31 + 7);
    this.headline = this.day === 1 ? ['EXPERIMENTAL', 'VITAMIN HAS', 'ILL EFFECTS.'] : HEADLINES[Math.floor(r() * HEADLINES.length)];
    const joined = this.players.filter((p) => p.joined);
    this.newsKind = (joined.length ? joined[Math.floor(r() * joined.length)] : this.players[0]).kind;
    this.newsBackdrop = renderBackdrop(['day', 'dusk', 'night'][(this.day - 1) % 3], mulberry32(this.day));
    audio.play('newsSting');
    audio.loop('newsMusic', 0.6);
    this.setScene('news');
  }

  startDay() {
    audio.stop('newsMusic');
    this.world = new World(this, this.day);
    this.players.forEach((p, i) => {
      p.monster = null;
      if (p.joined && p.contT <= 0 && !p.out) this.spawn(i);
    });
    audio.play('cityStart');
    this.setScene('play');
  }

  frame(now) {
    // Schedule the next frame first so a single bad frame can never freeze the game.
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    try {
      this.input.update();
      this.update(dt);
      this.draw();
    } catch (err) {
      this.errors = (this.errors || 0) + 1;
      if (this.errors <= 5) console.error('[RAMPAGE] frame error (recovered):', err);
    } finally {
      this.input.endFrame();
    }
  }

  anyAction() {
    return [0, 1, 2].some((i) => { const s = this.input.player(i); return s.punchPressed || s.jumpPressed || s.startPressed; });
  }

  update(dt) {
    this.time += dt; this.sceneT += dt;
    const inp = this.input;
    if (inp.pressed('KeyM')) audio.toggleMute();
    if (inp.pressed('KeyV')) REAL.enabled = !REAL.enabled;   // photoreal / classic toon art
    switch (this.scene) {
      case 'title':
        this.updateTitle();
        break;
      case 'news':
        if ((this.sceneT > 1.2 && (this.anyAction() || this.taps.length)) || this.sceneT > 6) this.startDay();
        break;
      case 'play':
        this.updatePlay(dt);
        break;
      case 'gameover':
        if ((this.sceneT > 2 && (this.anyAction() || this.taps.length)) || this.sceneT > 8) {
          this.toTitle();
        }
        break;
      case 'soundtest':
        this.updateSoundTest();
        break;
    }
    this.taps.length = 0;
  }

  toTitle() {
    audio.stopAll();
    for (const p of this.players) { p.joined = false; p.monster = null; }
    this.save = loadSave();
    this.menu = { sel: this.save ? 2 : 1, stage: this.save?.day ?? 1 };
    this.paused = false;
    this.setScene('title');
  }

  menuItems() {
    const sv = this.save;
    return [
      { id: 'char', label: `캐릭터 (1P)  ◀ ${KINDS[this.players[0].kind].name} ▶`, enabled: true },
      { id: 'new', label: '새 게임  NEW GAME', enabled: true },
      { id: 'continue', label: sv ? `이어하기  DAY ${sv.day} · ${CITIES[(sv.day - 1) % CITIES.length]}` : '이어하기  (저장 없음)', enabled: !!sv },
      { id: 'stage', label: sv ? `스테이지 선택  ◀ DAY ${this.menu.stage} ▶` : '스테이지 선택  (저장 없음)', enabled: !!sv },
      { id: 'sound', label: '사운드 테스트', enabled: true },
    ];
  }

  activateMenu(id) {
    if (id === 'char') { this.cycleP1Kind(1); return; }
    if (id === 'new') this.startGame('new', 1);
    else if (id === 'continue') this.startGame('continue');
    else if (id === 'stage') this.startGame('stage', this.menu.stage);
    else if (id === 'sound') this.setScene('soundtest');
  }

  updateTitle() {
    const inp = this.input, p1 = inp.player(0), items = this.menuItems(), mn = this.menu;
    const maxDay = this.save?.maxDay ?? 1;
    // players 2 and 3 join / leave with their start key
    for (let i = 1; i < 3; i++) {
      if (inp.player(i).startPressed) {
        this.players[i].joined = !this.players[i].joined;
        if (this.players[i].joined) audio.play('coin');
      }
    }
    const move = (d) => {
      do { mn.sel = (mn.sel + d + items.length) % items.length; } while (!items[mn.sel].enabled);
    };
    if (p1.upPressed) move(-1);
    if (p1.downPressed) move(1);
    if (items[mn.sel].id === 'stage') {
      if (p1.leftPressed) mn.stage = mn.stage > 1 ? mn.stage - 1 : maxDay;
      if (p1.rightPressed) mn.stage = mn.stage < maxDay ? mn.stage + 1 : 1;
    }
    if (items[mn.sel].id === 'char') {
      if (p1.leftPressed) this.cycleP1Kind(-1);
      if (p1.rightPressed) this.cycleP1Kind(1);
      // on the character row, confirming starts a new game with that monster
      if (p1.startPressed || p1.punchPressed || p1.jumpPressed) { this.activateMenu('new'); return; }
    }
    if (p1.startPressed || p1.punchPressed || p1.jumpPressed) { this.activateMenu(items[mn.sel].id); return; }
    if (inp.pressed('KeyT')) { this.setScene('soundtest'); return; }
    for (const t of this.taps) {
      // tapping a monster portrait picks it for player 1
      if (t.y > 400 && t.y < 700) {
        const kind = KIND_ORDER[[190, W / 2, W - 190].findIndex((x) => Math.abs(t.x - x) < 170)];
        if (kind) { this.setP1Kind(kind); mn.sel = 0; continue; }
      }
      const hit = MENU_RECTS.find((r) => t.x >= r.x && t.x <= r.x + r.w && t.y >= r.y && t.y <= r.y + r.h);
      if (!hit || !items[hit.i].enabled) continue;
      if (items[hit.i].id === 'char') {
        mn.sel = hit.i;
        this.cycleP1Kind(t.x < hit.x + hit.w * 0.3 ? -1 : 1);
        continue;
      }
      if (items[hit.i].id === 'stage') {
        if (t.x < hit.x + hit.w * 0.3) { mn.stage = mn.stage > 1 ? mn.stage - 1 : maxDay; mn.sel = hit.i; continue; }
        if (t.x > hit.x + hit.w * 0.7) { mn.stage = mn.stage < maxDay ? mn.stage + 1 : 1; mn.sel = hit.i; continue; }
      }
      mn.sel = hit.i;
      this.activateMenu(items[hit.i].id);
      return;
    }
  }

  updatePlay(dt) {
    const inp = this.input;
    if (inp.pressed('Escape') || this.pauseReq) { this.paused = !this.paused; this.pauseReq = false; }
    if (this.paused) {
      if (inp.pressed('KeyQ') || this.taps.some((t) => t.y > H / 2 + 60)) { this.toTitle(); return; }
      if (this.taps.length) this.paused = false;
      return;
    }
    const w = this.world;
    this.players.forEach((p, i) => {
      const s = inp.player(i);
      const m = p.monster;
      if (m) {
        m.update(dt, s, w);
        if (m.state === 'gone') { p.monster = null; p.contT = CONTINUE_TIME; w.monsters.splice(w.monsters.indexOf(m), 1); }
      } else if (s.startPressed) {
        this.joinPlayer(i);
      } else if (p.contT > 0) {
        p.contT -= dt;
        if (p.contT <= 0) p.out = true;
      }
    });
    w.update(dt);
    const hi = Math.max(...this.players.map((p) => p.score));
    if (hi > this.hiscore) { this.hiscore = hi; safeSet('rampage2026.hi', hi); }
    if (w.cleared && w.clearT > 3) {
      this.day++;
      for (const p of this.players) if (p.monster) p.monster.health = Math.min(100, p.monster.health + 10);
      this.toNews();
      return;
    }
    const anyAlive = this.players.some((p) => p.monster || p.contT > 0);
    if (!anyAlive) { audio.stopAll(); audio.play('gameOver'); this.setScene('gameover'); }
  }

  updateSoundTest() {
    const inp = this.input, st = this.soundTest, n = SFX_CODES.length;
    if (inp.pressed('ArrowRight')) st.sel = (st.sel + 1) % n;
    if (inp.pressed('ArrowLeft')) st.sel = (st.sel - 1 + n) % n;
    if (inp.pressed('ArrowDown')) st.sel = Math.min(n - 1, st.sel + 6);
    if (inp.pressed('ArrowUp')) st.sel = Math.max(0, st.sel - 6);
    const stop = () => { try { st.src?.stop(); } catch { /* already stopped */ } st.src = null; st.playing = null; };
    if (inp.pressed('KeyZ') || inp.pressed('Enter') || inp.pressed('Space')) {
      stop();
      const c = SFX_CODES[st.sel];
      st.src = audio.play(c, { gap: 0 });
      st.playing = c;
      if (st.src) st.src.onended = () => { if (st.playing === c) st.playing = null; };
    }
    if (inp.pressed('KeyX')) stop();
    if (inp.pressed('Escape') || this.taps.some((t) => t.y > H - 50)) { stop(); this.setScene('title'); return; }
    for (const t of this.taps) {
      const cols = 6, cw = 196, ch = 34, x0 = (W - cols * cw) / 2, y0 = 120;
      const c = Math.floor((t.x - x0) / cw), r = Math.floor((t.y - y0) / ch), i = r * cols + c;
      if (c >= 0 && c < cols && i >= 0 && i < n) { st.sel = i; stop(); st.src = audio.play(SFX_CODES[i], { gap: 0 }); st.playing = SFX_CODES[i]; }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.imageSmoothingQuality = 'high';
    switch (this.scene) {
      case 'title': drawTitle(ctx, this, this.time, this.titleBackdrop); break;
      case 'news': drawNews(ctx, this, this.sceneT, this.newsBackdrop); break;
      case 'play':
        this.world.draw(ctx);
        drawHUD(ctx, this, this.time);
        if (this.world.cleared) {
          const a = clamp(this.world.clearT, 0, 1);
          ctx.globalAlpha = a;
          ctx.font = '900 64px "Bungee", sans-serif'; ctx.textAlign = 'center';
          ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText('CITY DESTROYED!', W / 2, H / 2 - 40);
          ctx.fillStyle = '#ffe14d'; ctx.fillText('CITY DESTROYED!', W / 2, H / 2 - 40);
          ctx.globalAlpha = 1;
        }
        if (this.paused) drawPause(ctx);
        break;
      case 'gameover':
        this.world.draw(ctx);
        drawGameOver(ctx, this, this.sceneT);
        break;
      case 'soundtest':
        drawSoundTest(ctx, this.soundTest, SFX_LABELS, SFX_CODES, this.titleBackdrop);
        break;
    }
  }
}

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* storage unavailable */ } }

// Touch controls (player 1): analog-style d-pad, punch/jump, start/pause/fullscreen.
function setupTouch(game) {
  const pad = document.getElementById('touch');
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!pad || !isTouch) return;
  game.touch = true;
  pad.hidden = false;
  const input = game.input;
  const goFull = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  };
  for (const el of pad.querySelectorAll('[data-btn]')) {
    const b = el.dataset.btn;
    const on = (e) => { e.preventDefault(); audio.unlock(); input.setTouch(b, true); el.classList.add('on'); };
    const off = (e) => { e.preventDefault(); input.setTouch(b, false); el.classList.remove('on'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  }
  const dpad = document.getElementById('dpad'), knob = document.getElementById('knob');
  let id = null;
  const setDir = (t) => {
    const r = dpad.getBoundingClientRect();
    const dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const max = r.width / 2, dead = max * 0.28;
    const k = Math.min(1, Math.hypot(dx, dy) / max);
    const a = Math.atan2(dy, dx);
    knob.style.transform = `translate(${Math.cos(a) * k * max * 0.55}px, ${Math.sin(a) * k * max * 0.55}px)`;
    input.setTouch('left', dx < -dead); input.setTouch('right', dx > dead);
    input.setTouch('up', dy < -dead); input.setTouch('down', dy > dead);
  };
  const clear = () => { id = null; knob.style.transform = ''; for (const b of ['left', 'right', 'up', 'down']) input.setTouch(b, false); };
  dpad.addEventListener('touchstart', (e) => { e.preventDefault(); audio.unlock(); const t = e.changedTouches[0]; id = t.identifier; setDir(t); }, { passive: false });
  dpad.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) setDir(t); }, { passive: false });
  const end = (e) => { for (const t of e.changedTouches) if (t.identifier === id) clear(); };
  dpad.addEventListener('touchend', end); dpad.addEventListener('touchcancel', end);
  document.getElementById('pausebtn').addEventListener('touchstart', (e) => { e.preventDefault(); if (game.scene === 'play') game.pauseReq = true; }, { passive: false });
  document.getElementById('fsbtn').addEventListener('touchstart', (e) => { e.preventDefault(); goFull(); }, { passive: false });
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  const rot = document.getElementById('rotate');
  const checkRot = () => { rot.hidden = !(innerHeight > innerWidth); };
  addEventListener('resize', checkRot); checkRot();
}

loadRealAssets().catch(() => {});
document.fonts?.ready.then(() => {
  const game = new Game(document.getElementById('game'));
  setupTouch(game);
  window.__game = game;
});
