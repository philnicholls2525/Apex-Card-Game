import { gameApi } from './game-api.js';
export async function loadAuthoritativeState() { return gameApi('bootstrap'); }
export function inventoryMap(state) { return Object.fromEntries((state.inventory || []).map(x => [x.product, x.quantity])); }
