// People, soldiers, items, vehicles and projectiles.
import { shade } from '../util.js';

const OUT = '#14100c';

function blob(ctx, x, y, rx, ry, col, light = 0.3) {
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(x, y, rx + 1.5, ry + 1.5, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x - rx * 0.4, y - ry * 0.4, 1, x, y, Math.max(rx, ry));
  g.addColorStop(0, shade(col, light)); g.addColorStop(1, shade(col, -0.3));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
}

// Person leaning out of a window, waving (r = window rect in world coords).
export function drawWindowPerson(ctx, r, kind, t, appear) {
  const cx = r.x + r.w / 2, by = r.y + r.h;
  const rise = Math.min(1, appear * 4);
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x - 4, r.y - 30, r.w + 8, r.h + 30); ctx.clip();
  ctx.translate(cx, by + (1 - rise) * 30);
  const wave = Math.sin(t * 10);
  if (kind === 'soldier') {
    blob(ctx, 0, -10, 9, 11, '#4f6b2f');
    blob(ctx, 0, -25, 6.5, 7, '#e2b089', 0.2);
    ctx.fillStyle = '#3b5222'; ctx.beginPath(); ctx.ellipse(0, -29, 8.5, 5, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(-9, -29, 18, 2);
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-16, -14, 22, 4);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(2, -14, 8, 5);
  } else {
    const woman = kind === 'woman';
    blob(ctx, 0, -10, 8.5, 11, woman ? '#d42f3a' : '#e6c13a');
    blob(ctx, 0, -25, 6.5, 7, '#efbd94', 0.2);
    ctx.fillStyle = woman ? '#6a3412' : '#2c2119';
    ctx.beginPath(); ctx.ellipse(0, woman ? -26 : -29, woman ? 8 : 6.5, woman ? 8 : 4, 0, Math.PI, 0); ctx.fill();
    if (woman) { ctx.fillRect(-8, -27, 3, 10); ctx.fillRect(5, -27, 3, 10); }
    ctx.strokeStyle = '#efbd94'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(13 + wave * 3, -30); ctx.moveTo(-6, -14); ctx.lineTo(-13 - wave * 3, -30); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, -21, 2, 2.5, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

export const ITEM_INFO = {
  milk: { cls: 'food', label: 'MILK', heal: 14, score: 100 },
  turkey: { cls: 'food', label: 'TURKEY', heal: 20, score: 100 },
  toast: { cls: 'food', label: 'HOT TOAST', heal: 12, score: 100 },
  melon: { cls: 'food', label: 'MELON', heal: 14, score: 100 },
  burger: { cls: 'food', label: 'BURGER', heal: 18, score: 100 },
  cactus: { cls: 'hazard', label: 'CACTUS', dmg: 10 },
  poison: { cls: 'hazard', label: 'POISON', dmg: 16 },
  toaster: { cls: 'hazard', label: 'TOASTER', dmg: 12, zap: true },
  bulb: { cls: 'hazard', label: 'LIGHT BULB', dmg: 10, zap: true },
  dynamite: { cls: 'hazard', label: 'TNT', dmg: 14, boom: true },
  money: { cls: 'bonus', label: 'MONEY BAG', score: 1000 },
  flower: { cls: 'bonus', label: 'FLOWER POT', score: 350 },
  tv: { cls: 'bonus', label: 'T.V. OFF', score: 500 },
};

export function drawItem(ctx, type, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t * 5) * 1.5;
  ctx.translate(0, bob);
  ctx.shadowColor = ITEM_INFO[type].cls === 'food' ? 'rgba(120,255,140,0.9)' : ITEM_INFO[type].cls === 'bonus' ? 'rgba(255,220,80,0.9)' : 'rgba(255,80,60,0.7)';
  ctx.shadowBlur = 10;
  switch (type) {
    case 'milk':
      ctx.fillStyle = OUT; ctx.fillRect(-7, -14, 14, 24);
      ctx.fillStyle = '#f7f7f2'; ctx.fillRect(-5.5, -12, 11, 20);
      ctx.fillStyle = '#3c7ad8'; ctx.fillRect(-5.5, -3, 11, 6);
      ctx.fillStyle = '#ddd'; ctx.fillRect(-3, -17, 6, 5);
      break;
    case 'turkey':
      blob(ctx, 0, 0, 13, 9, '#c47a33');
      ctx.fillStyle = '#f4ead2'; ctx.fillRect(8, -8, 9, 3); ctx.beginPath(); ctx.arc(17, -7, 3, 0, 7); ctx.fill();
      break;
    case 'toast':
      blob(ctx, 0, 0, 11, 10, '#d99a4a');
      ctx.fillStyle = '#f6dca6'; ctx.fillRect(-7, -6, 14, 12);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -12); ctx.quadraticCurveTo(i * 5 + 3, -17, i * 5, -22); ctx.stroke(); }
      break;
    case 'melon':
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#2f8a3a'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#ec4552'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#111'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 3.5, 3, 1.5, 2.5);
      break;
    case 'burger':
      blob(ctx, 0, -5, 12, 6, '#d9963d'); ctx.fillStyle = '#5b2f14'; ctx.fillRect(-12, -1, 24, 5);
      ctx.fillStyle = '#58b64a'; ctx.fillRect(-12, -2, 24, 2); blob(ctx, 0, 6, 12, 3.5, '#d9963d');
      break;
    case 'cactus':
      ctx.fillStyle = '#b5552a'; ctx.fillRect(-9, 4, 18, 9);
      blob(ctx, 0, -6, 5, 13, '#3f9a3e'); blob(ctx, -8, -6, 3, 6, '#3f9a3e'); blob(ctx, 8, -9, 3, 6, '#3f9a3e');
      break;
    case 'poison':
      ctx.fillStyle = OUT; ctx.fillRect(-8, -12, 16, 24);
      ctx.fillStyle = '#5c2a8a'; ctx.fillRect(-6.5, -10, 13, 20);
      ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(0, -1, 4, 0, 7); ctx.fill(); ctx.fillRect(-2.5, 2, 5, 3);
      ctx.fillStyle = '#111'; ctx.fillRect(-2.5, -2, 1.6, 1.6); ctx.fillRect(1, -2, 1.6, 1.6);
      break;
    case 'toaster':
      ctx.fillStyle = OUT; ctx.fillRect(-13, -9, 26, 20);
      const tg = ctx.createLinearGradient(-12, 0, 12, 0); tg.addColorStop(0, '#f4f6f8'); tg.addColorStop(1, '#8b939c');
      ctx.fillStyle = tg; ctx.fillRect(-11.5, -7.5, 23, 17);
      ctx.fillStyle = '#222'; ctx.fillRect(-8, -7.5, 6, 2); ctx.fillRect(2, -7.5, 6, 2);
      break;
    case 'bulb':
      blob(ctx, 0, -4, 9, 10, '#fff4a8', 0.5);
      ctx.fillStyle = '#9ba2ab'; ctx.fillRect(-4.5, 5, 9, 7);
      break;
    case 'dynamite':
      for (let i = -1; i <= 1; i++) { ctx.fillStyle = OUT; ctx.fillRect(i * 6 - 3.5, -11, 7, 22); ctx.fillStyle = '#d4302c'; ctx.fillRect(i * 6 - 2.5, -10, 5, 20); }
      ctx.strokeStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(4, -18, 8, -16); ctx.stroke();
      ctx.fillStyle = Math.sin(t * 30) > 0 ? '#ffe36b' : '#ff7b2b'; ctx.beginPath(); ctx.arc(8, -16, 2.5, 0, 7); ctx.fill();
      break;
    case 'money':
      blob(ctx, 0, 2, 12, 11, '#c8b07a');
      ctx.fillStyle = '#9e8a58'; ctx.fillRect(-4, -12, 8, 5);
      ctx.fillStyle = '#2c6b2c'; ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 7);
      break;
    case 'flower':
      ctx.fillStyle = '#b5552a'; ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(8, 2); ctx.lineTo(6, 13); ctx.lineTo(-6, 13); ctx.fill();
      ctx.strokeStyle = '#3d8a35'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -8); ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = i * 1.256; blob(ctx, Math.cos(a) * 5, -11 + Math.sin(a) * 5, 3.5, 3.5, '#ff6aa8', 0.4); }
      blob(ctx, 0, -11, 2.5, 2.5, '#ffd84a');
      break;
    case 'tv':
      ctx.fillStyle = OUT; ctx.fillRect(-14, -11, 28, 22);
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-12.5, -9.5, 25, 19);
      ctx.fillStyle = '#3d4a52'; ctx.fillRect(-10, -7, 15, 14);
      ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(-9, -18); ctx.moveTo(2, -11); ctx.lineTo(7, -18); ctx.stroke();
      break;
  }
  ctx.restore();
}

