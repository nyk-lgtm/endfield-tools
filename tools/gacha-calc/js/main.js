import { getMode, setMode, getPity, setPity, getGuaranteed, setGuaranteed, getPulls, setPulls, getBannerCount, setBannerCount } from './state.js';
import { cacheElements, renderModeToggle, renderGuaranteedToggle, renderSingleResults, renderMultiResults, setupResizeHandler } from './ui.js';
import { initNav } from '../../../shared/nav.js';
import { initHelpModal } from '../../../shared/modal.js';

function updateSingle() {
  renderSingleResults(getPity(), getGuaranteed(), getPulls());
}

function updateMulti() {
  renderMultiResults(getPulls(), getBannerCount(), getPity(), getGuaranteed());
}

function update() {
  if (getMode() === 'single') updateSingle();
  else updateMulti();
}

function init() {
  cacheElements();
  initNav();
  initHelpModal();

  const mode = getMode();
  renderModeToggle(mode);

  // Set initial input values from state
  document.getElementById('pityInput').value = getPity();
  document.getElementById('pullsInput').value = getPulls();
  renderGuaranteedToggle(
    document.getElementById('guaranteedToggle'),
    document.getElementById('guaranteedLabel'),
    getGuaranteed()
  );
  document.getElementById('multiPullsInput').value = getPulls();
  document.getElementById('multiPityInput').value = getPity();
  renderGuaranteedToggle(
    document.getElementById('multiGuaranteedToggle'),
    document.getElementById('multiGuaranteedLabel'),
    getGuaranteed()
  );
  document.getElementById('bannerCountInput').value = getBannerCount();

  // Mode toggle
  document.querySelector('.toggle-group').addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    setMode(btn.dataset.mode);
    renderModeToggle(btn.dataset.mode);
    update();
  });

  // Single banner inputs
  document.getElementById('pityInput').addEventListener('input', (e) => {
    setPity(parseInt(e.target.value) || 0);
    document.getElementById('multiPityInput').value = getPity();
    updateSingle();
  });

  document.getElementById('pullsInput').addEventListener('input', (e) => {
    setPulls(parseInt(e.target.value) || 0);
    document.getElementById('multiPullsInput').value = getPulls();
    updateSingle();
  });

  document.getElementById('guaranteedToggle').addEventListener('click', () => {
    setGuaranteed(!getGuaranteed());
    renderGuaranteedToggle(
      document.getElementById('guaranteedToggle'),
      document.getElementById('guaranteedLabel'),
      getGuaranteed()
    );
    renderGuaranteedToggle(
      document.getElementById('multiGuaranteedToggle'),
      document.getElementById('multiGuaranteedLabel'),
      getGuaranteed()
    );
    updateSingle();
  });

  // Multi-banner inputs
  document.getElementById('multiPullsInput').addEventListener('input', (e) => {
    setPulls(parseInt(e.target.value) || 0);
    document.getElementById('pullsInput').value = getPulls();
    updateMulti();
  });

  document.getElementById('multiPityInput').addEventListener('input', (e) => {
    setPity(parseInt(e.target.value) || 0);
    document.getElementById('pityInput').value = getPity();
    updateMulti();
  });

  document.getElementById('multiGuaranteedToggle').addEventListener('click', () => {
    setGuaranteed(!getGuaranteed());
    renderGuaranteedToggle(
      document.getElementById('guaranteedToggle'),
      document.getElementById('guaranteedLabel'),
      getGuaranteed()
    );
    renderGuaranteedToggle(
      document.getElementById('multiGuaranteedToggle'),
      document.getElementById('multiGuaranteedLabel'),
      getGuaranteed()
    );
    updateMulti();
  });

  document.getElementById('bannerCountInput').addEventListener('input', (e) => {
    setBannerCount(parseInt(e.target.value) || 1);
    updateMulti();
  });

  // Resize handler for chart
  setupResizeHandler(() => {
    if (getMode() === 'single') updateSingle();
  });

  // Initial render
  update();
}

document.addEventListener('DOMContentLoaded', init);
