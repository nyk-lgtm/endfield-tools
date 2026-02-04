// Ship Optimizer state management

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
  // Manufacturing: 'Weapon EXP' | 'Operator EXP'
  // Growth: array of selected types ['Fungal Matter', 'Plant', 'Rare Mineral']
  roomTargets: {
    2: 'Weapon EXP',
    3: 'Weapon EXP',
    4: 'Weapon EXP'
  },
  // Selected characters: { characterName: eliteLevel } where eliteLevel is 'max' or 'e1'|'e2'
  selectedCharacters: {},
  // Whether to show elite level controls
  showEliteControls: false,
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
  // Set default target when room type changes
  if (type === 'Manufacturing Cabin') {
    state.roomTargets[index] = 'Weapon EXP';
  } else if (type === 'Growth Chamber') {
    state.roomTargets[index] = ['Fungal Matter', 'Plant', 'Rare Mineral']; // All by default
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

export function getSelectedCharacters() {
  return state.selectedCharacters;
}

export function isCharacterSelected(name) {
  return name in state.selectedCharacters;
}

export function selectCharacter(name, eliteLevel = 'max') {
  state.selectedCharacters[name] = eliteLevel;
}

export function deselectCharacter(name) {
  delete state.selectedCharacters[name];
}

export function setCharacterElite(name, eliteLevel) {
  if (name in state.selectedCharacters) {
    state.selectedCharacters[name] = eliteLevel;
  }
}

export function selectAllCharacters(characters, eliteLevel = 'max') {
  for (const name of Object.keys(characters)) {
    state.selectedCharacters[name] = eliteLevel;
  }
}

export function deselectAllCharacters() {
  state.selectedCharacters = {};
}

export function getShowEliteControls() {
  return state.showEliteControls;
}

export function setShowEliteControls(show) {
  state.showEliteControls = show;
}

export function getResults() {
  return state.results;
}

export function setResults(results) {
  state.results = results;
}
