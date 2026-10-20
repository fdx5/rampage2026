// Procedural rendering of George, Lizzie and Ralph, modelled on the original
// 1986 sprites: big 3/4-view heads with heavy brows, glowing red eyes and gaping
// fanged mouths on hulking, furry (or scaly) bodies.
//
// Each body part is a muscle-shaped silhouette built from a width profile along
// its bone, shaded from a fixed world light, textured (fur strands or scales)
// and given a jagged fur edge. Heads are drawn separately in a head-local frame.
import { lerp, shade, rgba } from '../util.js';
import { ITEM_INFO, drawItem } from './propArt.js';
import { REAL, texPattern } from './realAssets.js';

export const KINDS = {
  george: {
    name: 'GEORGE', ui: '#f2a23a', tex: 'fur', fur: 1.7, texBody: 'fur_brown', texSkin: 'skin_gorilla', tint: '#ffe2c4',
    base: '#5c3018', light: '#a4612e', dark: '#240f05', line: '#120602',
    skin: '#c98a52', skinLight: '#f0bd86', skinDark: '#7d4f2b',
    eye: '#ff2a12', mouth: '#3a0505', gum: '#c23038',
    torso: [[0, 20, 19], [0.3, 23, 25], [0.62, 27, 29], [0.86, 28, 25], [1, 19, 15]],
    upper: [[0, 15, 13], [0.38, 18, 16], [0.75, 14, 13], [1, 11, 11]],
    fore: [[0, 12, 12], [0.3, 15, 14], [0.8, 11, 11], [1, 10, 10]],
    thigh: [[0, 16, 15], [0.5, 16, 15], [1, 11, 11]],
    shin: [[0, 11, 11], [0.45, 11, 10], [1, 9, 9]],
    hand: 11.5,
  },
  lizzie: {
    name: 'LIZZIE', ui: '#59d94a', tex: 'scale', fur: 0, texBody: 'scales_green', texSkin: 'scales_green', texBelly: 'belly_reptile', tint: '#a4b088',
    base: '#367a26', light: '#80c94f', dark: '#10330b', line: '#061503',
    skin: '#367a26', skinLight: '#80c94f', skinDark: '#1b4a12',
    belly: '#dcc85a', bellyDark: '#8f7f22', spikes: '#f2840f', spikeTip: '#ffe36a',
    eye: '#ff3a10', mouth: '#4a0608', gum: '#b8333c',
    torso: [[0, 19, 19], [0.3, 21, 24], [0.65, 23, 25], [0.88, 22, 21], [1, 16, 14]],
    upper: [[0, 12, 11], [0.4, 14, 13], [1, 9, 9]],
    fore: [[0, 10, 10], [0.4, 11, 10], [1, 8, 8]],
    thigh: [[0, 17, 16], [0.5, 15, 14], [1, 11, 10]],
    shin: [[0, 11, 11], [0.5, 10, 10], [1, 8, 8]],
    hand: 9.5, claws: true,
  },
  ralph: {
    name: 'RALPH', ui: '#c9d2e0', tex: 'fur', fur: 2.1, texBody: 'fur_grey', texSkin: 'skin_wolf', tint: '#b8b8bc',
    base: '#7a7f89', light: '#d2d7de', dark: '#2c3037', line: '#0f1013',
    skin: '#c08e62', skinLight: '#ecc192', skinDark: '#7d5534',
    eye: '#ff1e1e', mouth: '#3c0606', gum: '#bd2e36',
    torso: [[0, 18, 18], [0.3, 20, 23], [0.65, 23, 26], [0.88, 24, 22], [1, 16, 14]],
    upper: [[0, 12, 11], [0.4, 14, 12], [1, 9, 9]],
    fore: [[0, 10, 9], [0.4, 12, 11], [1, 8, 8]],
    thigh: [[0, 16, 15], [0.5, 14, 13], [1, 10, 10]],
    shin: [[0, 10, 10], [0.5, 9, 9], [1, 8, 8]],
    hand: 9.5, claws: true,
  },
};

