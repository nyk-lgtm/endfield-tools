import { ESSENCE_ZONES, ATTRIBUTES, ALL_SECONDARIES, ALL_SKILLS, ATTR_POOL, ATTR_TICKET_POOL, SECONDS_PER_SANITY, SECONDS_PER_DAY } from '../../../data/index.js';
import {
  getBuilds, getSelectedZone, setSelectedZone,
  getSelectedTicket, setSelectedTicket, getCurrentMode,
  getOptimizeMode
} from './state.js';
import {
  getValidZonesForEssence, getZoneConfigurations,
  findBestTicketConfig, calculatePlanStats, calculateConfidenceRuns,
  deduplicateBuilds
} from './calculations.js';

// DOM element cache
const elements = {
  buildsList: null,
  zoneList: null,
  zoneDetails: null,
  farmingPlan: null,
  essencesPerRun: null,
  sanityCost: null,
  modeSingle: null,
  modeMulti: null,
  singleModeResults: null,
  multiModeResults: null
};

export function cacheElements() {
  elements.buildsList = document.getElementById('buildsList');
  elements.zoneList = document.getElementById('zoneList');
  elements.zoneDetails = document.getElementById('zoneDetails');
  elements.farmingPlan = document.getElementById('farmingPlan');
  elements.essencesPerRun = document.getElementById('essencesPerRun');
  elements.sanityCost = document.getElementById('sanityCost');
  elements.modeSingle = document.getElementById('modeSingle');
  elements.modeMulti = document.getElementById('modeMulti');
  elements.singleModeResults = document.getElementById('singleModeResults');
  elements.multiModeResults = document.getElementById('multiModeResults');
}

export function getVal(id) {
  const el = elements[id] || document.getElementById(id);
  if (!el) return 1;
  return Math.max(1, parseInt(el.value) || 1);
}

