"""Turn background-removed head photos into game assets: soft round fade around the
head centre (neck/shoulders dissolve into the rig's body), square crop, metadata."""
import json
import numpy as np
from PIL import Image
SRC = 'I:/ai_root/rampage/analysis/gen_cut/'
DST = 'I:/ai_root/rampage/rampage2026/assets/real/'
OUT_PX = 400
# per image (1024px source coords): head centre, fade radii, eyes, mouth
SPEC = {
    'george': {'size': 112, 'warm': True,
               'snarl': dict(c=(560, 430), r=(360, 470), ell=(530, 440, 300, 262, 440, 420, 0.1), eyes=[(544, 346), (704, 356)], mouth=(620, 660)),
               'roar': dict(c=(580, 440), r=(360, 470), ell=(500, 450, 320, 322, 445, 430, 0.1), eyes=[(544, 332), (720, 334)], mouth=(620, 630))},
    'lizzie': {'size': 122, 'warm': False,
               'snarl': dict(c=(620, 420), r=(420, 520), eyes=[(526, 226)], mouth=(720, 560)),
               'roar': dict(c=(640, 420), r=(420, 520), eyes=[(556, 196)], mouth=(700, 520))},
    'ralph': {'size': 114, 'warm': False,
              'snarl': dict(c=(620, 420), r=(400, 500), eyes=[(632, 340)], mouth=(740, 640)),
              'roar': dict(c=(600, 430), r=(400, 500), eyes=[(588, 250)], mouth=(760, 540))},
}
meta = {}
for kind, ks in SPEC.items():
    meta[kind] = {'size': ks['size']}
    for expr in ('snarl', 'roar'):
        sp = ks[expr]
        im = np.asarray(Image.open(f'{SRC}{kind}_{expr}.png').convert('RGBA')).astype(np.float32)
        cx, cy = sp['c']; r0, r1 = sp['r']
        yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
        if 'ell' in sp:
            # asymmetric ellipse hugging the head outline: (cx, cy, left, right, top, bottom, feather)
            ex, ey, rl, rr, rt, rb, fe = sp['ell']
            nx = (xx - ex) / np.where(xx < ex, rl, rr)
            ny = (yy - ey) / np.where(yy < ey, rt, rb)
            d = np.hypot(nx, ny)
            fade = np.clip((1 - d) / fe, 0, 1)
        else:
            d = np.hypot(xx - cx, (yy - cy) * 0.92)
            fade = np.clip((r1 - d) / (r1 - r0), 0, 1)
        im[..., 3] *= fade
        if ks['warm']:   # original George is brown, the photo gorilla is near-black
            im[..., 0] = np.clip(im[..., 0] * 1.25 + 18, 0, 255)
            im[..., 1] = np.clip(im[..., 1] * 1.0 + 6, 0, 255)
            im[..., 2] = np.clip(im[..., 2] * 0.78, 0, 255)
        half = r1
        canvas = np.zeros((2 * half, 2 * half, 4), np.float32)
        x0, y0 = cx - half, cy - half
        sx0, sy0 = max(0, x0), max(0, y0)
        sx1, sy1 = min(im.shape[1], cx + half), min(im.shape[0], cy + half)
        canvas[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = im[sy0:sy1, sx0:sx1]
        out = Image.fromarray(canvas.astype(np.uint8), 'RGBA').resize((OUT_PX, OUT_PX), Image.LANCZOS)
        fn = f'head_{kind}_{expr}.webp'
        out.save(DST + fn, quality=88, method=6)
        norm = lambda p: [round((p[0] - x0) / (2 * half), 4), round((p[1] - y0) / (2 * half), 4)]
        meta[kind][expr] = {'file': fn, 'eyes': [norm(e) for e in sp['eyes']], 'mouth': norm(sp['mouth'])}
json.dump(meta, open(DST + 'heads.json', 'w'), indent=1)
print(json.dumps(meta)[:300])
