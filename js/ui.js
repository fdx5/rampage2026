// HUD and full-screen scenes: title, newspaper "DATELINE" card, game over, sound test.
import { W, H, HUD_H, roundRect, shade } from './util.js';
import { KINDS, drawMonster } from './art/monsterArt.js';
import { KEY_HELP } from './input.js';
import { ROM_CREDITS } from './data.js';

export const FONT = '"Bungee", "Black Han Sans", sans-serif';
export const KFONT = '"Black Han Sans", "Bungee", sans-serif';

export function text(ctx, s, x, y, { size = 20, color = '#fff', align = 'left', font = FONT, stroke = 0, strokeColor = 'rgba(0,0,0,0.8)', weight = 900 } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = strokeColor; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

export function drawHUD(ctx, game, time) {
  const g = ctx.createLinearGradient(0, 0, 0, HUD_H + 10);
  g.addColorStop(0, 'rgba(5,8,18,0.85)'); g.addColorStop(1, 'rgba(5,8,18,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HUD_H + 10);
  const pw = W / 3;
  game.players.forEach((p, i) => {
    const k = KINDS[p.kind];
    const x = i * pw + 22;
    text(ctx, k.name, x, 26, { size: 18, color: k.ui, stroke: 4 });
    if (!p.joined) {
      if (!game.touch && Math.floor(time * 2) % 2) text(ctx, `${i + 1} 키를 눌러 참가`, x, 52, { size: 16, color: '#cfd6e6', font: KFONT, weight: 400, stroke: 3 });
      return;
    }
    text(ctx, String(p.score).padStart(7, '0'), x + pw - 60, 26, { size: 20, color: '#fff', align: 'right', stroke: 4 });
    const m = p.monster;
    if (m && m.active) {
      const bw = pw - 70, bx = x, by = 36;
      roundRect(ctx, bx, by, bw, 14, 7); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
      const hp = Math.max(0, m.health) / 100;
      const col = hp > 0.5 ? '#5ee06a' : hp > 0.25 ? '#ffc93c' : '#ff4b3e';
      if (hp > 0) {
        roundRect(ctx, bx + 2, by + 2, (bw - 4) * hp, 10, 5);
        const hg = ctx.createLinearGradient(0, by, 0, by + 14);
        hg.addColorStop(0, shade(col, 0.35)); hg.addColorStop(1, shade(col, -0.25));
        ctx.fillStyle = hg; ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let s = 1; s < 10; s++) ctx.fillRect(bx + (bw * s) / 10, by + 2, 1.5, 10);
      if (hp < 0.25 && Math.floor(time * 4) % 2) text(ctx, 'DANGER', bx + bw + 6, by + 12, { size: 11, color: '#ff4b3e' });
    } else if (p.contT > 0) {
      text(ctx, `CONTINUE? ${Math.ceil(p.contT)}  [${i + 1}]`, x, 54, { size: 16, color: Math.floor(time * 3) % 2 ? '#ffe14d' : '#fff', stroke: 3 });
    } else {
      text(ctx, 'GAME OVER', x, 54, { size: 16, color: '#ff6a5a', stroke: 3 });
    }
  });
  text(ctx, `DAY ${game.day}  ·  ${game.cityName}`, W / 2, H - 14, { size: 14, color: 'rgba(255,255,255,0.75)', align: 'center', stroke: 3 });
}

function fakeMonster(kind, x, y, face, roar, scale) {
  return { kind, x, y, face, scale, state: 'ground', vx: 0, punchT: 0, roarT: roar ? 1 : 0, hurtT: 0, seed: kind.length, walkPhase: 0, climbPhase: 0 };
}

export const MENU_RECTS = [];

export function drawTitle(ctx, game, time, backdrop) {
  ctx.drawImage(backdrop, 0, 0);
  ctx.fillStyle = 'rgba(4,6,20,0.45)'; ctx.fillRect(0, 0, W, H);
  const kinds = ['george', 'lizzie', 'ralph'];
  kinds.forEach((k, i) => {
    const roar = Math.floor(time / 1.2) % 3 === i;
    const x = [190, W / 2, W - 190][i];
    const m = fakeMonster(k, x, 620, i === 2 ? -1 : 1, roar, 1.55);
    const joined = i === 0 || game.players[i].joined;
    if (joined) {
      const gl = ctx.createRadialGradient(x, 520, 10, x, 520, 200);
      gl.addColorStop(0, KINDS[k].ui + '77'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 200, 320, 400, 400);
    }
    drawMonster(ctx, m, time + i);
    text(ctx, KINDS[k].name, x, 650, { size: 24, color: KINDS[k].ui, align: 'center', stroke: 6 });
    const sub = i === 0 ? 'P1 · ' + (game.touch ? '터치 패드' : KEY_HELP[0]) : joined ? 'READY!  (' + (i + 1) + ' 키로 취소)' : KEY_HELP[i];
    text(ctx, sub, x, 678, { size: 13, color: joined && i ? '#fff' : '#cfd6e6', align: 'center', font: KFONT, weight: 400, stroke: 4 });
  });
  // logo
  ctx.save();
  ctx.translate(W / 2, 112);
  ctx.rotate(-0.03);
  const lg = ctx.createLinearGradient(0, -70, 0, 20);
  lg.addColorStop(0, '#fff3b0'); lg.addColorStop(0.45, '#ffb02e'); lg.addColorStop(0.5, '#e2471f'); lg.addColorStop(1, '#7a1408');
  ctx.font = `900 104px ${FONT}`; ctx.textAlign = 'center';
  ctx.lineWidth = 16; ctx.strokeStyle = '#1a0603'; ctx.lineJoin = 'round'; ctx.strokeText('RAMPAGE', 0, 0);
  ctx.shadowColor = '#ff5a1f'; ctx.shadowBlur = 30;
  ctx.fillStyle = lg; ctx.fillText('RAMPAGE', 0, 0);
  ctx.shadowBlur = 0;
  const cg = ctx.createLinearGradient(0, 10, 0, 60);
  cg.addColorStop(0, '#e8f6ff'); cg.addColorStop(1, '#5ab4ff');
  ctx.font = `900 40px ${FONT}`;
  ctx.lineWidth = 9; ctx.strokeStyle = '#03101f'; ctx.strokeText('2026', 140, 48);
  ctx.fillStyle = cg; ctx.fillText('2026', 140, 48);
  ctx.restore();
  // menu
  const items = game.menuItems();
  MENU_RECTS.length = 0;
  const mw = 460, mh = 40, mx = W / 2 - mw / 2, my0 = 186;
  items.forEach((it, i) => {
    const y = my0 + i * (mh + 8), sel = game.menu.sel === i;
    MENU_RECTS.push({ x: mx, y, w: mw, h: mh, i });
    roundRect(ctx, mx, y, mw, mh, 12);
    ctx.fillStyle = sel ? 'rgba(255,176,46,0.92)' : 'rgba(10,14,30,0.7)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = sel ? '#ffe3a0' : 'rgba(255,255,255,0.18)'; ctx.stroke();
    text(ctx, it.label, W / 2, y + 27, { size: 19, color: !it.enabled ? 'rgba(255,255,255,0.3)' : sel ? '#1a0a00' : '#fff', align: 'center', font: KFONT, weight: 400 });
    if (sel && Math.floor(time * 3) % 2) text(ctx, '▶', mx + 18, y + 27, { size: 16, color: '#1a0a00' });
  });
  const sv = game.save;
  const info = sv ? `최고 기록 DAY ${sv.maxDay} · HI-SCORE ${game.hiscore}` : `HI-SCORE ${game.hiscore}`;
  text(ctx, info, W / 2, my0 + 4 * (mh + 8) + 18, { size: 14, color: '#ffe14d', align: 'center', font: KFONT, weight: 400, stroke: 3 });
  text(ctx, game.touch ? '메뉴를 터치하세요 · 2P/3P는 키보드/게임패드' : '↑↓ 선택 · ←→ 스테이지 · ENTER/Z 결정 · 2/3 키: 2P/3P 참가 · M 음소거', W / 2, my0 + 4 * (mh + 8) + 40, { size: 13, color: '#9aa6c4', align: 'center', font: KFONT, weight: 400, stroke: 3 });
  text(ctx, 'ORIGINAL © 1986 BALLY MIDWAY · ' + ROM_CREDITS.join(' · '), W / 2, H - 6, { size: 10, color: 'rgba(255,255,255,0.45)', align: 'center', weight: 400 });
}

export function drawNews(ctx, game, time, backdrop) {
  ctx.drawImage(backdrop, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  const t = Math.min(1, time / 0.5);
  const spin = (1 - t) * 6;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.04 + spin);
  ctx.scale(0.2 + 0.8 * t, 0.2 + 0.8 * t);
  const pw = 860, ph = 470;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  const pg = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
  pg.addColorStop(0, '#f4ecd6'); pg.addColorStop(1, '#ddd0b0');
  ctx.fillStyle = pg; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(80,60,30,0.06)';
  for (let i = 0; i < 400; i++) ctx.fillRect(((i * 97) % pw) - pw / 2, ((i * 61) % ph) - ph / 2, 2, 2);
  text(ctx, 'THE DAILY RAMPAGE', 0, -ph / 2 + 64, { size: 52, color: '#1b1610', align: 'center', font: '"Playfair Display", Georgia, serif' });
  ctx.fillStyle = '#1b1610'; ctx.fillRect(-pw / 2 + 30, -ph / 2 + 80, pw - 60, 3); ctx.fillRect(-pw / 2 + 30, -ph / 2 + 86, pw - 60, 1);
  text(ctx, `DATELINE ......... ${game.cityName}`, -pw / 2 + 40, -ph / 2 + 122, { size: 22, color: '#2a2018', font: '"Courier New", monospace' });
  text(ctx, `DAY ${game.day}`, pw / 2 - 40, -ph / 2 + 122, { size: 22, color: '#8a1a10', align: 'right' });
  const lines = game.headline;
  lines.forEach((l, i) => text(ctx, l, -pw / 2 + 40, -ph / 2 + 200 + i * 56, { size: 42, color: '#1b1610', font: '"Playfair Display", Georgia, serif' }));
  // monster mugshot
  const kind = game.newsKind;
  const fx = pw / 2 - 210, fy = -ph / 2 + 150, fw = 170, fh = 230;
  ctx.fillStyle = '#20242c'; ctx.fillRect(fx, fy, fw, fh);
  ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
  const bg = ctx.createRadialGradient(fx + fw / 2, fy + fh / 2, 10, fx + fw / 2, fy + fh / 2, 150);
  bg.addColorStop(0, KINDS[kind].ui + '66'); bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg; ctx.fillRect(fx, fy, fw, fh);
  drawMonster(ctx, fakeMonster(kind, fx + fw / 2 - 62, fy + fh + 128, 1, Math.sin(time * 3) > 0, 2.5), time);
  ctx.restore();
  ctx.strokeStyle = '#1b1610'; ctx.lineWidth = 4; ctx.strokeRect(fx, fy, fw, fh);
  text(ctx, 'FILE PHOTO', fx + fw / 2, fy + fh + 22, { size: 12, color: '#3a2e20', align: 'center', font: '"Courier New", monospace' });
  ctx.restore();
  if (time > 1.2) text(ctx, '펀치 / 점프로 건너뛰기', W / 2, H - 24, { size: 15, color: 'rgba(255,255,255,0.7)', align: 'center', font: KFONT, weight: 400 });
}

export function drawGameOver(ctx, game, time) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
  const s = 1 + Math.sin(time * 3) * 0.03;
  ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s);
  text(ctx, 'GAME OVER', 0, 0, { size: 96, color: '#ff4b3e', align: 'center', stroke: 12 });
  ctx.restore();
  game.players.forEach((p, i) => {
    if (!p.joined) return;
    text(ctx, `${KINDS[p.kind].name}  ${p.score}`, W / 2, H / 2 + 40 + i * 34, { size: 24, color: KINDS[p.kind].ui, align: 'center', stroke: 5 });
  });
  text(ctx, `DAY ${game.day}까지 저장됨 · 타이틀에서 이어하기 가능 · 최고 점수 ${game.hiscore}`, W / 2, H / 2 + 160, { size: 20, color: '#fff', align: 'center', font: KFONT, weight: 400, stroke: 4 });
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', W / 2, H / 2, { size: 64, color: '#fff', align: 'center', stroke: 8 });
  text(ctx, 'ESC/화면 터치: 계속 · Q/하단 터치: 타이틀로 (진행은 스테이지마다 자동 저장)', W / 2, H / 2 + 44, { size: 18, color: '#cfd6e6', align: 'center', font: KFONT, weight: 400 });
}

