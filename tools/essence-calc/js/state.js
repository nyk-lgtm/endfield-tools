import { ATTRIBUTES, ALL_SECONDARIES, ALL_SKILLS } from '../../../data/index.js';
import { save, load } from '../../../shared/storage.js';

const TOOL = 'essence-calc';

function isValidBuild(b) {
  return b && ATTRIBUTES.includes(b.attribute)
    && ALL_SECONDARIES.includes(b.secondary)
    && ALL_SKILLS.includes(b.skill);
}

function defaultBuild() {
  return { attribute: ATTRIBUTES[0], secondary: ALL_SECONDARIES[0], skill: ALL_SKILLS[0] };
}

function loadBuilds(key) {
  const saved = load(TOOL, key);
  if (Array.isArray(saved) && saved.length > 0 && saved.every(isValidBuild)) {
    return saved;
  }
  return [defaultBuild()];
}

let plannerBuilds = loadBuilds('plannerBuilds');
let calcBuilds = loadBuilds('calcBuilds');

let selectedZone = null;
let selectedTicket = "none";
let currentMode = load(TOOL, 'mode') || "multi";
let optimizeMode = load(TOOL, 'optimizeMode') || "sanity";

function persistBuilds() {
  save(TOOL, 'plannerBuilds', plannerBuilds);
  save(TOOL, 'calcBuilds', calcBuilds);
}

// State accessors
export function getBuilds() {
  return currentMode === 'multi' ? plannerBuilds : calcBuilds;
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
  save(TOOL, 'mode', mode);
}

export function getOptimizeMode() {
  return optimizeMode;
}

export function setOptimizeMode(mode) {
  optimizeMode = mode;
  save(TOOL, 'optimizeMode', mode);
}

// Build mutations
export function addBuild() {
  getBuilds().push(defaultBuild());
  selectedZone = null;
  persistBuilds();
}

export function removeBuild(index) {
  const builds = getBuilds();
  if (builds.length > 1) {
    builds.splice(index, 1);
    selectedZone = null;
    persistBuilds();
    return true;
  }
  return false;
}

export function updateBuild(index, field, value) {
  getBuilds()[index][field] = value;
  selectedZone = null;
  persistBuilds();
}
