import { ESSENCE_ZONES, ATTR_POOL, ATTR_TICKET_POOL, SECONDS_PER_SANITY, SECONDS_PER_DAY } from '../../../data/index.js';

/**
 * Group items by a key and return each group's top-3 attributes with filtered items
 */
function getTopAttributeGroups(items, groupKey) {
  const groups = {};
  items.forEach(item => {
    const key = item[groupKey];
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const result = {};
  for (const [key, group] of Object.entries(groups)) {
    const attrCounts = {};
    group.forEach(item => {
      attrCounts[item.attribute] = (attrCounts[item.attribute] || 0) + 1;
    });
    const top3Attrs = Object.entries(attrCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(x => x[0]);
    const validItems = group.filter(item => top3Attrs.includes(item.attribute));
    result[key] = { top3Attrs, validItems };
  }
  return result;
}

export function getValidZonesForEssence(essence) {
  const valid = [];
  for (const [zoneId, zone] of Object.entries(ESSENCE_ZONES)) {
    if (zone.secondaries.includes(essence.secondary) && zone.skills.includes(essence.skill)) {
      valid.push(zoneId);
    }
  }
  return valid;
}

export function getZoneConfigurations(zoneId, essences) {
  const zone = ESSENCE_ZONES[zoneId];
  const secPool = zone.secondaries.length;
  const skillPool = zone.skills.length;
  const configs = [];

  // Option 1: No ticket - all essences can be farmed
  const probNoTicket = essences.length * (1 / ATTR_POOL) * (1 / secPool) * (1 / skillPool);
  configs.push({
    ticket: "none",
    stat: null,
    essences: essences,
    prob: probNoTicket
  });

  // Option 2: Secondary tickets
  const secGroups = getTopAttributeGroups(essences, 'secondary');
  for (const [sec, { validItems }] of Object.entries(secGroups)) {
    if (validItems.length > 0) {
      const prob = validItems.length * (1 / ATTR_TICKET_POOL) * 1 * (1 / skillPool);
      configs.push({
        ticket: "secondary",
        stat: sec,
        essences: validItems,
        prob: prob
      });
    }
  }

  // Option 3: Skill tickets
  const skillGroups = getTopAttributeGroups(essences, 'skill');
  for (const [skill, { validItems }] of Object.entries(skillGroups)) {
    if (validItems.length > 0) {
      const prob = validItems.length * (1 / ATTR_TICKET_POOL) * (1 / secPool) * 1;
      configs.push({
        ticket: "skill",
        stat: skill,
        essences: validItems,
        prob: prob
      });
    }
  }

  return configs;
}

export function findBestTicketConfig(builds, statKey) {
  const groups = getTopAttributeGroups(builds, statKey);
  let bestConfig = { stats: [], attrs: [], count: 0 };

  for (const [stat, { top3Attrs, validItems }] of Object.entries(groups)) {
    const benefitCount = validItems.length;

    if (benefitCount > bestConfig.count) {
      bestConfig = { stats: [stat], attrs: top3Attrs, count: benefitCount };
    } else if (benefitCount === bestConfig.count && benefitCount > 0) {
      if (!bestConfig.stats.includes(stat)) {
        bestConfig.stats.push(stat);
      }
    }
  }

  return bestConfig;
}

export function calculatePlanStats(prob, essencesPerRun, sanityCost) {
  const pMiss = 1 - prob;
  const pRunMiss = Math.pow(pMiss, essencesPerRun);
  const pRunHit = 1 - pRunMiss;
  const avgRuns = pRunHit > 0 ? 1 / pRunHit : Infinity;
  const avgSanity = avgRuns * sanityCost;
  const avgRegenDays = (avgSanity * SECONDS_PER_SANITY) / SECONDS_PER_DAY;

  return { pMiss, pRunMiss, pRunHit, avgRuns, avgSanity, avgRegenDays };
}

export function calculateConfidenceRuns(confidence, pRunMiss) {
  if (1 - pRunMiss <= 0) return Infinity;
  return Math.ceil(Math.log(1 - confidence) / Math.log(pRunMiss));
}
