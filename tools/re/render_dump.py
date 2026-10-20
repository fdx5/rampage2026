import numpy as np, sys
from PIL import Image
sys.path.insert(0, 'I:/ai_root/rampage/analysis')
from gfxdecode import palette
tiles = np.load('I:/ai_root/rampage/analysis/gfx/tiles.npy'); spr = np.load('I:/ai_root/rampage/analysis/gfx/sprites.npy')
def render(path):
    raw = open(path, 'rb').read()
    pal = palette(raw[:128]); sram = np.frombuffer(raw[128:128+512], np.uint8); vram = np.frombuffer(raw[640:640+2048], np.uint8)
    img = np.zeros((480, 512), np.uint8)
    for ti in range(32 * 30):
        d = int(vram[ti*2]) | (int(vram[ti*2+1]) << 8)
        code = (d & 0x3ff); color = ((d >> 12) & 3) ^ 3
        t = tiles[code]
        if d & 0x400: t = t[:, ::-1]
        if d & 0x800: t = t[::-1, :]
        t = np.kron(t, np.ones((2, 2), np.uint8))
        y, x = (ti // 32) * 16, (ti % 32) * 16
        img[y:y+16, x:x+16] = t + color * 16
    for offs in range(512 - 4, -1, -4):
        if sram[offs] == 0: continue
        flags = int(sram[offs+1]); code = int(sram[offs+2]) + 256 * ((flags >> 3) & 1)
        color = (~flags) & 3
        s = spr[code]
        if flags & 0x10: s = s[:, ::-1]
        if flags & 0x20: s = s[::-1, :]
        sx = (int(sram[offs+3]) - 3) * 2; sy = (241 - int(sram[offs])) * 2
        for yy in range(32):
            for xx in range(32):
                v = s[yy, xx]; X, Y = sx + xx, sy + yy
                if v in (0, 8) or not (0 <= X < 512 and 0 <= Y < 480): continue
                img[Y, X] = color * 16 + v
    return Image.fromarray(pal[img])
if __name__ == '__main__':
    render(sys.argv[1]).save(sys.argv[2])
