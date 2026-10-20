// City backdrop: sky, layered parallax skyline, street and foreground props.
import { W, H, GROUND, makeCanvas, shade } from '../util.js';

export const TIMES = {
  day: { sky: ['#3d7fd0', '#8dc1ec', '#f6dcae'], far: '#9fb1c8', mid: '#6d7f99', near: '#46546b', haze: 'rgba(255,236,200,0.25)', night: false },
  dusk: { sky: ['#1d1f4a', '#8c3f78', '#ffa864'], far: '#5a3c6a', mid: '#3a2a52', near: '#22193a', haze: 'rgba(255,140,90,0.22)', night: true },
  night: { sky: ['#030617', '#0c1a3c', '#27406e'], far: '#16213f', mid: '#0f1730', near: '#070c1c', haze: 'rgba(80,120,200,0.15)', night: true },
};

function skyline(ctx, rng, baseY, minH, maxH, color, litColor, density) {
  let x = -20;
  ctx.fillStyle = color;
  const lit = [];
  while (x < W + 20) {
    const w = 30 + rng() * 70, h = minH + rng() * (maxH - minH);
    ctx.fillRect(x, baseY - h, w, h + 2);
    const top = rng();
    if (top < 0.25) { ctx.fillRect(x + w * 0.3, baseY - h - 14, w * 0.4, 14); }
    else if (top < 0.4) { ctx.beginPath(); ctx.moveTo(x + w * 0.2, baseY - h); ctx.lineTo(x + w / 2, baseY - h - 30 - rng() * 30); ctx.lineTo(x + w * 0.8, baseY - h); ctx.fill(); }
    else if (top < 0.5) { ctx.fillRect(x + w / 2 - 1, baseY - h - 40, 2, 40); }
    if (litColor) {
      for (let wy = baseY - h + 8; wy < baseY - 6; wy += 9) {
        for (let wx = x + 5; wx < x + w - 5; wx += 8) if (rng() < density) lit.push([wx, wy]);
      }
    }
    x += w + rng() * 8;
  }
  if (litColor) {
    ctx.fillStyle = litColor;
    for (const [wx, wy] of lit) ctx.fillRect(wx, wy, 3, 4);
    ctx.fillStyle = color;
  }
}

