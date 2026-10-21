/**
 * FinanceiT - Calendar View
 * Monthly interactive calendar highlighting salary paydays, recurring bills,
 * and income/expense activity with interactive Day Inspector.
 */

import { State, formatPHP, formatDateLabel, formatMonthLabel, getTodayDateString, getNextPaydayInfo, getCategoryById } from '../state.js';
import { getIcon, escapeHtml } from '../ui.js';

let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let selectedDateStr = getTodayDateString();

export function renderCalendar() {
  const container = document.getElementById('view-calendar');
  if (!container) return;

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const todayStr = getTodayDateString();

  // Aggregate events for this month
  const currPeriodStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;

  // Transactions on this month
  const txByDay = {};
  State.transactions.forEach(tx => {
    if (tx.date.startsWith(currPeriodStr)) {
      if (!txByDay[tx.date]) txByDay[tx.date] = [];
      txByDay[tx.date].push(tx);
    }
  });

  // Bills due this month
  const billsByDay = {};
  State.recurringBills.filter(b => !b.isArchived).forEach(bill => {
    const dueDay = Math.min(bill.dueDay || 1, daysInMonth);
    const dateStr = `${currPeriodStr}-${String(dueDay).padStart(2, '0')}`;
    if (!billsByDay[dateStr]) billsByDay[dateStr] = [];
    billsByDay[dateStr].push(bill);
  });

  // Salary dates for this month
  const salaryDates = new Set();
  const settings = State.salarySettings;
  if (settings) {
    if (settings.scheduleType === 'twice_monthly') {
      const d1 = Math.min(settings.firstPayday || 15, daysInMonth);
      const d2 = Math.min(settings.secondPayday || 30, daysInMonth);
      salaryDates.add(`${currPeriodStr}-${String(d1).padStart(2, '0')}`);
      salaryDates.add(`${currPeriodStr}-${String(d2).padStart(2, '0')}`);
    } else if (settings.scheduleType === 'monthly') {
      const d = Math.min(settings.monthlyDay || 30, daysInMonth);
      salaryDates.add(`${currPeriodStr}-${String(d).padStart(2, '0')}`);
    }
  }

  // Selected date info
  const selectedTxList = txByDay[selectedDateStr] || (
    State.transactions.filter(tx => tx.date === selectedDateStr)
  );
  const selectedBills = billsByDay[selectedDateStr] || [];
  const isSelectedSalary = salaryDates.has(selectedDateStr);

  let html = `
    <div class="calendar-layout-wrapper">
      <!-- Calendar Controls Header -->
      <div class="ios-card calendar-header-card">
        <div class="calendar-nav-bar">
          <button class="btn-icon-subtle" id="cal-prev-month" aria-label="Previous Month">
            ${getIcon('chevronLeft', 20)}
          </button>
          <h2 class="calendar-current-month">${formatMonthLabel(currPeriodStr)}</h2>
          <button class="btn-icon-subtle" id="cal-next-month" aria-label="Next Month">
            ${getIcon('chevronRight', 20)}
          </button>
        </div>

        <!-- Days of week -->
        <div class="cal-weekdays-row">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        <!-- Month Grid -->
        <div class="cal-days-grid">
          ${renderCalendarCells({
            firstDayOfMonth,
            daysInMonth,
            currPeriodStr,
            todayStr,
            selectedDateStr,
            txByDay,
            billsByDay,
            salaryDates
          })}
        </div>

        <!-- Legend -->
        <div class="cal-legend">
          <span class="legend-item"><span class="dot dot-salary"></span> Salary</span>
          <span class="legend-item"><span class="dot dot-bill"></span> Bill Due</span>
          <span class="legend-item"><span class="dot dot-income"></span> Income</span>
          <span class="legend-item"><span class="dot dot-expense"></span> Expense</span>
        </div>
      </div>

      <!-- Day Inspector -->
      <div class="ios-card day-inspector-card">
        <div class="card-section-header">
          <div>
            <h3 class="card-title">${formatDateLabel(selectedDateStr)}</h3>
            <span class="card-subtitle">${selectedDateStr === todayStr ? 'Today' : 'Selected Date'}</span>
          </div>
          <button class="ios-btn-compact" id="btn-add-tx-for-day">
            ${getIcon('plus', 14)} Add
          </button>
        </div>

        ${isSelectedSalary ? `
          <div class="cal-event-banner banner-salary">
            <div class="banner-icon">${getIcon('briefcase', 16)}</div>
            <div class="banner-info">
              <strong>Scheduled Payday</strong>
              <span>Take-home: ${formatPHP(settings?.takeHomeCentavos || 0)}</span>
            </div>
          </div>
        ` : ''}

        ${selectedBills.length > 0 ? `
          <div class="cal-bills-section">
            <span class="section-micro-label">BILLS DUE TODAY</span>
            ${selectedBills.map(b => {
              const isPaid = b.lastPaidDate && b.lastPaidDate.startsWith(currPeriodStr);
              return `
                <div class="cal-bill-row">
                  <div>
                    <span class="cal-bill-name">${escapeHtml(b.name)}</span>
                    <span class="cal-bill-status">${isPaid ? 'Paid' : 'Pending payment'}</span>
                  </div>
                  <div class="cal-bill-val">
                    <span>${formatPHP(b.amountCentavos)}</span>
                    ${!isPaid ? `
                      <button class="btn-pay-bill btn-pay-bill-sm" data-bill-id="${b.id}">Pay</button>
                    ` : `<span class="paid-check">${getIcon('check', 14)}</span>`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <div class="cal-tx-section">
          <span class="section-micro-label">TRANSACTIONS (${selectedTxList.length})</span>
          ${selectedTxList.length === 0 ? `
            <div class="empty-list-notice">No transactions recorded on this date.</div>
          ` : `
            <div class="tx-compact-list">
              ${selectedTxList.map(tx => {
                const isInc = tx.type === 'income';
                const isTrans = tx.type === 'transfer';
                const cat = getCategoryById(tx.categoryId);
                return `
                  <div class="tx-row" data-tx-id="${tx.id}">
                    <div class="tx-row-left">
                      <div class="tx-cat-icon icon-${tx.type}">${getIcon(cat.icon || 'tag', 16)}</div>
                      <div class="tx-info">
                        <span class="tx-desc">${escapeHtml(tx.description || cat.name)}</span>
                        <span class="tx-sub">${escapeHtml(cat.name)}</span>
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
  attachCalendarEvents();
}

function renderCalendarCells({ firstDayOfMonth, daysInMonth, currPeriodStr, todayStr, selectedDateStr, txByDay, billsByDay, salaryDates }) {
  let cells = [];

  // Empty cells before first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push('<div class="cal-day-cell empty-cell"></div>');
  }

  // Days 1..daysInMonth
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const fullDate = `${currPeriodStr}-${dayStr}`;
    const isToday = fullDate === todayStr;
    const isSelected = fullDate === selectedDateStr;

    const txs = txByDay[fullDate] || [];
    const hasIncome = txs.some(t => t.type === 'income');
    const hasExpense = txs.some(t => t.type === 'expense');
    const hasBill = Boolean(billsByDay[fullDate] && billsByDay[fullDate].length > 0);
    const hasSalary = salaryDates.has(fullDate);

    cells.push(`
      <div class="cal-day-cell ${isToday ? 'cell-today' : ''} ${isSelected ? 'cell-selected' : ''}" data-date="${fullDate}">
        <span class="day-number">${day}</span>
        <div class="day-dots-container">
          ${hasSalary ? '<span class="cal-dot dot-salary" title="Salary Day"></span>' : ''}
          ${hasBill ? '<span class="cal-dot dot-bill" title="Bill Due"></span>' : ''}
          ${hasIncome ? '<span class="cal-dot dot-income" title="Income"></span>' : ''}
          ${hasExpense ? '<span class="cal-dot dot-expense" title="Expense"></span>' : ''}
        </div>
      </div>
    `);
  }

  return cells.join('');
}

function attachCalendarEvents() {
  // Navigation
  const prevBtn = document.getElementById('cal-prev-month');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      calendarMonth--;
      if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
      }
      renderCalendar();
    });
  }

  const nextBtn = document.getElementById('cal-next-month');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
      }
      renderCalendar();
    });
  }

  // Click day cell
  document.querySelectorAll('.cal-day-cell:not(.empty-cell)').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const date = e.currentTarget.getAttribute('data-date');
      if (date) {
        selectedDateStr = date;
        renderCalendar();
      }
    });
  });

  // Add transaction for selected day
  const btnAdd = document.getElementById('btn-add-tx-for-day');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      window.openAddTransactionModal('expense', selectedDateStr);
    });
  }

  // Tap transaction to edit
  document.querySelectorAll('#view-calendar .tx-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const txId = e.currentTarget.getAttribute('data-tx-id');
      window.openEditTransactionModal(txId);
    });
  });

  // Pay bill from calendar
  document.querySelectorAll('#view-calendar .btn-pay-bill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const billId = e.currentTarget.getAttribute('data-bill-id');
      window.openPayBillModal(billId);
    });
  });
}