export function drawHelicopter(ctx, h, t) {
  ctx.save(); ctx.translate(h.x, h.y); ctx.scale(h.face, 1); ctx.rotate(h.tilt * h.face);
  // tail boom
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-62, -10); ctx.lineTo(-62, -2); ctx.lineTo(-14, 6); ctx.fill();
  ctx.fillStyle = '#4c6236'; ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-60, -8); ctx.lineTo(-60, -4); ctx.lineTo(-14, 4); ctx.fill();
  ctx.fillStyle = '#334426'; ctx.fillRect(-66, -20, 6, 16);
  // tail rotor blur
  ctx.fillStyle = 'rgba(200,210,200,0.35)'; ctx.beginPath(); ctx.ellipse(-63, -12, 3, 12, 0, 0, 7); ctx.fill();
  // body
  const g = ctx.createLinearGradient(0, -20, 0, 18);
  g.addColorStop(0, '#7c9a5a'); g.addColorStop(0.6, '#4c6236'); g.addColorStop(1, '#2c3a1f');
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, 0, 32, 18, 0, 0, 7); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 30, 16, 0, 0, 7); ctx.fill();
  // canopy
  const cg = ctx.createLinearGradient(10, -14, 28, 6);
  cg.addColorStop(0, '#d7f1ff'); cg.addColorStop(1, '#2b5d80');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(16, -3, 13, 11, 0.2, -1.6, 1.2); ctx.fill();
  ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-4, 12, 3, 8); ctx.fillRect(14, 12, 3, 8);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-14, 19, 40, 3);
  // star
  ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(-10, 2, 5, 0, 7); ctx.fill();
  // rotor
  ctx.fillStyle = '#222'; ctx.fillRect(-2, -22, 4, 6);
  const sp = Math.sin(t * 60);
  ctx.fillStyle = 'rgba(30,30,30,0.55)'; ctx.fillRect(-52 * Math.abs(sp), -24, 104 * Math.abs(sp), 3);
  ctx.fillStyle = 'rgba(200,200,200,0.12)'; ctx.beginPath(); ctx.ellipse(0, -23, 54, 4, 0, 0, 7); ctx.fill();
  if (h.hp <= 0) { ctx.fillStyle = 'rgba(255,120,40,0.6)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); }
  ctx.restore();
}

