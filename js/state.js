/**
 * FinanceiT - Financial State and Calculations Module
 * Uses integer centavos for zero-loss financial arithmetic.
 * Default Currency: Philippine Peso (PHP, ₱).
 */

import * as DB from './db.js';

export const State = {
  // Loaded records cache
  transactions: [],
  categories: [],
  budgets: [],
  salarySettings: null,
  salaryHistory: [],
  recurringBills: [],
  accounts: [],
  meta: {},

  // Current view & filters
  currentView: 'dashboard',
  selectedPeriod: getCurrentMonthPeriod(), // 'YYYY-MM'
  customDateRange: null, // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
  activeTxTypeFilter: 'all', // 'all', 'expense', 'income', 'transfer'
  txSearchQuery: '',
  txCategoryFilter: 'all',

  // Listeners for UI re-render
  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify(event, data) {
    this.listeners.forEach(fn => fn(event, data));
  }
};

// ================= DATE HELPERS =================

export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthPeriod() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getPreviousMonthPeriod() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatMonthLabel(periodStr) {
  if (!periodStr) return '';
  const [y, m] = periodStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, 1);
  return dateObj.toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric'
  });
}

// ================= SAFE FINANCIAL ARITHMETIC =================

/**
 * Converts pesos (decimal number or string e.g. "1,500.50") to safe integer centavos.
 */
export function toCentavos(amount) {
  if (amount === null || amount === undefined || amount === '') return 0;
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }
  const clean = String(amount).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Converts integer centavos to decimal pesos string (e.g. 150050 -> "1500.50").
 */
export function toPesos(centavos) {
  if (!centavos) return '0.00';
  return (centavos / 100).toFixed(2);
}

/**
 * Formats integer centavos to Philippine Peso currency string: ₱1,250.50
 */
export function formatPHP(centavos, options = {}) {
  const isNegative = centavos < 0;
  const absCentavos = Math.abs(centavos || 0);
  const pesos = absCentavos / 100;

  const formatted = pesos.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const sign = isNegative ? '-' : (options.showPlus ? '+' : '');
  const prefix = options.noSymbol ? '' : '₱';
  return `${sign}${prefix}${formatted}`;
}

// ================= INITIAL DATA LOADING =================

export async function reloadAllState() {
  const [
    transactions,
    categories,
    budgets,
    salarySettings,
    salaryHistory,
    recurringBills,
    accounts
  ] = await Promise.all([
    DB.getAllTransactions(),
    DB.getAllCategories(),
    DB.getAllBudgets(),
    DB.getSalarySettings(),
    DB.getSalaryHistory(),
    DB.getAllRecurringBills(),
    DB.getAllAccounts()
  ]);

  // Sort transactions by date descending, then id descending
  State.transactions = (transactions || []).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  State.categories = categories || [];
  State.budgets = budgets || [];
  State.salarySettings = salarySettings || DB.DEFAULT_SALARY_SETTINGS;
  State.salaryHistory = salaryHistory || [];
  State.recurringBills = recurringBills || [];
  State.accounts = accounts || [];

  State.notify('state_reloaded');
}

// ================= FINANCIAL TOTALS & BALANCES =================

/**
 * Calculates current actual available money and sub-account balances.
 * Rule: Pending salary is NEVER included in balance.
 * Rule: Transfers to own savings / emergency fund adjust sub-balances without double counting.
 */
