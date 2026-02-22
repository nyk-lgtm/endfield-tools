import { CHARACTERS } from '../../../data/index.js';

// Base rates
const BASE_MOOD_DROP = 7;      // % per hour
const BASE_MOOD_REGEN = 12;    // % per hour
const BASE_EFFICIENCY = 100;   // %
const OPERATOR_BONUS = 40;     // % per operator in room

export const MAX_OPERATORS_PER_ROOM = 3;
const EFFICIENCY_EPSILON = 0.01;

// Production stats by cabin type
const PRODUCTION_STATS = {
  'Manufacturing Cabin': ['Weapon EXP', 'Operator EXP'],
  'Growth Chamber': ['Fungal Matter', 'Plant', 'Rare Mineral'],
  'Reception Room': ['Clue Collecting Efficiency'],
  'Control Nexus': ['Mood Regen']
};

/**
 * Resolve target products into an array
 */
function resolveTargets(targetProducts, roomType) {
  return targetProducts
    ? (Array.isArray(targetProducts) ? targetProducts : [targetProducts])
    : (PRODUCTION_STATS[roomType] || []);
}

/**
 * Get the talents a character can contribute at a given elite level
 */
export function getCharacterTalents(charName, maxElite = 'e4') {
  const charData = CHARACTERS[charName];
  if (!charData) return [];

  const talents = [];
  const seen = new Set();

  // Talent slots: slot1 (e1→e3), slot2 (e2→e4)
  const eliteRanges = {
    'e4': ['e3', 'e4'],
    'e3': ['e3', 'e2'],   // slot1 upgraded, slot2 base
    'e2': ['e1', 'e2'],   // both slots base
    'e1': ['e1']          // slot1 only
  };

  const elites = eliteRanges[maxElite] || ['e1'];
  for (const elite of elites) {
    const talent = charData.ship_talents[elite];
    const key = `${talent.cabin}|${talent.stat}`;
    if (!seen.has(key)) {
      seen.add(key);
      talents.push({ cabin: talent.cabin, stat: talent.stat, value: talent.value, elite });
    }
  }

  return talents;
}

/**
 * Get talents a character contributes when placed in a specific cabin
 */
export function getCharacterTalentsForCabin(charName, cabin, maxElite = 'e4') {
  const allTalents = getCharacterTalents(charName, maxElite);
  return allTalents.filter(t => t.cabin === cabin);
}

/**
 * Calculate uptime based on mood stats
 */
export function calculateUptime(slowMoodDrop, moodRegen) {
  const clampedDrop = Math.min(slowMoodDrop, 99);
  const effectiveDrop = BASE_MOOD_DROP * (1 - clampedDrop / 100);
  const effectiveRegen = BASE_MOOD_REGEN * (1 + moodRegen / 100);

  const workHours = 100 / effectiveDrop;
  const restHours = 100 / effectiveRegen;

  return workHours / (workHours + restHours);
}

/**
 * Calculate effective efficiency for a room
 */
export function calculateRoomEfficiency(numOperators, productionBonus, slowMoodDrop, globalMoodRegen) {
  const baseEff = BASE_EFFICIENCY + (OPERATOR_BONUS * numOperators);
  const nominal = baseEff * (1 + productionBonus / 100);
  const uptime = calculateUptime(slowMoodDrop, globalMoodRegen);
  const effective = nominal * uptime;

  return { nominal, uptime, effective };
}

/**
 * Get room stats from assigned operators
 */
function getRoomStats(operators, roomType, targetProducts, eliteLevels) {
  let productionBonus = 0;
  let slowMoodDrop = 0;
  let moodRegen = 0;

  const relevantStats = resolveTargets(targetProducts, roomType);

  for (const charName of operators) {
    const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'e4');
    for (const talent of talents) {
      // Mood Regen is special - always track it separately for global uptime calc
      if (talent.stat === 'Mood Regen') {
        moodRegen += talent.value;
      } else if (relevantStats.includes(talent.stat)) {
        productionBonus += talent.value;
      } else if (talent.stat === 'Slow Mood Drop') {
        slowMoodDrop += talent.value;
      }
    }
  }

  return { productionBonus, slowMoodDrop, moodRegen };
}

