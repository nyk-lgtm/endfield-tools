import {
  getRooms,
  setRoom,
  getRoomTargets,
  setRoomTarget,
  isCharacterSelected,
  selectCharacter,
  deselectCharacter,
  selectAllCharacters,
  deselectAllCharacters,
  setEliteLevel,
  setAllEliteLevels,
  getSelectedCharactersWithElite,
  setResults,
  getAssignment,
  setAssignment,
  getOptimizerConfig,
  setOptimizerConfig,
  getAllEliteLevels,
  setROIResults
} from './state.js';
import { renderRoomConfig, renderCharacterList, renderResults, renderROIResults } from './ui.js';
import { optimizeLayout, buildResults, MAX_OPERATORS_PER_ROOM, calculateROI } from './calculations.js';
import { initHelpModal } from '../../../shared/modal.js';
import { initNav } from '../../../shared/nav.js';
import { showToast } from '../../../shared/toast.js';

// DOM element cache
const elements = {
  roomConfig: null,
  characterList: null,
  resultsCard: null,
  resultsContainer: null,
  staleHint: null,
  roiView: null,
  optimizerView: null,
  roiResultsContainer: null,
};

function cacheElements() {
  elements.roomConfig = document.getElementById('roomConfig');
  elements.characterList = document.getElementById('characterList');
  elements.resultsCard = document.getElementById('resultsCard');
  elements.resultsContainer = document.getElementById('resultsContainer');
  elements.staleHint = document.getElementById('staleHint');
  elements.roiView = document.getElementById('roiView');
  elements.optimizerView = document.getElementById('optimizerView');
  elements.roiResultsContainer = document.getElementById('roiResultsContainer');
}

function markStale() {
  if (getAssignment()) elements.staleHint.hidden = false;
}

function handleCharacterClick(e) {
  const item = e.target.closest('.character-item');
  if (!item) return;

  if (e.target.classList.contains('elite-btn')) return;

  const name = item.dataset.name;

  if (isCharacterSelected(name)) {
    deselectCharacter(name);
  } else {
    selectCharacter(name);
  }

  renderCharacterList(elements.characterList);
  markStale();
}

function handleEliteClick(e) {
  if (!e.target.classList.contains('elite-btn')) return;

  const name = e.target.dataset.name;
  const level = e.target.dataset.level;

  setEliteLevel(name, level);

  // Auto-select the character when setting elite level
  if (!isCharacterSelected(name)) {
    selectCharacter(name);
  }

  renderCharacterList(elements.characterList);
  markStale();
}

