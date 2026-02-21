import { ORIGEOMETRY_TOPUP, PROTOCOL_PASS_S1 } from '../../../data/index.js';

const SEASONS = { s1: PROTOCOL_PASS_S1 };

// --- Topup ---

export function buildTopupRows(firstBuyUsed) {
  const rows = Object.entries(ORIGEOMETRY_TOPUP).map(([id, pack]) => {
    const used = firstBuyUsed.has(id);
    const effectiveAmount = used ? pack.subsequent_total : pack.base + pack.first_buy_bonus;
    const rate = effectiveAmount / pack.price_usd;
    const costPerUnit = pack.price_usd / effectiveAmount;
    return { id, ...pack, effectiveAmount, rate, costPerUnit, firstBuyUsed: used };
  });

  rows.sort((a, b) => b.rate - a.rate);
  const bestId = rows[0]?.id ?? null;
  return { rows, bestId };
}

// --- Pass ---

export function getSeasonData(key) {
  return SEASONS[key] ?? null;
}

const TIER_KEYS = ['basic', 'originium', 'customized'];

export function computeTierTotals(passData) {
  const totals = { basic: {}, originium: {}, customized: {} };
  const categories = ['currencies', 'cosmetics', 'consumables', 'progression'];

  for (const cat of categories) {
    const items = passData[cat];
    if (!items) continue;
    for (const [item, tiers] of Object.entries(items)) {
      let cumulative = 0;
      for (const tier of TIER_KEYS) {
        cumulative += tiers[tier] ?? 0;
        totals[tier][item] = cumulative;
      }
    }
  }

  return totals;
}

export function formatItemName(key) {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function formatCategory(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