const P = (x, y) => ({ x, y });
const mix = (a, b, t) => P(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
const hash = (i, s = 0) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const LIGHT = { x: -0.6, y: -0.8 };
const HEAD_SCALE = 1.04;           // vector heads
const PHOTO_K = 0.8;               // photo heads (relative to their metadata size)

// ---------------------------------------------------------------------------
// Pose

export function computePose(m, time) {
  const k = KINDS[m.kind];
  const breathe = Math.sin(time * 3 + m.seed) * 1.5;
  let p;
  if (m.kind === 'george') {
    p = {
      hip: P(0, -46), chest: P(10, -90), head: P(26, -110),
      shF: P(22, -92), shB: P(4, -96),
      hipF: P(7, -44), hipB: P(-6, -44),
      kneeF: P(15, -22), footF: P(14, 0), kneeB: P(-2, -22), footB: P(-11, 0),
      elbF: P(38, -62), handF: P(38, -28), elbB: P(18, -64), handB: P(16, -30),
    };
  } else {
    p = {
      hip: P(0, -48), chest: P(6, -94), head: P(18, -116),
      shF: P(16, -96), shB: P(0, -98),
      hipF: P(6, -46), hipB: P(-6, -46),
      kneeF: P(16, -24), footF: P(14, 0), kneeB: P(0, -24), footB: P(-10, 0),
      elbF: P(28, -68), handF: P(34, -46), elbB: P(10, -70), handB: P(16, -48),
    };
  }
  p.headRot = 0; p.mouth = 0.35 + Math.max(0, Math.sin(time * 1.7 + m.seed)) * 0.15; // permanent snarl
  p.tailWag = Math.sin(time * 4 + m.seed) * 0.3;
  p.held = null;
  let upper = breathe;
  const st = m.state;
  if (st === 'ground' && Math.abs(m.vx) > 1) {
    const ph = m.walkPhase, s = Math.sin(ph), c = Math.cos(ph);
    p.footF = P(4 + s * 18, -Math.max(0, c) * 12);
    p.footB = P(-4 - s * 18, -Math.max(0, -c) * 12);
    p.kneeF = P((p.hipF.x + p.footF.x) / 2 + 8, (p.hipF.y + p.footF.y) / 2);
    p.kneeB = P((p.hipB.x + p.footB.x) / 2 + 8, (p.hipB.y + p.footB.y) / 2);
    p.handF.x -= s * 12; p.elbF.x -= s * 6; p.handB.x += s * 12; p.elbB.x += s * 6;
    p.head.y += Math.abs(c) * 2; p.headRot = s * 0.05;
    upper = -Math.abs(c) * 3;
  } else if (st === 'air') {
    p.footF = P(18, -14); p.kneeF = P(22, -32); p.footB = P(-6, -10); p.kneeB = P(4, -30);
    p.elbF = P(32, -106); p.handF = P(34, -132); p.elbB = P(14, -108); p.handB = P(16, -134);
    p.mouth = 0.8;
  } else if (st === 'climb') {
    const a = Math.sin(m.climbPhase);
    p.hip = P(4, -48); p.chest = P(10, -90); p.head = P(18, -112); p.headRot = -0.08;
    p.shF = P(18, -94); p.shB = P(6, -96);
    p.elbF = P(28, -104 + a * 6); p.handF = P(34, -128 + a * 14);
    p.elbB = P(22, -102 - a * 6); p.handB = P(32, -120 - a * 14);
    p.footF = P(30, -8 - a * 10); p.kneeF = P(26, -30); p.footB = P(26, -14 + a * 10); p.kneeB = P(18, -34);
    p.hipF = P(8, -48); p.hipB = P(0, -48);
  } else if (st === 'eat') {
    // grab -> bring to mouth -> chomp chomp -> gulp
    const e = 1 - m.eatT / m.eatDur;
    const mo = mouthOffset(m.kind);
    const mouth = P(p.head.x + mo.x, p.head.y + mo.y);
    const reach = P(62, -88), reachE = P(42, -88);
    const atMouthE = P(p.head.x + 20, p.head.y + 40);
    if (e < 0.28) {
      const u = e / 0.28, s = u * u * (3 - 2 * u);
      p.handF = mix(reach, mouth, s); p.elbF = mix(reachE, atMouthE, s);
      p.mouth = 0.5 + s * 0.5;
    } else if (e < 0.82) {
      p.handF = P(mouth.x + 2, mouth.y + 4); p.elbF = atMouthE;
      p.mouth = 0.25 + Math.abs(Math.sin((e - 0.28) * Math.PI * 4.5)) * 0.75;
      p.headRot = -0.12;
    } else {
      const u = (e - 0.82) / 0.18;
      p.handF = mix(P(mouth.x + 2, mouth.y + 4), P(p.handF.x, p.handF.y), u); p.elbF = mix(atMouthE, p.elbF, u);
      p.mouth = 0.1; p.headRot = -0.35 * (1 - u);
    }
    if (e < 0.8 && m.eatWhat) {
      const shrink = e < 0.3 ? 1 : Math.max(0.15, 1 - (e - 0.3) / 0.5);
      p.held = { what: m.eatWhat, s: shrink, x: p.handF.x + 2, y: p.handF.y - 6 * shrink };
    }
  } else if (st === 'dying') {
    p.head = P(p.head.x - 8, p.head.y - 4); p.headRot = -0.5; p.mouth = 1;
    p.elbF = P(28, -116); p.handF = P(36, -142); p.elbB = P(-6, -114); p.handB = P(-10, -140);
  }
  if (m.roarT > 0 && st !== 'climb' && st !== 'eat') { p.headRot = -0.35; p.mouth = 1; p.head.y -= 3; }
  if (m.hurtT > 0) p.mouth = 1;

  if (m.punchT > 0) {
    const t = 1 - m.punchT / m.punchDur;
    const ext = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 0.6);
    let hand, elb;
    if (m.punchDir === 'up') { hand = P(24, -168); elb = P(22, -130); }
    else if (m.punchDir === 'down') { hand = P(46, -6); elb = P(40, -46); }
    else { hand = P(70, -90); elb = P(46, -92); }
    p.handF = mix(p.handF, hand, ext); p.elbF = mix(p.elbF, elb, ext);
    p.mouth = Math.max(p.mouth, ext > 0.3 ? 0.9 : 0.5);
    if (m.punchDir !== 'down') { p.chest.x += ext * 5; p.head.x += ext * 6; }
  }
  for (const key of ['chest', 'head', 'shF', 'shB', 'elbF', 'handF', 'elbB', 'handB']) {
    if (st === 'climb' && key.startsWith('hand')) continue;
    if (st === 'eat' && key.endsWith('F')) continue;
    p[key].y += upper;
  }
  return p;
}


const isReal = () => REAL.ready && REAL.enabled;

// Lays a photoreal material over the current path (already filled with the shaded
// base colour): overlay keeps hue and lighting, multiply adds depth to the strands.
function texOver(ctx, name, scale = 0.3, alpha = 1) {
  if (!isReal() || !name) return;
  const pat = texPattern(name, scale);
  if (!pat) return;
  ctx.save();
  ctx.clip();
  ctx.fillStyle = pat;
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = alpha;
  ctx.fillRect(-400, -400, 800, 800);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = alpha * 0.4;
  ctx.fillRect(-400, -400, 800, 800);
  ctx.restore();
}

// Fills the current path with the photo material (real mode) or the given style.
function matFill(ctx, fallback, texName, scale = 0.3) {
  const pat = isReal() && texName ? texPattern(texName, scale) : null;
  ctx.fillStyle = pat || fallback; ctx.fill();
}

// Grey-scale form shading multiplied over the material, tinted per monster.
function shadeOver(ctx, x0, y0, x1, y1, tint, back, rect) {
  ctx.save(); ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, tint); g.addColorStop(0.5, shade(tint, -0.3)); g.addColorStop(1, shade(tint, -0.82));
  ctx.fillStyle = g; ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
  if (back) { ctx.fillStyle = '#5e5e66'; ctx.fillRect(rect[0], rect[1], rect[2], rect[3]); }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Muscle-shaped parts

function profileAt(prof, t, idx) {
  for (let i = 0; i < prof.length - 1; i++) {
    const a = prof[i], b = prof[i + 1];
    if (t <= b[0]) { const u = (t - a[0]) / (b[0] - a[0]); return lerp(a[idx], b[idx], u * u * (3 - 2 * u)); }
  }
  return prof[prof.length - 1][idx];
}

// Closed outline in bone-local space (x along the bone, -y = back, +y = front).
function outline(len, prof, furBack, furFront, seed) {
  const n = Math.max(10, Math.round(len / 2.6));
  const pts = [];
  const b0 = profileAt(prof, 0, 1), f0 = profileAt(prof, 0, 2), b1 = profileAt(prof, 1, 1), f1 = profileAt(prof, 1, 2);
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([t * len, -profileAt(prof, t, 1), furBack]); }
  for (let k = 1; k < 6; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 6, s = Math.sin(a); pts.push([len + Math.cos(a) * (b1 + f1) * 0.45, s * (s < 0 ? b1 : f1), (furBack + furFront) / 2]); }
  for (let i = n; i >= 0; i--) { const t = i / n; pts.push([t * len, profileAt(prof, t, 2), furFront]); }
  for (let k = 1; k < 6; k++) { const a = Math.PI / 2 + (k * Math.PI) / 6, s = Math.sin(a); pts.push([Math.cos(a) * (b0 + f0) * 0.45, s * (s > 0 ? f0 : b0), (furBack + furFront) / 2]); }
  // jagged fur edge: push every other point outwards
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y, amp] = pts[i];
    if (!amp || i % 2 === 0) { out.push([x, y]); continue; }
    const pv = pts[(i - 1 + pts.length) % pts.length], nx = pts[(i + 1) % pts.length];
    let dx = nx[0] - pv[0], dy = nx[1] - pv[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const a = amp * (0.55 + 0.6 * hash(i, seed));
    out.push([x + dy * a - dx * a * 0.6, y - dx * a + dy * a * 0.1]);
  }
  return out;
}

