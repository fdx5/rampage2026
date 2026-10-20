"""Render the 1200x630 link-preview thumbnail (assets/og/thumbnail.jpg) with the
game's own renderer. Needs the game served at http://localhost:8027 and Playwright."""
import asyncio, base64, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8027/'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/og/thumbnail.jpg'

JS = r'''async () => {
  const RA = await import('./js/art/realAssets.js'); await RA.loadRealAssets();
  const { drawMonster } = await import('./js/art/monsterArt.js');
  const { World } = await import('./js/game/world.js');
  await Promise.all([
    document.fonts.load('900 128px "Bungee"', 'RAMPAGE2026'),
    document.fonts.load('400 30px "Black Han Sans"', '1986 아케이드 명작, 웹에서 다시 날뛰다 원작 사운드 · 최대 3인 동시 플레이 · 모바일 지원'),
  ]);
  const W = 1200, H = 630;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // night city, one building already collapsing in a dust cloud
  const game = { addScore() {}, players: [] };
  const world = new World(game, 3);
  const b = world.buildings[1];
  for (let f = 0; f < b.floors; f++) for (let k = 0; k < b.cols; k++) if ((f + k) % 2 === 0) b.sec(k, f).dmg = 2; else b.sec(k, f).dmg = 1;
  b.sink = b.h * 0.25; b.shakeX = 2;
  world.fx.dust(b.x + b.w / 2, 620, 26, b.w / 2, 1.6);
  for (let i = 0; i < 40; i++) world.fx.update(0.03);
  ctx.save(); ctx.scale(0.9375, 0.9375); ctx.translate(0, -50);
  world.draw(ctx);
  ctx.restore();
  // cinematic grade
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(3,4,14,0.85)'); g.addColorStop(0.4, 'rgba(3,4,14,0.25)'); g.addColorStop(1, 'rgba(10,2,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // monsters
  const mk = (kind, x, y, face, scale, extra) => Object.assign({ kind, x, y, face, scale, state: 'ground', vx: 0, punchT: 0, punchDur: 0.26, roarT: 1, hurtT: 0, seed: 2, walkPhase: 0, climbPhase: 0, eatT: 0, eatDur: 0.95 }, extra);
  drawMonster(ctx, mk('lizzie', 610, 690, 1, 2.35, {}), 0.4);
  drawMonster(ctx, mk('george', 255, 700, 1, 2.6, { punchT: 0.14, punchDir: 'fwd', roarT: 1 }), 0.4);
  drawMonster(ctx, mk('ralph', 960, 700, -1, 2.5, {}), 0.4);
  // logo
  ctx.save(); ctx.translate(W / 2, 128); ctx.rotate(-0.03);
  const lg = ctx.createLinearGradient(0, -80, 0, 20);
  lg.addColorStop(0, '#fff3b0'); lg.addColorStop(0.45, '#ffb02e'); lg.addColorStop(0.5, '#e2471f'); lg.addColorStop(1, '#7a1408');
  ctx.font = '900 128px "Bungee"'; ctx.textAlign = 'center';
  ctx.lineJoin = 'round'; ctx.lineWidth = 20; ctx.strokeStyle = '#1a0603'; ctx.strokeText('RAMPAGE', 0, 0);
  ctx.shadowColor = '#ff5a1f'; ctx.shadowBlur = 40; ctx.fillStyle = lg; ctx.fillText('RAMPAGE', 0, 0); ctx.shadowBlur = 0;
  const cg = ctx.createLinearGradient(0, 10, 0, 70); cg.addColorStop(0, '#e8f6ff'); cg.addColorStop(1, '#5ab4ff');
  ctx.font = '900 54px "Bungee"'; ctx.lineWidth = 11; ctx.strokeStyle = '#03101f';
  ctx.strokeText('2026', 205, 62); ctx.fillStyle = cg; ctx.fillText('2026', 205, 62);
  ctx.restore();
  // tagline
  ctx.textAlign = 'center'; ctx.font = '400 30px "Black Han Sans"';
  ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  const tag = '1986 아케이드 명작, 웹에서 다시 날뛰다';
  ctx.strokeText(tag, W / 2, 228); ctx.fillStyle = '#ffffff'; ctx.fillText(tag, W / 2, 228);
  ctx.font = '400 20px "Black Han Sans"'; ctx.lineWidth = 5;
  const sub = '원작 사운드 · 최대 3인 동시 플레이 · 모바일 지원';
  ctx.strokeText(sub, W / 2, 262); ctx.fillStyle = '#ffd36b'; ctx.fillText(sub, W / 2, 262);
  return c.toDataURL('image/jpeg', 0.9);
}'''

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        url = await pg.evaluate(JS)
        open(OUT, 'wb').write(base64.b64decode(url.split(',')[1]))
        await b.close()
    print('wrote', OUT)

asyncio.run(main())