export function drawTank(ctx, k, t) {
  ctx.save(); ctx.translate(k.x, k.y); ctx.scale(k.face, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 2, 50, 6, 0, 0, 7); ctx.fill();
  // treads
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, -10, 48, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2d2f2a'; ctx.beginPath(); ctx.ellipse(0, -10, 46, 10, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a5d55';
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.arc(i * 10 + ((t * 30 * k.vdir) % 10), -10, 3.5, 0, 7); ctx.fill(); }
  // hull
  const g = ctx.createLinearGradient(0, -36, 0, -18);
  g.addColorStop(0, '#8aa05c'); g.addColorStop(1, '#4a5a2c');
  ctx.fillStyle = OUT; ctx.fillRect(-46, -32, 92, 16);
  ctx.fillStyle = g; ctx.fillRect(-44, -30, 88, 13);
  // turret + barrel aimed at angle
  ctx.save(); ctx.translate(4, -34); ctx.rotate(-k.aim);
  ctx.fillStyle = OUT; ctx.fillRect(10, -4, 44, 8);
  ctx.fillStyle = '#5b6d34'; ctx.fillRect(10, -3, 43, 6);
  ctx.restore();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(4, -34, 22, 11, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#6f8442'; ctx.beginPath(); ctx.ellipse(4, -34, 20, 9, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(-20, -24, 4, 0, 7); ctx.fill();
  ctx.restore();
}

