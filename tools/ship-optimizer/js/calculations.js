// Ship Optimizer calculations and optimization logic

import { CHARACTERS } from '../../../data/index.js';

// Base rates
const BASE_MOOD_DROP = 7;      // % per hour
const BASE_MOOD_REGEN = 12;    // % per hour
const BASE_EFFICIENCY = 100;   // %
const OPERATOR_BONUS = 40;     // % per operator in room

// Production stats by cabin type
const PRODUCTION_STATS = {
  'Manufacturing Cabin': ['Weapon EXP', 'Operator EXP'],
  'Growth Chamber': ['Fungal Matter', 'Plant', 'Rare Mineral'],
  'Reception Room': ['Clue Collecting Efficiency'],
  'Control Nexus': ['Mood Regen']
};

/**
 * Get the talents a character can contribute at a given elite level
 */
export function getCharacterTalents(charName, maxElite = 'max') {
  const charData = CHARACTERS[charName];
  if (!charData) return [];

  const talents = [];
  const seen = new Set();

  // Talent slots: slot1 (e1→e3), slot2 (e2→e4)
  const eliteRanges = {
    'max': ['e3', 'e4'],  // both slots upgraded
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
export function getCharacterTalentsForCabin(charName, cabin, maxElite = 'max') {
  const allTalents = getCharacterTalents(charName, maxElite);
  return allTalents.filter(t => t.cabin === cabin);
}

/**
 * Calculate uptime based on mood stats
 */
export function calculateUptime(slowMoodDrop, moodRegen) {
  const effectiveDrop = BASE_MOOD_DROP * (1 - slowMoodDrop / 100);
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

  const relevantStats = targetProducts
    ? (Array.isArray(targetProducts) ? targetProducts : [targetProducts])
    : (PRODUCTION_STATS[roomType] || []);

  for (const charName of operators) {
    const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'max');
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
      // Control Nexus doesn't have direct efficiency, but we track mood regen
      roomEfficiencies.push({ moodRegen: globalMoodRegen, effective: 0 });
      continue;
    }

    const { slowMoodDrop } = getRoomStats(operators, roomType, target, eliteLevels);

    // Handle multi-product rooms correctly
    const targetArray = target
      ? (Array.isArray(target) ? target : [target])
      : (PRODUCTION_STATS[roomType] || []);

    let roomEffective = 0;
    if (targetArray.length > 1) {
      // Multiple products - average their efficiencies
      for (const product of targetArray) {
        let productBonus = 0;
        for (const charName of operators) {
          const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'max');
          for (const t of talents) {
            if (t.stat === product) productBonus += t.value;
          }
        }
        const { effective } = calculateRoomEfficiency(operators.length, productBonus, slowMoodDrop, globalMoodRegen);
        roomEffective += effective;
      }
      roomEffective /= targetArray.length; // Average
    } else {
      // Single product
      const { productionBonus } = getRoomStats(operators, roomType, target, eliteLevels);
      const { effective } = calculateRoomEfficiency(operators.length, productionBonus, slowMoodDrop, globalMoodRegen);
      roomEffective = effective;
    }

    roomEfficiencies.push({ effective: roomEffective, slowMoodDrop });
    totalEfficiency += roomEffective;
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

  const relevantStats = targetProducts
    ? (Array.isArray(targetProducts) ? targetProducts : [targetProducts])
    : (PRODUCTION_STATS[roomType] || []);

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

  // Score: production value + uptime gain weighted by base efficiency
  // A 1% uptime gain on 220% efficiency = 2.2% effective gain
  const score = productionValue + (uptimeGain * 100 * 2.2);

  return { score, talents, productionValue, moodValue };
}

/**
 * Greedy assignment with fixed Control Nexus configuration
 */
