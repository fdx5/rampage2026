// Pre-rendered building facades. Each building is drawn once to an offscreen
// canvas; damage (cracks, holes) and window occupants are drawn on top per frame.
import { makeCanvas, shade, rgba } from '../util.js';

export const SEC_W = 56;
export const FLOOR_H = 50;
export const ROOF_PAD = 90;   // space above the roofline for crowns, tanks and antennas
export const SIDE_PAD = 10;

export const STYLES = [
  { id: 'brick', wall: '#8e3f2c', trim: '#e9e2d4', frame: '#efe9dc' },
  { id: 'deco', wall: '#c9b48e', trim: '#a8925f', frame: '#5d4c2c' },
  { id: 'glass', wall: '#2e5b80', trim: '#c7d6e2', frame: '#1c2c3c' },
  { id: 'concrete', wall: '#6f7550', trim: '#9da27c', frame: '#2f321f' },
  { id: 'bank', wall: '#d5d0c3', trim: '#f1ede2', frame: '#565048' },
  { id: 'shop', wall: '#6b4a3a', trim: '#c9a77d', frame: '#2c1c14' },
];
const SIGNS = [
  ["DAN'S DELI", '#d8262c', '#ffe9a8'],
  ['COLD BEER', '#1f7a3a', '#fff2a0'],
  ['EATS', '#202020', '#ff5a3c'],
  ['DRUGS', '#1e4fa8', '#e8f3ff'],
  ['HOTEL', '#4c1f6b', '#ffcf5a'],
];