function pathPts(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// Draws one part from a to b. `mat` = {base, light, dark, line, tex}.
function part(ctx, a, b, prof, mat, L, opt = {}) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  const seed = opt.seed ?? 1;
  ctx.save();
  ctx.translate(a.x, a.y); ctx.rotate(ang);
  const pts = outline(len, prof, opt.furBack ?? mat.fur ?? 0, opt.furFront ?? mat.fur ?? 0, seed);
  const ca = Math.cos(-ang), sa = Math.sin(-ang);
  const lx = L.x * ca - L.y * sa, ly = L.x * sa + L.y * ca;   // light dir in local space
  const w = Math.max(profileAt(prof, 0.5, 1), profileAt(prof, 0.5, 2)) + 4;
  pathPts(ctx, pts);
  const real = isReal();
  if (real) {
    ctx.fillStyle = texPattern(opt.tex || mat.texBody, 0.22); ctx.fill();
    ctx.save(); ctx.clip();
    if (opt.detail) opt.detail(ctx, len, lx, ly);
    ctx.restore();
    pathPts(ctx, pts);
    shadeOver(ctx, len / 2 + lx * w, ly * w, len / 2 - lx * w, -ly * w, mat.tint || '#ffffff', mat.back, [-40, -w * 3, len + 80, w * 6]);
    pathPts(ctx, pts);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.fillStyle = mat.line; ctx.lineWidth = real ? 2.6 : 4.5; ctx.lineJoin = 'round'; ctx.strokeStyle = real ? 'rgba(0,0,0,0.8)' : mat.line; ctx.stroke();
  const g = ctx.createLinearGradient(len / 2 + lx * w, ly * w, len / 2 - lx * w, -ly * w);
  g.addColorStop(0, mat.light); g.addColorStop(0.42, mat.base); g.addColorStop(1, mat.dark);
  ctx.fillStyle = g; ctx.fill();
  texOver(ctx, opt.tex || mat.texBody);
  ctx.save(); ctx.clip();
  if (!real) texture(ctx, len, w, mat, seed);
  if (opt.detail) opt.detail(ctx, len, lx, ly);
  // rim light on the lit edge, ambient occlusion on the far edge
  ctx.translate(-lx * 3, -ly * 3);
  ctx.strokeStyle = 'rgba(255,236,200,0.28)'; ctx.lineWidth = 3; pathPts(ctx, pts); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function texture(ctx, len, w, mat, seed) {
  if (mat.tex === 'fur') {
    const n = Math.round((len * w) / 22);
    ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = hash(i, seed) * len, y = (hash(i + 99, seed) - 0.5) * w * 2;
      const l = 4 + hash(i + 7, seed) * 5;
      ctx.strokeStyle = i % 3 ? 'rgba(0,0,0,0.28)' : 'rgba(255,230,190,0.18)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l * 0.5, y + 1.5, x + l, y + (hash(i + 3, seed) - 0.5) * 3); ctx.stroke();
    }
  } else if (mat.tex === 'scale') {
    const n = Math.round((len * w) / 30);
    for (let i = 0; i < n; i++) {
      const x = hash(i, seed) * len, y = (hash(i + 50, seed) - 0.5) * w * 2, r = 1.6 + hash(i + 5, seed) * 2.6;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x + 0.8, y + 0.8, r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(200,255,150,0.2)'; ctx.beginPath(); ctx.arc(x - 0.4, y - 0.4, r * 0.7, 0, 7); ctx.fill();
    }
  }
}

function jaggedBlob(ctx, cx, cy, rx, ry, n, amp, seed, skip) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 1;
    if (i % 2 && !(skip && skip(a))) r += (amp / Math.max(rx, ry)) * (0.5 + hash(i, seed));
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function radial(ctx, x, y, r, c0, c1, c2) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2);
  return g;
}

// ---------------------------------------------------------------------------
// Face features

