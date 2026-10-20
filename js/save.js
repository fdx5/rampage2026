// localStorage save: a checkpoint at the start of every day (stage), plus the
// furthest day reached so any stage played so far can be picked again.
const KEY = 'rampage2026.save.v1';

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && s.v === 1 && s.day >= 1 ? s : null;
  } catch {
    return null;
  }
}

export function writeSave(game) {
  const prev = loadSave();
  const data = {
    v: 1,
    day: game.day,
    maxDay: Math.max(prev?.maxDay ?? 1, game.day),
    players: game.players.map((p) => ({ kind: p.kind, joined: p.joined, score: p.score })),
    hiscore: game.hiscore,
    savedAt: Date.now(),
  };
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable (private mode) */ }
  return data;
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
