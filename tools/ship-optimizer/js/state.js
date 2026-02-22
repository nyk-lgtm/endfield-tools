import { CHARACTERS } from '../../../data/index.js';
import { save, load } from '../../../shared/storage.js';

const TOOL = 'ship-optimizer';

// Initialize elite levels for all characters (default to 'e4')
function initEliteLevels() {
  const levels = {};
  for (const name of Object.keys(CHARACTERS)) {
    levels[name] = 'e4';
  }
  return levels;
}

function loadState() {
  const saved = load(TOOL, 'state');
  const defaults = {
    rooms: ['Control Nexus', 'Reception Room', 'Manufacturing Cabin', 'Manufacturing Cabin', 'Manufacturing Cabin'],
    roomTargets: { 2: 'Weapon EXP', 3: 'Weapon EXP', 4: 'Weapon EXP' },
    eliteLevels: initEliteLevels(),
    selectedCharacters: {},
  };

  if (!saved) return { ...defaults, results: null, assignment: null, optimizerConfig: null, roiResults: null };

  // Merge saved elite levels with current character list (handles new characters)
  const eliteLevels = initEliteLevels();
  if (saved.eliteLevels) {
    for (const [name, level] of Object.entries(saved.eliteLevels)) {
      if (name in eliteLevels) eliteLevels[name] = level;
    }
  }

  // Filter selected characters to only include valid ones
  const selectedCharacters = {};
  if (saved.selectedCharacters) {
    for (const name of Object.keys(saved.selectedCharacters)) {
      if (name in CHARACTERS) selectedCharacters[name] = true;
    }
  }

  return {
    rooms: saved.rooms || defaults.rooms,
    roomTargets: saved.roomTargets || defaults.roomTargets,
    eliteLevels,
    selectedCharacters,
    results: null,
    assignment: null,
    optimizerConfig: null,
    roiResults: null,
  };
}

function persist() {
  save(TOOL, 'state', {
    rooms: state.rooms,
    roomTargets: state.roomTargets,
    eliteLevels: state.eliteLevels,
    selectedCharacters: state.selectedCharacters,
  });
}

let state = loadState();

export function getRooms() {
  return state.rooms;
}

export function setRoom(index, type) {
  const prevType = state.rooms[index];
  state.rooms[index] = type;
  if (type === 'Manufacturing Cabin') {
    if (prevType !== 'Manufacturing Cabin') {
      state.roomTargets[index] = 'Weapon EXP';
    }
  } else if (type === 'Growth Chamber') {
    if (prevType !== 'Growth Chamber' || !Array.isArray(state.roomTargets[index])) {
      state.roomTargets[index] = ['Fungal Matter', 'Plant', 'Rare Mineral'];
    }
  }
  persist();
}

export function getRoomTargets() {
  return state.roomTargets;
}

export function getRoomTarget(index) {
  return state.roomTargets[index];
}

export function setRoomTarget(index, target) {
  state.roomTargets[index] = target;
  persist();
}

// Character selection
export function isCharacterSelected(name) {
  return name in state.selectedCharacters;
}

export function selectCharacter(name) {
  state.selectedCharacters[name] = true;
  persist();
}

export function deselectCharacter(name) {
  delete state.selectedCharacters[name];
  persist();
}

export function selectAllCharacters() {
  for (const name of Object.keys(CHARACTERS)) {
    state.selectedCharacters[name] = true;
  }
  persist();
}

export function deselectAllCharacters() {
  state.selectedCharacters = {};
  persist();
}

// Elite levels (separate from selection)
export function getEliteLevel(name) {
  return state.eliteLevels[name] || 'e4';
}

export function setEliteLevel(name, level) {
  state.eliteLevels[name] = level;
  persist();
}

export function setAllEliteLevels(level) {
  for (const name of Object.keys(CHARACTERS)) {
    state.eliteLevels[name] = level;
  }
  persist();
}

export function getAllEliteLevels() {
  return { ...state.eliteLevels };
}

// Get selected characters with their elite levels (for optimizer)
export function getSelectedCharactersWithElite() {
  const result = {};
  for (const name of Object.keys(state.selectedCharacters)) {
    result[name] = state.eliteLevels[name];
  }
  return result;
}

export function getResults() {
  return state.results;
}

export function setResults(results) {
  state.results = results;
}

export function getAssignment() {
  return state.assignment;
}

export function setAssignment(assignment) {
  state.assignment = assignment;
}

export function getOptimizerConfig() {
  return state.optimizerConfig;
}

export function setOptimizerConfig(config) {
  state.optimizerConfig = config;
}

export function getROIResults() {
  return state.roiResults;
}

export function setROIResults(results) {
  state.roiResults = results;
}