export function renderBuilds(onUpdate, onRemove) {
  const builds = getBuilds();
  elements.buildsList.innerHTML = builds.map((b, i) => `
    <div class="build-row">
      <div>
        <label>Attribute</label>
        <select data-index="${i}" data-field="attribute">
          ${ATTRIBUTES.map(a => `<option value="${a}" ${b.attribute === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
      <div>
        <label>Secondary</label>
        <select data-index="${i}" data-field="secondary">
          ${ALL_SECONDARIES.map(s => `<option value="${s}" ${b.secondary === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div>
        <label>Skill</label>
        <select data-index="${i}" data-field="skill">
          ${ALL_SKILLS.map(s => `<option value="${s}" ${b.skill === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-secondary btn-remove" data-index="${i}" ${builds.length <= 1 ? 'disabled' : ''}>✕</button>
    </div>
  `).join('');

  // Attach event listeners
  elements.buildsList.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      onUpdate(index, field, e.target.value);
    });
  });

  elements.buildsList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      onRemove(index);
    });
  });

  const unique = deduplicateBuilds(builds);
  if (unique.length < builds.length) {
    elements.buildsList.insertAdjacentHTML('beforeend',
      '<p class="hint text-error">Duplicate essences — duplicates are ignored in calculations.</p>');
  }
}

export function renderModeToggle(mode) {
  elements.modeSingle.classList.toggle('active', mode === 'single');
  elements.modeMulti.classList.toggle('active', mode === 'multi');
  elements.modeSingle.setAttribute('aria-pressed', mode === 'single');
  elements.modeMulti.setAttribute('aria-pressed', mode === 'multi');
  elements.singleModeResults.hidden = mode !== 'single';
  elements.multiModeResults.hidden = mode !== 'multi';
}

export function renderMultiZonePlan() {
  const builds = getBuilds();
  const essencesPerRun = getVal('essencesPerRun');
  const sanityCost = getVal('sanityCost');

  if (builds.length === 0) {
    elements.farmingPlan.innerHTML = '<p class="no-zones-msg">Add essences to generate a farming plan.</p>';
    return;
  }

  // Find valid zones for each essence
  const essenceZones = builds.map((b, i) => ({
    ...b,
    index: i,
    validZones: getValidZonesForEssence(b)
  }));

  // Deduplicate — each unique essence is counted once in the math
  const uniqueEssences = deduplicateBuilds(essenceZones);
  const hasDuplicates = uniqueEssences.length < essenceZones.length;

  // Check for impossible essences
  const impossible = uniqueEssences.filter(e => e.validZones.length === 0);
  if (impossible.length > 0) {
    elements.farmingPlan.innerHTML = `<p class="no-zones-msg">No zone can drop: ${impossible.map(e => `${e.attribute}/${e.secondary}/${e.skill}`).join(', ')}</p>`;
    return;
  }

  // Greedy algorithm: assign essences to zones for best efficiency
  const remaining = [...uniqueEssences];
  const plan = [];
  const optimizeMode = getOptimizeMode();

  // Scoring function based on optimization mode
  const getScore = (config) => {
    if (optimizeMode === 'probability') {
      // Best per-essence probability
      return config.prob;
    }
    // Sanity efficiency (default): more essences at higher prob = less total sanity
    return config.essences.length * config.prob;
  };

  while (remaining.length > 0) {
    let bestOption = null;

    for (const [zoneId, zone] of Object.entries(ESSENCE_ZONES)) {
      const canHandle = remaining.filter(e => e.validZones.includes(zoneId));
      if (canHandle.length === 0) continue;

      const configs = getZoneConfigurations(zoneId, canHandle);

      for (const config of configs) {
        const score = getScore(config);

        if (!bestOption || score > bestOption.score) {
          bestOption = {
            zoneId,
            essences: config.essences,
            ticket: config.ticket,
            stat: config.stat,
            prob: config.prob,
            score
          };
        }
      }
    }

    if (!bestOption) break;

    plan.push(bestOption);
    const assignedIndices = new Set(bestOption.essences.map(e => e.index));
    remaining.splice(0, remaining.length, ...remaining.filter(e => !assignedIndices.has(e.index)));
  }

  if (plan.length === 0) {
    elements.farmingPlan.innerHTML = '<p class="no-zones-msg">Could not generate a farming plan.</p>';
    return;
  }

  // Group plan items by zone
  const byZone = {};
  plan.forEach(p => {
    if (!byZone[p.zoneId]) byZone[p.zoneId] = [];
    byZone[p.zoneId].push(p);
  });

  const dupWarning = hasDuplicates
    ? '<p class="hint text-error">Duplicate builds ignored — each unique essence is counted once.</p>'
    : '';

  elements.farmingPlan.innerHTML = dupWarning + Object.entries(byZone).map(([zoneId, configs]) => {
    const zone = ESSENCE_ZONES[zoneId];

    const configsHtml = configs.map(p => {
      const stats = calculatePlanStats(p.prob, essencesPerRun, sanityCost);
      const ticketText = p.ticket === 'none' ? 'No ticket' : `Lock ${p.stat}`;

      return `
        <div class="card-sm plan-config">
          <div class="plan-config-left">
            <div class="plan-config-ticket">${ticketText}</div>
            <div class="plan-essences">
              ${p.essences.map(e => `<span class="plan-essence">${e.attribute} / ${e.secondary} / ${e.skill}</span>`).join('')}
            </div>
          </div>
          <div class="plan-config-right">
            <div class="plan-stat"><span class="plan-stat-label">Per essence</span><span class="plan-stat-value">${(p.prob * 100).toFixed(2)}%</span></div>
            <div class="plan-stat"><span class="plan-stat-label">Per run</span><span class="plan-stat-value">${(stats.pRunHit * 100).toFixed(1)}%</span></div>
            <div class="plan-stat"><span class="plan-stat-label">Avg sanity</span><span class="plan-stat-value">${Math.round(stats.avgSanity).toLocaleString()}</span></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card plan-zone">
        <div class="plan-zone-name">${zone.name}</div>
        <div class="plan-configs">
          ${configsHtml}
        </div>
      </div>
    `;
  }).join('');
}

export function renderSingleZoneCalc(onSelectZone, onSelectTicket) {
  const builds = getBuilds();
  const unique = deduplicateBuilds(builds);
  const essencesPerRun = getVal('essencesPerRun');
  const sanityCost = getVal('sanityCost');
  const selectedZone = getSelectedZone();
  const selectedTicket = getSelectedTicket();

  // Calculate zone validity
  const zoneResults = [];
  for (const [zoneId, zone] of Object.entries(ESSENCE_ZONES)) {
    const requiredSecs = new Set(unique.map(b => b.secondary));
    const requiredSkills = new Set(unique.map(b => b.skill));
    const hasAllSecs = [...requiredSecs].every(s => zone.secondaries.includes(s));
    const hasAllSkills = [...requiredSkills].every(s => zone.skills.includes(s));
    zoneResults.push({ zoneId, zone, isValid: hasAllSecs && hasAllSkills });
  }

  // Render zone list
  elements.zoneList.innerHTML = zoneResults.map(r => `
    <div class="list-item ${r.isValid ? '' : 'disabled'} ${selectedZone === r.zoneId ? 'selected' : ''}"
         data-zone-id="${r.zoneId}" data-valid="${r.isValid}">
      <span class="zone-item-name">${r.zone.name}</span>
      <span class="zone-item-status">${r.isValid ? 'Available' : 'Missing stats'}</span>
    </div>
  `).join('');

  // Attach zone click listeners
  elements.zoneList.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.valid === 'true') {
        onSelectZone(el.dataset.zoneId);
      }
    });
  });

  // Render zone details if selected
  if (!selectedZone) {
    elements.zoneDetails.hidden = true;
    return;
  }

  elements.zoneDetails.hidden = false;
  const zone = ESSENCE_ZONES[selectedZone];
  const secPool = zone.secondaries.length;
  const skillPool = zone.skills.length;

  const secConfig = findBestTicketConfig(unique, 'secondary');
  const skillConfig = findBestTicketConfig(unique, 'skill');

  const probNoTicket = unique.length * (1 / ATTR_POOL) * (1 / secPool) * (1 / skillPool);
  const probSecTicket = secConfig.count * (1 / ATTR_TICKET_POOL) * 1 * (1 / skillPool);
  const probSkillTicket = skillConfig.count * (1 / ATTR_TICKET_POOL) * (1 / secPool) * 1;

  let currentP;
  if (selectedTicket === "secondary") {
    currentP = probSecTicket;
  } else if (selectedTicket === "skill") {
    currentP = probSkillTicket;
  } else {
    currentP = probNoTicket;
  }

  const stats = calculatePlanStats(currentP, essencesPerRun, sanityCost);
  const frac = (n) => n === 1 ? '1' : `1/${n}`;

  elements.zoneDetails.innerHTML = `
    <div class="ticket-options">
      <div class="ticket-header">
        <span>${zone.name}</span>
        <span>Per Essence</span>
      </div>
      <div class="list-item ${selectedTicket === 'none' ? 'selected' : ''}" data-ticket="none">
        <span class="ticket-option-name">No ticket</span>
        <span class="ticket-option-prob"><span class="prob-calc">${frac(ATTR_POOL)} × ${frac(secPool)} × ${frac(skillPool)} =</span> ${(probNoTicket * 100).toFixed(2)}%</span>
      </div>
      <div class="list-item ${selectedTicket === 'secondary' ? 'selected' : ''}" data-ticket="secondary">
        <span class="ticket-option-name">Lock ${secConfig.stats.join('/')} (${secConfig.count}/${unique.length} essences)</span>
        <span class="ticket-option-prob"><span class="prob-calc">${frac(ATTR_TICKET_POOL)} × 1 × ${frac(skillPool)} =</span> ${(probSecTicket * 100).toFixed(2)}%</span>
      </div>
      <div class="list-item ${selectedTicket === 'skill' ? 'selected' : ''}" data-ticket="skill">
        <span class="ticket-option-name">Lock ${skillConfig.stats.join('/')} (${skillConfig.count}/${unique.length} essences)</span>
        <span class="ticket-option-prob"><span class="prob-calc">${frac(ATTR_TICKET_POOL)} × ${frac(secPool)} × 1 =</span> ${(probSkillTicket * 100).toFixed(2)}%</span>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-label">Per Essence</div>
        <div class="stat-value">${currentP > 0 ? (currentP * 100).toFixed(2) + '%' : '0%'}</div>
        <div class="stat-sub">${currentP > 0 ? '1 in ' + Math.round(1 / currentP) : 'Impossible'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Per Run</div>
        <div class="stat-value">${stats.pRunHit > 0 ? (stats.pRunHit * 100).toFixed(1) + '%' : '0%'}</div>
        <div class="stat-sub">${stats.pRunHit > 0 ? '1 in ' + stats.avgRuns.toFixed(1) : 'Impossible'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Avg Sanity</div>
        <div class="stat-value">${stats.pRunHit > 0 ? Math.round(stats.avgSanity).toLocaleString() : '∞'}</div>
        <div class="stat-sub">${stats.pRunHit > 0 ? stats.avgRegenDays.toFixed(1) + ' days regen' : '∞'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>Confidence</th><th>Runs</th><th>Sanity</th><th>Regen Time</th></tr>
      </thead>
      <tbody>
        ${[0.5, 0.75, 0.9, 0.95, 0.99].map(c => {
          if (stats.pRunHit <= 0) return `<tr><td>${c * 100}%</td><td>∞</td><td>∞</td><td>∞</td></tr>`;
          const runs = calculateConfidenceRuns(c, stats.pRunMiss);
          const sanity = runs * sanityCost;
          const days = (sanity * SECONDS_PER_SANITY) / SECONDS_PER_DAY;
          return `<tr><td>${c * 100}%</td><td>${runs}</td><td>${sanity.toLocaleString()}</td><td>~${days.toFixed(1)} days</td></tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  // Attach ticket click listeners
  elements.zoneDetails.querySelectorAll('.list-item[data-ticket]').forEach(el => {
    el.addEventListener('click', () => {
      onSelectTicket(el.dataset.ticket);
    });
  });
}