export function calculateBalances() {
  let cashOpening = 0;
  let savingsOpening = 0;
  let emergencyOpening = 0;

  State.accounts.forEach(acc => {
    if (acc.id === 'cash') cashOpening += (acc.openingBalanceCentavos || 0);
    else if (acc.id === 'savings') savingsOpening += (acc.openingBalanceCentavos || 0);
    else if (acc.id === 'emergency') emergencyOpening += (acc.openingBalanceCentavos || 0);
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let savingsTransferIn = 0;
  let emergencyTransferIn = 0;

  State.transactions.forEach(tx => {
    const amt = tx.amountCentavos || 0;
    if (tx.type === 'income') {
      totalIncome += amt;
    } else if (tx.type === 'expense') {
      totalExpense += amt;
    } else if (tx.type === 'transfer') {
      // Check target category
      if (tx.categoryId === 'cat_emergency') {
        emergencyTransferIn += amt;
      } else {
        savingsTransferIn += amt;
      }
    }
  });

  // Available cash = Opening cash + Income - Expenses - Transfers into savings/emergency
  const availableCash = cashOpening + totalIncome - totalExpense - (savingsTransferIn + emergencyTransferIn);
  const totalSavings = savingsOpening + savingsTransferIn;
  const totalEmergency = emergencyOpening + emergencyTransferIn;
  const netWorth = availableCash + totalSavings + totalEmergency;

  return {
    availableCash,
    totalSavings,
    totalEmergency,
    netWorth,
    allTimeIncome: totalIncome,
    allTimeExpense: totalExpense
  };
}

/**
 * Returns transactions filtered by the currently active period / range.
 */
export function getFilteredTransactions() {
  let list = State.transactions;

  // Filter by period or custom date range
  if (State.customDateRange && State.customDateRange.start && State.customDateRange.end) {
    const { start, end } = State.customDateRange;
    list = list.filter(tx => tx.date >= start && tx.date <= end);
  } else if (State.selectedPeriod) {
    if (State.selectedPeriod === 'all') {
      // no date restriction
    } else if (State.selectedPeriod.startsWith('pay_period_')) {
      // Half-month pay period (e.g. pay_period_2026-10-1 or pay_period_2026-10-2)
      const parts = State.selectedPeriod.split('_');
      const ym = parts[2];
      const half = parts[3];
      if (half === '1') {
        list = list.filter(tx => tx.date.startsWith(ym) && parseInt(tx.date.slice(8, 10), 10) <= 15);
      } else {
        list = list.filter(tx => tx.date.startsWith(ym) && parseInt(tx.date.slice(8, 10), 10) > 15);
      }
    } else {
      // Monthly period 'YYYY-MM'
      list = list.filter(tx => tx.date.startsWith(State.selectedPeriod));
    }
  }

  // Filter by type
  if (State.activeTxTypeFilter !== 'all') {
    list = list.filter(tx => tx.type === State.activeTxTypeFilter);
  }

  // Filter by category
  if (State.txCategoryFilter !== 'all') {
    list = list.filter(tx => tx.categoryId === State.txCategoryFilter);
  }

  // Filter by search text
  if (State.txSearchQuery && State.txSearchQuery.trim() !== '') {
    const q = State.txSearchQuery.trim().toLowerCase();
    list = list.filter(tx => {
      const desc = (tx.description || '').toLowerCase();
      const notes = (tx.notes || '').toLowerCase();
      const cat = getCategoryById(tx.categoryId);
      const catName = (cat ? cat.name : '').toLowerCase();
      return desc.includes(q) || notes.includes(q) || catName.includes(q);
    });
  }

  return list;
}

/**
 * Calculates Period Summary: Total Income, Total Expense, Net Savings, Total Savings Transfers.
 */
export function calculatePeriodSummary(periodStr = State.selectedPeriod, customRange = State.customDateRange) {
  let list = State.transactions;

  if (customRange && customRange.start && customRange.end) {
    list = list.filter(tx => tx.date >= customRange.start && tx.date <= customRange.end);
  } else if (periodStr && periodStr !== 'all') {
    if (periodStr.startsWith('pay_period_')) {
      const parts = periodStr.split('_');
      const ym = parts[2];
      const half = parts[3];
      if (half === '1') {
        list = list.filter(tx => tx.date.startsWith(ym) && parseInt(tx.date.slice(8, 10), 10) <= 15);
      } else {
        list = list.filter(tx => tx.date.startsWith(ym) && parseInt(tx.date.slice(8, 10), 10) > 15);
      }
    } else {
      list = list.filter(tx => tx.date.startsWith(periodStr));
    }
  }

  let income = 0;
  let expenses = 0;
  let transfers = 0;

  list.forEach(tx => {
    const amt = tx.amountCentavos || 0;
    if (tx.type === 'income') income += amt;
    else if (tx.type === 'expense') expenses += amt;
    else if (tx.type === 'transfer') transfers += amt;
  });

  return {
    income,
    expenses,
    transfers,
    netSavings: income - expenses - transfers,
    savingsRate: income > 0 ? Math.round(((transfers + Math.max(0, income - expenses - transfers)) / income) * 100) : 0
  };
}

// ================= CATEGORIES HELPERS =================

export function getCategoryById(id) {
  return State.categories.find(c => c.id === id) || {
    id,
    name: 'Uncategorized',
    type: 'expense',
    icon: 'tag',
    isTransfer: false
  };
}

export function getActiveCategories(type = null) {
  return State.categories.filter(c => {
    if (c.isArchived) return false;
    if (type && c.type !== type) return false;
    return true;
  });
}

// ================= SALARY SCHEDULER =================

/**
 * Determines the next expected payday based on salary settings.
 * Supports:
 * - 'twice_monthly': 15th and 30th (or month-end)
 * - 'monthly': specific day of month (e.g. 25th)
 * - 'every_15_days': computed from anchor date
 * - 'weekly': computed from anchor date
 */
export function getNextPaydayInfo(settings = State.salarySettings, fromDateStr = getTodayDateString()) {
  if (!settings) return null;

  const [currY, currM, currD] = fromDateStr.split('-').map(Number);
  const fromDate = new Date(currY, currM - 1, currD);

  let nextPaydayDateStr = null;

  if (settings.scheduleType === 'twice_monthly') {
    const day1 = settings.firstPayday || 15;
    const day2 = settings.secondPayday || 30;

    // Check day1 of current month
    const d1Date = new Date(currY, currM - 1, day1);
    // Check day2 of current month (safely clamp to last day of month)
    const daysInCurrMonth = new Date(currY, currM, 0).getDate();
    const actualDay2 = Math.min(day2, daysInCurrMonth);
    const d2Date = new Date(currY, currM - 1, actualDay2);

    if (fromDate <= d1Date) {
      nextPaydayDateStr = formatDateToISO(d1Date);
    } else if (fromDate <= d2Date) {
      nextPaydayDateStr = formatDateToISO(d2Date);
    } else {
      // Day1 of next month
      const nextMonthD1 = new Date(currY, currM, day1);
      nextPaydayDateStr = formatDateToISO(nextMonthD1);
    }
  } else if (settings.scheduleType === 'monthly') {
    const targetDay = settings.monthlyDay || 30;
    const daysInCurrMonth = new Date(currY, currM, 0).getDate();
    const actualDay = Math.min(targetDay, daysInCurrMonth);
    const mDate = new Date(currY, currM - 1, actualDay);

    if (fromDate <= mDate) {
      nextPaydayDateStr = formatDateToISO(mDate);
    } else {
      const daysInNextMonth = new Date(currY, currM + 1, 0).getDate();
      const actualNextDay = Math.min(targetDay, daysInNextMonth);
      const nextMDate = new Date(currY, currM, actualNextDay);
      nextPaydayDateStr = formatDateToISO(nextMDate);
    }
  } else if (settings.scheduleType === 'every_15_days' || settings.scheduleType === 'weekly') {
    const interval = settings.scheduleType === 'weekly' ? 7 : (settings.intervalDays || 15);
    const anchor = settings.anchorDate ? new Date(settings.anchorDate) : new Date(currY, currM - 1, 1);
    
    // Step forward until >= fromDate
    const testDate = new Date(anchor.getTime());
    while (testDate < fromDate) {
      testDate.setDate(testDate.getDate() + interval);
    }
    nextPaydayDateStr = formatDateToISO(testDate);
  } else {
    // Custom / Irregular
    nextPaydayDateStr = settings.anchorDate || getTodayDateString();
  }

  // Check if this payday was already received
  const isAlreadyReceived = State.salaryHistory.some(
    sh => sh.paydayDate === nextPaydayDateStr
  );

  const todayStr = getTodayDateString();
  const isDueOrPast = nextPaydayDateStr <= todayStr;

  return {
    dateStr: nextPaydayDateStr,
    takeHomeCentavos: settings.takeHomeCentavos || 0,
    grossAmountCentavos: settings.grossAmountCentavos || 0,
    deductionsCentavos: settings.deductionsCentavos || 0,
    employer: settings.employer || 'Salary',
    isAlreadyReceived,
    isDueOrPast
  };
}

function formatDateToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ================= BUDGET CALCULATIONS =================

/**
 * Calculates budget vs actual spending for the current active period.
 */
export function calculateBudgetStatus(periodStr = State.selectedPeriod) {
  const activePeriod = periodStr && periodStr !== 'all' ? periodStr : getCurrentMonthPeriod();

  // Get budgets defined for this period
  const periodBudgets = State.budgets.filter(b => b.period === activePeriod);
  const budgetMap = new Map();
  periodBudgets.forEach(b => {
    budgetMap.set(b.categoryId, b.amountCentavos || 0);
  });

  // Calculate actual spending per category in this period
  const actualMap = new Map();
  State.transactions.forEach(tx => {
    if (tx.type === 'expense' && tx.date.startsWith(activePeriod)) {
      const prev = actualMap.get(tx.categoryId) || 0;
      actualMap.set(tx.categoryId, prev + (tx.amountCentavos || 0));
    }
  });

  // Categories to display: all expense categories that have either a budget or actual spend
  const expenseCategories = State.categories.filter(c => c.type === 'expense' && !c.isArchived);

  let totalPlannedCentavos = 0;
  let totalActualCentavos = 0;

  const items = expenseCategories.map(cat => {
    const planned = budgetMap.get(cat.id) || 0;
    const actual = actualMap.get(cat.id) || 0;
    const remaining = planned - actual;
    const percentUsed = planned > 0 ? (actual / planned) * 100 : (actual > 0 ? 100 : 0);

    totalPlannedCentavos += planned;
    totalActualCentavos += actual;

    let status = 'good'; // under 85%
    if (actual > planned && planned > 0) {
      status = 'exceeded';
    } else if (planned > 0 && percentUsed >= 85) {
      status = 'warning';
    } else if (planned === 0 && actual > 0) {
      status = 'no_budget';
    }

    return {
      category: cat,
      plannedCentavos: planned,
      actualCentavos: actual,
      remainingCentavos: remaining,
      percentUsed: Math.min(Math.round(percentUsed), 999),
      status
    };
  });

  // Sort by highest planned, then highest actual
  items.sort((a, b) => {
    if (b.plannedCentavos !== a.plannedCentavos) {
      return b.plannedCentavos - a.plannedCentavos;
    }
    return b.actualCentavos - a.actualCentavos;
  });

  const totalRemainingCentavos = totalPlannedCentavos - totalActualCentavos;
  const overallPercent = totalPlannedCentavos > 0
    ? Math.round((totalActualCentavos / totalPlannedCentavos) * 100)
    : 0;

  return {
    period: activePeriod,
    items,
    totalPlannedCentavos,
    totalActualCentavos,
    totalRemainingCentavos,
    overallPercent
  };
}

/**
 * Calculates Salary Allocation Plan for Take-Home Pay.
 */
export function calculateSalaryAllocation(takeHomeCentavos = State.salarySettings?.takeHomeCentavos || 0) {
  const activePeriod = State.selectedPeriod && State.selectedPeriod !== 'all'
    ? State.selectedPeriod
    : getCurrentMonthPeriod();

  // Sum planned expenses for active period
  let plannedExpenses = 0;
  let plannedSavings = 0;

  State.budgets
    .filter(b => b.period === activePeriod)
    .forEach(b => {
      const cat = getCategoryById(b.categoryId);
      if (cat.isTransfer) {
        plannedSavings += (b.amountCentavos || 0);
      } else {
        plannedExpenses += (b.amountCentavos || 0);
      }
    });

  const totalAllocated = plannedExpenses + plannedSavings;
  const unallocated = takeHomeCentavos - totalAllocated;

  return {
    takeHomeCentavos,
    plannedExpenses,
    plannedSavings,
    totalAllocated,
    unallocatedCentavos: unallocated,
    isOverallocated: unallocated < 0
  };
}

// ================= RECURRING BILLS HELPERS =================

export function getUpcomingBills(limitDays = 14) {
  const todayStr = getTodayDateString();
  const [currY, currM, currD] = todayStr.split('-').map(Number);

  return State.recurringBills
    .filter(bill => !bill.isArchived)
    .map(bill => {
      // Compute next due date for current month
      const daysInMonth = new Date(currY, currM, 0).getDate();
      const actualDueDay = Math.min(bill.dueDay || 1, daysInMonth);
      let dueDate = new Date(currY, currM - 1, actualDueDay);

      // If already past this month and marked paid recently
      let dueDateStr = formatDateToISO(dueDate);

      // Check if bill was already paid for this cycle
      const isPaid = bill.lastPaidDate && bill.lastPaidDate.startsWith(`${currY}-${String(currM).padStart(2, '0')}`);

      const diffTime = dueDate.getTime() - new Date(currY, currM - 1, currD).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isOverdue = !isPaid && diffDays < 0;
      const isDueSoon = !isPaid && diffDays >= 0 && diffDays <= limitDays;

      return {
        ...bill,
        dueDateStr,
        diffDays,
        isPaid,
        isOverdue,
        isDueSoon
      };
    })
    .sort((a, b) => a.diffDays - b.diffDays);
}
