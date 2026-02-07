// Ship Optimizer entry point

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
  setOptimizerConfig
} from './state.js';
import { renderRoomConfig, renderCharacterList, renderResults } from './ui.js';
import { optimizeLayout, buildResults } from './calculations.js';
import { initHelpModal } from '../../../shared/modal.js';
import { initNav } from '../../../shared/nav.js';

// DOM element cache
const elements = {
  roomConfig: null,
  characterList: null,
  resultsCard: null,
  resultsContainer: null
};

function cacheElements() {
  elements.roomConfig = document.getElementById('roomConfig');
  elements.characterList = document.getElementById('characterList');
  elements.resultsCard = document.getElementById('resultsCard');
  elements.resultsContainer = document.getElementById('resultsContainer');
}

function handleCharacterClick(e) {
  const item = e.target.closest('.character-item');
  if (!item) return;

  // Ignore clicks on elite buttons
  if (e.target.classList.contains('elite-btn')) return;

  const name = item.dataset.name;

  if (isCharacterSelected(name)) {
    deselectCharacter(name);
  } else {
    selectCharacter(name);
  }

  renderCharacterList(elements.characterList);
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
}

function handleRoomTypeChange(e) {
  if (!e.target.classList.contains('room-select')) return;
  const roomIndex = parseInt(e.target.dataset.room);
  setRoom(roomIndex, e.target.value);
  renderRoomConfig(elements.roomConfig);
}

function handleTargetChange(e) {
  // Manufacturing target (select)
  if (e.target.classList.contains('target-select')) {
    const roomIndex = parseInt(e.target.dataset.room);
    setRoomTarget(roomIndex, e.target.value);
    return;
  }

  // Growth target (checkboxes)
  const checkboxContainer = e.target.closest('.target-checkboxes');
  if (checkboxContainer) {
    const roomIndex = parseInt(checkboxContainer.dataset.room);
    const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
    const selected = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    // Ensure at least one is selected
    if (selected.length === 0) {
      e.target.checked = true;
      return;
    }
    setRoomTarget(roomIndex, selected);
  }
}

async function handleOptimize() {
  const selectedChars = getSelectedCharactersWithElite();
  const rooms = getRooms();
  const roomTargets = getRoomTargets();

  // Need at least some characters to optimize
  if (Object.keys(selectedChars).length === 0) {
    alert('Please select at least one character');
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
  setOptimizerConfig({ rooms: [...rooms], roomTargets: { ...roomTargets }, eliteLevels: { ...selectedChars } });

  setResults(results);
  renderResults(elements.resultsContainer, elements.resultsCard);
}

// Drag-and-drop handlers for result operators
function handleDragStart(e) {
  const op = e.target.closest('.result-operator[draggable]');
  if (!op) return;
  op.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify({
    roomIndex: parseInt(op.dataset.roomIndex),
    slot: parseInt(op.dataset.slot)
  }));
}

function handleDragEnd(e) {
  const op = e.target.closest('.result-operator[draggable]');
  if (op) op.classList.remove('dragging');
  // Clean up all highlights
  elements.resultsContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
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

function handleDrop(e) {
  e.preventDefault();
  elements.resultsContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

  const sourceData = JSON.parse(e.dataTransfer.getData('text/plain'));
  const srcRoom = sourceData.roomIndex;
  const srcSlot = sourceData.slot;

  const assignment = getAssignment();
  if (!assignment) return;

  const dropTarget = e.target.closest('.result-operator[draggable], .result-drop-zone');
  if (!dropTarget) return;

  if (dropTarget.classList.contains('result-drop-zone')) {
    // Move to room (drop zone)
    const dstRoom = parseInt(dropTarget.dataset.roomIndex);
    if (dstRoom === srcRoom) return;
    if (assignment[dstRoom].length >= 3) return;

    // Move operator from source to destination
    const operator = assignment[srcRoom].splice(srcSlot, 1)[0];
    assignment[dstRoom].push(operator);
  } else {
    // Swap with another operator
    const dstRoom = parseInt(dropTarget.dataset.roomIndex);
    const dstSlot = parseInt(dropTarget.dataset.slot);
    if (dstRoom === srcRoom) return;

    // Swap
    const temp = assignment[srcRoom][srcSlot];
    assignment[srcRoom][srcSlot] = assignment[dstRoom][dstSlot];
    assignment[dstRoom][dstSlot] = temp;
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

  // Drag-and-drop on results
  elements.resultsContainer.addEventListener('dragstart', handleDragStart);
  elements.resultsContainer.addEventListener('dragend', handleDragEnd);
  elements.resultsContainer.addEventListener('dragover', handleDragOver);
  elements.resultsContainer.addEventListener('dragleave', handleDragLeave);
  elements.resultsContainer.addEventListener('drop', handleDrop);

  // Initial render
  renderRoomConfig(elements.roomConfig);
  renderCharacterList(elements.characterList);

  console.log('Ship Optimizer initialized');
}

document.addEventListener('DOMContentLoaded', init);
