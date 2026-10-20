// Photoreal assets generated locally with RealVisXL (SDXL): material textures for
// the body parts and cut-out head photos (snarl / roar) for each monster.
// Everything degrades gracefully to the vector art until (or unless) it loads.
const TEX = ['fur_brown', 'fur_grey', 'scales_green', 'skin_gorilla', 'belly_reptile', 'skin_wolf'];

export const REAL = { ready: false, enabled: true, tex: {}, heads: {} };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadRealAssets() {
  const scratch = document.createElement('canvas').getContext('2d');
  await Promise.all(TEX.map(async (name) => {
    const img = await loadImage(`assets/real/${name}.jpg`);
    REAL.tex[name] = scratch.createPattern(img, 'repeat');
  }));
  try {
    const meta = await (await fetch('assets/real/heads.json')).json();
    await Promise.all(Object.entries(meta).map(async ([kind, h]) => {
      const [snarl, roar] = await Promise.all([loadImage(`assets/real/${h.snarl.file}`), loadImage(`assets/real/${h.roar.file}`)]);
      REAL.heads[kind] = { ...h, snarlImg: snarl, roarImg: roar };
    }));
  } catch { /* heads optional */ }
  REAL.ready = true;
}

// Pattern for a texture at a given scale (pattern space follows the current transform).
export function texPattern(name, scale = 0.32) {
  const p = REAL.tex[name];
  if (!p) return null;
  p.setTransform(new DOMMatrix().scale(scale));
  return p;
}
