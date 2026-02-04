// Ship Optimizer state management

import { CHARACTERS } from '../../../data/index.js';

// Initialize elite levels for all characters (default to 'max')
function initEliteLevels() {
  const levels = {};
  for (const name of Object.keys(CHARACTERS)) {
    levels[name] = 'max';
  }
  return levels;
}

// Application state
let state = {
  // Room configuration: [Control Nexus, Reception Room, room3, room4, room5]
  rooms: [
    'Control Nexus',
    'Reception Room',
    'Manufacturing Cabin',
    'Manufacturing Cabin',
    'Manufacturing Cabin'
  ],
  // Production targets for each room (index 2-4 are configurable)
  roomTargets: {
    2: 'Weapon EXP',
    3: 'Weapon EXP',
    4: 'Weapon EXP'
  },
  // Elite levels for ALL characters: { name: 'max' | 'e2' | 'e1' }
  eliteLevels: initEliteLevels(),
  // Selected character names (Set-like object)
  selectedCharacters: {},
  // Optimization results
  results: null
};

export function getState() {
  return state;
}

export function getRooms() {
  return state.rooms;
}

export function setRoom(index, type) {
  state.rooms[index] = type;
  if (type === 'Manufacturing Cabin') {
    state.roomTargets[index] = 'Weapon EXP';
  } else if (type === 'Growth Chamber') {
    state.roomTargets[index] = ['Fungal Matter', 'Plant', 'Rare Mineral'];
  }
}

export function getRoomTargets() {
  return state.roomTargets;
}

export function getRoomTarget(index) {
  return state.roomTargets[index];
}

export function setRoomTarget(index, target) {
  state.roomTargets[index] = target;
}

// Character selection
export function isCharacterSelected(name) {
  return name in state.selectedCharacters;
}

export function selectCharacter(name) {
  state.selectedCharacters[name] = true;
}

export function deselectCharacter(name) {
  delete state.selectedCharacters[name];
}

export function selectAllCharacters() {
  for (const name of Object.keys(CHARACTERS)) {
    state.selectedCharacters[name] = true;
  }
}

export function deselectAllCharacters() {
  state.selectedCharacters = {};
}

// Elite levels (separate from selection)
export function getEliteLevel(name) {
  return state.eliteLevels[name] || 'max';
}

export function setEliteLevel(name, level) {
  state.eliteLevels[name] = level;
}

export function setAllEliteLevels(level) {
  for (const name of Object.keys(CHARACTERS)) {
    state.eliteLevels[name] = level;
  }
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