/**
 * Calculate effective efficiency for a single room given operators and global mood regen
 */
function calcRoomEffective(operators, roomType, target, eliteLevels, globalMoodRegen) {
  if (roomType === 'Control Nexus') return 0;

  const { slowMoodDrop } = getRoomStats(operators, roomType, target, eliteLevels);
  const targetArray = resolveTargets(target, roomType);

  if (targetArray.length > 1) {
    let total = 0;
    for (const product of targetArray) {
      let productBonus = 0;
      for (const charName of operators) {
        const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'e4');
        for (const t of talents) {
          if (t.stat === product) productBonus += t.value;
        }
      }
      const { effective } = calculateRoomEfficiency(operators.length, productBonus, slowMoodDrop, globalMoodRegen);
      total += effective;
    }
    return total / targetArray.length;
  }

  const { productionBonus } = getRoomStats(operators, roomType, target, eliteLevels);
  const { effective } = calculateRoomEfficiency(operators.length, productionBonus, slowMoodDrop, globalMoodRegen);
  return effective;
}

/**
 * Calculate total ship efficiency for a given assignment
 * This is the objective function we're optimizing
 */
function calculateTotalShipEfficiency(assignment, rooms, roomTargets, eliteLevels) {
  // First, get Control Nexus mood regen (affects all rooms)
  const controlNexusIndex = rooms.indexOf('Control Nexus');
  const controlNexusOps = assignment[controlNexusIndex] || [];
  const { moodRegen: globalMoodRegen } = getRoomStats(
    controlNexusOps, 'Control Nexus', null, eliteLevels
  );

  let totalEfficiency = 0;
  const roomEfficiencies = [];

  for (let i = 0; i < rooms.length; i++) {
    const roomType = rooms[i];
    const operators = assignment[i] || [];
    const target = roomTargets[i];

    if (roomType === 'Control Nexus') {
      roomEfficiencies.push({ moodRegen: globalMoodRegen, effective: 0 });
      continue;
    }

    const effective = calcRoomEffective(operators, roomType, target, eliteLevels, globalMoodRegen);
    const { slowMoodDrop } = getRoomStats(operators, roomType, target, eliteLevels);
    roomEfficiencies.push({ effective, slowMoodDrop });
    totalEfficiency += effective;
  }

  return { totalEfficiency, roomEfficiencies, globalMoodRegen };
}

/**
 * Score a character for a specific room, considering current room state
 */
function scoreCharacterForRoom(charName, roomType, maxElite, currentMoodDrop, globalMoodRegen, targetProducts) {
  const talents = getCharacterTalentsForCabin(charName, roomType, maxElite);
  if (talents.length === 0) return { score: 0, talents: [], productionValue: 0, moodValue: 0 };

  let productionValue = 0;
  let moodValue = 0;

  const relevantStats = resolveTargets(targetProducts, roomType);

  for (const talent of talents) {
    if (relevantStats.includes(talent.stat)) {
      productionValue += talent.value;
    } else if (talent.stat === 'Slow Mood Drop') {
      moodValue += talent.value;
    }
  }

  // Calculate actual uptime improvement considering current room state
  const currentUptime = calculateUptime(currentMoodDrop, globalMoodRegen);
  const newUptime = calculateUptime(currentMoodDrop + moodValue, globalMoodRegen);
  const uptimeGain = newUptime - currentUptime;

  // Score: production value + uptime gain weighted by full-room base efficiency
  const fullRoomBase = (BASE_EFFICIENCY + OPERATOR_BONUS * MAX_OPERATORS_PER_ROOM) / 100;
  const score = productionValue + (uptimeGain * 100 * fullRoomBase);

  return { score, talents, productionValue, moodValue };
}

/**
 * Greedy assignment with fixed Control Nexus configuration
 */
