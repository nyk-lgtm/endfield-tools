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
  setResults
} from './state.js';
import { renderRoomConfig, renderCharacterList, renderResults } from './ui.js';
import { optimizeLayout } from './calculations.js';

// DOM element cache
const elements = {
  helpModal: null,
  roomConfig: null,
  characterList: null,
  resultsCard: null,
  resultsContainer: null
};

function cacheElements() {
  elements.helpModal = document.getElementById('helpModal');
  elements.roomConfig = document.getElementById('roomConfig');
  elements.characterList = document.getElementById('characterList');
  elements.resultsCard = document.getElementById('resultsCard');
  elements.resultsContainer = document.getElementById('resultsContainer');
}

function toggleModal(open) {
  elements.helpModal.classList.toggle('open', open);
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
  btn.textContent = 'Optimize Ship Layout';
  progress.textContent = '';

  setResults(results);
  renderResults(elements.resultsContainer, elements.resultsCard);
}

function init() {
  cacheElements();

  // Help modal
  document.querySelector('.help-btn').addEventListener('click', () => toggleModal(true));
  elements.helpModal.addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') toggleModal(false);
  });
  document.querySelector('.modal-close').addEventListener('click', () => toggleModal(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleModal(false);
  });

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

  // Initial render
  renderRoomConfig(elements.roomConfig);
  renderCharacterList(elements.characterList);

  console.log('Ship Optimizer initialized');
}

document.addEventListener('DOMContentLoaded', init);
