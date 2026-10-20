import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append('console: '+m.text) if m.type=='error' else None)
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(1200)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500); await pg.keyboard.press('KeyZ'); await pg.wait_for_timeout(2000)
        # two street soldiers right under a monster that is about to land
        await pg.evaluate('''async () => {
          const { StreetSoldier } = await import('./js/game/enemies.js');
          const g = window.__game, w = g.world, m = g.players[0].monster;
          m.invuln = 0; m.x = 600; m.y = 560; m.vy = 300; m.state = 'air';
          for (let i = 0; i < 2; i++) { const s = new StreetSoldier(); s.x = 600 + i * 10; s.moving = false; w.soldiers.push(s); }
        }''')
        t0 = await pg.evaluate('() => window.__game.time')
        await pg.wait_for_timeout(3000)
        st = await pg.evaluate('() => { const m = window.__game.players[0].monster; return { time: window.__game.time, state: m && m.state, afterEat: m && m.afterEat, score: window.__game.players[0].score } }')
        print('time advanced:', round(st['time'] - t0, 2), 's  state:', st['state'], ' score:', st['score'])
        print('errors:', errs[:3])
        await b.close()
asyncio.run(main())