function greedyAssignment(eliteLevels, rooms, roomTargets, fixedNexus) {
  const availableChars = new Set(Object.keys(eliteLevels));
  const assignment = rooms.map(() => []);
  const controlNexusIndex = rooms.indexOf('Control Nexus');

  assignment[controlNexusIndex] = [...fixedNexus];
  for (const char of fixedNexus) {
    availableChars.delete(char);
  }

  let globalMoodRegen = 0;
  for (const charName of assignment[controlNexusIndex]) {
    const talents = getCharacterTalentsForCabin(charName, 'Control Nexus', eliteLevels[charName]);
    for (const t of talents) {
      if (t.stat === 'Mood Regen') globalMoodRegen += t.value;
    }
  }

  for (let i = 0; i < rooms.length; i++) {
    if (i === controlNexusIndex) continue;
    assignRoomGreedy(i, rooms[i], assignment, availableChars, eliteLevels, globalMoodRegen, roomTargets[i]);
  }

  return assignment;
}

/**
 * Greedy room assignment with dynamic re-scoring after each pick
 */
function assignRoomGreedy(roomIndex, roomType, assignment, availableChars, eliteLevels, globalMoodRegen, targetProducts) {
  let currentMoodDrop = 0;

  for (let slot = 0; slot < MAX_OPERATORS_PER_ROOM; slot++) {
    let bestChar = null;
    let bestScore = -Infinity;
    let bestMoodValue = 0;

    // Score all available characters with current room state
    for (const charName of availableChars) {
      const maxElite = eliteLevels[charName];
      const { score, moodValue, talents } = scoreCharacterForRoom(
        charName, roomType, maxElite, currentMoodDrop, globalMoodRegen, targetProducts
      );

      // Only consider characters with matching talents
      if (talents.length > 0 && score > bestScore) {
        bestScore = score;
        bestChar = charName;
        bestMoodValue = moodValue;
      }
    }

    if (bestChar) {
      assignment[roomIndex].push(bestChar);
      availableChars.delete(bestChar);
      currentMoodDrop += bestMoodValue;
    } else if (availableChars.size > 0) {
      // No matching character - fill with any available
      // Non-matching chars still provide +40% base efficiency
      const nextChar = availableChars.values().next().value;
      assignment[roomIndex].push(nextChar);
      availableChars.delete(nextChar);
    }
  }
}

/**
 * Check if a character has matching talents for a room
 */
function hasMatchingTalent(charName, roomType, eliteLevel) {
  const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevel);
  return talents.length > 0;
}

/**
 * Generate all k-combinations of an array
 */
function* combinations(arr, k) {
  if (k === 0) {
    yield [];
    return;
  }
  if (arr.length < k) return;

  const [first, ...rest] = arr;
  // Combinations including first
  for (const combo of combinations(rest, k - 1)) {
    yield [first, ...combo];
  }
  // Combinations excluding first
  yield* combinations(rest, k);
}

/**
 * Get all characters that have Mood Regen talent for Control Nexus
 */
function getControlNexusCandidates(selectedCharacters) {
  const candidates = [];
  for (const [charName, elite] of Object.entries(selectedCharacters)) {
    const talents = getCharacterTalentsForCabin(charName, 'Control Nexus', elite);
    if (talents.some(t => t.stat === 'Mood Regen')) {
      candidates.push(charName);
    }
  }
  return candidates;
}

/**
 * Generate all valid Control Nexus configurations (0 to 3 operators)
 */
function generateNexusConfigs(nexusCandidates) {
  const configs = [[]]; // Include empty config
  for (let k = 1; k <= Math.min(MAX_OPERATORS_PER_ROOM, nexusCandidates.length); k++) {
    for (const combo of combinations(nexusCandidates, k)) {
      configs.push(combo);
    }
  }
  return configs;
}

/**
 * Phase 2: Iterative improvement via swaps
 * Uses delta evaluation: only recalculates affected rooms unless Control Nexus is involved
 */