function noise(ctx, w, h, rng, alpha, n) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${rng() < 0.5 ? '0,0,0' : '255,255,255'},${alpha * rng()})`;
    ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
  }
}

export function windowRect(b, c, f) {
  // facade-local rect for the window of section (c, f); f = 0 is the ground floor
  const x = c * SEC_W, y = b.h - (f + 1) * FLOOR_H;
  return { x: x + 11, y: y + 11, w: SEC_W - 22, h: FLOOR_H - 20 };
}

function drawWindow(ctx, b, r, lit, rng, style) {
  const { x, y, w, h } = r;
  ctx.fillStyle = style.frame; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  if (lit) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    const warm = rng() < 0.7;
    g.addColorStop(0, warm ? '#ffe7a3' : '#d8f1ff'); g.addColorStop(1, warm ? '#f2a64a' : '#87b8e0');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // silhouette of furniture / blinds
    ctx.fillStyle = 'rgba(80,40,10,0.35)';
    if (rng() < 0.5) ctx.fillRect(x, y, w, h * (0.2 + rng() * 0.4));
    if (rng() < 0.3) ctx.fillRect(x + w * 0.6, y + h * 0.5, w * 0.3, h * 0.5);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, b.night ? '#16223a' : '#3d5470'); g.addColorStop(0.55, b.night ? '#0d1424' : '#1f2c3d'); g.addColorStop(1, b.night ? '#1d2c48' : '#4f6987');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.7); ctx.lineTo(x + w * 0.5, y); ctx.lineTo(x + w * 0.75, y); ctx.lineTo(x, y + h); ctx.fill();
    if (rng() < 0.35) { ctx.fillStyle = 'rgba(200,190,170,0.5)'; ctx.fillRect(x, y, w, h * (0.15 + rng() * 0.5)); }
  }
  ctx.fillStyle = style.frame; ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
  ctx.fillRect(x, y + h * 0.45, w, 2.5);
  // sill
  ctx.fillStyle = style.trim; ctx.fillRect(x - 5, y + h + 2, w + 10, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 5, y + h + 6, w + 10, 3);
}

export function renderFacade(b, rng) {
  const st = STYLES[b.style];
  const W = b.w + SIDE_PAD * 2, Hh = b.h + ROOF_PAD;
  const cv = makeCanvas(W, Hh);
  const ctx = cv.getContext('2d');
  ctx.translate(SIDE_PAD, ROOF_PAD);

  // wall with vertical light gradient and side shading
  const g = ctx.createLinearGradient(0, 0, b.w, 0);
  g.addColorStop(0, shade(st.wall, 0.12)); g.addColorStop(0.65, st.wall); g.addColorStop(1, shade(st.wall, -0.35));
  ctx.fillStyle = g; ctx.fillRect(0, 0, b.w, b.h);
  const v = ctx.createLinearGradient(0, 0, 0, b.h);
  v.addColorStop(0, 'rgba(255,255,255,0.08)'); v.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, b.w, b.h);

  if (st.id === 'brick' || st.id === 'shop') {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let y = 0; y < b.h; y += 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(b.w, y); ctx.stroke();
      for (let x = (y / 6) % 2 ? 0 : 7; x < b.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 6); ctx.stroke(); }
    }
    noise(ctx, b.w, b.h, rng, 0.12, b.w * b.h / 40);
  } else if (st.id === 'glass') {
    for (let c = 0; c < b.cols; c++) {
      const gg = ctx.createLinearGradient(c * SEC_W, 0, c * SEC_W + SEC_W, b.h);
      gg.addColorStop(0, 'rgba(160,210,255,0.25)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.02)'); gg.addColorStop(1, 'rgba(120,180,240,0.18)');
      ctx.fillStyle = gg; ctx.fillRect(c * SEC_W, 0, SEC_W, b.h);
    }
  } else {
    noise(ctx, b.w, b.h, rng, 0.1, b.w * b.h / 60);
  }

  // floors / windows
  for (let f = 0; f < b.floors; f++) {
    const y = b.h - (f + 1) * FLOOR_H;
    if (st.id !== 'glass') {
      ctx.fillStyle = st.trim; ctx.fillRect(-2, y, b.w + 4, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-2, y + 3, b.w + 4, 2);
    } else {
      ctx.fillStyle = 'rgba(200,225,240,0.5)'; ctx.fillRect(0, y, b.w, 2);
    }
    for (let c = 0; c < b.cols; c++) {
      if (f === 0 && b.doorCol === c) continue;
      const lit = b.night ? rng() < 0.55 : rng() < 0.08;
      drawWindow(ctx, b, windowRect(b, c, f), lit, rng, st);
    }
  }
  // vertical pilasters for deco/bank/concrete
  if (st.id === 'deco' || st.id === 'concrete') {
    for (let c = 0; c <= b.cols; c++) {
      ctx.fillStyle = rgba(st.id === 'deco' ? '#ffffff' : '#000000', 0.1);
      ctx.fillRect(c * SEC_W - 3, 0, 6, b.h);
    }
  }

  // ground floor: door / shopfront
  const gy = b.h - FLOOR_H;
  if (st.id === 'shop') {
    const [txt, bg, fg] = SIGNS[b.sign % SIGNS.length];
    ctx.fillStyle = bg; ctx.fillRect(4, gy + 2, b.w - 8, 14);
    ctx.fillStyle = fg; ctx.font = '900 11px "Bungee", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(txt, b.w / 2, gy + 13);
    // awnings
    for (let c = 0; c < b.cols; c++) {
      const ax = c * SEC_W + 6;
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = s % 2 ? '#f3efe6' : bg;
        ctx.beginPath(); ctx.moveTo(ax + s * 7.3, gy + 18); ctx.lineTo(ax + (s + 1) * 7.3, gy + 18); ctx.lineTo(ax + (s + 1) * 7.3 + 2, gy + 28); ctx.lineTo(ax + s * 7.3 + 2, gy + 28); ctx.fill();
      }
    }
  }
  if (b.doorCol >= 0) {
    const dx = b.doorCol * SEC_W + SEC_W / 2;
    ctx.fillStyle = shade(st.trim, -0.2); ctx.fillRect(dx - 16, gy + 8, 32, FLOOR_H - 8);
    const dg = ctx.createLinearGradient(0, gy + 12, 0, b.h);
    dg.addColorStop(0, b.night ? '#ffd27a' : '#2a3a48'); dg.addColorStop(1, b.night ? '#a8632a' : '#121a22');
    ctx.fillStyle = dg; ctx.fillRect(dx - 12, gy + 12, 24, FLOOR_H - 12);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(dx - 0.5, gy + 12, 1, FLOOR_H - 12);
  }
  if (st.id === 'bank') {
    for (let c = 0; c <= b.cols; c++) {
      const cx = Math.min(b.w - 6, Math.max(6, c * SEC_W));
      const cg = ctx.createLinearGradient(cx - 5, 0, cx + 5, 0);
      cg.addColorStop(0, '#fffdf6'); cg.addColorStop(1, '#a8a294');
      ctx.fillStyle = cg; ctx.fillRect(cx - 5, gy - FLOOR_H + 6, 10, FLOOR_H * 2 - 6);
    }
  }

  // roof: cornice + crown
  ctx.fillStyle = shade(st.trim, -0.1); ctx.fillRect(-6, -6, b.w + 12, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-6, 3, b.w + 12, 3);
  drawRoof(ctx, b, st, rng);
  return cv;
}

function drawRoof(ctx, b, st, rng) {
  if (st.id === 'bank') {
    ctx.fillStyle = st.trim;
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(b.w / 2, -40); ctx.lineTo(b.w + 6, -6); ctx.fill();
    ctx.fillStyle = '#5e5648'; ctx.font = '900 13px "Bungee", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('BANK', b.w / 2, -14);
    return;
  }
  if (st.id === 'deco') {
    ctx.fillStyle = shade(st.wall, -0.05);
    ctx.fillRect(b.w * 0.15, -18, b.w * 0.7, 14); ctx.fillRect(b.w * 0.3, -32, b.w * 0.4, 16);
    ctx.fillStyle = st.trim; ctx.fillRect(b.w * 0.45, -60, b.w * 0.1, 30);
    return;
  }
  const r = rng();
  if (r < 0.4) {
    // water tower
    const x = b.w * (0.2 + rng() * 0.5);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 10, -6); ctx.lineTo(x - 8, -24); ctx.moveTo(x + 10, -6); ctx.lineTo(x + 8, -24); ctx.stroke();
    const tg = ctx.createLinearGradient(x - 13, 0, x + 13, 0);
    tg.addColorStop(0, '#9a6a3a'); tg.addColorStop(1, '#4a2e16');
    ctx.fillStyle = tg; ctx.fillRect(x - 13, -48, 26, 26);
    ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.moveTo(x - 15, -48); ctx.lineTo(x, -60); ctx.lineTo(x + 15, -48); ctx.fill();
  } else if (r < 0.75) {
    // antenna with beacon (beacon is animated by the world)
    const x = b.w * (0.3 + rng() * 0.4);
    ctx.strokeStyle = '#3a3d44'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x, -80); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 8, -40); ctx.lineTo(x + 8, -40); ctx.moveTo(x - 5, -60); ctx.lineTo(x + 5, -60); ctx.stroke();
    b.beacon = { x, y: -82 };
  } else {
    // AC units
    for (let i = 0; i < 2; i++) {
      const x = 10 + rng() * (b.w - 40);
      ctx.fillStyle = '#8d939b'; ctx.fillRect(x, -20, 24, 14);
      ctx.fillStyle = '#5b6068'; ctx.beginPath(); ctx.arc(x + 12, -13, 5, 0, 7); ctx.fill();
    }
  }
}

// Precomputed jagged hole outline and crack lines for one section.
export function makeDamageShapes(rng) {
  const hole = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 0.36 + rng() * 0.16;
    hole.push([0.5 + Math.cos(a) * rr * 1.05, 0.5 + Math.sin(a) * rr]);
  }
  const cracks = [];
  for (let k = 0; k < 3; k++) {
    let x = 0.5 + (rng() - 0.5) * 0.3, y = 0.5 + (rng() - 0.5) * 0.3;
    const line = [[x, y]];
    const a = rng() * Math.PI * 2;
    for (let s = 0; s < 4; s++) { x += Math.cos(a + (rng() - 0.5)) * 0.14; y += Math.sin(a + (rng() - 0.5)) * 0.14; line.push([x, y]); }
    cracks.push(line);
  }
  return { hole, cracks };
}

export function drawSectionDamage(ctx, b, sec, sx, sy, night) {
  const w = SEC_W, h = FLOOR_H;
  if (sec.dmg === 1) {
    ctx.strokeStyle = 'rgba(15,10,8,0.85)'; ctx.lineWidth = 2;
    for (const line of sec.shape.cracks) {
      ctx.beginPath(); line.forEach(([u, v], i) => (i ? ctx.lineTo(sx + u * w, sy + v * h) : ctx.moveTo(sx + u * w, sy + v * h))); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    for (const line of sec.shape.cracks) {
      ctx.beginPath(); line.forEach(([u, v], i) => (i ? ctx.lineTo(sx + u * w + 1, sy + v * h + 1) : ctx.moveTo(sx + u * w + 1, sy + v * h + 1))); ctx.stroke();
    }
  } else if (sec.dmg >= 2) {
    ctx.save();
    ctx.beginPath();
    sec.shape.hole.forEach(([u, v], i) => {
      const x = sx + (u - 0.5) * w * 1.25 + w / 2, y = sy + (v - 0.5) * h * 1.25 + h / 2;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#1a120d'; ctx.fill();
    ctx.clip();
    const g = ctx.createRadialGradient(sx + w / 2, sy + h * 0.4, 2, sx + w / 2, sy + h / 2, w * 0.7);
    g.addColorStop(0, night ? 'rgba(255,170,80,0.55)' : 'rgba(120,100,80,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(sx, sy, w, h);
    // exposed rebar / floor slab
    ctx.fillStyle = 'rgba(90,80,70,0.9)'; ctx.fillRect(sx, sy + h - 8, w, 8);
    ctx.strokeStyle = '#7a4b2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx + 8, sy + h - 8); ctx.lineTo(sx + 14, sy + h - 18); ctx.moveTo(sx + w - 10, sy + h - 8); ctx.lineTo(sx + w - 18, sy + h - 16); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    sec.shape.hole.forEach(([u, v], i) => {
      const x = sx + (u - 0.5) * w * 1.25 + w / 2, y = sy + (v - 0.5) * h * 1.25 + h / 2;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath(); ctx.stroke();
  }
}
