/**
 * FinanceiT - Reports View
 * Pure CSS and SVG visualizations for financial trends, category donut breakdown,
 * and budget performance without external libraries.
 */

import { State, formatPHP, formatMonthLabel, calculatePeriodSummary, getCategoryById, getCurrentMonthPeriod } from '../state.js';
import { getIcon, escapeHtml } from '../ui.js';

export function renderReports() {
  const container = document.getElementById('view-reports');
  if (!container) return;

  const currentPeriod = State.selectedPeriod && State.selectedPeriod !== 'all' ? State.selectedPeriod : getCurrentMonthPeriod();
  const summary = calculatePeriodSummary(currentPeriod);

  // 1. Spending by Category calculation for current period
  const categoryTotals = {};
  let totalExpenses = 0;

  State.transactions.forEach(tx => {
    if (tx.type === 'expense' && tx.date.startsWith(currentPeriod)) {
      const amt = tx.amountCentavos || 0;
      totalExpenses += amt;
      categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + amt;
    }
  });

  const rankedCategories = Object.entries(categoryTotals)
    .map(([catId, amt]) => {
      const cat = getCategoryById(catId);
      const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
      return {
        cat,
        amountCentavos: amt,
        percent: pct
      };
    })
    .sort((a, b) => b.amountCentavos - a.amountCentavos);

  // 2. Multi-month Trends (Last 4 months)
  const trends = getMultiMonthTrends(4);

  // 3. Savings Rate
  const savingsRate = summary.income > 0
    ? Math.min(Math.round(((summary.transfers + Math.max(0, summary.income - summary.expenses - summary.transfers)) / summary.income) * 100), 100)
    : 0;

  let html = `
    <!-- Top Period & Summary Card -->
    <div class="ios-card report-header-card">
      <div class="card-section-header">
        <div>
          <h2 class="card-title">Financial Reports</h2>
          <span class="card-subtitle">${formatMonthLabel(currentPeriod)}</span>
        </div>
        <div class="badge-pill badge-neutral">
          Savings Rate: ${savingsRate}%
        </div>
      </div>

      <div class="report-kpi-grid">
        <div class="report-kpi-box">
          <span class="kpi-label">Total Inflow</span>
          <span class="kpi-val text-income">${formatPHP(summary.income)}</span>
        </div>
        <div class="report-kpi-box">
          <span class="kpi-label">Total Outflow</span>
          <span class="kpi-val text-expense">${formatPHP(summary.expenses)}</span>
        </div>
        <div class="report-kpi-box">
          <span class="kpi-label">Retained Capital</span>
          <span class="kpi-val ${summary.netSavings >= 0 ? 'text-income' : 'text-expense'}">
            ${formatPHP(summary.netSavings)}
          </span>
        </div>
      </div>
    </div>

    <div class="reports-charts-grid">
      <!-- Spending by Category SVG Donut Chart -->
      <div class="ios-card chart-card">
        <div class="card-section-header">
          <h3 class="card-title">Spending by Category</h3>
          <span class="card-counter">${formatPHP(totalExpenses)} Total</span>
        </div>

        ${rankedCategories.length === 0 ? `
          <div class="empty-chart-notice">No expense transactions recorded in ${formatMonthLabel(currentPeriod)}.</div>
        ` : `
          <div class="donut-chart-wrapper">
            <div class="donut-svg-container">
              ${renderDonutSvg(rankedCategories, totalExpenses)}
            </div>
            <div class="donut-legend-col">
              ${rankedCategories.slice(0, 5).map((item, idx) => `
                <div class="legend-row">
                  <span class="legend-color-dot shade-${idx}"></span>
                  <span class="legend-name">${escapeHtml(item.cat.name)}</span>
                  <span class="legend-pct">${Math.round(item.percent)}%</span>
                  <span class="legend-amt">${formatPHP(item.amountCentavos)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `}
      </div>

      <!-- Monthly Trend Comparison (Last 4 Months) -->
      <div class="ios-card chart-card">
        <div class="card-section-header">
          <h3 class="card-title">Monthly Cashflow Trend</h3>
          <span class="card-subtitle">Last 4 Months</span>
        </div>

        <div class="trend-bars-container">
          ${renderTrendBarsSvg(trends)}
        </div>

        <div class="trend-legend">
          <span class="trend-legend-item"><span class="bar-color-key key-income"></span> Income</span>
          <span class="trend-legend-item"><span class="bar-color-key key-expense"></span> Expense</span>
        </div>
      </div>
    </div>

    <!-- Highest Spending Categories Ranking -->
    <div class="ios-card ranked-card">
      <div class="card-section-header">
        <h3 class="card-title">Category Ranking</h3>
        <span class="card-subtitle">Top Outflows</span>
      </div>

      ${rankedCategories.length === 0 ? `
        <div class="empty-list-notice">No expenses recorded for this period.</div>
      ` : `
        <div class="ranked-list">
          ${rankedCategories.map((item, idx) => `
            <div class="ranked-row">
              <div class="ranked-info-row">
                <div class="ranked-label-group">
                  <span class="ranked-index">#${idx + 1}</span>
                  <div class="cat-icon-circle-sm">${getIcon(item.cat.icon || 'tag', 14)}</div>
                  <span class="ranked-name">${escapeHtml(item.cat.name)}</span>
                </div>
                <div class="ranked-amounts">
                  <span class="ranked-amt">${formatPHP(item.amountCentavos)}</span>
                  <span class="ranked-pct">${Math.round(item.percent)}%</span>
                </div>
              </div>
              <div class="ranked-track">
                <div class="ranked-fill" style="width: ${Math.min(item.percent, 100)}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Generates an SVG Donut chart using SVG stroke-dasharray and circle segments.
 */
function renderDonutSvg(rankedCategories, totalExpenses) {
  if (totalExpenses === 0 || rankedCategories.length === 0) return '';

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Grayscale shades for minimal iOS aesthetic
  const shades = [
    'var(--text-primary)',
    'var(--text-secondary)',
    'var(--border-subtle)',
    '#666666',
    '#999999',
    '#bbbbbb'
  ];

  let accumulatedPercent = 0;
  let circles = [];

  rankedCategories.forEach((item, idx) => {
    const fraction = item.percent / 100;
    const strokeLength = circumference * fraction;
    const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
    const strokeDashoffset = -(accumferenceOffset(accumulatedPercent, circumference));
    const strokeColor = shades[idx % shades.length];

    circles.push(`
      <circle
        cx="${size / 2}" cy="${size / 2}" r="${radius}"
        fill="transparent"
        stroke="${strokeColor}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        stroke-linecap="round"
      />
    `);

    accumulatedPercent += item.percent;
  });

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="svg-donut">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="transparent" stroke="var(--bg-tertiary)" stroke-width="${strokeWidth}" />
      ${circles.join('')}
    </svg>
  `;
}

function accumferenceOffset(accumulatedPercent, circumference) {
  return (accumulatedPercent / 100) * circumference;
}

/**
 * Computes multi-month income & expenses for trend visualization.
 */
function getMultiMonthTrends(count = 4) {
  const result = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PH', { month: 'short' });

    let income = 0;
    let expense = 0;

    State.transactions.forEach(tx => {
      if (tx.date.startsWith(ym)) {
        if (tx.type === 'income') income += (tx.amountCentavos || 0);
        else if (tx.type === 'expense') expense += (tx.amountCentavos || 0);
      }
    });

    result.push({ ym, label, income, expense });
  }

  return result;
}

/**
 * Renders SVG vertical comparative bars for the trends.
 */
function renderTrendBarsSvg(trends) {
  let maxVal = 100000; // minimum baseline
  trends.forEach(t => {
    if (t.income > maxVal) maxVal = t.income;
    if (t.expense > maxVal) maxVal = t.expense;
  });

  const chartHeight = 120;

  return `
    <div class="trend-bars-grid">
      ${trends.map(t => {
        const incHeight = maxVal > 0 ? (t.income / maxVal) * chartHeight : 0;
        const expHeight = maxVal > 0 ? (t.expense / maxVal) * chartHeight : 0;

        return `
          <div class="trend-col">
            <div class="trend-col-bars" style="height: ${chartHeight}px;">
              <div class="trend-bar-pillar bar-income" style="height: ${Math.max(incHeight, 4)}px;" title="Income: ${formatPHP(t.income)}"></div>
              <div class="trend-bar-pillar bar-expense" style="height: ${Math.max(expHeight, 4)}px;" title="Expense: ${formatPHP(t.expense)}"></div>
            </div>
            <span class="trend-col-label">${t.label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
