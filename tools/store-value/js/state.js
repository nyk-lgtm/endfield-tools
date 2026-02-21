import { save, load } from '../../../shared/storage.js';

const TOOL = 'store-value';

let currentView = load(TOOL, 'view', 'topup');
let currentSeason = load(TOOL, 'season', 's1');
let firstBuyUsed = new Set(load(TOOL, 'firstBuyUsed', []));

export function getView() {
  return currentView;
}

export function setView(view) {
  currentView = view;
  save(TOOL, 'view', view);
}

export function getSeason() {
  return currentSeason;
}

export function setSeason(season) {
  currentSeason = season;
  save(TOOL, 'season', season);
}

export function getFirstBuyUsed() {
  return firstBuyUsed;
}

export function toggleFirstBuy(packId) {
  if (firstBuyUsed.has(packId)) {
    firstBuyUsed.delete(packId);
  } else {
    firstBuyUsed.add(packId);
  }
  save(TOOL, 'firstBuyUsed', [...firstBuyUsed]);
}
