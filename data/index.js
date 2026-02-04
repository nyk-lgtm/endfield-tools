// Central data export
// Import from here: import { ZONES, ATTRIBUTES, ... } from '../../data/index.js'

export { ZONES } from './zones.js';
export { ATTRIBUTES, ATTR_POOL, ATTR_TICKET_POOL } from './constants.js';

// Derived data
import { ZONES } from './zones.js';

// All unique secondaries across all zones (sorted)
export const ALL_SECONDARIES = [...new Set(Object.values(ZONES).flatMap(z => z.secondaries))].sort();

// All unique skills across all zones (sorted)
export const ALL_SKILLS = [...new Set(Object.values(ZONES).flatMap(z => z.skills))].sort();
