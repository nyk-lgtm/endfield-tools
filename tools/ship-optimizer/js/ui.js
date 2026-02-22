import { CHARACTERS } from '../../../data/index.js';
import {
  getRooms,
  getRoomTarget,
  isCharacterSelected,
  getEliteLevel,
  getResults,
  getROIResults
} from './state.js';

const GROWTH_PRODUCTS = ['Fungal Matter', 'Plant', 'Rare Mineral'];
const ELITE_LEVELS = ['e1', 'e2', 'e3', 'e4'];

export function renderRoomConfig(container) {
  const rooms = getRooms();

  const roomsHtml = rooms.map((roomType, index) => {
    if (index < 2) {
      // Fixed rooms
      return `
        <div class="room-slot fixed">
          <span class="room-label">Room ${index + 1}</span>
          <span class="room-type">${roomType}</span>
        </div>
      `;
    }

    // Configurable rooms
    const target = getRoomTarget(index);
    let targetHtml = '';

    if (roomType === 'Manufacturing Cabin') {
      targetHtml = `
        <select class="target-select" data-room="${index}">
          <option value="Weapon EXP" ${target === 'Weapon EXP' ? 'selected' : ''}>Weapon EXP</option>
          <option value="Operator EXP" ${target === 'Operator EXP' ? 'selected' : ''}>Operator EXP</option>
        </select>
      `;
    } else if (roomType === 'Growth Chamber') {
      const targetArray = Array.isArray(target) ? target : GROWTH_PRODUCTS;
      targetHtml = `
        <div class="target-checkboxes" data-room="${index}">
          ${GROWTH_PRODUCTS.map(product => `
            <label class="target-checkbox">
              <input type="checkbox" value="${product}" ${targetArray.includes(product) ? 'checked' : ''}>
              <span>${product.replace(' Matter', '').replace('Rare ', '')}</span>
            </label>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="room-slot configurable">
        <span class="room-label">Room ${index + 1}</span>
        <select class="room-select" data-room="${index}">
          <option value="Manufacturing Cabin" ${roomType === 'Manufacturing Cabin' ? 'selected' : ''}>Manufacturing</option>
          <option value="Growth Chamber" ${roomType === 'Growth Chamber' ? 'selected' : ''}>Growth Chamber</option>
        </select>
        ${targetHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = roomsHtml;
}

// Get a summary of character's cabin types for display
function getCharacterCabinSummary(charData) {
  const cabins = new Set();
  for (const talent of Object.values(charData.ship_talents)) {
    cabins.add(talent.cabin);
  }
  return [...cabins].map(c => c.replace(' Cabin', '').replace(' Chamber', '').replace(' Room', '')).join(', ');
}

// Format elite level for display
function formatEliteLabel(level) {
  return level.toUpperCase();
}

export function renderCharacterList(container) {
  const html = Object.entries(CHARACTERS).map(([name, data]) => {
    const selected = isCharacterSelected(name);
    const eliteLevel = getEliteLevel(name);
    const cabinSummary = getCharacterCabinSummary(data);

    const eliteButtonsHtml = ELITE_LEVELS.map(level => {
      const isActive = eliteLevel === level;
      return `<button class="elite-btn${isActive ? ' active' : ''}" data-name="${name}" data-level="${level}">${formatEliteLabel(level)}</button>`;
    }).join('');

    return `
      <div class="character-item${selected ? ' selected' : ''}" draggable="true" data-name="${name}">
        <span class="drag-handle">⠿</span>
        <div class="character-info">
          <div class="character-name">${name}</div>
          <div class="character-talents">${cabinSummary}</div>
        </div>
        <div class="elite-buttons">
          ${eliteButtonsHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

export function renderResults(container, resultsCard) {
  const results = getResults();

  if (!results) {
    resultsCard.hidden = true;
    return;
  }

  resultsCard.hidden = false;

  const roomsHtml = results.rooms.map((room, i) => {
    const operatorsHtml = room.operators.length > 0
      ? room.operators.map((op, j) => {
          const statsHtml = op.stats
            .map(s => {
              if (!s.value) return s.stat;
              const sign = s.value >= 0 ? '+' : '';
              return `${s.stat} ${sign}${s.value}%`;
            })
            .join(', ');
          return `
            <div class="result-operator" draggable="true" data-room-index="${i}" data-slot="${j}">
              <span class="drag-handle">⠿</span>
              <span class="result-operator-name">${op.name}</span>
              <span class="result-operator-stat">${statsHtml}</span>
              <span class="result-operator-elite">${op.elite.toUpperCase()}</span>
            </div>
          `;
        }).join('')
      : '<div class="result-empty-slot">No operators assigned</div>';

    const dropZoneHtml = room.operators.length < 3
      ? `<div class="result-drop-zone" data-room-index="${i}">Drop here</div>`
      : '';

    let efficiencyHtml = '';
    if (room.efficiencyByProduct) {
      const productEffHtml = Object.entries(room.efficiencyByProduct)
        .map(([product, eff]) => {
          const shortName = product.replace(' Matter', '').replace('Rare ', '');
          return `<span class="eff-product">${shortName}: <strong>${eff.toFixed(1)}%</strong></span>`;
        })
        .join('');
      efficiencyHtml = `<div class="result-room-efficiencies">${productEffHtml}</div>`;
    } else if (room.efficiency) {
      efficiencyHtml = `<span class="result-room-efficiency">Effective: <strong>${room.efficiency.toFixed(1)}%</strong></span>`;
    }

    const targetHtml = room.target
      ? `<span class="result-room-target">${room.target}</span>`
      : '';

    return `
      <div class="result-room" data-room-index="${i}">
        <div class="result-room-header">
          <div class="result-room-title">
            <span class="result-room-name">${room.name}</span>
            ${targetHtml}
          </div>
          ${efficiencyHtml}
        </div>
        <div class="result-operators">
          ${operatorsHtml}
          ${dropZoneHtml}
        </div>
      </div>
    `;
  }).join('');

  const summaryHtml = `
    <div class="results-summary">
      <div class="summary-title">Ship Summary</div>
      <div class="summary-stats">
        <div class="summary-stat">
          <span class="summary-stat-label">Global Uptime</span>
          <span class="summary-stat-value">${results.summary.uptime.toFixed(1)}%</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-label">Avg Production Eff.</span>
          <span class="summary-stat-value">${results.summary.avgProduction.toFixed(1)}%</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-label">Clue Efficiency</span>
          <span class="summary-stat-value">${results.summary.clueEfficiency.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="results-grid">
      ${roomsHtml}
    </div>
    ${summaryHtml}
  `;
}

export function renderROIResults(container) {
  const roiResults = getROIResults();

  if (!roiResults) {
    container.innerHTML = '<p class="hint">Run the optimizer first, then click Calculate ROI to find the best upgrades.</p>';
    return;
  }

  const { baseline, results } = roiResults;

  if (results.length === 0) {
    container.innerHTML = '<p class="hint">All selected operators are already at E4.</p>';
    return;
  }

  const tableRows = results.map((r, i) => {
    const rank = i + 1;
    const isTop3 = rank <= 3;
    const deltaSign = r.delta >= 0 ? '+' : '';
    return `
      <tr class="${isTop3 ? 'roi-top' : ''}">
        <td class="roi-rank">${rank}</td>
        <td>${r.name}</td>
        <td>${r.currentElite.toUpperCase()} → ${r.nextElite.toUpperCase()}</td>
        <td class="roi-delta">${deltaSign}${r.delta.toFixed(1)}%</td>
        <td>${r.newEfficiency.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="roi-baseline">
      <span class="roi-baseline-label">Current total efficiency</span>
      <span class="roi-baseline-value">${baseline.toFixed(1)}%</span>
    </div>
    <table class="roi-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Operator</th>
          <th>Upgrade</th>
          <th>Δ Efficiency</th>
          <th>New Total</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}
