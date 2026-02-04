// Ship Optimizer entry point

import { CHARACTERS } from '../../../data/index.js';
import {
  getRooms,
  setRoom,
  getRoomTargets,
  setRoomTarget,
  isCharacterSelected,
  selectCharacter,
  deselectCharacter,
  setCharacterElite,
  selectAllCharacters,
  deselectAllCharacters,
  getSelectedCharacters,
  getShowEliteControls,
  setShowEliteControls,
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

  // Ignore clicks on the elite select dropdown
  if (e.target.classList.contains('elite-select')) return;

  const name = item.dataset.name;

  if (isCharacterSelected(name)) {
    deselectCharacter(name);
  } else {
    selectCharacter(name, getShowEliteControls() ? 'max' : 'max');
  }

  renderCharacterList(elements.characterList);
}

function handleEliteChange(e) {
  if (!e.target.classList.contains('elite-select')) return;

  const name = e.target.dataset.name;
  const elite = e.target.value;

  // Auto-select the character if not already selected
  if (!isCharacterSelected(name)) {
    selectCharacter(name, elite);
  } else {
    setCharacterElite(name, elite);
  }

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
  const selectedChars = getSelectedCharacters();
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

  // Character selection
  elements.characterList.addEventListener('click', handleCharacterClick);
  elements.characterList.addEventListener('change', handleEliteChange);

  // Select all/none buttons
  document.getElementById('selectAll').addEventListener('click', () => {
    selectAllCharacters(CHARACTERS);
    renderCharacterList(elements.characterList);
  });

  document.getElementById('selectNone').addEventListener('click', () => {
    deselectAllCharacters();
    renderCharacterList(elements.characterList);
  });

  // Elite controls toggle
  document.getElementById('showEliteControls').addEventListener('change', (e) => {
    setShowEliteControls(e.target.checked);
    renderCharacterList(elements.characterList);
  });

  // Optimize button
  document.getElementById('optimizeBtn').addEventListener('click', handleOptimize);

  // Initial render
  renderRoomConfig(elements.roomConfig);
  renderCharacterList(elements.characterList);

  console.log('Ship Optimizer initialized');
}

document.addEventListener('DOMContentLoaded', init);