function glowEye(ctx, x, y, r, k, slit, angle = -0.25) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 1.4, angle, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
  g.addColorStop(0, rgba(k.eye, 0.9)); g.addColorStop(0.3, rgba(k.eye, 0.35)); g.addColorStop(1, rgba(k.eye, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4.5, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const ig = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.2);
  ig.addColorStop(0, '#fff3a0'); ig.addColorStop(0.35, '#ffb020'); ig.addColorStop(1, k.eye);
  ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r, angle, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a0000';
  if (slit) { ctx.beginPath(); ctx.ellipse(x + 0.3, y, r * 0.22, r * 0.9, 0, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(x + r * 0.25, y + 0.2, r * 0.42, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.35, r * 0.25, 0, 7); ctx.fill();
  ctx.restore();
}

// Row of teeth between two points. dir = 1 points down, -1 up. Fangs at given indices.
function teeth(ctx, x0, y0, x1, y1, n, len, dir, fangs = [], fangLen = 2.2) {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = lerp(x0, x1, t), y = lerp(y0, y1, t);
    const isFang = fangs.includes(i);
    const l = len * (isFang ? fangLen : 0.8 + 0.3 * hash(i, x0));
    const w = ((x1 - x0) / n) * (isFang ? 0.75 : 0.5);
    const g = ctx.createLinearGradient(x, y, x, y + l * dir);
    g.addColorStop(0, '#d9cfae'); g.addColorStop(0.4, '#fffaf0'); g.addColorStop(1, '#f2e6c4');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(40,20,10,0.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.4, y + l * dir * 0.7, x + w * 0.15, y + l * dir); ctx.quadraticCurveTo(x + w * 0.5, y + l * dir * 0.5, x + w, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drool(ctx, x, y0, y1, t) {
  ctx.strokeStyle = 'rgba(220,240,255,0.55)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + Math.sin(t * 3) * 2, (y0 + y1) / 2 + 3, x + 1, y1); ctx.stroke();
  ctx.fillStyle = 'rgba(220,240,255,0.6)'; ctx.beginPath(); ctx.arc(x + 1, y1, 1.6, 0, 7); ctx.fill();
}

// Open maw: interior, gums, teeth, tongue. Rect centred at (cx, cy).
function maw(ctx, k, cx, cy, w, h, t, fangsUp = [0, 5], fangsDown = [0, 4]) {
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, w * 0.7);
  g.addColorStop(0, '#120000'); g.addColorStop(1, k.mouth);
  ctx.fillStyle = k.line; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 + 2.5, h / 2 + 2.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); ctx.clip();
  ctx.fillStyle = '#c4505a'; ctx.beginPath(); ctx.ellipse(cx + 1, cy + h * 0.42, w * 0.32, h * 0.25, 0, 0, 7); ctx.fill();
  ctx.fillStyle = k.gum; ctx.fillRect(cx - w / 2, cy - h / 2, w, 3.2); ctx.fillRect(cx - w / 2, cy + h / 2 - 3.2, w, 3.2);
  ctx.restore();
  const tl = Math.min(4.2, 2 + h * 0.18);
  teeth(ctx, cx - w / 2 + 1, cy - h / 2 + 2, cx + w / 2 - 1, cy - h / 2 + 2, 6, tl, 1, fangsUp, Math.min(2.6, 1 + h / 8));
  teeth(ctx, cx - w / 2 + 2, cy + h / 2 - 2, cx + w / 2 - 2, cy + h / 2 - 2, 5, tl * 0.9, -1, fangsDown, Math.min(2.4, 1 + h / 9));
  if (h > 10) drool(ctx, cx + w * 0.2, cy - h / 2 + 4, cy + h / 2 + 4 + Math.sin(t * 2) * 2, t);
}

function headGeorge(ctx, k, mo, t) {
  // fur skull with ragged outline (smooth where the face is)
  jaggedBlob(ctx, -2, -3, 27, 28, 34, 4.5, 3, (a) => a > -0.9 && a < 1.4);
  ctx.fillStyle = k.line; ctx.lineWidth = 4.5; ctx.strokeStyle = k.line; ctx.stroke();
  ctx.fillStyle = radial(ctx, -10, -16, 40, k.light, k.base, k.dark); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 26; i++) { const a = -2.6 + hash(i, 4) * 3.3, r = 10 + hash(i, 5) * 15; const x = -2 + Math.cos(a) * r, y = -3 + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 5); ctx.stroke(); }
  ctx.restore();
  // face mask
  const open = mo * 15;
  ctx.beginPath();
  ctx.moveTo(-8, -9); ctx.bezierCurveTo(0, -17, 18, -18, 28, -11);
  ctx.bezierCurveTo(35, -2, 35, 10, 33, 18 + open * 0.5);
  ctx.bezierCurveTo(30, 30 + open, 12, 34 + open, 2, 28 + open * 0.8);
  ctx.bezierCurveTo(-8, 22, -11, 6, -8, -9);
  ctx.closePath();
  ctx.lineWidth = 3.5; ctx.strokeStyle = k.line; ctx.stroke();
  const fg = ctx.createLinearGradient(-6, -14, 24, 30);
  fg.addColorStop(0, k.skinLight); fg.addColorStop(0.5, k.skin); fg.addColorStop(1, k.skinDark);
  ctx.fillStyle = fg; ctx.fill();
  ctx.save(); ctx.clip();
  // eye sockets
  ctx.fillStyle = 'rgba(30,10,2,0.75)';
  ctx.beginPath(); ctx.ellipse(18, -4, 8, 6, -0.2, 0, 7); ctx.ellipse(2, -5, 6, 5.5, 0.2, 0, 7); ctx.fill();
  // cheek wrinkles
  ctx.strokeStyle = 'rgba(80,40,15,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-3, 6); ctx.quadraticCurveTo(2, 14, 1, 22); ctx.moveTo(10, 4); ctx.quadraticCurveTo(13, 9, 11, 13); ctx.stroke();
  ctx.restore();
  glowEye(ctx, 18, -3.5, 3.4, k, false, -0.3);
  glowEye(ctx, 2.5, -4.5, 2.7, k, false, 0.25);
  // heavy angry brow ridge
  ctx.beginPath();
  ctx.moveTo(-10, -6); ctx.quadraticCurveTo(-4, -18, 4, -14); ctx.lineTo(10, -6);
  ctx.lineTo(15, -13); ctx.quadraticCurveTo(24, -19, 31, -11); ctx.lineTo(27, -8);
  ctx.quadraticCurveTo(21, -11, 16, -7); ctx.lineTo(10, -1); ctx.lineTo(4, -8); ctx.quadraticCurveTo(-3, -11, -7, -2); ctx.closePath();
  ctx.lineWidth = 3; ctx.strokeStyle = k.line; ctx.stroke();
  ctx.fillStyle = radial(ctx, 4, -18, 30, k.light, k.base, k.dark); ctx.fill();
  // nose bridge wrinkles + nostrils
  ctx.strokeStyle = 'rgba(60,25,8,0.8)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(15 + i, -2 + i * 3); ctx.quadraticCurveTo(20 + i, -4 + i * 3, 24 + i, -1 + i * 3); ctx.stroke(); }
  ctx.fillStyle = k.skinLight; ctx.beginPath(); ctx.ellipse(25, 8, 9, 5.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1c0a03';
  ctx.beginPath(); ctx.ellipse(22, 9, 3, 2.2, 0.3, 0, 7); ctx.ellipse(29, 9, 2.6, 2, -0.2, 0, 7); ctx.fill();
  // mouth
  maw(ctx, k, 19, 18 + open * 0.45, 24, 4 + open, t);
  // snarl lip
  ctx.strokeStyle = k.skinDark; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(6, 14); ctx.quadraticCurveTo(12, 11, 19, 13); ctx.quadraticCurveTo(26, 11, 32, 14); ctx.stroke();
  // crest tuft
  jaggedBlob(ctx, -6, -26, 9, 6, 12, 4, 8);
  ctx.fillStyle = k.dark; ctx.fill();
}

function headLizzie(ctx, k, mo, t) {
  const jaw = mo * 0.55;
  // head spikes (behind)
  ctx.lineWidth = 2; ctx.strokeStyle = k.line;
  for (let i = 0; i < 5; i++) {
    const x = -20 + i * 7, y = -12 - i * 3.2, h = 12 + (i % 2) * 5;
    const g = ctx.createLinearGradient(x, y, x - 6, y - h);
    g.addColorStop(0, k.spikes); g.addColorStop(1, k.spikeTip);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x - 7, y - h); ctx.lineTo(x + 5, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // lower jaw (rotates)
  ctx.save(); ctx.translate(-4, 8); ctx.rotate(jaw);
  ctx.beginPath(); ctx.moveTo(-6, -4); ctx.bezierCurveTo(10, 8, 30, 8, 40, 2); ctx.lineTo(40, -3); ctx.bezierCurveTo(26, -2, 8, -3, -6, -6); ctx.closePath();
  ctx.lineWidth = 3.5; ctx.strokeStyle = k.line; ctx.stroke();
  const jg = ctx.createLinearGradient(0, -4, 0, 8); jg.addColorStop(0, k.base); jg.addColorStop(1, k.belly);
  ctx.fillStyle = jg; ctx.fill();
  if (mo > 0.12) teeth(ctx, 4, -3, 38, -3, 7, 3.5, -1, [5], 1.8);
  ctx.restore();
  // mouth interior
  if (mo > 0.12) {
    ctx.fillStyle = k.mouth;
    ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(40, 4);
    ctx.lineTo(-4 + Math.cos(jaw) * 42, 8 + Math.sin(jaw) * 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c4505a'; ctx.beginPath(); ctx.ellipse(14, 9 + jaw * 12, 12, 3 + jaw * 5, jaw * 0.6, 0, 7); ctx.fill();
  }
  // skull + snout
  ctx.beginPath();
  ctx.moveTo(-22, 2); ctx.bezierCurveTo(-26, -16, -10, -26, 4, -21);
  ctx.bezierCurveTo(12, -19, 14, -14, 20, -11); ctx.bezierCurveTo(30, -9, 40, -7, 43, -1);
  ctx.bezierCurveTo(45, 4, 40, 7, 34, 6); ctx.lineTo(0, 7); ctx.bezierCurveTo(-10, 10, -20, 10, -22, 2); ctx.closePath();
  ctx.lineWidth = 4; ctx.strokeStyle = k.line; ctx.stroke();
  ctx.fillStyle = radial(ctx, 0, -18, 46, k.light, k.base, k.dark); ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 34; i++) {
    const x = -22 + hash(i, 11) * 64, y = -22 + hash(i, 12) * 30, r = 1.5 + hash(i, 13) * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 0.8, y + 0.8, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(210,255,160,0.28)'; ctx.beginPath(); ctx.arc(x - 0.5, y - 0.5, r * 0.65, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-26, 3, 80, 6);
  ctx.restore();
  if (mo > 0.12) teeth(ctx, 2, 6, 41, 5, 8, 4, 1, [1, 6], 1.9);
  // brow knob + eye
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.beginPath(); ctx.ellipse(10, -9, 8, 6, -0.3, 0, 7); ctx.fill();
  glowEye(ctx, 11, -8.5, 3.6, k, true, -0.35);
  ctx.beginPath(); ctx.moveTo(1, -12); ctx.quadraticCurveTo(10, -22, 22, -13); ctx.quadraticCurveTo(14, -15, 4, -8); ctx.closePath();
  ctx.lineWidth = 2.5; ctx.strokeStyle = k.line; ctx.stroke();
  ctx.fillStyle = radial(ctx, 8, -18, 16, k.light, k.base, k.dark); ctx.fill();
  // nostril + snarl ridges
  ctx.fillStyle = '#0a1a05'; ctx.beginPath(); ctx.ellipse(39, -3, 2.6, 1.6, -0.4, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(24 + i * 4, -8); ctx.quadraticCurveTo(26 + i * 4, -4, 25 + i * 4, 0); ctx.stroke(); }
  if (mo > 0.5) drool(ctx, 30, 6, 16 + jaw * 20, t);
}

function headRalph(ctx, k, mo, t) {
  const jaw = mo * 0.5;
  // pinned-back ears
  for (const [x0, y0, x1, y1, x2, y2, dk] of [[-14, -14, -28, -36, -4, -20, 0.35], [-4, -16, -14, -42, 8, -20, 0]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath();
    ctx.lineWidth = 3.5; ctx.strokeStyle = k.line; ctx.stroke();
    ctx.fillStyle = shade(k.base, -dk); ctx.fill();
    ctx.fillStyle = '#7a3a3e'; ctx.beginPath(); ctx.moveTo(lerp(x0, x2, 0.3), lerp(y0, y2, 0.3) - 1); ctx.lineTo(lerp(x1, x0, 0.15), lerp(y1, y0, 0.15)); ctx.lineTo(lerp(x2, x0, 0.25), lerp(y2, y0, 0.25)); ctx.closePath(); ctx.fill();
  }
  // shaggy skull + cheek ruff
  jaggedBlob(ctx, -3, 0, 24, 23, 36, 7, 21, (a) => a > -0.8 && a < 0.6);
  ctx.lineWidth = 4.5; ctx.strokeStyle = k.line; ctx.stroke();
  ctx.fillStyle = radial(ctx, -10, -12, 40, k.light, k.base, k.dark); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.3;
  for (let i = 0; i < 30; i++) { const a = -3 + hash(i, 22) * 4.5, r = 8 + hash(i, 23) * 16; const x = -3 + Math.cos(a) * r, y = Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 4); ctx.stroke(); }
  ctx.restore();
  // lower jaw
  ctx.save(); ctx.translate(6, 8); ctx.rotate(jaw);
  ctx.beginPath(); ctx.moveTo(-4, -3); ctx.bezierCurveTo(8, 7, 22, 7, 30, 1); ctx.lineTo(30, -3); ctx.closePath();
  ctx.lineWidth = 3.5; ctx.strokeStyle = k.line; ctx.stroke(); ctx.fillStyle = k.skin; ctx.fill();
  if (mo > 0.12) teeth(ctx, 2, -3, 29, -3, 6, 3.4, -1, [4], 2);
  ctx.restore();
  if (mo > 0.12) {
    ctx.fillStyle = k.mouth;
    ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(36, 4); ctx.lineTo(6 + Math.cos(jaw) * 30, 8 + Math.sin(jaw) * 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c4505a'; ctx.beginPath(); ctx.ellipse(16, 9 + jaw * 10, 9, 2.5 + jaw * 4, jaw * 0.5, 0, 7); ctx.fill();
  }
  // muzzle
  ctx.beginPath();
  ctx.moveTo(2, -8); ctx.bezierCurveTo(14, -10, 28, -9, 38, -5);
  ctx.bezierCurveTo(42, -2, 41, 4, 36, 5); ctx.lineTo(4, 7); ctx.bezierCurveTo(-2, 4, -2, -4, 2, -8); ctx.closePath();
  ctx.lineWidth = 3.5; ctx.strokeStyle = k.line; ctx.stroke();
  const mg = ctx.createLinearGradient(0, -10, 0, 8); mg.addColorStop(0, k.skinLight); mg.addColorStop(1, k.skinDark);
  ctx.fillStyle = mg; ctx.fill();
  ctx.strokeStyle = 'rgba(70,35,15,0.75)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 5, -8); ctx.quadraticCurveTo(14 + i * 5, -4, 12 + i * 5, 0); ctx.stroke(); }
  if (mo > 0.12) teeth(ctx, 6, 5, 37, 4, 7, 3.6, 1, [1, 6], 2.1);
  // nose
  ctx.fillStyle = '#0d0d0f'; ctx.beginPath(); ctx.ellipse(38, -4, 5, 3.8, -0.2, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(36.5, -5.5, 1.8, 1, -0.2, 0, 7); ctx.fill();
  // eyes + brows
  glowEye(ctx, 12, -10, 3.1, k, false, -0.35);
  glowEye(ctx, -1, -11, 2.5, k, false, 0.3);
  ctx.fillStyle = k.dark; ctx.strokeStyle = k.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(3, -15); ctx.lineTo(19, -17); ctx.lineTo(7, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, -17); ctx.lineTo(4, -14); ctx.lineTo(-4, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (mo > 0.5) drool(ctx, 28, 5, 14 + jaw * 20, t);
}

// Photoreal head: snarl / roar photos swapped by mouth openness, glowing eyes on top.
const PHOTO_OFS = { x: 6, y: 2 };
function drawPhotoHead(ctx, h, mouth, t) {
  const roar = mouth > 0.62;
  const v = roar ? h.roar : h.snarl, img = roar ? h.roarImg : h.snarlImg;
  const S = h.size * PHOTO_K;
  ctx.translate(PHOTO_OFS.x, PHOTO_OFS.y);
  ctx.drawImage(img, -S / 2, -S / 2, S, S);
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.75 + Math.sin(t * 6) * 0.25;
  for (const [ex, ey] of v.eyes) {
    const x = (ex - 0.5) * S, y = (ey - 0.5) * S, r = S * 0.07;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,220,160,${0.9 * pulse})`); g.addColorStop(0.25, `rgba(255,40,10,${0.7 * pulse})`); g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Where the mouth is relative to the head joint (for bringing prey to it).
function mouthOffset(kind) {
  const h = isReal() && REAL.heads[kind];
  if (!h) return { x: 22, y: 12 };
  const S = h.size * PHOTO_K;
  return { x: PHOTO_OFS.x + (h.roar.mouth[0] - 0.5) * S, y: PHOTO_OFS.y - 2 + (h.roar.mouth[1] - 0.5) * S };
}

// ---------------------------------------------------------------------------
// Hands, feet, held prey

function hand(ctx, elb, h, k, mat, L, grip) {
  const ang = Math.atan2(h.y - elb.y, h.x - elb.x);
  const r = k.hand * (grip ? 1.15 : 1);
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang);
  const skin = k === KINDS.lizzie ? mat : { base: k.skin, light: k.skinLight, dark: k.skinDark, line: k.line };
  if (k.claws) {
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = '#f6f0dc'; ctx.strokeStyle = k.line; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(r * 0.7, i * 4.5 - 2); ctx.quadraticCurveTo(r + 7, i * 5, r + 5, i * 5 + 5); ctx.lineTo(r * 0.7, i * 4.5 + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (isReal()) {
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.95, 0, 0, 7);
    matFill(ctx, skin.base, k.texSkin, 0.16);
    shadeOver(ctx, -r, -r, r, r, k.tint || '#ffffff', mat.back, [-r * 2, -r * 2, r * 4, r * 4]);
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { const y = -r * 0.45 + i * r * 0.45; ctx.beginPath(); ctx.moveTo(r * 0.25, y); ctx.quadraticCurveTo(r * 0.75, y + 1.5, r * 0.98, y); ctx.stroke(); }
    ctx.restore();
    return;
  }
  ctx.fillStyle = skin.line; ctx.beginPath(); ctx.ellipse(0, 0, r + 2.5, r * 0.92 + 2.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = radial(ctx, -r * 0.4, -r * 0.4, r * 1.6, skin.light, skin.base, skin.dark);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, 7); ctx.fill();
  texOver(ctx, k.texSkin, 0.18);
  // knuckles
  for (let i = 0; i < 4; i++) {
    const y = -r * 0.62 + i * r * 0.42;
    ctx.fillStyle = skin.line; ctx.beginPath(); ctx.arc(r * 0.62, y, r * 0.3 + 1.2, 0, 7); ctx.fill();
    ctx.fillStyle = radial(ctx, r * 0.55, y - 1, r * 0.45, skin.light, skin.base, skin.dark);
    ctx.beginPath(); ctx.arc(r * 0.62, y, r * 0.3, 0, 7); ctx.fill();
    texOver(ctx, k.texSkin, 0.15);
  }
  ctx.restore();
}

function foot(ctx, knee, f, k, mat) {
  const skin = k === KINDS.lizzie ? mat : { base: k.skin, light: k.skinLight, dark: k.skinDark, line: k.line };
  if (isReal()) {
    ctx.beginPath(); ctx.ellipse(f.x + 5, f.y - 5, 16, 7.5, 0, 0, 7);
    matFill(ctx, skin.base, k.texSkin, 0.16);
    shadeOver(ctx, f.x, f.y - 12, f.x, f.y + 2, k.tint || '#ffffff', mat.back, [f.x - 20, f.y - 20, 50, 30]);
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
    if (k.claws) for (let i = 0; i < 3; i++) { const x = f.x + 16 + i * 1.5, y = f.y - 8 + i * 3.5; ctx.fillStyle = '#e9e0c6'; ctx.beginPath(); ctx.moveTo(x, y - 1.5); ctx.lineTo(x + 7, y + 0.5); ctx.lineTo(x, y + 1.8); ctx.fill(); }
    return;
  }
  ctx.fillStyle = skin.line; ctx.beginPath(); ctx.ellipse(f.x + 5, f.y - 5, 17.5, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = radial(ctx, f.x, f.y - 9, 20, skin.light, skin.base, skin.dark);
  ctx.beginPath(); ctx.ellipse(f.x + 5, f.y - 5, 15, 7, 0, 0, 7); ctx.fill();
  texOver(ctx, k.texSkin, 0.18);
  for (let i = 0; i < 3; i++) {
    const x = f.x + 14 + i * 1.5, y = f.y - 8 + i * 3.5;
    if (k.claws) { ctx.fillStyle = '#f6f0dc'; ctx.beginPath(); ctx.moveTo(x, y - 1.5); ctx.lineTo(x + 7, y + 0.5); ctx.lineTo(x, y + 1.8); ctx.fill(); }
    else { ctx.strokeStyle = skin.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 4, y - 1); ctx.lineTo(x + 1, y); ctx.stroke(); }
  }
}

const PREY_STYLE = {
  man: { shirt: '#e6c13a', pants: '#2f4f8a', hair: '#2c2119' },
  woman: { shirt: '#d42f3a', pants: '#d42f3a', hair: '#6a3412' },
  soldier: { shirt: '#4f6b2f', pants: '#3e5426', hair: '#3b5222' },
};

// A tiny struggling person held in the monster's fist.
export function drawPrey(ctx, type, x, y, s, t) {
  const st = PREY_STYLE[type];
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const kick = Math.sin(t * 26), wave = Math.sin(t * 22 + 1);
  ctx.lineCap = 'round';
  const limb = (x0, y0, x1, y1, c, w) => {
    ctx.strokeStyle = '#140c06'; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
  limb(0, 6, -5 + kick * 4, 17, st.pants, 3.4);
  limb(0, 6, 5 - kick * 4, 17, st.pants, 3.4);
  ctx.fillStyle = '#140c06'; ctx.beginPath(); ctx.ellipse(0, 0, 6.2, 8.2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = st.shirt; ctx.beginPath(); ctx.ellipse(0, 0, 5, 7, 0, 0, 7); ctx.fill();
  limb(-3, -4, -10, -10 + wave * 4, '#efbd94', 2.6);
  limb(3, -4, 10, -10 - wave * 4, '#efbd94', 2.6);
  ctx.fillStyle = '#140c06'; ctx.beginPath(); ctx.arc(0, -12, 5.6, 0, 7); ctx.fill();
  ctx.fillStyle = '#efbd94'; ctx.beginPath(); ctx.arc(0, -12, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = st.hair; ctx.beginPath(); ctx.arc(0, -13.5, 4.6, Math.PI, 0); ctx.fill();
  if (type === 'woman') { ctx.fillRect(-4.6, -14, 2, 7); ctx.fillRect(2.6, -14, 2, 7); }
  ctx.fillStyle = '#300'; ctx.beginPath(); ctx.ellipse(0.5, -10.5, 1.3, 1.8, 0, 0, 7); ctx.fill();    // scream
  ctx.fillStyle = '#000'; ctx.fillRect(-2, -14, 1, 1.2); ctx.fillRect(1.5, -14, 1, 1.2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Body extras

function tail(ctx, p, k, L) {
  if (m_tail(k) === 'lizard') {
    const a = P(p.hip.x - 4, p.hip.y + 2);
    const b = P(a.x - 30, a.y + 14 + p.tailWag * 10), c = P(a.x - 56, a.y + 36 - p.tailWag * 14);
    spikeRow(ctx, a, c, 4, 11, k, -1);
    part(ctx, a, b, [[0, 15, 15], [1, 11, 11]], k, L, { seed: 31 });
    part(ctx, b, c, [[0, 11, 11], [1, 3, 3]], k, L, { seed: 32 });
  } else if (m_tail(k) === 'wolf') {
    const a = P(p.hip.x - 6, p.hip.y - 2);
    const b = P(a.x - 24, a.y - 10 + p.tailWag * 8), c = P(a.x - 44, a.y + 2 + p.tailWag * 12);
    part(ctx, a, b, [[0, 8, 8], [1, 11, 11]], k, L, { seed: 33, furBack: 5, furFront: 5 });
    part(ctx, b, c, [[0, 12, 12], [0.6, 12, 12], [1, 5, 5]], { ...k, base: k.light, light: '#f2f4f7', dark: k.base }, L, { seed: 34, furBack: 6, furFront: 6 });
  }
}
const m_tail = (k) => (k === KINDS.lizzie ? 'lizard' : k === KINDS.ralph ? 'wolf' : null);

function spikeRow(ctx, a, b, n, h, k, side) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const nx = Math.sin(ang) * side, ny = -Math.cos(ang) * side;
  ctx.lineWidth = 2; ctx.strokeStyle = k.line;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t);
    const hh = h * (1 - t * 0.4);
    const tx = x - nx * hh * -1 + Math.cos(ang) * -3, ty = y + ny * hh;
    const g = ctx.createLinearGradient(x, y, tx, ty); g.addColorStop(0, k.spikes); g.addColorStop(1, k.spikeTip);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang) * 5, y - Math.sin(ang) * 5);
    ctx.lineTo(x + nx * hh - Math.cos(ang) * 3, y + ny * hh - Math.sin(ang) * 3);
    ctx.lineTo(x + Math.cos(ang) * 5, y + Math.sin(ang) * 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function torsoDetail(kind, k) {
  if (kind === 'george') {
    return (ctx, len) => {
      // bare chest: pecs and abs on the front side
      ctx.beginPath();
      ctx.moveTo(len * 0.25, 30); ctx.bezierCurveTo(len * 0.2, 8, len * 0.5, 2, len * 0.95, 4);
      ctx.bezierCurveTo(len * 1.05, 14, len, 30, len * 0.9, 34); ctx.closePath();
      const g = ctx.createLinearGradient(len, 0, len * 0.2, 30);
      g.addColorStop(0, k.skinLight); g.addColorStop(0.5, k.skin); g.addColorStop(1, k.skinDark);
      matFill(ctx, g, k.texSkin, 0.25);
      ctx.strokeStyle = 'rgba(70,35,12,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(len * 0.78, 6); ctx.quadraticCurveTo(len * 0.68, 18, len * 0.72, 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(len * 0.95, 8); ctx.quadraticCurveTo(len * 0.8, 16, len * 0.72, 18); ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const x = len * (0.36 + i * 0.12); ctx.beginPath(); ctx.moveTo(x, 12); ctx.quadraticCurveTo(x - 2, 20, x, 30); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,230,190,0.35)';
      ctx.beginPath(); ctx.moveTo(len * 0.9, 8); ctx.quadraticCurveTo(len * 0.84, 12, len * 0.8, 10); ctx.stroke();
    };
  }
  if (kind === 'lizzie') {
    return (ctx, len) => {
      // segmented belly plates
      ctx.beginPath(); ctx.moveTo(len * 0.05, 26); ctx.bezierCurveTo(len * 0.1, 8, len * 0.6, 6, len * 0.98, 6); ctx.lineTo(len, 30); ctx.closePath();
      const g = ctx.createLinearGradient(0, 4, 0, 26); g.addColorStop(0, k.belly); g.addColorStop(1, k.bellyDark);
      matFill(ctx, g, k.texBelly, 0.22);
      ctx.strokeStyle = 'rgba(90,70,10,0.75)'; ctx.lineWidth = 1.6;
      for (let i = 1; i < 8; i++) { const x = len * (i / 8); ctx.beginPath(); ctx.moveTo(x, 8); ctx.quadraticCurveTo(x + 3, 16, x, 28); ctx.stroke(); }
    };
  }
  return (ctx, len) => {
    // tan chest fur with ragged edge
    ctx.beginPath(); ctx.moveTo(len * 0.1, 28);
    for (let i = 0; i <= 10; i++) { const x = lerp(len * 0.1, len * 1.02, i / 10); ctx.lineTo(x, i % 2 ? 4 : 10); }
    ctx.lineTo(len, 30); ctx.closePath();
    const g = ctx.createLinearGradient(len, 0, 0, 30); g.addColorStop(0, k.skinLight); g.addColorStop(1, k.skinDark);
    matFill(ctx, g, k.texSkin, 0.25);
    ctx.strokeStyle = 'rgba(70,35,12,0.55)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 14; i++) { const x = len * (0.15 + hash(i, 77) * 0.85), y = 10 + hash(i, 78) * 18; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 4); ctx.stroke(); }
  };
}

// ---------------------------------------------------------------------------

export function drawMonster(ctx, m, time) {
  const k = KINDS[m.kind];
  const p = computePose(m, time);
  const L = { x: LIGHT.x * m.face, y: LIGHT.y };
  const back = { ...k, back: true, base: shade(k.base, -0.35), light: shade(k.light, -0.4), dark: shade(k.dark, -0.3), skin: shade(k.skin, -0.35), skinLight: shade(k.skinLight, -0.4), skinDark: shade(k.skinDark, -0.3) };
  ctx.save();
  ctx.translate(m.x, m.y);
  const sc = m.scale ?? 1;
  ctx.scale(m.face * sc, sc);
  if (m.hurtT > 0 && Math.floor(time * 30) % 2 === 0) ctx.filter = 'brightness(2.4) saturate(0.3)';
  if (m.state !== 'climb') {
    const sg = ctx.createRadialGradient(4, 0, 2, 4, 0, 42);
    sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(4, 1, 42, 8, 0, 0, 7); ctx.fill();
  }
  // back limbs
  part(ctx, p.shB, p.elbB, k.upper, back, L, { seed: 2 });
  part(ctx, p.elbB, p.handB, k.fore, back, L, { seed: 3 });
  hand(ctx, p.elbB, p.handB, k, back, L, false);
  part(ctx, p.hipB, p.kneeB, k.thigh, back, L, { seed: 4 });
  part(ctx, p.kneeB, p.footB, k.shin, back, L, { seed: 5 });
  foot(ctx, p.kneeB, p.footB, k, back);
  tail(ctx, p, k, L);
  // torso (hip -> neck), with dorsal spikes for Lizzie
  const neck = P(p.chest.x + (p.head.x - p.chest.x) * 0.35, p.chest.y + (p.head.y - p.chest.y) * 0.35);
  if (m.kind === 'lizzie') spikeRow(ctx, p.hip, neck, 5, 14, k, 1);
  part(ctx, p.hip, neck, k.torso, k, L, { seed: 6, furFront: m.kind === 'lizzie' ? 0 : 1.5, furBack: k.fur * 1.4, detail: torsoDetail(m.kind, k) });
  // front leg
  part(ctx, p.hipF, p.kneeF, k.thigh, k, L, { seed: 7 });
  part(ctx, p.kneeF, p.footF, k.shin, k, L, { seed: 8 });
  foot(ctx, p.kneeF, p.footF, k, k);
  // neck / mane: a tapering mass of the body material running from the shoulders up
  // under the photo head, with a contact shadow below the jaw so the head sits on it
  if (isReal() && REAL.heads[m.kind]) {
    const nk = m.kind === 'george' ? [[0, 26, 26], [0.55, 24, 23], [1, 18, 17]] : m.kind === 'ralph' ? [[0, 23, 23], [0.6, 22, 22], [1, 16, 16]] : [[0, 20, 20], [1, 15, 15]];
    part(ctx, P(p.chest.x - 4, p.chest.y + 10), P(p.head.x, p.head.y + 2), nk, k, L, { seed: 12, furBack: k.fur * 1.6, furFront: k.fur });
    const S = REAL.heads[m.kind].size * PHOTO_K;
    const sx = p.head.x + 4, sy = p.head.y + S * 0.26;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, S * 0.38);
    sg.addColorStop(0, 'rgba(0,0,0,0.32)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(sx, sy, S * 0.38, S * 0.22, 0, 0, 7); ctx.fill();
  }
  // shoulder mass + front arm
  ctx.save();
  jaggedBlob(ctx, p.shF.x, p.shF.y, k.upper[1][1] + 1, k.upper[1][1], 22, k.fur, 9);
  if (isReal()) {
    matFill(ctx, k.base, k.texBody, 0.3);
    shadeOver(ctx, p.shF.x - 14, p.shF.y - 14, p.shF.x + 14, p.shF.y + 14, k.tint, false, [p.shF.x - 40, p.shF.y - 40, 80, 80]);
  } else {
    ctx.lineWidth = 4; ctx.strokeStyle = k.line; ctx.stroke();
    ctx.fillStyle = radial(ctx, p.shF.x - 5, p.shF.y - 6, 24, k.light, k.base, k.dark); ctx.fill();
  }
  ctx.restore();
  part(ctx, p.shF, p.elbF, k.upper, k, L, { seed: 9 });
  part(ctx, p.elbF, p.handF, k.fore, k, L, { seed: 10 });
  // head (big, like the original sprites)
  ctx.save();
  ctx.translate(p.head.x, p.head.y - 2); ctx.rotate(p.headRot); ctx.scale(HEAD_SCALE, HEAD_SCALE);
  const photo = isReal() && REAL.heads[m.kind];
  if (photo) { ctx.scale(1 / HEAD_SCALE, 1 / HEAD_SCALE); drawPhotoHead(ctx, photo, p.mouth, time); }
  else if (m.kind === 'george') headGeorge(ctx, k, p.mouth, time);
  else if (m.kind === 'lizzie') headLizzie(ctx, k, p.mouth, time);
  else headRalph(ctx, k, p.mouth, time);
  ctx.restore();
  if (p.held) {
    const w = p.held.what;
    if (w.type === 'item') {
      ctx.save(); ctx.translate(p.held.x, p.held.y); ctx.scale(p.held.s, p.held.s); drawItem(ctx, w.item, 0, -4, time); ctx.restore();
    } else drawPrey(ctx, w.type, p.held.x, p.held.y - 4, p.held.s * 1.25, time);
  }
  // fist in front of the face only when punching up / eating; otherwise it stays with the arm
  hand(ctx, p.elbF, p.handF, k, k, L, m.punchT > 0 || !!p.held);
  ctx.filter = 'none';
  ctx.restore();
}

// The little naked human a monster turns back into when its damage runs out.
export function drawHuman(ctx, x, y, face, time, kind) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  const s = Math.sin(time * 12);
  ctx.strokeStyle = '#2a1a10'; ctx.lineCap = 'round';
  const skin = '#e7b48c';
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-s * 6, 0); ctx.moveTo(0, -20); ctx.lineTo(s * 6, 0); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-s * 6, 0); ctx.moveTo(0, -20); ctx.lineTo(s * 6, 0); ctx.stroke();
  ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(0, -30, 7.5, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, -30, 6, 10.5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(1, -47, 7, 0, 7); ctx.fill();
  ctx.fillStyle = { george: '#4a2a12', lizzie: '#c86b2a', ralph: '#2e2e30' }[kind];
  ctx.beginPath(); ctx.arc(0, -49, 7, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#c98f66'; ctx.beginPath(); ctx.ellipse(2, -22, 4, 3, 0, 0, 7); ctx.fill();
  ctx.restore();
}

export { ITEM_INFO };