function iterativeImprovement(assignment, rooms, roomTargets, eliteLevels, maxIterations = 100) {
  let improved = true;
  let iterations = 0;
  let swapsMade = 0;
  const controlNexusIndex = rooms.indexOf('Control Nexus');

  const { globalMoodRegen } = calculateTotalShipEfficiency(assignment, rooms, roomTargets, eliteLevels);
  let cachedMoodRegen = globalMoodRegen;
  const roomEffCache = rooms.map((_, i) =>
    calcRoomEffective(assignment[i] || [], rooms[i], roomTargets[i], eliteLevels, cachedMoodRegen)
  );
  let bestEfficiency = roomEffCache.reduce((sum, e) => sum + e, 0);

  function evalSwap(affectedRooms) {
    if (affectedRooms.includes(controlNexusIndex)) {
      const result = calculateTotalShipEfficiency(assignment, rooms, roomTargets, eliteLevels);
      return { efficiency: result.totalEfficiency, moodRegen: result.globalMoodRegen };
    }
    let newTotal = bestEfficiency;
    for (const ri of affectedRooms) {
      const oldEff = roomEffCache[ri];
      const newEff = calcRoomEffective(assignment[ri] || [], rooms[ri], roomTargets[ri], eliteLevels, cachedMoodRegen);
      newTotal += newEff - oldEff;
    }
    return { efficiency: newTotal, moodRegen: cachedMoodRegen };
  }

  function commitSwap(affectedRooms, newEfficiency, newMoodRegen) {
    bestEfficiency = newEfficiency;
    cachedMoodRegen = newMoodRegen;
    for (const ri of affectedRooms) {
      roomEffCache[ri] = calcRoomEffective(assignment[ri] || [], rooms[ri], roomTargets[ri], eliteLevels, cachedMoodRegen);
    }
    if (affectedRooms.includes(controlNexusIndex)) {
      for (let i = 0; i < rooms.length; i++) {
        roomEffCache[i] = calcRoomEffective(assignment[i] || [], rooms[i], roomTargets[i], eliteLevels, cachedMoodRegen);
      }
    }
  }

  const getUnassignedChars = () => {
    const assigned = new Set();
    for (const roomOps of assignment) {
      for (const char of roomOps) assigned.add(char);
    }
    return Object.keys(eliteLevels).filter(name => !assigned.has(name));
  };

  function tryPairwiseSwaps() {
    let found = false;
    for (let roomA = 0; roomA < rooms.length; roomA++) {
      for (let roomB = roomA + 1; roomB < rooms.length; roomB++) {
        for (let slotA = 0; slotA < assignment[roomA].length; slotA++) {
          for (let slotB = 0; slotB < assignment[roomB].length; slotB++) {
            const charA = assignment[roomA][slotA];
            const charB = assignment[roomB][slotB];

            if (rooms[roomA] === 'Control Nexus' && !hasMatchingTalent(charB, 'Control Nexus', eliteLevels[charB])) continue;
            if (rooms[roomB] === 'Control Nexus' && !hasMatchingTalent(charA, 'Control Nexus', eliteLevels[charA])) continue;

            assignment[roomA][slotA] = charB;
            assignment[roomB][slotB] = charA;

            const { efficiency: newEfficiency, moodRegen: newMoodRegen } = evalSwap([roomA, roomB]);

            if (newEfficiency > bestEfficiency + EFFICIENCY_EPSILON) {
              commitSwap([roomA, roomB], newEfficiency, newMoodRegen);
              found = true;
              swapsMade++;
            } else {
              assignment[roomA][slotA] = charA;
              assignment[roomB][slotB] = charB;
            }
          }
        }
      }
    }
    return found;
  }

  function tryUnassignedSwaps() {
    let found = false;
    const unassigned = getUnassignedChars();
    for (let roomIdx = 0; roomIdx < rooms.length; roomIdx++) {
      const roomType = rooms[roomIdx];

      for (let slot = 0; slot < assignment[roomIdx].length; slot++) {
        const assignedChar = assignment[roomIdx][slot];

        for (const unassignedChar of unassigned) {
          if (roomType === 'Control Nexus' && !hasMatchingTalent(unassignedChar, 'Control Nexus', eliteLevels[unassignedChar])) continue;

          assignment[roomIdx][slot] = unassignedChar;

          let bestPlacement = null;
          let { efficiency: bestNewEfficiency, moodRegen: bestNewMoodRegen } = evalSwap([roomIdx]);

          for (let targetRoom = 0; targetRoom < rooms.length; targetRoom++) {
            if (targetRoom === roomIdx) continue;
            const targetRoomType = rooms[targetRoom];
            if (targetRoomType === 'Control Nexus' && !hasMatchingTalent(assignedChar, 'Control Nexus', eliteLevels[assignedChar])) continue;

            if (assignment[targetRoom].length < MAX_OPERATORS_PER_ROOM) {
              assignment[targetRoom].push(assignedChar);

              const { efficiency: eff, moodRegen: mr } = evalSwap([roomIdx, targetRoom]);
              if (eff > bestNewEfficiency) {
                bestNewEfficiency = eff;
                bestNewMoodRegen = mr;
                bestPlacement = { room: targetRoom, action: 'add' };
              }

              assignment[targetRoom].pop();
            }

            for (let targetSlot = 0; targetSlot < assignment[targetRoom].length; targetSlot++) {
              const displaced = assignment[targetRoom][targetSlot];
              assignment[targetRoom][targetSlot] = assignedChar;

              const { efficiency: eff, moodRegen: mr } = evalSwap([roomIdx, targetRoom]);
              if (eff > bestNewEfficiency) {
                bestNewEfficiency = eff;
                bestNewMoodRegen = mr;
                bestPlacement = { room: targetRoom, slot: targetSlot, action: 'displace', displaced };
              }

              assignment[targetRoom][targetSlot] = displaced;
            }
          }

          if (bestNewEfficiency > bestEfficiency + EFFICIENCY_EPSILON) {
            if (bestPlacement) {
              if (bestPlacement.action === 'add') {
                assignment[bestPlacement.room].push(assignedChar);
              } else if (bestPlacement.action === 'displace') {
                assignment[bestPlacement.room][bestPlacement.slot] = assignedChar;
              }
            }

            const affected = [roomIdx];
            if (bestPlacement) affected.push(bestPlacement.room);
            commitSwap(affected, bestNewEfficiency, bestNewMoodRegen);
            found = true;
            swapsMade++;
            break;
          } else {
            assignment[roomIdx][slot] = assignedChar;
          }
        }

        if (found) break;
      }

      if (found) break;
    }
    return found;
  }

  function tryCrossRoomMoves() {
    let found = false;
    for (let roomA = 0; roomA < rooms.length; roomA++) {
      for (let roomB = 0; roomB < rooms.length; roomB++) {
        if (roomA === roomB) continue;
        if (assignment[roomB].length >= MAX_OPERATORS_PER_ROOM) continue;

        for (let slotA = 0; slotA < assignment[roomA].length; slotA++) {
          if (assignment[roomA].length <= 1) continue;

          const charA = assignment[roomA][slotA];
          if (rooms[roomB] === 'Control Nexus' && !hasMatchingTalent(charA, 'Control Nexus', eliteLevels[charA])) continue;

          assignment[roomA].splice(slotA, 1);
          assignment[roomB].push(charA);

          const { efficiency: newEfficiency, moodRegen: newMoodRegen } = evalSwap([roomA, roomB]);

          if (newEfficiency > bestEfficiency + EFFICIENCY_EPSILON) {
            commitSwap([roomA, roomB], newEfficiency, newMoodRegen);
            found = true;
            swapsMade++;
          } else {
            assignment[roomB].pop();
            assignment[roomA].splice(slotA, 0, charA);
          }
        }
      }
    }
    return found;
  }

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    improved = tryPairwiseSwaps() || improved;
    improved = tryUnassignedSwaps() || improved;
    improved = tryCrossRoomMoves() || improved;
  }

  return { assignment, iterations, swapsMade, finalEfficiency: bestEfficiency };
}

