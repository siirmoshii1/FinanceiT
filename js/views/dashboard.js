/**
 * FinanceiT - Dashboard View
 * Native iOS styled summary cards, balances, salary payday tracker, upcoming bills & recent activity.
 */

import { State, calculateBalances, calculatePeriodSummary, calculateBudgetStatus, getNextPaydayInfo, getUpcomingBills, formatPHP, formatDateLabel, formatMonthLabel, getCurrentMonthPeriod, getPreviousMonthPeriod } from '../state.js';
import { getIcon, openModal, escapeHtml } from '../ui.js';

export function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const balances = calculateBalances();
  const periodSummary = calculatePeriodSummary();
  const budgetStatus = calculateBudgetStatus();
  const paydayInfo = getNextPaydayInfo();
  const upcomingBills = getUpcomingBills(14);
  const recentTransactions = State.transactions.slice(0, 6);

  // Period label for display
  let periodDisplay = formatMonthLabel(State.selectedPeriod);
  if (State.selectedPeriod === 'all') periodDisplay = 'All Time';
  else if (State.selectedPeriod.startsWith('pay_period_')) {
    const parts = State.selectedPeriod.split('_');
    periodDisplay = `${formatMonthLabel(parts[2])} (${parts[3] === '1' ? '1st-15th' : '16th-End'})`;
  }

  // Check if first-time empty user
  const isFreshInstall = State.transactions.length === 0 && (!State.salarySettings || State.salarySettings.takeHomeCentavos === 0);

  let html = `
    <!-- Hero Section (Balance & Quick Actions) -->
    <div class="dashboard-hero-section">
      <!-- Top Account Balance Card -->
      <div class="ios-card balance-card">
        <div class="balance-header">
          <span class="balance-label">AVAILABLE BALANCE</span>
          <button id="btn-toggle-balance-visibility" class="btn-icon-subtle" title="Toggle visibility" aria-label="Toggle visibility">
            ${getIcon('shield', 14)}
          </button>
        </div>
        <div class="balance-amount" id="main-balance-display">
          ${formatPHP(balances.availableCash)}
        </div>

        <div class="sub-balances-row">
          <div class="sub-balance-item">
            <span class="sub-balance-label">Savings</span>
            <span class="sub-balance-val">${formatPHP(balances.totalSavings + balances.totalEmergency)}</span>
          </div>
          <div class="sub-balance-divider"></div>
          <div class="sub-balance-item">
            <span class="sub-balance-label">Net Worth</span>
            <span class="sub-balance-val">${formatPHP(balances.netWorth)}</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Shortcuts -->
      <div class="quick-actions-grid">
        <button class="quick-action-btn" id="qa-add-expense" aria-label="Add Expense">
          <div class="quick-action-icon">${getIcon('plus', 18)}</div>
          <span class="quick-action-label">Expense</span>
        </button>
        <button class="quick-action-btn" id="qa-add-income" aria-label="Add Income">
          <div class="quick-action-icon">${getIcon('arrowDownLeft', 18)}</div>
          <span class="quick-action-label">Income</span>
        </button>
        <button class="quick-action-btn" id="qa-transfer-savings" aria-label="Transfer to Savings">
          <div class="quick-action-icon">${getIcon('shield', 18)}</div>
          <span class="quick-action-label">Save</span>
        </button>
        <button class="quick-action-btn" id="qa-manage-budget" aria-label="Budget Overview">
          <div class="quick-action-icon">${getIcon('budget', 18)}</div>
          <span class="quick-action-label">Budget</span>
        </button>
      </div>
    </div>

    ${isFreshInstall ? `
      <!-- Welcome Empty State -->
      <div class="ios-card empty-welcome-card">
        <div class="empty-badge">${getIcon('briefcase', 24)}</div>
        <h3 class="empty-title">Welcome to FinanceiT</h3>
        <p class="empty-desc">Your private, offline-first personal finance tracker. Let's start by configuring your salary or setting your opening balance.</p>
        <div class="empty-actions">
          <button class="ios-btn ios-btn-primary" id="btn-welcome-setup-salary">Configure Salary</button>
          <button class="ios-btn ios-btn-secondary" id="btn-welcome-add-first-tx">Log Opening Balance</button>
        </div>
      </div>
    ` : ''}

    <!-- Main Dashboard Responsive Columns -->
    <div class="dashboard-columns-grid">
      <!-- Left Column: Period Summary & Salary Scheduler -->
      <div class="dashboard-col">
        <!-- Period Summary Card -->
        <div class="ios-card period-card">
          <div class="card-section-header">
            <div>
              <h2 class="card-title">Period Overview</h2>
              <span class="card-subtitle">${escapeHtml(periodDisplay)}</span>
            </div>
            <div class="period-picker-wrapper">
              <select id="dashboard-period-select" class="ios-select-compact" aria-label="Select Period">
                <option value="${getCurrentMonthPeriod()}" ${State.selectedPeriod === getCurrentMonthPeriod() ? 'selected' : ''}>This Month</option>
                <option value="${getPreviousMonthPeriod()}" ${State.selectedPeriod === getPreviousMonthPeriod() ? 'selected' : ''}>Last Month</option>
                <option value="pay_period_${getCurrentMonthPeriod()}_1" ${State.selectedPeriod === `pay_period_${getCurrentMonthPeriod()}_1` ? 'selected' : ''}>1st - 15th Pay Period</option>
                <option value="pay_period_${getCurrentMonthPeriod()}_2" ${State.selectedPeriod === `pay_period_${getCurrentMonthPeriod()}_2` ? 'selected' : ''}>16th - End Pay Period</option>
                <option value="all" ${State.selectedPeriod === 'all' ? 'selected' : ''}>All Time</option>
              </select>
            </div>
          </div>

          <div class="period-stats-grid">
            <div class="stat-box">
              <span class="stat-label">Income</span>
              <span class="stat-value text-income">${formatPHP(periodSummary.income)}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Expenses</span>
              <span class="stat-value text-expense">${formatPHP(periodSummary.expenses)}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Net Savings</span>
              <span class="stat-value ${periodSummary.netSavings >= 0 ? 'text-income' : 'text-expense'}">
                ${formatPHP(periodSummary.netSavings)}
              </span>
            </div>
          </div>

          <!-- Budget Progress Bar -->
          <div class="budget-mini-progress">
            <div class="budget-mini-header">
              <span class="budget-mini-label">Budget Spent: ${formatPHP(budgetStatus.totalActualCentavos)} / ${formatPHP(budgetStatus.totalPlannedCentavos)}</span>
              <span class="budget-mini-pct ${budgetStatus.overallPercent > 100 ? 'text-expense' : ''}">${budgetStatus.overallPercent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${budgetStatus.overallPercent > 100 ? 'fill-exceeded' : ''}" style="width: ${Math.min(budgetStatus.overallPercent, 100)}%;"></div>
            </div>
          </div>
        </div>

        <!-- Salary Tracker Card -->
        ${paydayInfo && paydayInfo.dateStr ? `
          <div class="ios-card salary-card">
            <div class="salary-card-header">
              <div class="salary-info">
                <span class="badge-label">SALARY SCHEDULE</span>
                <h3 class="salary-employer">${escapeHtml(paydayInfo.employer)}</h3>
                <span class="salary-date">Next Payday: <strong>${formatDateLabel(paydayInfo.dateStr)}</strong></span>
              </div>
              <div class="salary-amount-block">
                <span class="salary-takehome-label">Take-Home</span>
                <span class="salary-takehome-val">${formatPHP(paydayInfo.takeHomeCentavos)}</span>
              </div>
            </div>

            <div class="salary-action-row">
              ${paydayInfo.isAlreadyReceived ? `
                <div class="salary-status-tag status-received">
                  ${getIcon('check', 14)} Payday confirmed received
                </div>
              ` : `
                <button class="ios-btn ios-btn-action-primary" id="btn-mark-salary-received" data-payday="${paydayInfo.dateStr}">
                  ${getIcon('check', 16)} Mark Salary as Received
                </button>
              `}
            </div>
            <p class="salary-notice-text">
              Expected salary never increases available balance until you confirm receipt.
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Right Column: Bills & Recent Transactions -->
      <div class="dashboard-col">
        <!-- Upcoming Recurring Bills -->
        <div class="ios-card bills-card">
          <div class="card-section-header">
            <h2 class="card-title">Upcoming Bills</h2>
            <span class="card-counter">${upcomingBills.filter(b => !b.isPaid).length} Pending</span>
          </div>

          ${upcomingBills.length === 0 ? `
            <div class="empty-list-notice">No upcoming bills scheduled.</div>
          ` : `
            <div class="bills-list">
              ${upcomingBills.slice(0, 4).map(bill => `
                <div class="bill-item ${bill.isOverdue ? 'bill-overdue' : ''} ${bill.isPaid ? 'bill-paid' : ''}">
                  <div class="bill-left">
                    <div class="bill-icon-box">${getIcon('repeat', 16)}</div>
                    <div class="bill-details">
                      <span class="bill-name">${escapeHtml(bill.name)}</span>
                      <span class="bill-due-meta">
                        ${bill.isPaid ? 'Paid this month' : (bill.isOverdue ? 'Overdue!' : `Due ${formatDateLabel(bill.dueDateStr)}`)}
                      </span>
                    </div>
                  </div>
                  <div class="bill-right">
                    <span class="bill-amt">${formatPHP(bill.amountCentavos)}</span>
                    ${!bill.isPaid ? `
                      <button class="btn-pay-bill" data-bill-id="${bill.id}" title="Mark as Paid">
                        Pay
                      </button>
                    ` : `
                      <span class="paid-check">${getIcon('check', 14)}</span>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Recent Transactions Card -->
        <div class="ios-card recent-tx-card">
          <div class="card-section-header">
            <h2 class="card-title">Recent Transactions</h2>
            <button class="btn-link" id="btn-view-all-tx">View All</button>
          </div>

          ${recentTransactions.length === 0 ? `
            <div class="empty-list-notice">No transactions yet. Tap + to add one.</div>
          ` : `
            <div class="tx-compact-list">
              ${recentTransactions.map(tx => {
                const isInc = tx.type === 'income';
                const isTrans = tx.type === 'transfer';
                const cat = State.categories.find(c => c.id === tx.categoryId) || { name: 'Uncategorized', icon: 'tag' };
                return `
                  <div class="tx-row" data-tx-id="${tx.id}">
                    <div class="tx-row-left">
                      <div class="tx-cat-icon icon-${tx.type}">${getIcon(cat.icon || 'tag', 16)}</div>
                      <div class="tx-info">
                        <span class="tx-desc">${escapeHtml(tx.description || cat.name)}</span>
                        <span class="tx-sub">${escapeHtml(cat.name)} &bull; ${formatDateLabel(tx.date)}</span>
                      </div>
                    </div>
                    <div class="tx-row-right">
                      <span class="tx-amount ${isInc ? 'text-income' : (isTrans ? 'text-transfer' : 'text-expense')}">
                        ${isInc ? '+' : (isTrans ? '' : '-')}${formatPHP(tx.amountCentavos)}
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  attachDashboardEvents();
}

function attachDashboardEvents() {
  // Period dropdown
  const periodSelect = document.getElementById('dashboard-period-select');
  if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
      State.selectedPeriod = e.target.value;
      State.notify('period_changed');
    });
  }

  // Quick actions
  const qaExpense = document.getElementById('qa-add-expense');
  if (qaExpense) {
    qaExpense.addEventListener('click', () => {
      window.openAddTransactionModal('expense');
    });
  }

  const qaIncome = document.getElementById('qa-add-income');
  if (qaIncome) {
    qaIncome.addEventListener('click', () => {
      window.openAddTransactionModal('income');
    });
  }

  const qaTransfer = document.getElementById('qa-transfer-savings');
  if (qaTransfer) {
    qaTransfer.addEventListener('click', () => {
      window.openAddTransactionModal('transfer');
    });
  }

  const qaBudget = document.getElementById('qa-manage-budget');
  if (qaBudget) {
    qaBudget.addEventListener('click', () => {
      window.navigateToView('budget');
    });
  }

  // Welcome actions
  const btnSetupSalary = document.getElementById('btn-welcome-setup-salary');
  if (btnSetupSalary) {
    btnSetupSalary.addEventListener('click', () => {
      window.navigateToView('settings');
      setTimeout(() => {
        const el = document.getElementById('salary-config-card');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    });
  }

  const btnFirstTx = document.getElementById('btn-welcome-add-first-tx');
  if (btnFirstTx) {
    btnFirstTx.addEventListener('click', () => {
      window.openAddTransactionModal('income');
    });
  }

  // Mark Salary Received
  const btnMarkSalary = document.getElementById('btn-mark-salary-received');
  if (btnMarkSalary) {
    btnMarkSalary.addEventListener('click', (e) => {
      const payday = e.currentTarget.getAttribute('data-payday');
      window.openConfirmSalaryModal(payday);
    });
  }

  // Pay recurring bill button
  document.querySelectorAll('.btn-pay-bill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const billId = e.currentTarget.getAttribute('data-bill-id');
      window.openPayBillModal(billId);
    });
  });

  // Tap transaction to edit
  document.querySelectorAll('.tx-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const txId = e.currentTarget.getAttribute('data-tx-id');
      window.openEditTransactionModal(txId);
    });
  });

  // View All transactions button
  const btnViewAll = document.getElementById('btn-view-all-tx');
  if (btnViewAll) {
    btnViewAll.addEventListener('click', () => {
      window.navigateToView('transactions');
    });
  }
}
