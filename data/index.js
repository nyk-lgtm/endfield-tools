// Central data export
// Import from here: import { ESSENCE_ZONES, ATTRIBUTES, ... } from '../../data/index.js'

export const LAST_UPDATED = '2026-02-21';

export { ESSENCE_ZONES } from './zones.js';
export { PROTOCOL_SPACES } from './protocol-spaces.js';
export { ATTRIBUTES, ATTR_POOL, ATTR_TICKET_POOL, SECONDS_PER_SANITY, SECONDS_PER_DAY, ITEM_VALUES } from './constants.js';
export { CHARACTERS, CABINS, SHIP_STAT_TYPES } from './characters.js';
export { ORIGEOMETRY_TOPUP } from './store-packs.js';
export { PROTOCOL_PASS_S1 } from './protocol-pass/s1.js';

// Derived data
import { ESSENCE_ZONES } from './zones.js';

// All unique secondaries across all zones (sorted)
export const ALL_SECONDARIES = [...new Set(Object.values(ESSENCE_ZONES).flatMap(z => z.secondaries))].sort();

// All unique skills across all zones (sorted)
export const ALL_SKILLS = [...new Set(Object.values(ESSENCE_ZONES).flatMap(z => z.skills))].sort();
