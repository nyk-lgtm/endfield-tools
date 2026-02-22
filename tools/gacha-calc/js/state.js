import { save, load } from '../../../shared/storage.js';

const TOOL = 'gacha-calc';

let mode = load(TOOL, 'mode', 'single');
let pity = load(TOOL, 'pity', 0);
let guaranteed = load(TOOL, 'guaranteed', false);
let pulls = load(TOOL, 'pulls', 100);
let bannerCount = load(TOOL, 'bannerCount', 2);

export function getMode() { return mode; }
export function setMode(v) { mode = v; save(TOOL, 'mode', v); }

export function getPity() { return pity; }
export function setPity(v) { pity = Math.max(0, Math.min(79, v)); save(TOOL, 'pity', pity); }

export function getGuaranteed() { return guaranteed; }
export function setGuaranteed(v) { guaranteed = v; save(TOOL, 'guaranteed', v); }

export function getPulls() { return pulls; }
export function setPulls(v) { pulls = Math.max(0, v); save(TOOL, 'pulls', pulls); }

export function getBannerCount() { return bannerCount; }
export function setBannerCount(v) { bannerCount = Math.max(1, Math.min(5, v)); save(TOOL, 'bannerCount', bannerCount); }
