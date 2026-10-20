import sys
from rembg import remove, new_session
from PIL import Image, ImageDraw
sess = new_session('isnet-general-use')
pick = {'george': (23, 23), 'lizzie': (11, 23), 'ralph': (23, 23)}
for kind, (s1, s2) in pick.items():
    for expr, seed in (('snarl', s1), ('roar', s2)):
        im = Image.open(f'I:/ai_root/rampage/analysis/gen_raw/head_{kind}_{expr}_{seed}.png').convert('RGB')
        out = remove(im, session=sess)
        out.save(f'I:/ai_root/rampage/analysis/gen_cut/{kind}_{expr}.png')
        g = Image.new('RGBA', out.size, (40, 60, 90, 255)); g.alpha_composite(out)
        d = ImageDraw.Draw(g)
        for v in range(0, 1024, 128):
            d.line([(v, 0), (v, 1024)], fill=(255, 255, 0, 255)); d.line([(0, v), (1024, v)], fill=(255, 255, 0, 255))
            d.text((v + 2, 2), str(v), fill='white'); d.text((2, v + 2), str(v), fill='white')
        g.convert('RGB').resize((512, 512)).save(f'I:/ai_root/rampage/analysis/gen_cut/_grid_{kind}_{expr}.png')
        print(kind, expr, out.getbbox(), flush=True)