function handleGlobalEliteClick(e) {
  if (!e.target.classList.contains('global-elite-btn')) return;

  const level = e.target.dataset.level;
  setAllEliteLevels(level);

  // Update active state on global buttons
  document.querySelectorAll('.global-elite-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });

  renderCharacterList(elements.characterList);
  markStale();
}

function handleRoomTypeChange(e) {
  if (!e.target.classList.contains('room-select')) return;
  const roomIndex = parseInt(e.target.dataset.room);
  setRoom(roomIndex, e.target.value);
  renderRoomConfig(elements.roomConfig);
  markStale();
}

function handleTargetChange(e) {
  if (e.target.classList.contains('target-select')) {
    const roomIndex = parseInt(e.target.dataset.room);
    setRoomTarget(roomIndex, e.target.value);
    markStale();
    return;
  }

  const checkboxContainer = e.target.closest('.target-checkboxes');
  if (checkboxContainer) {
    const roomIndex = parseInt(checkboxContainer.dataset.room);
    const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
    const selected = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    if (selected.length === 0) {
      e.target.checked = true;
      return;
    }
    setRoomTarget(roomIndex, selected);
    markStale();
  }
}

async function handleOptimize() {
  const selectedChars = getSelectedCharactersWithElite();
  const rooms = getRooms();
  const roomTargets = getRoomTargets();

  if (Object.keys(selectedChars).length === 0) {
    showToast('Please select at least one character');
    return;
  }

  const btn = document.getElementById('optimizeBtn');
  const progress = document.getElementById('optimizeProgress');

  btn.disabled = true;
  btn.textContent = 'Optimizing...';

  const onProgress = (current, total) => {
    progress.textContent = `${current}/${total}`;
  };

  const results = await optimizeLayout(selectedChars, rooms, roomTargets, onProgress);

  btn.disabled = false;
  btn.textContent = 'Optimize';
  progress.textContent = '';

  // Store raw assignment for drag-and-drop recalculation
  const assignment = results.rooms.map(r => r.operators.map(op => op.name));
  setAssignment(assignment);
  setOptimizerConfig({ rooms: [...rooms], roomTargets: { ...roomTargets }, eliteLevels: getAllEliteLevels() });

  setResults(results);
  renderResults(elements.resultsContainer, elements.resultsCard);
  elements.staleHint.hidden = true;
}

function handleViewToggle(e) {
  if (!e.target.classList.contains('toggle-btn')) return;

  const view = e.target.dataset.view;

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  elements.optimizerView.hidden = view !== 'optimizer';
  elements.roiView.hidden = view !== 'roi';

  // Render ROI results when switching to ROI view
  if (view === 'roi') {
    renderROIResults(elements.roiResultsContainer);
  }
}

async function handleCalculateROI() {
  const selectedChars = getSelectedCharactersWithElite();
  const rooms = getRooms();
  const roomTargets = getRoomTargets();

  if (Object.keys(selectedChars).length === 0) {
    showToast('Please select at least one character');
    return;
  }

  const btn = document.getElementById('calculateROIBtn');
  const progress = document.getElementById('roiProgress');

  btn.disabled = true;
  btn.textContent = 'Calculating...';

  const onProgress = (current, total) => {
    progress.textContent = `${current}/${total}`;
  };

  const results = await calculateROI(selectedChars, rooms, roomTargets, onProgress);

  btn.disabled = false;
  btn.textContent = 'Calculate ROI';
  progress.textContent = '';

  setROIResults(results);
  renderROIResults(elements.roiResultsContainer);
}

// Drag-and-drop handlers for result operators and character list
function handleResultDragStart(e) {
  const op = e.target.closest('.result-operator[draggable]');
  if (!op) return;
  op.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'result',
    roomIndex: parseInt(op.dataset.roomIndex),
    slot: parseInt(op.dataset.slot)
  }));
}

function handleCharacterDragStart(e) {
  const item = e.target.closest('.character-item[draggable]');
  if (!item || !getAssignment()) return;
  if (e.target.classList.contains('elite-btn')) { e.preventDefault(); return; }
  item.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'character',
    name: item.dataset.name
  }));
  // Show drop zones
  elements.resultsContainer.querySelectorAll('.result-drop-zone').forEach(z => z.classList.add('visible'));
}

function handleDragEnd(e) {
  const el = e.target.closest('.result-operator[draggable], .character-item[draggable]');
  if (el) el.classList.remove('dragging');
  elements.resultsContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  elements.resultsContainer.querySelectorAll('.result-drop-zone.visible').forEach(z => z.classList.remove('visible'));
}

