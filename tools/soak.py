import asyncio, random, sys, json
from playwright.async_api import async_playwright
DUR = int(sys.argv[1]) if len(sys.argv) > 1 else 150
KEYS = [['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyZ','KeyX'], ['KeyA','KeyD','KeyW','KeyS','KeyF','KeyG'], ['KeyJ','KeyL','KeyI','KeyK','KeyO','KeyP']]
async def run(b, idx, results):
    pg = await b.new_page(viewport={'width':1280,'height':720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(('PAGEERROR', str(e), getattr(e, 'stack', ''))))
    pg.on('console', lambda m: errs.append(('console', m.text, '')) if m.type == 'error' else None)
    await pg.goto('http://localhost:8027/'); await pg.wait_for_timeout(1500)
    await pg.evaluate('() => localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(1500)
    if idx % 2: await pg.keyboard.press('Digit2')
    if idx % 3 == 0: await pg.keyboard.press('Digit3')
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter')
    rnd = random.Random(idx)
    t = 0; last_frame = None; stalls = 0
    held = set()
    while t < DUR:
        for pl in range(3):
            if rnd.random() < 0.5:
                k = rnd.choice(KEYS[pl])
                if k in held: await pg.keyboard.up(k); held.discard(k)
                else: await pg.keyboard.down(k); held.add(k)
        if rnd.random() < 0.08: await pg.keyboard.press(rnd.choice(['Enter', 'Digit2', 'Digit3']))
        if rnd.random() < 0.02:   # speed things up: wreck a building
            await pg.evaluate('() => { const w = window.__game.world; if (!w) return; const b = w.buildings.find(b => b.alive); if (b) for (let f=0; f<b.floors; f++) for (let c=0;c<b.cols;c++) { b.hit(c,f,w); } }')
        await pg.wait_for_timeout(150); t += 0.15
        if int(t * 100) % 300 == 0:
            st = await pg.evaluate('() => { const g = window.__game; return { f: g.time, scene: g.scene, day: g.day, parts: g.world ? g.world.fx.parts.length + g.world.fx.front.length : 0, mons: g.world ? g.world.monsters.map(m => m.state) : [] } }')
            if last_frame is not None and st['f'] == last_frame: stalls += 1; errs.append(('STALL', json.dumps(st), ''))
            last_frame = st['f']
    results[idx] = errs
    await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        results = {}
        await asyncio.gather(*[run(b, i, results) for i in range(4)])
        for i, e in results.items():
            print('PAGE', i, len(e))
            seen = set()
            for k, msg, stack in e:
                if msg in seen: continue
                seen.add(msg); print(' ', k, msg[:300]); print('   ', (stack or '')[:600])
        await b.close()
asyncio.run(main())
