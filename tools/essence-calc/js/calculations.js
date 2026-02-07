import { ESSENCE_ZONES, ATTR_POOL, ATTR_TICKET_POOL } from '../../../data/index.js';

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

  // Option 2: Secondary tickets - only essences with that secondary can be farmed
  const secGroups = {};
  essences.forEach(e => {
    if (!secGroups[e.secondary]) secGroups[e.secondary] = [];
    secGroups[e.secondary].push(e);
  });
  for (const [sec, group] of Object.entries(secGroups)) {
    const attrCounts = {};
    group.forEach(e => { attrCounts[e.attribute] = (attrCounts[e.attribute] || 0) + 1; });
    const top3Attrs = Object.entries(attrCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    const validEssences = group.filter(e => top3Attrs.includes(e.attribute));
    if (validEssences.length > 0) {
      const prob = validEssences.length * (1 / ATTR_TICKET_POOL) * 1 * (1 / skillPool);
      configs.push({
        ticket: "secondary",
        stat: sec,
        essences: validEssences,
        prob: prob
      });
    }
  }

  // Option 3: Skill tickets - only essences with that skill can be farmed
  const skillGroups = {};
  essences.forEach(e => {
    if (!skillGroups[e.skill]) skillGroups[e.skill] = [];
    skillGroups[e.skill].push(e);
  });
  for (const [skill, group] of Object.entries(skillGroups)) {
    const attrCounts = {};
    group.forEach(e => { attrCounts[e.attribute] = (attrCounts[e.attribute] || 0) + 1; });
    const top3Attrs = Object.entries(attrCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    const validEssences = group.filter(e => top3Attrs.includes(e.attribute));
    if (validEssences.length > 0) {
      const prob = validEssences.length * (1 / ATTR_TICKET_POOL) * (1 / secPool) * 1;
      configs.push({
        ticket: "skill",
        stat: skill,
        essences: validEssences,
        prob: prob
      });
    }
  }

  return configs;
}

export function findBestTicketConfig(builds, statKey) {
  const statGroups = {};
  builds.forEach(b => {
    const stat = b[statKey];
    if (!statGroups[stat]) statGroups[stat] = [];
    statGroups[stat].push(b);
  });

  let bestConfig = { stats: [], attrs: [], count: 0 };

  for (const [stat, group] of Object.entries(statGroups)) {
    const attrCounts = {};
    group.forEach(b => {
      attrCounts[b.attribute] = (attrCounts[b.attribute] || 0) + 1;
    });

    const sortedAttrs = Object.entries(attrCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([attr]) => attr);

    const benefitCount = group.filter(b => sortedAttrs.includes(b.attribute)).length;

    if (benefitCount > bestConfig.count) {
      bestConfig = { stats: [stat], attrs: sortedAttrs, count: benefitCount };
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
  const avgRegenDays = (avgSanity * 432) / 86400;

  return { pMiss, pRunMiss, pRunHit, avgRuns, avgSanity, avgRegenDays };
}

export function calculateConfidenceRuns(confidence, pRunMiss) {
  if (1 - pRunMiss <= 0) return Infinity;
  return Math.ceil(Math.log(1 - confidence) / Math.log(pRunMiss));
}
