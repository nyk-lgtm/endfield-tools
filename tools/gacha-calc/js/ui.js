import { computeFeaturedCDF, expectedPulls, pullsForProbability, planMultiBanner } from './calculations.js';

const elements = {};

export function cacheElements() {
  elements.singlePanel = document.getElementById('singlePanel');
  elements.multiPanel = document.getElementById('multiPanel');
  elements.pityInput = document.getElementById('pityInput');
  elements.pullsInput = document.getElementById('pullsInput');
  elements.guaranteedToggle = document.getElementById('guaranteedToggle');
  elements.guaranteedLabel = document.getElementById('guaranteedLabel');
  elements.singleStats = document.getElementById('singleStats');
  elements.cdfChart = document.getElementById('cdfChart');
  elements.multiPullsInput = document.getElementById('multiPullsInput');
  elements.multiPityInput = document.getElementById('multiPityInput');
  elements.multiGuaranteedToggle = document.getElementById('multiGuaranteedToggle');
  elements.multiGuaranteedLabel = document.getElementById('multiGuaranteedLabel');
  elements.bannerCountInput = document.getElementById('bannerCountInput');
  elements.multiResults = document.getElementById('multiResults');
  elements.toggleBtns = document.querySelectorAll('.toggle-btn');
}

export function renderModeToggle(mode) {
  elements.toggleBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  elements.singlePanel.hidden = mode !== 'single';
  elements.multiPanel.hidden = mode !== 'multi';
}

export function renderGuaranteedToggle(el, labelEl, val) {
  el.classList.toggle('active', val);
  labelEl.textContent = val ? 'Yes' : 'No';
}

export function renderSingleResults(pity, guaranteed, pulls) {
  const cdf = computeFeaturedCDF(pulls, pity, guaranteed);
  const prob = cdf[pulls];
  const expected = expectedPulls(pity, guaranteed);
  const p50 = pullsForProbability(cdf, 0.5);
  const p90 = pullsForProbability(cdf, 0.9);

  elements.singleStats.innerHTML = `
    <div class="stat-box">
      <div class="stat-label">Probability</div>
      <div class="stat-value">${(prob * 100).toFixed(1)}%</div>
      <div class="stat-sub">in ${pulls} pulls</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Expected Pulls</div>
      <div class="stat-value">${Math.round(expected)}</div>
      <div class="stat-sub">on average</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">50% Chance</div>
      <div class="stat-value">${p50 >= 0 ? p50 : '—'}</div>
      <div class="stat-sub">pulls needed</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">90% Chance</div>
      <div class="stat-value">${p90 >= 0 ? p90 : '—'}</div>
      <div class="stat-sub">pulls needed</div>
    </div>
  `;

  renderCDFChart(cdf, pulls, pity);
}

function renderCDFChart(cdf, maxPulls, startPity) {
  const canvas = elements.cdfChart;
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Determine X range — find where CDF hits 0.999 or use maxPulls, whichever is smaller but at least maxPulls
  let xMax = maxPulls;
  for (let i = 1; i <= cdf.length - 1; i++) {
    if (cdf[i] >= 0.999) { xMax = Math.max(i, Math.min(maxPulls, i + 10)); break; }
  }
  xMax = Math.max(xMax, 10);

  const xScale = (x) => pad.left + (x / xMax) * plotW;
  const yScale = (y) => pad.top + (1 - y) * plotH;

  // Grid lines
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  // Horizontal: 0%, 25%, 50%, 75%, 100%
  for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
    const y = yScale(frac);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }

  // Threshold lines (50%, 90%)
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  for (const { frac, color } of [{ frac: 0.5, color: '#444' }, { frac: 0.9, color: '#444' }]) {
    const y = yScale(frac);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // CDF curve
  ctx.strokeStyle = '#feff42';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= Math.min(xMax, cdf.length - 1); i++) {
    const x = xScale(i);
    const y = yScale(cdf[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Fill under curve
  ctx.fillStyle = 'rgba(254, 255, 66, 0.06)';
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(0));
  for (let i = 0; i <= Math.min(xMax, cdf.length - 1); i++) {
    ctx.lineTo(xScale(i), yScale(cdf[i]));
  }
  ctx.lineTo(xScale(Math.min(xMax, cdf.length - 1)), yScale(0));
  ctx.closePath();
  ctx.fill();

  // Current pull count vertical line
  if (maxPulls > 0 && maxPulls <= xMax) {
    ctx.strokeStyle = 'rgba(254, 255, 66, 0.4)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xScale(maxPulls), pad.top);
    ctx.lineTo(xScale(maxPulls), h - pad.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // X-axis labels
  ctx.fillStyle = '#888';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const xStep = xMax <= 50 ? 10 : xMax <= 100 ? 20 : xMax <= 200 ? 40 : 50;
  for (let i = 0; i <= xMax; i += xStep) {
    ctx.fillText(i.toString(), xScale(i), h - pad.bottom + 16);
  }
  // Always label xMax if not already labeled
  if (xMax % xStep !== 0) {
    ctx.fillText(xMax.toString(), xScale(xMax), h - pad.bottom + 16);
  }

  // X-axis title
  ctx.fillStyle = '#666';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Pulls', w / 2, h - 4);

  // Y-axis labels
  ctx.textAlign = 'right';
  ctx.fillStyle = '#888';
  for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
    ctx.fillText(`${Math.round(frac * 100)}%`, pad.left - 8, yScale(frac) + 4);
  }
}

export function renderMultiResults(totalPulls, bannerCount, pity, guaranteed) {
  const results = planMultiBanner(totalPulls, bannerCount, pity, guaranteed);

  let allProb = 1;
  let html = '';

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    allProb *= r.probability;
    html += `
      <div class="banner-result">
        <div class="banner-result-header">
          <h3>Banner ${i + 1}</h3>
          <span class="banner-prob">${(r.probability * 100).toFixed(1)}%</span>
        </div>
        <div class="banner-meta">
          <span>~${Math.round(r.expectedPulls)} pulls expected</span>
          <span>${Math.round(r.remainingAfter)} pulls remaining</span>
        </div>
        <div class="prob-bar">
          <div class="prob-bar-fill" style="width: ${(r.probability * 100).toFixed(1)}%"></div>
        </div>
      </div>
    `;
  }

  html += `
    <div class="multi-summary">
      <div class="stat-label">Get All Featured</div>
      <div class="stat-value">${(allProb * 100).toFixed(1)}%</div>
    </div>
  `;

  elements.multiResults.innerHTML = html;
}

// Handle chart resize
let resizeTimer;
export function setupResizeHandler(renderFn) {
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderFn, 150);
  });
}
