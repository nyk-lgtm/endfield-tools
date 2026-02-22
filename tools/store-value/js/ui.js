import { buildTopupRows, getSeasonData, computeTierTotals, formatItemName, formatCategory, getSanityPerUnit, computeSanityBreakdown } from './calculations.js';

const elements = {};
const CATEGORIES = ['currencies', 'cosmetics', 'consumables', 'progression'];

export function cacheElements() {
  elements.topupPanel = document.getElementById('topupPanel');
  elements.passPanel = document.getElementById('passPanel');
  elements.topupBody = document.getElementById('topupBody');
  elements.seasonSelect = document.getElementById('seasonSelect');
  elements.passTiers = document.getElementById('passTiers');
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

function renderCategoryTable(passData, tierTotals, tierKey, cat, catSanity) {
  const catItems = passData[cat];
  if (!catItems) return '';

  const entries = Object.keys(catItems).filter(key => tierTotals[tierKey][key] > 0);
  if (entries.length === 0) return '';

  const hasSanity = catSanity > 0;
  const sanityLabel = hasSanity ? `<span class="category-sanity">~${catSanity.toLocaleString()} sanity</span>` : '';

  let rows = '';
  for (const key of entries) {
    const cumulative = tierTotals[tierKey][key];
    const delta = catItems[key][tierKey] ?? 0;
    const showDelta = tierKey !== 'basic' && delta > 0 && delta < cumulative;
    const rate = getSanityPerUnit(key);
    const itemSanity = rate != null ? Math.round(cumulative * rate) : null;

    rows += `<tr>
      <td>${formatItemName(key)}</td>
      <td class="text-accent">${cumulative.toLocaleString()}${showDelta ? ` <span class="reward-delta">(+${delta.toLocaleString()})</span>` : ''}</td>
      <td class="text-muted">${itemSanity != null ? '~' + itemSanity.toLocaleString() : '\u2014'}</td>
    </tr>`;
  }

  return `<div class="reward-section">
    <div class="reward-section-header">
      <span class="collapse-indicator">\u25bc</span>
      <span>${formatCategory(cat)}</span>
      ${sanityLabel}
    </div>
    <div class="reward-section-body">
      <table class="reward-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Sanity</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

export function renderPassView(seasonKey) {
  const passData = getSeasonData(seasonKey);
  if (!passData) {
    elements.passTiers.innerHTML = '<p class="text-error">Season data not found.</p>';
    return;
  }

  const tierTotals = computeTierTotals(passData);
  const sanity = computeSanityBreakdown(passData, tierTotals);
  const tierKeys = ['basic', 'originium', 'customized'];

  elements.passTiers.innerHTML = tierKeys.map((tierKey, i) => {
    const info = passData.tiers[tierKey];
    const tierSanity = sanity[tierKey];
    const expanded = i === 0;

    let body = '';
    for (const cat of CATEGORIES) {
      body += renderCategoryTable(passData, tierTotals, tierKey, cat, tierSanity.categories[cat] ?? 0);
    }

    return `<div class="collapsible pass-tier${expanded ? '' : ' collapsed'}">
      <div class="collapsible-header pass-tier-header">
        <span class="collapse-indicator">${expanded ? '\u25bc' : '\u25b6'}</span>
        <div class="pass-tier-name">${info.name}</div>
        <div class="pass-tier-meta">
          <span class="pass-tier-cost">${info.cost}</span>
          <span class="pass-tier-sanity">~${tierSanity.total.toLocaleString()} sanity</span>
        </div>
      </div>
      <div class="collapsible-body pass-tier-body">${body}</div>
    </div>`;
  }).join('');
}