/**
 * Main optimization function - exhaustive search over Control Nexus configurations
 * Guarantees global optimum by trying all valid Nexus assignments
 * @param {Function} onProgress - Optional callback(current, total) for progress updates
 */
export async function optimizeLayout(selectedCharacters, rooms, roomTargets = {}, onProgress = null) {
  const nexusCandidates = getControlNexusCandidates(selectedCharacters);
  const nexusConfigs = generateNexusConfigs(nexusCandidates);
  const totalConfigs = nexusConfigs.length;

  let bestAssignment = null;
  let bestEfficiency = -Infinity;
  let totalSwapsMade = 0;
  let configsTried = 0;

  for (const nexusConfig of nexusConfigs) {
    configsTried++;

    // Phase 1: Greedy assignment with this fixed Nexus config
    const initialAssignment = greedyAssignment(selectedCharacters, rooms, roomTargets, nexusConfig);

    // Phase 2: Iterative improvement
    const { assignment, swapsMade, finalEfficiency } = iterativeImprovement(
      initialAssignment, rooms, roomTargets, selectedCharacters
    );

    if (finalEfficiency > bestEfficiency) {
      bestEfficiency = finalEfficiency;
      bestAssignment = assignment;
      totalSwapsMade = swapsMade;
    }

    // Yield to browser for UI updates
    if (onProgress) {
      onProgress(configsTried, totalConfigs);
    }
    if (configsTried % 10 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return buildResults(bestAssignment, rooms, roomTargets, selectedCharacters, totalSwapsMade);
}

/**
 * Build the results object for display
 */
export function buildResults(assignment, rooms, roomTargets, eliteLevels, swapsMade) {
  const controlNexusIndex = rooms.indexOf('Control Nexus');
  const { moodRegen: globalMoodRegen } = getRoomStats(
    assignment[controlNexusIndex] || [], 'Control Nexus', null, eliteLevels
  );

  const roomResults = [];

  for (let i = 0; i < rooms.length; i++) {
    const roomType = rooms[i];
    const operators = assignment[i] || [];
    const target = roomTargets[i];

    const relevantStats = resolveTargets(target, roomType);

    let productionBonus = 0;
    let slowMoodDrop = 0;

    const operatorResults = operators.map(charName => {
      const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'e4');
      const stats = [];
      let requiredElite = 'e1';

      for (const talent of talents) {
        if (relevantStats.includes(talent.stat)) {
          productionBonus += talent.value;
          stats.push({ stat: talent.stat, value: talent.value });
          if (talent.elite > requiredElite) requiredElite = talent.elite;
        } else if (talent.stat === 'Slow Mood Drop') {
          slowMoodDrop += talent.value;
          stats.push({ stat: 'Mood Drop', value: -talent.value });
          if (talent.elite > requiredElite) requiredElite = talent.elite;
        } else if (talent.stat === 'Mood Regen' && roomType === 'Control Nexus') {
          productionBonus += talent.value;
          stats.push({ stat: talent.stat, value: talent.value });
          if (talent.elite > requiredElite) requiredElite = talent.elite;
        }
      }

      return {
        name: charName,
        stats: stats.length > 0 ? stats : [{ stat: 'No matching talent', value: 0 }],
        elite: stats.length > 0 ? requiredElite : 'e1'
      };
    });

    // Calculate efficiency - per product for multi-product rooms
    let efficiency = null;
    let efficiencyByProduct = null;

    if (roomType !== 'Control Nexus') {
      const targetArray = resolveTargets(target, roomType);

      if (targetArray.length > 1) {
        efficiencyByProduct = {};
        for (const product of targetArray) {
          // Sum only bonuses for this specific product
          let productBonus = 0;
          for (const charName of operators) {
            const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'e4');
            for (const talent of talents) {
              if (talent.stat === product) {
                productBonus += talent.value;
              }
            }
          }
          const eff = calculateRoomEfficiency(operators.length, productBonus, slowMoodDrop, globalMoodRegen);
          efficiencyByProduct[product] = eff.effective;
        }
        // Use average for summary calculations
        const effValues = Object.values(efficiencyByProduct);
        efficiency = effValues.reduce((a, b) => a + b, 0) / effValues.length;
      } else {
        const eff = calculateRoomEfficiency(operators.length, productionBonus, slowMoodDrop, globalMoodRegen);
        efficiency = eff.effective;
      }
    }

    let targetDisplay = null;
    if (target) {
      targetDisplay = Array.isArray(target) ? target.join(', ') : target;
    }

    roomResults.push({
      name: roomType,
      target: targetDisplay,
      operators: operatorResults,
      efficiency,
      efficiencyByProduct,
      productionBonus,
      slowMoodDrop
    });
  }

  // Calculate summary stats — weighted average uptime across production rooms
  const productionRoomsForUptime = roomResults.filter(r =>
    r.name === 'Manufacturing Cabin' || r.name === 'Growth Chamber' || r.name === 'Reception Room'
  );
  const uptime = productionRoomsForUptime.length > 0
    ? productionRoomsForUptime.reduce((sum, r) =>
        sum + calculateUptime(r.slowMoodDrop, globalMoodRegen) * 100, 0
      ) / productionRoomsForUptime.length
    : calculateUptime(0, globalMoodRegen) * 100;

  const productionRooms = roomResults.filter(r =>
    r.name === 'Manufacturing Cabin' || r.name === 'Growth Chamber'
  );
  const avgProduction = productionRooms.length > 0
    ? productionRooms.reduce((sum, r) => sum + r.efficiency, 0) / productionRooms.length
    : 0;

  const receptionRoom = roomResults.find(r => r.name === 'Reception Room');
  const clueEfficiency = receptionRoom ? receptionRoom.efficiency : 0;

  return {
    rooms: roomResults,
    summary: {
      uptime,
      avgProduction,
      clueEfficiency,
      globalMoodRegen,
      swapsMade
    }
  };
}