function handleDragOver(e) {
  const target = e.target.closest('.result-operator[draggable], .result-drop-zone');
  if (!target) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  // Highlight the target
  elements.resultsContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (target.classList.contains('result-drop-zone')) {
    target.closest('.result-room').classList.add('drag-over');
  } else {
    target.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  const target = e.target.closest('.result-operator[draggable], .result-drop-zone');
  if (!target) return;
  // Only remove if we're actually leaving (not entering a child)
  if (!target.contains(e.relatedTarget)) {
    target.classList.remove('drag-over');
    if (target.classList.contains('result-drop-zone')) {
      target.closest('.result-room').classList.remove('drag-over');
    }
  }
}

function removeFromAssignment(assignment, name) {
  for (let i = 0; i < assignment.length; i++) {
    if (!Array.isArray(assignment[i])) continue;
    const idx = assignment[i].indexOf(name);
    if (idx !== -1) {
      assignment[i].splice(idx, 1);
      return true;
    }
  }
  return false;
}

function handleDrop(e) {
  e.preventDefault();
  elements.resultsContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

  const assignment = getAssignment();
  if (!assignment) return;

  const dropTarget = e.target.closest('.result-operator[draggable], .result-drop-zone');
  if (!dropTarget) return;

  let sourceData;
  try {
    sourceData = JSON.parse(e.dataTransfer.getData('text/plain'));
  } catch {
    return;
  }

  const dstRoom = parseInt(dropTarget.dataset.roomIndex);
  if (isNaN(dstRoom) || !assignment[dstRoom]) return;

  if (sourceData.type === 'character') {
    // Dragging from character list
    const name = sourceData.name;

    if (assignment[dstRoom].includes(name)) return;

    if (dropTarget.classList.contains('result-drop-zone')) {
      if (assignment[dstRoom].length >= MAX_OPERATORS_PER_ROOM) return;
      removeFromAssignment(assignment, name);
      assignment[dstRoom].push(name);
    } else {
      const dstSlot = parseInt(dropTarget.dataset.slot);
      if (isNaN(dstSlot) || dstSlot >= assignment[dstRoom].length) return;
      removeFromAssignment(assignment, name);
      assignment[dstRoom][dstSlot] = name;
    }
  } else {
    const srcRoom = sourceData.roomIndex;
    const srcSlot = sourceData.slot;
    if (!assignment[srcRoom] || srcSlot >= assignment[srcRoom].length) return;

    if (dropTarget.classList.contains('result-drop-zone')) {
      if (dstRoom === srcRoom) return;
      if (assignment[dstRoom].length >= MAX_OPERATORS_PER_ROOM) return;
      const operator = assignment[srcRoom].splice(srcSlot, 1)[0];
      assignment[dstRoom].push(operator);
    } else {
      const dstSlot = parseInt(dropTarget.dataset.slot);
      if (isNaN(dstSlot) || dstSlot >= assignment[dstRoom].length) return;
      if (dstRoom === srcRoom) return;
      const temp = assignment[srcRoom][srcSlot];
      assignment[srcRoom][srcSlot] = assignment[dstRoom][dstSlot];
      assignment[dstRoom][dstSlot] = temp;
    }
  }

  // Recalculate and re-render
  const config = getOptimizerConfig();
  const results = buildResults(assignment, config.rooms, config.roomTargets, config.eliteLevels, 0);
  setAssignment(assignment);
  setResults(results);
  renderResults(elements.resultsContainer, elements.resultsCard);
}

function init() {
  cacheElements();

  initNav();
  initHelpModal();

  // Room configuration (event delegation)
  elements.roomConfig.addEventListener('change', handleRoomTypeChange);
  elements.roomConfig.addEventListener('change', handleTargetChange);

  // Character selection and elite level clicks
  elements.characterList.addEventListener('click', handleCharacterClick);
  elements.characterList.addEventListener('click', handleEliteClick);

  // Select all/none buttons
  document.getElementById('selectAll').addEventListener('click', () => {
    selectAllCharacters();
    renderCharacterList(elements.characterList);
  });

  document.getElementById('selectNone').addEventListener('click', () => {
    deselectAllCharacters();
    renderCharacterList(elements.characterList);
  });

  // Global elite level buttons
  document.querySelector('.global-elite-controls').addEventListener('click', handleGlobalEliteClick);

  // Optimize button
  document.getElementById('optimizeBtn').addEventListener('click', handleOptimize);

  // View toggle
  document.querySelector('.toggle-group').addEventListener('click', handleViewToggle);

  // ROI calculation
  document.getElementById('calculateROIBtn').addEventListener('click', handleCalculateROI);

  // Drag-and-drop on results
  elements.resultsContainer.addEventListener('dragstart', handleResultDragStart);
  elements.resultsContainer.addEventListener('dragend', handleDragEnd);
  elements.resultsContainer.addEventListener('dragover', handleDragOver);
  elements.resultsContainer.addEventListener('dragleave', handleDragLeave);
  elements.resultsContainer.addEventListener('drop', handleDrop);

  // Drag from character list into results
  elements.characterList.addEventListener('dragstart', handleCharacterDragStart);
  elements.characterList.addEventListener('dragend', handleDragEnd);

  // Initial render
  renderRoomConfig(elements.roomConfig);
  renderCharacterList(elements.characterList);
}

document.addEventListener('DOMContentLoaded', init);
