import { buildTopupRows, getSeasonData, computeTierTotals, formatItemName, formatCategory } from './calculations.js';

const elements = {};

export function cacheElements() {
  elements.topupPanel = document.getElementById('topupPanel');
  elements.passPanel = document.getElementById('passPanel');
  elements.topupBody = document.getElementById('topupBody');
  elements.seasonSelect = document.getElementById('seasonSelect');
  elements.tierCards = document.getElementById('tierCards');
  elements.upgradeCards = document.getElementById('upgradeCards');
  elements.toggleBtns = document.querySelectorAll('.toggle-btn');
}

export function renderViewToggle(view) {
  elements.toggleBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  elements.topupPanel.hidden = view !== 'topup';
  elements.passPanel.hidden = view !== 'pass';
}

export function renderTopupTable(firstBuyUsed) {
  const { rows, bestId } = buildTopupRows(firstBuyUsed);

  elements.topupBody.innerHTML = rows.map(r => `
    <tr class="${r.id === bestId ? 'best-value' : ''}">
      <td>${r.name}${r.web_exclusive ? ' <span class="text-muted">(Web)</span>' : ''}</td>
      <td>$${r.price_usd.toFixed(2)}</td>
      <td>${r.effectiveAmount}</td>
      <td>${r.rate.toFixed(2)}</td>
      <td>$${r.costPerUnit.toFixed(3)}</td>
      <td>
        <input type="checkbox" data-pack="${r.id}"
          ${r.firstBuyUsed ? 'checked' : ''}>
      </td>
    </tr>
  `).join('');
}

function renderRewardList(items, tierTotals, tierKey) {
  const passData = getSeasonData(document.getElementById('seasonSelect').value);
  const categories = ['currencies', 'cosmetics', 'consumables', 'progression'];
  let html = '';

  for (const cat of categories) {
    const catItems = passData[cat];
    if (!catItems) continue;

    const catEntries = Object.keys(catItems).filter(key => tierTotals[tierKey][key] > 0);
    if (catEntries.length === 0) continue;

    html += `<div class="reward-category">
      <div class="category-label">${formatCategory(cat)}</div>
      ${catEntries.map(key => `
        <div class="reward-row">
          <span>${formatItemName(key)}</span>
          <span class="text-accent">${tierTotals[tierKey][key].toLocaleString()}</span>
        </div>
      `).join('')}
    </div>`;
  }

  return html;
}

export function renderPassView(seasonKey) {
  const passData = getSeasonData(seasonKey);
  if (!passData) {
    elements.tierCards.innerHTML = '<p class="text-error">Season data not found.</p>';
    elements.upgradeCards.innerHTML = '';
    return;
  }

  const tierTotals = computeTierTotals(passData);
  const tierKeys = ['basic', 'originium', 'customized'];

  // Tier overview cards — cumulative totals
  elements.tierCards.innerHTML = tierKeys.map(tier => {
    const info = passData.tiers[tier];
    return `<div class="tier-card">
      <div class="tier-card-header">
        <div class="tier-card-name">${info.name}</div>
        <div class="tier-card-cost">${info.cost}</div>
      </div>
      ${renderRewardList(null, tierTotals, tier)}
    </div>`;
  }).join('');

  // Upgrade cards — what each upgrade adds (just the column values)
  const upgrades = [
    { from: 'basic', to: 'originium', label: `Basic \u2192 Originium`, cost: passData.tiers.originium.cost },
    { from: 'originium', to: 'customized', label: `Originium \u2192 Customized`, cost: passData.tiers.customized.cost },
  ];

  const categories = ['currencies', 'cosmetics', 'consumables', 'progression'];

  elements.upgradeCards.innerHTML = upgrades.map(upg => {
    let html = `<div class="tier-card">
      <div class="tier-card-header">
        <div class="tier-card-name">${upg.label}</div>
        <div class="tier-card-cost">${upg.cost}</div>
      </div>`;

    for (const cat of categories) {
      const catItems = passData[cat];
      if (!catItems) continue;

      const entries = Object.entries(catItems).filter(([, tiers]) => tiers[upg.to] > 0);
      if (entries.length === 0) continue;

      html += `<div class="reward-category">
        <div class="category-label">${formatCategory(cat)}</div>
        ${entries.map(([key, tiers]) => `
          <div class="reward-row">
            <span>${formatItemName(key)}</span>
            <span class="text-accent">+${tiers[upg.to].toLocaleString()}</span>
          </div>
        `).join('')}
      </div>`;
    }

    html += '</div>';
    return html;
  }).join('');
}