/**
 * Full optimization returning only total efficiency (skips buildResults).
 */
async function optimizeTotalEfficiency(selectedCharacters, rooms, roomTargets) {
  const nexusCandidates = getControlNexusCandidates(selectedCharacters);
  const nexusConfigs = generateNexusConfigs(nexusCandidates);

  let bestEfficiency = -Infinity;
  let configsTried = 0;

  for (const nexusConfig of nexusConfigs) {
    configsTried++;
    const initial = greedyAssignment(selectedCharacters, rooms, roomTargets, nexusConfig);
    const { finalEfficiency } = iterativeImprovement(initial, rooms, roomTargets, selectedCharacters);
    if (finalEfficiency > bestEfficiency) bestEfficiency = finalEfficiency;
    if (configsTried % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  return bestEfficiency;
}

export async function calculateROI(selectedCharacters, rooms, roomTargets, baseline, onProgress) {
  const ELITE_ORDER = ['e1', 'e2', 'e3', 'e4'];

  // Build all (operator, targetElite) pairs for every reachable level
  const pairs = [];
  for (const [name, elite] of Object.entries(selectedCharacters)) {
    if (elite === 'e4') continue;
    const currentIdx = ELITE_ORDER.indexOf(elite);
    for (let t = currentIdx + 1; t < ELITE_ORDER.length; t++) {
      pairs.push({ name, currentElite: elite, targetElite: ELITE_ORDER[t] });
    }
  }

  const total = pairs.length;
  if (onProgress) onProgress(0, total);

  const results = [];

  for (let i = 0; i < pairs.length; i++) {
    const { name, currentElite, targetElite } = pairs[i];
    const modified = { ...selectedCharacters };
    modified[name] = targetElite;

    const newEfficiency = await optimizeTotalEfficiency(modified, rooms, roomTargets);

    results.push({ name, currentElite, targetElite, newEfficiency, delta: newEfficiency - baseline });

    if (onProgress) onProgress(i + 1, total);
  }

  results.sort((a, b) => b.delta - a.delta);

  return { baseline, results };
}