const CAR_STYLE = {
  police: { body: '#f3f3f3', roof: '#1b1b1b' },
  taxi: { body: '#f4c21f', roof: '#f4c21f' },
  pickup: { body: '#c4442a', roof: '#c4442a' },
};

export function drawCar(ctx, c, t) {
  const s = CAR_STYLE[c.type];
  ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.face, c.crushed ? 0.45 : 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 46, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(-46, -30, 92, 22, 6); ctx.fill();
  const g = ctx.createLinearGradient(0, -30, 0, -8);
  g.addColorStop(0, shade(s.body, 0.3)); g.addColorStop(1, shade(s.body, -0.25));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-44, -28, 88, 19, 5); ctx.fill();
  if (c.type === 'pickup') {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(4, -46, 34, 20, 4); ctx.fill();
    ctx.fillStyle = s.roof; ctx.beginPath(); ctx.roundRect(6, -44, 30, 17, 3); ctx.fill();
    ctx.fillStyle = '#a8d6f0'; ctx.fillRect(22, -41, 12, 10);
  } else {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(-24, -46, 50, 20, 6); ctx.fill();
    ctx.fillStyle = s.roof; ctx.beginPath(); ctx.roundRect(-22, -44, 46, 17, 5); ctx.fill();
    ctx.fillStyle = '#a8d6f0'; ctx.fillRect(-18, -41, 18, 11); ctx.fillRect(4, -41, 17, 11);
  }
  if (c.type === 'police') {
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-44, -22, 88, 6);
    const on = Math.sin(t * 16) > 0;
    ctx.shadowBlur = 14;
    ctx.shadowColor = on ? '#ff2a2a' : '#2a6bff';
    ctx.fillStyle = on ? '#ff3b3b' : '#4a7bff'; ctx.fillRect(-6, -50, 12, 5);
    ctx.shadowBlur = 0;
  }
  if (c.type === 'taxi') { ctx.fillStyle = '#111'; ctx.fillRect(-7, -51, 14, 6); ctx.fillStyle = '#ffe36b'; ctx.fillRect(-5, -50, 10, 4); }
  ctx.fillStyle = '#fff4c0'; ctx.fillRect(40, -24, 5, 5);
  for (const wx of [-26, 26]) {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(wx, -8, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#9aa0a8'; ctx.beginPath(); ctx.arc(wx, -8, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
}

export function drawGroundSoldier(ctx, s, t) {
  ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.face, 1);
  const w = s.moving ? Math.sin(t * 14) : 0;
  ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-w * 6, 0); ctx.moveTo(0, -16); ctx.lineTo(w * 6, 0); ctx.stroke();
  ctx.strokeStyle = '#3e5426'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-w * 6, 0); ctx.moveTo(0, -16); ctx.lineTo(w * 6, 0); ctx.stroke();
  blob(ctx, 0, -24, 6, 9, '#4f6b2f');
  blob(ctx, 1, -37, 5, 5.5, '#e2b089', 0.2);
  ctx.fillStyle = '#3b5222'; ctx.beginPath(); ctx.ellipse(1, -40, 7, 4, 0, Math.PI, 0); ctx.fill();
  ctx.save(); ctx.translate(2, -27); ctx.rotate(-s.aim);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, -2, 18, 3.5);
  ctx.restore();
  ctx.restore();
}

export function drawBullet(ctx, b) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (b.kind === 'shell') {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 10);
    g.addColorStop(0, '#fff6c8'); g.addColorStop(0.4, '#ff9b3a'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, 7); ctx.fill();
  } else {
    const len = 0.03;
    ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ffb640'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * len, b.y - b.vy * len); ctx.stroke();
  }
  ctx.restore();
}
