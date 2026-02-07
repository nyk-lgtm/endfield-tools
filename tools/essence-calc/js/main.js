import {
  getCurrentMode, setCurrentMode,
  addBuild as stateAddBuild,
  removeBuild as stateRemoveBuild,
  updateBuild as stateUpdateBuild,
  setSelectedZone, setSelectedTicket,
  getSelectedZone, setOptimizeMode
} from './state.js';
import { ESSENCE_ZONES } from '../../../data/index.js';
import {
  cacheElements, renderBuilds, renderModeToggle,
  renderMultiZonePlan, renderSingleZoneCalc, toggleModal, getVal
} from './ui.js';
import { getBuilds } from './state.js';

function recalculate() {
  if (getCurrentMode() === 'multi') {
    renderMultiZonePlan();
  } else {
    renderSingleZoneCalc(handleSelectZone, handleSelectTicket);
  }
}

function handleUpdateBuild(index, field, value) {
  stateUpdateBuild(index, field, value);
  recalculate();
}

function handleRemoveBuild(index) {
  if (stateRemoveBuild(index)) {
    renderBuilds(handleUpdateBuild, handleRemoveBuild);
    recalculate();
  }
}

function handleAddBuild() {
  stateAddBuild();
  renderBuilds(handleUpdateBuild, handleRemoveBuild);
  recalculate();
}

function handleSelectZone(zoneId) {
  if (!zoneId) return;
  const builds = getBuilds();
  const zone = ESSENCE_ZONES[zoneId];
  const requiredSecs = new Set(builds.map(b => b.secondary));
  const requiredSkills = new Set(builds.map(b => b.skill));
  const hasAllSecs = [...requiredSecs].every(s => zone.secondaries.includes(s));
  const hasAllSkills = [...requiredSkills].every(s => zone.skills.includes(s));
  if (!hasAllSecs || !hasAllSkills) return;

  setSelectedZone(zoneId);
  setSelectedTicket("none");
  renderSingleZoneCalc(handleSelectZone, handleSelectTicket);
}

function handleSelectTicket(ticket) {
  setSelectedTicket(ticket);
  renderSingleZoneCalc(handleSelectZone, handleSelectTicket);
}

function handleSetMode(mode) {
  setCurrentMode(mode);
  renderModeToggle(mode);
  renderBuilds(handleUpdateBuild, handleRemoveBuild);
  recalculate();
}

function init() {
  cacheElements();

  // Mode toggle buttons
  document.getElementById('modeMulti').addEventListener('click', () => handleSetMode('multi'));
  document.getElementById('modeSingle').addEventListener('click', () => handleSetMode('single'));

  // Add build button
  document.querySelector('.btn-add').addEventListener('click', handleAddBuild);

  // Config inputs
  document.querySelectorAll('.config-grid input').forEach(input => {
    input.addEventListener('input', recalculate);
  });

  // Optimize mode dropdown
  document.getElementById('optimizeMode').addEventListener('change', (e) => {
    setOptimizeMode(e.target.value);
    recalculate();
  });

  // Help modal
  document.querySelector('.help-btn').addEventListener('click', () => toggleModal(true));
  document.getElementById('helpModal').addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') toggleModal(false);
  });
  document.querySelector('.modal-close').addEventListener('click', () => toggleModal(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleModal(false);
  });

  // Initial render
  renderBuilds(handleUpdateBuild, handleRemoveBuild);
  renderMultiZonePlan();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
