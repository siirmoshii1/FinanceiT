/**
 * FinanceiT - Budget Planning View
 * Category budget tracking, progress bars, zero-division safe math,
 * and Take-Home Salary Allocation Planner.
 */

import { State, calculateBudgetStatus, calculateSalaryAllocation, formatPHP, formatMonthLabel, getCurrentMonthPeriod, getPreviousMonthPeriod } from '../state.js';
import { getIcon, escapeHtml } from '../ui.js';

export function renderBudget() {
  const container = document.getElementById('view-budget');
  if (!container) return;

  const budgetStatus = calculateBudgetStatus();
  const allocation = calculateSalaryAllocation();

  let html = `
    <!-- Top Period & Summary Card -->
    <div class="ios-card budget-summary-card">
      <div class="card-section-header">
        <div>
          <h2 class="card-title">Budget Planning</h2>
          <span class="card-subtitle">${formatMonthLabel(budgetStatus.period)}</span>
        </div>
        <button class="ios-btn-compact" id="btn-quick-add-budget">
          ${getIcon('plus', 14)} Set Budget
        </button>
      </div>

      <div class="budget-main-stat">
        <div class="budget-stat-col">
          <span class="b-stat-label">Total Planned</span>
          <span class="b-stat-val">${formatPHP(budgetStatus.totalPlannedCentavos)}</span>
        </div>
        <div class="budget-stat-col">
          <span class="b-stat-label">Actual Spent</span>
          <span class="b-stat-val ${budgetStatus.totalActualCentavos > budgetStatus.totalPlannedCentavos ? 'text-expense' : ''}">
            ${formatPHP(budgetStatus.totalActualCentavos)}
          </span>
        </div>
        <div class="budget-stat-col">
          <span class="b-stat-label">Remaining</span>
          <span class="b-stat-val ${budgetStatus.totalRemainingCentavos < 0 ? 'text-expense' : 'text-income'}">
            ${formatPHP(budgetStatus.totalRemainingCentavos)}
          </span>
        </div>
      </div>

      <!-- Overall progress -->
      <div class="budget-total-progress-bar">
        <div class="progress-track-lg">
          <div class="progress-fill ${budgetStatus.overallPercent > 100 ? 'fill-exceeded' : (budgetStatus.overallPercent >= 85 ? 'fill-warning' : '')}"
               style="width: ${Math.min(budgetStatus.overallPercent, 100)}%;"></div>
        </div>
        <div class="progress-sub-row">
          <span>Overall Usage</span>
          <span class="font-mono ${budgetStatus.overallPercent > 100 ? 'text-expense' : ''}">${budgetStatus.overallPercent}%</span>
        </div>
      </div>
    </div>

    <!-- Salary Allocation Planner Card -->
    <div class="ios-card allocation-card">
      <div class="card-section-header">
        <h2 class="card-title">Salary Allocation Planner</h2>
        <span class="badge-pill ${allocation.isOverallocated ? 'badge-danger' : 'badge-neutral'}">
          ${allocation.isOverallocated ? 'Overallocated' : 'Balanced'}
        </span>
      </div>

      <div class="allocation-grid">
        <div class="alloc-item">
          <span class="alloc-label">Expected Take-Home</span>
          <span class="alloc-val">${formatPHP(allocation.takeHomeCentavos)}</span>
        </div>
        <div class="alloc-item">
          <span class="alloc-label">Planned Expenses</span>
          <span class="alloc-val text-expense">-${formatPHP(allocation.plannedExpenses)}</span>
        </div>
        <div class="alloc-item">
          <span class="alloc-label">Planned Savings</span>
          <span class="alloc-val text-transfer">-${formatPHP(allocation.plannedSavings)}</span>
        </div>
        <div class="alloc-item highlight-box ${allocation.isOverallocated ? 'box-danger' : 'box-good'}">
          <span class="alloc-label">${allocation.isOverallocated ? 'Overallocated By' : 'Unallocated Money'}</span>
          <span class="alloc-val font-bold">${formatPHP(Math.abs(allocation.unallocatedCentavos))}</span>
        </div>
      </div>

      ${allocation.takeHomeCentavos === 0 ? `
        <div class="alloc-hint-bar">
          ${getIcon('info', 14)} <span>Set up your salary take-home in Settings to enable automatic allocation planning.</span>
        </div>
      ` : ''}
    </div>

    <!-- Categories Budget List -->
    <div class="budget-categories-list">
      <div class="section-title-row">
        <h3 class="section-title">Expense Categories</h3>
        <span class="section-count">${budgetStatus.items.length} Categories</span>
      </div>

      ${budgetStatus.items.length === 0 ? `
        <div class="ios-card empty-list-notice">
          No categories configured. Tap "+ Set Budget" to create a budget.
        </div>
      ` : `
        <div class="budget-cards-grid">
          ${budgetStatus.items.map(item => {
            const cat = item.category;
            const isExceeded = item.status === 'exceeded';
            const isWarning = item.status === 'warning';
            const hasNoBudget = item.status === 'no_budget';

            let badgeHtml = '';
            if (isExceeded) {
              badgeHtml = `<span class="status-badge badge-exceeded">Over by ${formatPHP(Math.abs(item.remainingCentavos))}</span>`;
            } else if (isWarning) {
              badgeHtml = `<span class="status-badge badge-warning">${item.percentUsed}% used</span>`;
            } else if (hasNoBudget) {
              badgeHtml = `<span class="status-badge badge-nobudget">No budget set</span>`;
            } else if (item.plannedCentavos > 0) {
              badgeHtml = `<span class="status-badge badge-ok">${formatPHP(item.remainingCentavos)} left</span>`;
            }

            return `
              <div class="ios-card budget-category-card" data-cat-id="${cat.id}">
                <div class="cat-card-header">
                  <div class="cat-identity">
                    <div class="cat-icon-wrap">${getIcon(cat.icon || 'tag', 16)}</div>
                    <div>
                      <h4 class="cat-name">${escapeHtml(cat.name)}</h4>
                      <div class="cat-spend-meta">
                        Spent: ${formatPHP(item.actualCentavos)}
                        ${item.plannedCentavos > 0 ? ` of ${formatPHP(item.plannedCentavos)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="cat-badge-wrap">
                    ${badgeHtml}
                    <button class="btn-edit-budget" data-cat-id="${cat.id}" title="Edit budget" aria-label="Edit budget for ${escapeHtml(cat.name)}">
                      ${getIcon('edit', 14)}
                    </button>
                  </div>
                </div>

                ${item.plannedCentavos > 0 ? `
                  <div class="cat-progress-track">
                    <div class="cat-progress-fill ${isExceeded ? 'fill-exceeded' : (isWarning ? 'fill-warning' : '')}"
                         style="width: ${Math.min(item.percentUsed, 100)}%;"></div>
                  </div>
                  <div class="cat-progress-footer">
                    <span>${item.percentUsed}% spent</span>
                    <span class="${isExceeded ? 'text-expense font-bold' : ''}">
                      ${isExceeded ? 'Deficit: ' : 'Remaining: '}${formatPHP(Math.abs(item.remainingCentavos))}
                    </span>
                  </div>
                ` : `
                  <div class="cat-nobudget-prompt">
                    <button class="btn-set-budget-link" data-cat-id="${cat.id}">+ Set monthly limit</button>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  container.innerHTML = html;
  attachBudgetEvents();
}

function attachBudgetEvents() {
  const btnQuickAdd = document.getElementById('btn-quick-add-budget');
  if (btnQuickAdd) {
    btnQuickAdd.addEventListener('click', () => {
      window.openAddBudgetModal();
    });
  }

  // Edit budget buttons
  document.querySelectorAll('.btn-edit-budget, .btn-set-budget-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = e.currentTarget.getAttribute('data-cat-id');
      window.openAddBudgetModal(catId);
    });
  });
}
