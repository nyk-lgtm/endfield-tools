import { ATTRIBUTES, ALL_SECONDARIES, ALL_SKILLS } from '../../../data/index.js';

// Application state
let plannerBuilds = [
  { attribute: "Agility", secondary: "Attack", skill: "Flow" },
];

let calcBuilds = [
  { attribute: "Agility", secondary: "Attack", skill: "Flow" },
];

let selectedZone = null;
let selectedTicket = "none";
let currentMode = "multi";
let optimizeMode = "sanity"; // "sanity" | "probability" | "zones"

// State accessors
export function getBuilds() {
  return currentMode === 'multi' ? plannerBuilds : calcBuilds;
}

export function setBuilds(newBuilds) {
  if (currentMode === 'multi') {
    plannerBuilds = newBuilds;
  } else {
    calcBuilds = newBuilds;
  }
}

export function getSelectedZone() {
  return selectedZone;
}

export function setSelectedZone(zoneId) {
  selectedZone = zoneId;
}

export function getSelectedTicket() {
  return selectedTicket;
}

export function setSelectedTicket(ticket) {
  selectedTicket = ticket;
}

export function getCurrentMode() {
  return currentMode;
}

export function setCurrentMode(mode) {
  currentMode = mode;
}

export function getOptimizeMode() {
  return optimizeMode;
}

export function setOptimizeMode(mode) {
  optimizeMode = mode;
}

// Build mutations
export function addBuild() {
  getBuilds().push({
    attribute: ATTRIBUTES[0],
    secondary: ALL_SECONDARIES[0],
    skill: ALL_SKILLS[0]
  });
  selectedZone = null;
}

export function removeBuild(index) {
  const builds = getBuilds();
  if (builds.length > 1) {
    builds.splice(index, 1);
    selectedZone = null;
    return true;
  }
  return false;
}

export function updateBuild(index, field, value) {
  getBuilds()[index][field] = value;
  selectedZone = null;
}
