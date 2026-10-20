"""Decode Rampage (MCR monoboard) background tiles and 32x32 sprites from the ROMs,
following MAME's mcr_bg_layout / mcr_sprite_layout, and rebuild screens from RAM dumps."""
import numpy as np, sys, glob
from PIL import Image
R = 'I:/ai_root/rampage/roms/'
bg = np.frombuffer(open(R+'bg-0','rb').read() + open(R+'bg-1','rb').read(), np.uint8) ^ 0xff  # ROMREGION_INVERT
fg = np.frombuffer(b''.join(open(R+f'fg-{i}','rb').read() for i in range(4)), np.uint8)

def bit(buf, b): return (buf[b >> 3] >> (7 - (b & 7))) & 1

def decode_bg():
    n = len(bg) * 8 // 2 // 128
    half = len(bg) * 8 // 2
    tiles = np.zeros((n, 8, 8), np.uint8)
    bits = np.unpackbits(bg)
    planes = [half + 0, half + 1, 0, 1]
    for t in range(n):
        base = t * 128
        for y in range(8):
            for x in range(8):
                o = base + y * 16 + x * 2
                v = 0
                for p in planes: v = (v << 1) | bits[p + o]
                tiles[t, y, x] = v
    return tiles

def decode_sprites():
    q = len(fg) * 8 // 4
    n = q // 1024
    bits = np.unpackbits(fg)
    xo = []
    for grp in range(4):
        for k in range(4):
            for s in range(2): xo.append(q * k + grp * 8 + s * 4)
    xo = np.array(xo)
    spr = np.zeros((n, 32, 32), np.uint8)
    for t in range(n):
        for y in range(32):
            o = t * 1024 + y * 32 + xo
            v = (bits[o] << 3) | (bits[o + 1] << 2) | (bits[o + 2] << 1) | bits[o + 3]
            spr[t, y] = v
    return spr

def palette(raw):
    p = np.frombuffer(raw, np.uint8).reshape(64, 2).astype(int)
    d = p[:, 0] | (p[:, 1] << 8)
    c = lambda v: (v << 5) | (v << 2) | (v >> 1)
    return np.stack([c((d >> 6) & 7), c(d & 7), c((d >> 3) & 7)], 1).astype(np.uint8)

if __name__ == '__main__':
    tiles = decode_bg(); spr = decode_sprites()
    np.save('I:/ai_root/rampage/analysis/gfx/tiles.npy', tiles); np.save('I:/ai_root/rampage/analysis/gfx/sprites.npy', spr)
    print(tiles.shape, spr.shape)
