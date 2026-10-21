/**
 * FinanceiT - Transactions View
 * Date-grouped transaction list, real-time search, filters, and modal triggers.
 */

import { State, getFilteredTransactions, formatPHP, formatDateLabel, toCentavos, getCategoryById, getTodayDateString } from '../state.js';
import { getIcon, escapeHtml } from '../ui.js';

export function renderTransactions() {
  const container = document.getElementById('view-transactions');
  if (!container) return;

  const filtered = getFilteredTransactions();

  // Group transactions by date
  const groups = {};
  filtered.forEach(tx => {
    if (!groups[tx.date]) {
      groups[tx.date] = [];
    }
    groups[tx.date].push(tx);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const activeCategories = State.categories.filter(c => !c.isArchived);

  let html = `
    <!-- Top Filter & Search Bar -->
    <div class="ios-card tx-header-card">
      <div class="tx-search-box">
        <span class="search-icon">${getIcon('search', 16)}</span>
        <input type="text" id="tx-search-input" class="ios-input-search" placeholder="Search transactions, notes, categories..." value="${escapeHtml(State.txSearchQuery)}" />
        ${State.txSearchQuery ? `<button id="btn-clear-tx-search" class="btn-clear-search">${getIcon('close', 14)}</button>` : ''}
      </div>

      <!-- Segmented Type Controls -->
      <div class="segmented-control">
        <button class="segment-btn ${State.activeTxTypeFilter === 'all' ? 'active' : ''}" data-type="all">All</button>
        <button class="segment-btn ${State.activeTxTypeFilter === 'expense' ? 'active' : ''}" data-type="expense">Expenses</button>
        <button class="segment-btn ${State.activeTxTypeFilter === 'income' ? 'active' : ''}" data-type="income">Income</button>
        <button class="segment-btn ${State.activeTxTypeFilter === 'transfer' ? 'active' : ''}" data-type="transfer">Transfers</button>
      </div>

      <!-- Category Filter Dropdown -->
      <div class="tx-sub-filters">
        <div class="filter-dropdown-wrap">
          <label for="tx-cat-filter" class="filter-label">${getIcon('filter', 14)} Category:</label>
          <select id="tx-cat-filter" class="ios-select-compact">
            <option value="all">All Categories</option>
            ${activeCategories.map(c => `
              <option value="${c.id}" ${State.txCategoryFilter === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>
            `).join('')}
          </select>
        </div>
        <div class="tx-total-count">${filtered.length} record${filtered.length === 1 ? '' : 's'}</div>
      </div>
    </div>

    <!-- Date Grouped Transaction List -->
    ${sortedDates.length === 0 ? `
      <div class="ios-card empty-transactions-card">
        <div class="empty-icon-wrap">${getIcon('transactions', 32)}</div>
        <h3>No Transactions Found</h3>
        <p>No records match your selected filters. Tap "+" to record a new transaction.</p>
        <button class="ios-btn ios-btn-primary" id="btn-empty-add-tx">+ Add Transaction</button>
      </div>
    ` : `
      <div class="tx-groups-container">
        ${sortedDates.map(dateStr => {
          const list = groups[dateStr];
          const today = getTodayDateString();
          let dateHeaderTitle = formatDateLabel(dateStr);
          if (dateStr === today) dateHeaderTitle = `Today &bull; ${dateHeaderTitle}`;

          // Calculate daily total
          let dailyExpense = 0;
          let dailyIncome = 0;
          list.forEach(tx => {
            if (tx.type === 'expense') dailyExpense += (tx.amountCentavos || 0);
            else if (tx.type === 'income') dailyIncome += (tx.amountCentavos || 0);
          });

          return `
            <div class="tx-date-group">
              <div class="tx-date-header">
                <span class="tx-date-title">${dateHeaderTitle}</span>
                <span class="tx-date-summary">
                  ${dailyIncome > 0 ? `<span class="text-income">+${formatPHP(dailyIncome)}</span> ` : ''}
                  ${dailyExpense > 0 ? `<span class="text-expense">-${formatPHP(dailyExpense)}</span>` : ''}
                </span>
              </div>

              <div class="ios-card tx-group-card">
                ${list.map((tx, idx) => {
                  const cat = getCategoryById(tx.categoryId);
                  const isInc = tx.type === 'income';
                  const isTrans = tx.type === 'transfer';
                  return `
                    <div class="tx-item-row" data-tx-id="${tx.id}">
                      <div class="tx-item-left">
                        <div class="tx-icon-circle type-${tx.type}">${getIcon(cat.icon || 'tag', 18)}</div>
                        <div class="tx-meta-col">
                          <span class="tx-main-desc">${escapeHtml(tx.description || cat.name)}</span>
                          <span class="tx-secondary-meta">
                            ${escapeHtml(cat.name)}
                            ${tx.paymentMethod ? ` &bull; ${escapeHtml(tx.paymentMethod)}` : ''}
                            ${tx.notes ? ` &bull; "${escapeHtml(tx.notes)}"` : ''}
                          </span>
                        </div>
                      </div>
                      <div class="tx-item-right">
                        <span class="tx-val ${isInc ? 'text-income' : (isTrans ? 'text-transfer' : 'text-expense')}">
                          ${isInc ? '+' : (isTrans ? '' : '-')}${formatPHP(tx.amountCentavos)}
                        </span>
                        <span class="tx-chevron">${getIcon('chevronRight', 14)}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;

  container.innerHTML = html;
  attachTransactionsEvents();
}

function attachTransactionsEvents() {
  // Search input
  const searchInput = document.getElementById('tx-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.txSearchQuery = e.target.value;
      renderTransactions();
    });
  }

  // Clear search
  const clearBtn = document.getElementById('btn-clear-tx-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      State.txSearchQuery = '';
      renderTransactions();
    });
  }

  // Segmented Type Buttons
  document.querySelectorAll('.segmented-control .segment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      State.activeTxTypeFilter = e.currentTarget.getAttribute('data-type');
      renderTransactions();
    });
  });

  // Category Filter
  const catFilter = document.getElementById('tx-cat-filter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      State.txCategoryFilter = e.target.value;
      renderTransactions();
    });
  }

  // Tap transaction to edit/view
  document.querySelectorAll('.tx-item-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const txId = e.currentTarget.getAttribute('data-tx-id');
      window.openEditTransactionModal(txId);
    });
  });

  // Empty state button
  const btnEmptyAdd = document.getElementById('btn-empty-add-tx');
  if (btnEmptyAdd) {
    btnEmptyAdd.addEventListener('click', () => {
      window.openAddTransactionModal('expense');
    });
  }
}
