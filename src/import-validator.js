const MAX = { coins: 10_000_000, product: 100_000, card: 100_000, lifetime: 10_000_000 };
export function readLegacySave() {
  const raw = localStorage.getItem('apex-v010-save');
  if (!raw) return null;
  let save; try { save = JSON.parse(raw); } catch { throw new Error('Your saved APEX data is unreadable.'); }
  const version = Number(save.version ?? save.saveVersion ?? 10);
  if (version !== 10 || !Number.isInteger(Number(save.coins)) || Number(save.coins) < 0 || Number(save.coins) > MAX.coins) throw new Error('This local save cannot be imported safely.');
  for (const count of Object.values(save.inventory || {})) if (!Number.isInteger(count) || count < 0 || count > MAX.product) throw new Error('This local inventory cannot be imported safely.');
  for (const card of Object.values(save.cards || {})) if (!Number.isInteger(card?.count) || !Number.isInteger(card?.lifetime) || card.count < 0 || card.lifetime < card.count || card.count > MAX.card || card.lifetime > MAX.lifetime) throw new Error('This card collection cannot be imported safely.');
  return { version: 10, coins: Number(save.coins), inventory: save.inventory || {}, cards: save.cards || {} };
}
