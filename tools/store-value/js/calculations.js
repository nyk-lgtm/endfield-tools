import { ORIGEOMETRY_TOPUP, PROTOCOL_PASS_S1, PROTOCOL_SPACES } from '../../../data/index.js';

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

// --- Protocol Pass Sanity Values ---

// Maps protocol-pass item keys to their protocol-space key and item display name.
const FARMABLE_ITEMS = {
  t_creds:                    { spaceKey: 't-creds',      itemName: 'T-Creds' },
  intermediate_combat_record: { spaceKey: 'operator-exp', itemName: 'Intermediate Combat Record' },
  advanced_combat_record:     { spaceKey: 'operator-exp', itemName: 'Advanced Combat Record' },
  arms_insp_kit:              { spaceKey: 'weapon-exp',   itemName: 'Arms Insp Kit' },
  arms_insp_set:              { spaceKey: 'weapon-exp',   itemName: 'Arms Insp Set' },
  protodisk:                  { spaceKey: 'promotions',   itemName: 'Protodisk' },
  cast_die:                   { spaceKey: 'weapon-tune',  itemName: 'Cast Die' },
  heavy_cast_die:             { spaceKey: 'weapon-tune',  itemName: 'Heavy Cast Die' },
  protoprism:                 { spaceKey: 'skill-up',     itemName: 'Protoprism' },
  protohedron:                { spaceKey: 'skill-up',     itemName: 'Protohedron' },
  protoset:                   { spaceKey: 'promotions',   itemName: 'Protoset' },
  adv_cognitive_carrier:      { spaceKey: 'operator-exp', itemName: 'Advanced Cognitive Carrier' },
};

// Direct sanity values for consumable items.
const DIRECT_SANITY = {
  emergency_sanity_booster: 40,
};

// Best sanity cost per unit across all protocol space tiers where the item appears.
function getFarmingSanityRate(passKey) {
  const mapping = FARMABLE_ITEMS[passKey];
  if (!mapping) return null;

  const space = PROTOCOL_SPACES[mapping.spaceKey];
  if (!space) return null;

  let best = Infinity;
  for (const tier of space.tiers) {
    const allRewards = [...tier.rewardsA, ...tier.rewardsB];
    const reward = allRewards.find(r => r.item === mapping.itemName);
    if (reward && reward.quantity > 0) {
      const rate = tier.sanityCost / reward.quantity;
      if (rate < best) best = rate;
    }
  }
  return best < Infinity ? best : null;
}

// Sanity value per unit for any item (farmable or direct).
export function getSanityPerUnit(passKey) {
  if (DIRECT_SANITY[passKey] !== undefined) return DIRECT_SANITY[passKey];
  return getFarmingSanityRate(passKey);
}

// Build full sanity rate map for all valued items.
function buildSanityMap() {
  const map = {};
  for (const key of Object.keys(FARMABLE_ITEMS)) {
    map[key] = getFarmingSanityRate(key);
  }
  for (const [key, val] of Object.entries(DIRECT_SANITY)) {
    map[key] = val;
  }
  return map;
}

const SANITY_MAP = buildSanityMap();

// Computes sanity values broken down by category and tier.
// Returns { tierKey: { total, categories: { catName: sanityTotal } } }
export function computeSanityBreakdown(passData, tierTotals) {
  const result = {};
  const categories = ['currencies', 'cosmetics', 'consumables', 'progression'];

  for (const tierKey of TIER_KEYS) {
    const catTotals = {};
    let total = 0;

    for (const cat of categories) {
      const catItems = passData[cat];
      if (!catItems) continue;
      let catSanity = 0;

      for (const itemKey of Object.keys(catItems)) {
        const rate = SANITY_MAP[itemKey];
        if (rate == null) continue;
        const qty = tierTotals[tierKey][itemKey] ?? 0;
        catSanity += qty * rate;
      }

      catTotals[cat] = Math.round(catSanity);
      total += catSanity;
    }

    result[tierKey] = { total: Math.round(total), categories: catTotals };
  }

  return result;
}
