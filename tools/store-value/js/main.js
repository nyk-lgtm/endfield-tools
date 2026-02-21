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

function handlePassTierClick(e) {
  const tierHeader = e.target.closest('.pass-tier-header');
  if (tierHeader) {
    const tier = tierHeader.closest('.pass-tier');
    tier.classList.toggle('collapsed');
    tierHeader.querySelector('.collapse-indicator').textContent =
      tier.classList.contains('collapsed') ? '▶' : '▼';
    return;
  }

  const sectionHeader = e.target.closest('.reward-section-header');
  if (sectionHeader) {
    const section = sectionHeader.closest('.reward-section');
    section.classList.toggle('collapsed');
    sectionHeader.querySelector('.collapse-indicator').textContent =
      section.classList.contains('collapsed') ? '▶' : '▼';
  }
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

  // Pass tier and category collapsibles (event delegation)
  document.getElementById('passTiers').addEventListener('click', handlePassTierClick);

  // Initial render
  renderViewToggle(getView());
  renderTopupTable(getFirstBuyUsed());
  renderPassView(getSeason());
}

document.addEventListener('DOMContentLoaded', init);