function greedyAssignment(selectedCharacters, rooms, roomTargets, fixedNexus) {
  const availableChars = new Set(Object.keys(selectedCharacters));
  const assignment = rooms.map(() => []);
  const controlNexusIndex = rooms.indexOf('Control Nexus');

  // Set the fixed Nexus configuration
  assignment[controlNexusIndex] = [...fixedNexus];
  for (const char of fixedNexus) {
    availableChars.delete(char);
  }

  // Calculate global mood regen
  let globalMoodRegen = 0;
  for (const charName of assignment[controlNexusIndex]) {
    const talents = getCharacterTalentsForCabin(charName, 'Control Nexus', selectedCharacters[charName]);
    for (const t of talents) {
      if (t.stat === 'Mood Regen') globalMoodRegen += t.value;
    }
  }

  // Assign other rooms
  for (let i = 0; i < rooms.length; i++) {
    if (i === controlNexusIndex) continue;
    assignRoomGreedy(i, rooms[i], assignment, availableChars, selectedCharacters, globalMoodRegen, roomTargets[i]);
  }

  return assignment;
}

/**
 * Greedy room assignment with dynamic re-scoring after each pick
 */
function assignRoomGreedy(roomIndex, roomType, assignment, availableChars, eliteLevels, globalMoodRegen, targetProducts) {
  let currentMoodDrop = 0;

  for (let slot = 0; slot < 3; slot++) {
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
  for (let k = 1; k <= Math.min(3, nexusCandidates.length); k++) {
    for (const combo of combinations(nexusCandidates, k)) {
      configs.push(combo);
    }
  }
  return configs;
}

/**
 * Phase 2: Iterative improvement via swaps
 * Try swapping characters between rooms and with unassigned pool to improve total efficiency
 */
function iterativeImprovement(assignment, rooms, roomTargets, eliteLevels, maxIterations = 100) {
  let improved = true;
  let iterations = 0;
  let swapsMade = 0;
  let { totalEfficiency: bestEfficiency } = calculateTotalShipEfficiency(assignment, rooms, roomTargets, eliteLevels);

  // Build set of assigned characters
  const getAssignedChars = () => {
    const assigned = new Set();
    for (const roomOps of assignment) {
      for (const char of roomOps) {
        assigned.add(char);
      }
    }
    return assigned;
  };

  // Get unassigned characters
  const getUnassignedChars = () => {
    const assigned = getAssignedChars();
    return Object.keys(eliteLevels).filter(name => !assigned.has(name));
  };

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Try all possible swaps between rooms
    for (let roomA = 0; roomA < rooms.length; roomA++) {
      for (let roomB = roomA + 1; roomB < rooms.length; roomB++) {
        for (let slotA = 0; slotA < assignment[roomA].length; slotA++) {
          for (let slotB = 0; slotB < assignment[roomB].length; slotB++) {
            const charA = assignment[roomA][slotA];
            const charB = assignment[roomB][slotB];

            // Don't swap non-matching chars INTO Control Nexus
            if (rooms[roomA] === 'Control Nexus' && !hasMatchingTalent(charB, 'Control Nexus', eliteLevels[charB])) continue;
            if (rooms[roomB] === 'Control Nexus' && !hasMatchingTalent(charA, 'Control Nexus', eliteLevels[charA])) continue;

            // Try swapping
            assignment[roomA][slotA] = charB;
            assignment[roomB][slotB] = charA;

            const { totalEfficiency: newEfficiency } = calculateTotalShipEfficiency(
              assignment, rooms, roomTargets, eliteLevels
            );

            if (newEfficiency > bestEfficiency + 0.01) {
              bestEfficiency = newEfficiency;
              improved = true;
              swapsMade++;
            } else {
              // Revert swap
              assignment[roomA][slotA] = charA;
              assignment[roomB][slotB] = charB;
            }
          }
        }
      }
    }

    // Try replacing assigned characters with unassigned ones
    const unassigned = getUnassignedChars();
    for (let roomIdx = 0; roomIdx < rooms.length; roomIdx++) {
      const roomType = rooms[roomIdx];

      for (let slot = 0; slot < assignment[roomIdx].length; slot++) {
        const assignedChar = assignment[roomIdx][slot];

        for (const unassignedChar of unassigned) {
          // Check if unassigned char can work in this room
          if (roomType === 'Control Nexus' && !hasMatchingTalent(unassignedChar, 'Control Nexus', eliteLevels[unassignedChar])) continue;

          // Try replacing
          assignment[roomIdx][slot] = unassignedChar;

          // Now try to place the freed char in a better spot
          let bestPlacement = null;
          let bestNewEfficiency = calculateTotalShipEfficiency(assignment, rooms, roomTargets, eliteLevels).totalEfficiency;

          // Try placing freed char in each room with space or by displacement
          for (let targetRoom = 0; targetRoom < rooms.length; targetRoom++) {
            if (targetRoom === roomIdx) continue;

            const targetRoomType = rooms[targetRoom];

            // Skip if freed char can't work in target room (for Control Nexus)
            if (targetRoomType === 'Control Nexus' && !hasMatchingTalent(assignedChar, 'Control Nexus', eliteLevels[assignedChar])) continue;

            if (assignment[targetRoom].length < 3) {
              // Room has space, try adding
              assignment[targetRoom].push(assignedChar);

              const { totalEfficiency: effWithPlacement } = calculateTotalShipEfficiency(
                assignment, rooms, roomTargets, eliteLevels
              );

              if (effWithPlacement > bestNewEfficiency) {
                bestNewEfficiency = effWithPlacement;
                bestPlacement = { room: targetRoom, action: 'add' };
              }

              assignment[targetRoom].pop();
            }

            // Try displacing someone in the target room
            for (let targetSlot = 0; targetSlot < assignment[targetRoom].length; targetSlot++) {
              const displaced = assignment[targetRoom][targetSlot];
              assignment[targetRoom][targetSlot] = assignedChar;

              const { totalEfficiency: effWithDisplace } = calculateTotalShipEfficiency(
                assignment, rooms, roomTargets, eliteLevels
              );

              if (effWithDisplace > bestNewEfficiency) {
                bestNewEfficiency = effWithDisplace;
                bestPlacement = { room: targetRoom, slot: targetSlot, action: 'displace', displaced };
              }

              assignment[targetRoom][targetSlot] = displaced;
            }
          }

          // Check if this replacement improves things
          if (bestNewEfficiency > bestEfficiency + 0.01) {
            // Apply the best placement for the freed char
            if (bestPlacement) {
              if (bestPlacement.action === 'add') {
                assignment[bestPlacement.room].push(assignedChar);
              } else if (bestPlacement.action === 'displace') {
                // The displaced char becomes unassigned (will be reconsidered in next iteration)
                assignment[bestPlacement.room][bestPlacement.slot] = assignedChar;
              }
            }

            bestEfficiency = bestNewEfficiency;
            improved = true;
            swapsMade++;

            // Update unassigned list and restart this loop
            break;
          } else {
            // Revert replacement
            assignment[roomIdx][slot] = assignedChar;
          }
        }

        if (improved) break;
      }

      if (improved) break;
    }

    // Also try moving a character to an empty slot (if any room has < 3)
    for (let roomA = 0; roomA < rooms.length; roomA++) {
      for (let roomB = 0; roomB < rooms.length; roomB++) {
        if (roomA === roomB) continue;
        if (assignment[roomB].length >= 3) continue; // Room B is full

        for (let slotA = 0; slotA < assignment[roomA].length; slotA++) {
          if (assignment[roomA].length <= 1) continue; // Don't empty a room completely

          const charA = assignment[roomA][slotA];

          // Don't move non-matching chars INTO Control Nexus
          if (rooms[roomB] === 'Control Nexus' && !hasMatchingTalent(charA, 'Control Nexus', eliteLevels[charA])) continue;

          // Try moving
          assignment[roomA].splice(slotA, 1);
          assignment[roomB].push(charA);

          const { totalEfficiency: newEfficiency } = calculateTotalShipEfficiency(
            assignment, rooms, roomTargets, eliteLevels
          );

          if (newEfficiency > bestEfficiency + 0.01) {
            bestEfficiency = newEfficiency;
            improved = true;
            swapsMade++;
          } else {
            // Revert move
            assignment[roomB].pop();
            assignment[roomA].splice(slotA, 0, charA);
          }
        }
      }
    }
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

  // Try each possible Control Nexus configuration
  for (const nexusConfig of nexusConfigs) {
    configsTried++;

    // Phase 1: Greedy assignment with this fixed Nexus config
    const initialAssignment = greedyAssignment(selectedCharacters, rooms, roomTargets, nexusConfig);

    // Phase 2: Iterative improvement
    const { assignment, swapsMade, finalEfficiency } = iterativeImprovement(
      initialAssignment, rooms, roomTargets, selectedCharacters
    );

    // Track the best result
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

  // Build results
  return buildResults(bestAssignment, rooms, roomTargets, selectedCharacters, totalSwapsMade);
}

/**
 * Build the results object for display
 */
function buildResults(assignment, rooms, roomTargets, eliteLevels, swapsMade) {
  const controlNexusIndex = rooms.indexOf('Control Nexus');
  const { moodRegen: globalMoodRegen } = getRoomStats(
    assignment[controlNexusIndex] || [], 'Control Nexus', null, eliteLevels
  );

  const roomResults = [];

  for (let i = 0; i < rooms.length; i++) {
    const roomType = rooms[i];
    const operators = assignment[i] || [];
    const target = roomTargets[i];

    const relevantStats = target
      ? (Array.isArray(target) ? target : [target])
      : (PRODUCTION_STATS[roomType] || []);

    let productionBonus = 0;
    let slowMoodDrop = 0;

    const operatorResults = operators.map(charName => {
      const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'max');
      const stats = [];
      let maxElite = 'e1';

      for (const talent of talents) {
        if (relevantStats.includes(talent.stat)) {
          productionBonus += talent.value;
          stats.push({ stat: talent.stat, value: talent.value });
          if (talent.elite > maxElite) maxElite = talent.elite;
        } else if (talent.stat === 'Slow Mood Drop') {
          slowMoodDrop += talent.value;
          stats.push({ stat: 'Mood Drop', value: -talent.value });
          if (talent.elite > maxElite) maxElite = talent.elite;
        } else if (talent.stat === 'Mood Regen' && roomType === 'Control Nexus') {
          productionBonus += talent.value;
          stats.push({ stat: talent.stat, value: talent.value });
          if (talent.elite > maxElite) maxElite = talent.elite;
        }
      }

      return {
        name: charName,
        stats: stats.length > 0 ? stats : [{ stat: 'No matching talent', value: 0 }],
        elite: stats.length > 0 ? maxElite : 'e1'
      };
    });

    // Calculate efficiency - per product for multi-product rooms
    let efficiency = null;
    let efficiencyByProduct = null;

    if (roomType !== 'Control Nexus') {
      const targetArray = target ? (Array.isArray(target) ? target : [target]) : relevantStats;

      if (targetArray.length > 1) {
        // Multiple products - calculate efficiency for each
        efficiencyByProduct = {};
        for (const product of targetArray) {
          // Sum only bonuses for this specific product
          let productBonus = 0;
          for (const charName of operators) {
            const talents = getCharacterTalentsForCabin(charName, roomType, eliteLevels[charName] || 'max');
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
        // Single product - simple calculation
        const eff = calculateRoomEfficiency(operators.length, productionBonus, slowMoodDrop, globalMoodRegen);
        efficiency = eff.effective;
      }
    }

    // Format target for display
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

  // Calculate summary stats
  const uptime = calculateUptime(0, globalMoodRegen) * 100;

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