export function renderBackdrop(todName, rng) {
  const t = TIMES[todName];
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, t.sky[0]); g.addColorStop(0.55, t.sky[1]); g.addColorStop(1, t.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  if (todName === 'night' || todName === 'dusk') {
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(todName === 'night' ? 0.8 : 0.4) * rng()})`;
      ctx.fillRect(rng() * W, rng() * GROUND * 0.6, rng() < 0.1 ? 2 : 1, rng() < 0.1 ? 2 : 1);
    }
    // moon
    const mx = 160 + rng() * 900, my = 110 + rng() * 60;
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 120);
    mg.addColorStop(0, 'rgba(255,250,220,0.35)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - 120, my - 120, 240, 240);
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(mx, my, 26, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(180,170,140,0.35)';
    ctx.beginPath(); ctx.arc(mx - 8, my - 6, 6, 0, 7); ctx.arc(mx + 9, my + 7, 4, 0, 7); ctx.fill();
  } else {
    const sx = 980 + rng() * 150, sy = 120;
    const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 260);
    sg.addColorStop(0, 'rgba(255,248,220,0.9)'); sg.addColorStop(0.15, 'rgba(255,240,200,0.4)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 260, sy - 260, 520, 520);
  }

  skyline(ctx, rng, GROUND - 40, 120, 320, t.far, t.night ? 'rgba(255,220,150,0.35)' : null, 0.25);
  ctx.fillStyle = t.haze; ctx.fillRect(0, GROUND - 260, W, 260);
  skyline(ctx, rng, GROUND - 10, 90, 250, t.mid, t.night ? 'rgba(255,210,130,0.55)' : null, 0.18);
  skyline(ctx, rng, GROUND, 40, 160, t.near, t.night ? 'rgba(255,200,120,0.6)' : null, 0.12);
  const hz = ctx.createLinearGradient(0, GROUND - 120, 0, GROUND);
  hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(1, t.haze);
  ctx.fillStyle = hz; ctx.fillRect(0, GROUND - 120, W, 120);

  drawStreet(ctx, t);
  return cv;
}

function drawStreet(ctx, t) {
  // sidewalk
  const sw = ctx.createLinearGradient(0, GROUND, 0, GROUND + 22);
  sw.addColorStop(0, t.night ? '#8e8f96' : '#cfcac0'); sw.addColorStop(1, t.night ? '#5e5f66' : '#a29c90');
  ctx.fillStyle = sw; ctx.fillRect(0, GROUND, W, 22);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = 0; x < W; x += 48) ctx.fillRect(x, GROUND, 2, 22);
  ctx.fillStyle = t.night ? '#4b4c52' : '#7d786e'; ctx.fillRect(0, GROUND + 22, W, 6);
  // asphalt
  const rd = ctx.createLinearGradient(0, GROUND + 28, 0, H);
  rd.addColorStop(0, t.night ? '#1d1f26' : '#3a3c42'); rd.addColorStop(1, t.night ? '#0d0e12' : '#24262b');
  ctx.fillStyle = rd; ctx.fillRect(0, GROUND + 28, W, H - GROUND - 28);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 900; i++) ctx.fillRect(Math.random() * W, GROUND + 28 + Math.random() * 64, 2, 1);
  ctx.fillStyle = '#e8c547';
  for (let x = 10; x < W; x += 80) ctx.fillRect(x, GROUND + 60, 44, 4);
}

// Lamps and shrubs along the sidewalk, drawn over the buildings' bases.
export function renderForeground(todName, rng, buildings) {
  const t = TIMES[todName];
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  for (let x = 40 + rng() * 60; x < W; x += 140 + rng() * 120) {
    const doorBlocked = buildings.some((b) => b.doorCol >= 0 && Math.abs(b.x + (b.doorCol + 0.5) * 56 - x) < 34);
    if (doorBlocked) continue;
    if (rng() < 0.45) {
      // street lamp
      ctx.strokeStyle = '#25272c'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, GROUND + 4); ctx.lineTo(x, GROUND - 92); ctx.quadraticCurveTo(x, GROUND - 104, x + 16, GROUND - 104); ctx.stroke();
      ctx.fillStyle = '#25272c'; ctx.fillRect(x + 10, GROUND - 106, 18, 6);
      if (t.night) {
        const lg = ctx.createRadialGradient(x + 19, GROUND - 98, 2, x + 19, GROUND - 60, 90);
        lg.addColorStop(0, 'rgba(255,214,140,0.55)'); lg.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x + 12, GROUND - 100); ctx.lineTo(x + 26, GROUND - 100); ctx.lineTo(x + 70, GROUND + 20); ctx.lineTo(x - 32, GROUND + 20); ctx.fill();
        ctx.fillStyle = '#fff1c4'; ctx.fillRect(x + 12, GROUND - 100, 14, 3);
      }
    } else {
      // shrub / tree
      const s = 0.7 + rng() * 0.6;
      ctx.fillStyle = '#3a2614'; ctx.fillRect(x - 3, GROUND - 26 * s, 6, 26 * s);
      const leaf = t.night ? '#1d3b22' : '#3f7a35';
      for (let i = 0; i < 6; i++) {
        const lx = x + (rng() - 0.5) * 34 * s, ly = GROUND - 30 * s - rng() * 26 * s, r = (10 + rng() * 8) * s;
        const gg = ctx.createRadialGradient(lx - r * 0.3, ly - r * 0.4, 1, lx, ly, r);
        gg.addColorStop(0, shade(leaf, 0.3)); gg.addColorStop(1, shade(leaf, -0.3));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.fill();
      }
    }
  }
  return cv;
}

export class Clouds {
  constructor(rng, todName) {
    this.list = [];
    this.tint = todName === 'day' ? 'rgba(255,255,255,0.75)' : todName === 'dusk' ? 'rgba(255,170,150,0.35)' : 'rgba(120,140,190,0.18)';
    for (let i = 0; i < 6; i++) this.list.push({ x: rng() * W, y: 90 + rng() * 200, s: 0.6 + rng() * 1.2, v: 6 + rng() * 10 });
  }
  update(dt) { for (const c of this.list) { c.x += c.v * dt; if (c.x > W + 200) c.x = -200; } }
  draw(ctx) {
    ctx.fillStyle = this.tint;
    for (const c of this.list) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 70 * c.s, 16 * c.s, 0, 0, 7);
      ctx.ellipse(c.x - 30 * c.s, c.y + 4 * c.s, 40 * c.s, 12 * c.s, 0, 0, 7);
      ctx.ellipse(c.x + 34 * c.s, c.y - 6 * c.s, 44 * c.s, 15 * c.s, 0, 0, 7);
      ctx.fill();
    }
  }
}