export function drawSoundTest(ctx, st, labels, codes, backdrop) {
  ctx.drawImage(backdrop, 0, 0);
  ctx.fillStyle = 'rgba(3,6,16,0.82)'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'SOUND TEST', W / 2, 60, { size: 40, color: '#ffb02e', align: 'center', stroke: 6 });
  text(ctx, '원작 Sounds Good 보드(68000) 출력을 MAME에서 사운드 코드별로 녹음한 원본 사운드입니다', W / 2, 90, { size: 15, color: '#cfd6e6', align: 'center', font: KFONT, weight: 400 });
  const cols = 6, cw = 196, ch = 34, x0 = (W - cols * cw) / 2, y0 = 120;
  codes.forEach((c, i) => {
    const x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * ch;
    const sel = i === st.sel;
    roundRect(ctx, x + 3, y + 3, cw - 6, ch - 6, 6);
    ctx.fillStyle = sel ? '#ffb02e' : st.playing === c ? 'rgba(90,180,255,0.35)' : 'rgba(255,255,255,0.06)'; ctx.fill();
    text(ctx, `$${c.toUpperCase()}`, x + 12, y + 23, { size: 14, color: sel ? '#1a0a00' : '#fff' });
    text(ctx, labels[c] || '', x + 62, y + 22, { size: 12, color: sel ? '#1a0a00' : '#9fb0d0', font: KFONT, weight: 400 });
  });
  text(ctx, '방향키 선택 · Z/ENTER 재생 · X 정지 · ESC(또는 아래쪽 터치) 돌아가기', W / 2, H - 18, { size: 15, color: '#cfd6e6', align: 'center', font: KFONT, weight: 400 });
}
