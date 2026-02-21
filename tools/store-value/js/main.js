import { getView, setView, getSeason, setSeason, getFirstBuyUsed, toggleFirstBuy } from './state.js';
import { cacheElements, renderViewToggle, renderTopupTable, renderPassView } from './ui.js';
import { initNav } from '../../../shared/nav.js';
import { initHelpModal } from '../../../shared/modal.js';

function handleViewToggle(e) {
  const btn = e.target.closest('.toggle-btn');
  if (!btn) return;
  const view = btn.dataset.view;
  setView(view);
  renderViewToggle(view);
}

function handleFirstBuyChange(e) {
  if (e.target.type !== 'checkbox') return;
  const packId = e.target.dataset.pack;
  if (!packId) return;
  toggleFirstBuy(packId);
  renderTopupTable(getFirstBuyUsed());
}

function handleSeasonChange(e) {
  const season = e.target.value;
  setSeason(season);
  renderPassView(season);
}

function init() {
  cacheElements();
  initNav();
  initHelpModal();

  // View toggle
  document.querySelector('.toggle-group').addEventListener('click', handleViewToggle);

  // Topup first-buy checkboxes (event delegation)
  document.getElementById('topupBody').addEventListener('change', handleFirstBuyChange);

  // Season selector
  document.getElementById('seasonSelect').addEventListener('change', handleSeasonChange);

  // Initial render
  renderViewToggle(getView());
  renderTopupTable(getFirstBuyUsed());
  renderPassView(getSeason());
}

document.addEventListener('DOMContentLoaded', init);
