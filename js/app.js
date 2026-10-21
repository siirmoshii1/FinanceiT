/**
 * FinanceiT - Main Application Controller
 * Boots IndexedDB, initializes router, modals, event listeners, and Service Worker.
 */

import * as DB from './db.js';
import { State, reloadAllState, toCentavos, toPesos, formatPHP, getTodayDateString, getCurrentMonthPeriod, getCategoryById } from './state.js';
import { initTheme, toggleTheme, openModal, closeModal, showToast, getIcon, escapeHtml } from './ui.js';

import { renderDashboard } from './views/dashboard.js';
import { renderTransactions } from './views/transactions.js';
import { renderBudget } from './views/budget.js';
import { renderCalendar } from './views/calendar.js';
import { renderReports } from './views/reports.js';
import { renderSettings } from './views/settings.js';

// Global application boot
document.addEventListener('DOMContentLoaded', async () => {
  try {
    initTheme();
    setupServiceWorker();

    // Initialize database & state
    await DB.openDB();
    await reloadAllState();

    setupGlobalEventListeners();
    setupNavigation();

    // Render initial view
    navigateToView('dashboard');
  } catch (err) {
    console.error('App initialization error:', err);
    showToast('Failed to initialize database: ' + err.message, 'error');
  }
});

// ================= NAVIGATION ROUTER =================

export function navigateToView(viewName) {
  State.currentView = viewName;

  // Hide all view containers
  const views = ['dashboard', 'transactions', 'budget', 'calendar', 'reports', 'settings'];
  views.forEach(name => {
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.remove('view-active');
  });

  // Show active view
  const activeEl = document.getElementById(`view-${viewName}`);
  if (activeEl) {
    activeEl.classList.add('view-active');
  }

  // Update bottom navigation bar
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.getAttribute('data-view') === viewName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Render content of active view
  switch (viewName) {
    case 'dashboard': renderDashboard(); break;
    case 'transactions': renderTransactions(); break;
    case 'budget': renderBudget(); break;
    case 'calendar': renderCalendar(); break;
    case 'reports': renderReports(); break;
    case 'settings': renderSettings(); break;
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.navigateToView = navigateToView;

function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const view = e.currentTarget.getAttribute('data-view');
      if (view) navigateToView(view);
    });
  });

  // State subscription to refresh current view on data updates
  State.subscribe((event) => {
    navigateToView(State.currentView);
  });
}

// ================= GLOBAL EVENT LISTENERS =================

function setupGlobalEventListeners() {
  // Theme toggle in header
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  // Reports button in header
  const reportsBtn = document.getElementById('btn-header-reports');
  if (reportsBtn) {
    reportsBtn.addEventListener('click', () => {
      navigateToView('reports');
    });
  }

  // Floating or Header Quick Add Transaction button
  const quickAddBtn = document.getElementById('btn-quick-add');
  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', () => {
      openAddTransactionModal('expense');
    });
  }

  // Modal close buttons (data-close-modal)
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Close modal when tapping backdrop
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  setupModalFormHandlers();
}

// ================= MODAL CONTROLLERS & FORM HANDLERS =================

function setupModalFormHandlers() {
  // 1. Transaction Form Submit
  const txForm = document.getElementById('form-transaction');
  if (txForm) {
    txForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveTransaction();
    });

    // Delete transaction from edit modal
    const btnDeleteTx = document.getElementById('btn-delete-tx');
    if (btnDeleteTx) {
      btnDeleteTx.addEventListener('click', async () => {
        const id = document.getElementById('tx-id').value;
        if (id && confirm('Are you sure you want to delete this transaction?')) {
          await DB.deleteTransaction(id);
          await reloadAllState();
          closeModal('modal-transaction');
          showToast('Transaction deleted', 'info');
        }
      });
    }

    // Type pills in transaction form
    document.querySelectorAll('#modal-transaction .tx-type-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        setTransactionModalType(type);
      });
    });
  }

  // 2. Salary Confirmation Form Submit
  const confirmSalaryForm = document.getElementById('form-confirm-salary');
  if (confirmSalaryForm) {
    confirmSalaryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleConfirmSalaryReceipt();
    });
  }

  // 3. Salary Settings Form Submit
  const salaryConfigForm = document.getElementById('form-salary-config');
  if (salaryConfigForm) {
    salaryConfigForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveSalarySettings();
    });

    // Toggle schedule fields based on selected schedule
    const scheduleSelect = document.getElementById('salary-schedule-select');
    if (scheduleSelect) {
      scheduleSelect.addEventListener('change', () => {
        updateSalaryScheduleFieldsVisibility(scheduleSelect.value);
      });
    }
  }

  // 4. Budget Form Submit
  const budgetForm = document.getElementById('form-budget');
  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveBudget();
    });

    const btnDeleteBudget = document.getElementById('btn-delete-budget');
    if (btnDeleteBudget) {
      btnDeleteBudget.addEventListener('click', async () => {
        const id = document.getElementById('budget-id').value;
        if (id) {
          await DB.deleteBudget(id);
          await reloadAllState();
          closeModal('modal-budget');
          showToast('Category budget cleared', 'info');
        }
      });
    }
  }

  // 5. Recurring Bill Form Submit
  const billForm = document.getElementById('form-recurring-bill');
  if (billForm) {
    billForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveRecurringBill();
    });
  }

  // 6. Pay Bill Form Submit
  const payBillForm = document.getElementById('form-pay-bill');
  if (payBillForm) {
    payBillForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleConfirmPayBill();
    });
  }

  // 7. Custom Category Form Submit
  const catForm = document.getElementById('form-category');
  if (catForm) {
    catForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveCategory();
    });
  }

  // 8. Opening Balances Form Submit
  const balancesForm = document.getElementById('form-opening-balances');
  if (balancesForm) {
    balancesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveOpeningBalances();
    });
  }

  // 9. Reset Confirmation Button
  const btnConfirmReset = document.getElementById('btn-confirm-full-reset');
  if (btnConfirmReset) {
    btnConfirmReset.addEventListener('click', async () => {
      const input = document.getElementById('reset-confirm-text');
      if (input && input.value.trim().toUpperCase() === 'RESET') {
        await DB.resetAllData();
        await reloadAllState();
        closeModal('modal-reset-confirmation');
        showToast('All application data has been reset to defaults', 'info');
        navigateToView('dashboard');
      } else {
        alert('Please type RESET in capital letters to confirm.');
      }
    });
  }

  // 10. Import JSON execution buttons
  const btnImportReplace = document.getElementById('btn-import-replace');
  if (btnImportReplace) {
    btnImportReplace.addEventListener('click', async () => {
      if (window._pendingImportData) {
        try {
          await DB.importData(window._pendingImportData, 'replace');
          await reloadAllState();
          closeModal('modal-import-preview');
          showToast('Backup restored successfully (Replaced)', 'success');
        } catch (err) {
          showToast('Import failed: ' + err.message, 'error');
        }
      }
    });
  }

  const btnImportMerge = document.getElementById('btn-import-merge');
  if (btnImportMerge) {
    btnImportMerge.addEventListener('click', async () => {
      if (window._pendingImportData) {
        try {
          await DB.importData(window._pendingImportData, 'merge');
          await reloadAllState();
          closeModal('modal-import-preview');
          showToast('Backup merged with existing records', 'success');
        } catch (err) {
          showToast('Import failed: ' + err.message, 'error');
        }
      }
    });
  }
}

// ================= TRANSACTION MODAL LOGIC =================

export function openAddTransactionModal(defaultType = 'expense', defaultDate = null) {
  document.getElementById('tx-modal-title').textContent = 'Add Transaction';
  document.getElementById('tx-id').value = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-description').value = '';
  document.getElementById('tx-notes').value = '';
  document.getElementById('tx-date').value = defaultDate || getTodayDateString();
  document.getElementById('tx-payment-method').value = 'Cash';

  const btnDelete = document.getElementById('btn-delete-tx');
  if (btnDelete) btnDelete.style.display = 'none';

  setTransactionModalType(defaultType);
  populateCategorySelect(defaultType);

  openModal('modal-transaction');
}

export function openEditTransactionModal(txId) {
  const tx = State.transactions.find(t => t.id === txId);
  if (!tx) return;

  document.getElementById('tx-modal-title').textContent = 'Edit Transaction';
  document.getElementById('tx-id').value = tx.id;
  document.getElementById('tx-amount').value = toPesos(tx.amountCentavos);
  document.getElementById('tx-description').value = tx.description || '';
  document.getElementById('tx-notes').value = tx.notes || '';
  document.getElementById('tx-date').value = tx.date;
  document.getElementById('tx-payment-method').value = tx.paymentMethod || 'Cash';

  const btnDelete = document.getElementById('btn-delete-tx');
  if (btnDelete) btnDelete.style.display = 'block';

  setTransactionModalType(tx.type);
  populateCategorySelect(tx.type, tx.categoryId);

  openModal('modal-transaction');
}

window.openAddTransactionModal = openAddTransactionModal;
window.openEditTransactionModal = openEditTransactionModal;

function setTransactionModalType(type) {
  document.getElementById('tx-type').value = type;
  document.querySelectorAll('#modal-transaction .tx-type-pill').forEach(btn => {
    if (btn.getAttribute('data-type') === type) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  populateCategorySelect(type);
}

function populateCategorySelect(type, selectedCatId = null) {
  const select = document.getElementById('tx-category');
  if (!select) return;

  const cats = State.categories.filter(c => {
    if (c.isArchived) return false;
    if (type === 'transfer') return c.isTransfer;
    if (type === 'income') return c.type === 'income';
    return c.type === 'expense' && !c.isTransfer;
  });

  select.innerHTML = cats.map(c => `
    <option value="${c.id}" ${c.id === selectedCatId ? 'selected' : ''}>${escapeHtml(c.name)}</option>
  `).join('');
}

async function handleSaveTransaction() {
  const id = document.getElementById('tx-id').value;
  const type = document.getElementById('tx-type').value;
  const amountStr = document.getElementById('tx-amount').value;
  const categoryId = document.getElementById('tx-category').value;
  const date = document.getElementById('tx-date').value || getTodayDateString();
  const description = document.getElementById('tx-description').value.trim();
  const notes = document.getElementById('tx-notes').value.trim();
  const paymentMethod = document.getElementById('tx-payment-method').value;

  const amountCentavos = toCentavos(amountStr);
  if (amountCentavos <= 0) {
    alert('Please enter a valid monetary amount greater than zero.');
    return;
  }

  const txData = {
    id: id || undefined,
    type,
    amountCentavos,
    categoryId,
    date,
    description: description || (getCategoryById(categoryId).name),
    notes,
    paymentMethod
  };

  await DB.saveTransaction(txData);
  await reloadAllState();
  closeModal('modal-transaction');
  showToast(id ? 'Transaction updated' : 'Transaction recorded', 'success');
}

// ================= CONFIRM SALARY RECEIPT =================

export function openConfirmSalaryModal(paydayDateStr) {
  const settings = State.salarySettings;
  if (!settings) return;

  // Check if duplicate
  const already = State.salaryHistory.some(sh => sh.paydayDate === paydayDateStr);
  if (already) {
    showToast(`Salary for ${paydayDateStr} has already been recorded!`, 'info');
    return;
  }

  document.getElementById('confirm-salary-payday-date').value = paydayDateStr;
  document.getElementById('confirm-salary-amount').value = toPesos(settings.takeHomeCentavos);
  document.getElementById('confirm-salary-date-label').textContent = paydayDateStr;
  document.getElementById('confirm-salary-desc').value = `${settings.employer || 'Salary'} Payday (${paydayDateStr})`;

  openModal('modal-confirm-salary');
}

window.openConfirmSalaryModal = openConfirmSalaryModal;

async function handleConfirmSalaryReceipt() {
  const paydayDate = document.getElementById('confirm-salary-payday-date').value;
  const amountStr = document.getElementById('confirm-salary-amount').value;
  const description = document.getElementById('confirm-salary-desc').value.trim();
  const paymentMethod = document.getElementById('confirm-salary-account').value;

  const amountCentavos = toCentavos(amountStr);
  if (amountCentavos <= 0) {
    alert('Please enter a valid salary amount.');
    return;
  }

  // Prevent duplicate confirmation
  const isAlreadyReceived = await DB.isPaydayReceived(paydayDate);
  if (isAlreadyReceived) {
    alert('This payday has already been marked as received.');
    closeModal('modal-confirm-salary');
    return;
  }

  // Create confirmed income transaction
  const tx = await DB.saveTransaction({
    type: 'income',
    amountCentavos,
    categoryId: 'cat_salary',
    date: paydayDate,
    description: description || `Salary Payday (${paydayDate})`,
    notes: `Confirmed salary receipt for ${paydayDate}`,
    paymentMethod,
    source: 'salary'
  });

  // Record in salary history
  await DB.recordSalaryReceipt(paydayDate, amountCentavos, tx.id);
  await reloadAllState();
  closeModal('modal-confirm-salary');
  showToast(`Salary received and added to available balance: ${formatPHP(amountCentavos)}`, 'success');
}

// ================= SALARY SETTINGS MODAL =================

export function openSalaryConfigModal() {
  const salary = State.salarySettings || DB.DEFAULT_SALARY_SETTINGS;

  document.getElementById('salary-employer').value = salary.employer || '';
  document.getElementById('salary-gross').value = toPesos(salary.grossAmountCentavos);
  document.getElementById('salary-takehome').value = toPesos(salary.takeHomeCentavos);
  document.getElementById('salary-deductions').value = toPesos(salary.deductionsCentavos);
  document.getElementById('salary-schedule-select').value = salary.scheduleType || 'twice_monthly';
  document.getElementById('salary-first-day').value = salary.firstPayday || 15;
  document.getElementById('salary-second-day').value = salary.secondPayday || 30;
  document.getElementById('salary-monthly-day').value = salary.monthlyDay || 30;
  document.getElementById('salary-anchor-date').value = salary.anchorDate || getTodayDateString();

  updateSalaryScheduleFieldsVisibility(salary.scheduleType || 'twice_monthly');
  openModal('modal-salary-config');
}

window.openSalaryConfigModal = openSalaryConfigModal;

function updateSalaryScheduleFieldsVisibility(type) {
  const twiceRow = document.getElementById('schedule-twice-fields');
  const monthlyRow = document.getElementById('schedule-monthly-fields');
  const anchorRow = document.getElementById('schedule-anchor-fields');

  if (twiceRow) twiceRow.style.display = type === 'twice_monthly' ? 'flex' : 'none';
  if (monthlyRow) monthlyRow.style.display = type === 'monthly' ? 'flex' : 'none';
  if (anchorRow) anchorRow.style.display = (type === 'every_15_days' || type === 'weekly' || type === 'irregular') ? 'flex' : 'none';
}

async function handleSaveSalarySettings() {
  const employer = document.getElementById('salary-employer').value.trim();
  const gross = toCentavos(document.getElementById('salary-gross').value);
  const takeHome = toCentavos(document.getElementById('salary-takehome').value);
  const deductions = toCentavos(document.getElementById('salary-deductions').value);
  const scheduleType = document.getElementById('salary-schedule-select').value;
  const firstPayday = parseInt(document.getElementById('salary-first-day').value, 10) || 15;
  const secondPayday = parseInt(document.getElementById('salary-second-day').value, 10) || 30;
  const monthlyDay = parseInt(document.getElementById('salary-monthly-day').value, 10) || 30;
  const anchorDate = document.getElementById('salary-anchor-date').value || getTodayDateString();

  const settings = {
    id: 'default',
    employer: employer || 'Primary Job',
    grossAmountCentavos: gross,
    takeHomeCentavos: takeHome,
    deductionsCentavos: deductions || Math.max(0, gross - takeHome),
    scheduleType,
    firstPayday,
    secondPayday,
    monthlyDay,
    anchorDate,
    intervalDays: scheduleType === 'weekly' ? 7 : 15
  };

  await DB.saveSalarySettings(settings);
  await reloadAllState();
  closeModal('modal-salary-config');
  showToast('Salary configuration saved', 'success');
}

// ================= BUDGET MODAL =================

export function openAddBudgetModal(categoryId = null) {
  const currentPeriod = State.selectedPeriod && State.selectedPeriod !== 'all' ? State.selectedPeriod : getCurrentMonthPeriod();

  const select = document.getElementById('budget-category');
  const expenseCats = State.categories.filter(c => c.type === 'expense' && !c.isArchived);
  select.innerHTML = expenseCats.map(c => `
    <option value="${c.id}" ${c.id === categoryId ? 'selected' : ''}>${escapeHtml(c.name)}</option>
  `).join('');

  document.getElementById('budget-period').value = currentPeriod;

  // Check if existing budget
  const targetCatId = categoryId || (expenseCats[0] ? expenseCats[0].id : null);
  const existing = State.budgets.find(b => b.period === currentPeriod && b.categoryId === targetCatId);

  document.getElementById('budget-id').value = existing ? existing.id : '';
  document.getElementById('budget-amount').value = existing ? toPesos(existing.amountCentavos) : '';
  document.getElementById('btn-delete-budget').style.display = existing ? 'block' : 'none';

  // Listener for category change in budget modal
  select.onchange = () => {
    const selected = select.value;
    const found = State.budgets.find(b => b.period === currentPeriod && b.categoryId === selected);
    document.getElementById('budget-id').value = found ? found.id : '';
    document.getElementById('budget-amount').value = found ? toPesos(found.amountCentavos) : '';
    document.getElementById('btn-delete-budget').style.display = found ? 'block' : 'none';
  };

  openModal('modal-budget');
}

window.openAddBudgetModal = openAddBudgetModal;

async function handleSaveBudget() {
  const period = document.getElementById('budget-period').value;
  const categoryId = document.getElementById('budget-category').value;
  const amountCentavos = toCentavos(document.getElementById('budget-amount').value);

  const budget = {
    id: `b_${period}_${categoryId}`,
    period,
    categoryId,
    amountCentavos
  };

  await DB.saveBudget(budget);
  await reloadAllState();
  closeModal('modal-budget');
  showToast('Category budget saved', 'success');
}

// ================= RECURRING BILLS MODAL =================

export function openAddRecurringBillModal(billId = null) {
  const isEdit = Boolean(billId);
  const bill = isEdit ? State.recurringBills.find(b => b.id === billId) : null;

  document.getElementById('bill-id').value = bill ? bill.id : '';
  document.getElementById('bill-name').value = bill ? bill.name : '';
  document.getElementById('bill-amount').value = bill ? toPesos(bill.amountCentavos) : '';
  document.getElementById('bill-due-day').value = bill ? bill.dueDay : 15;
  document.getElementById('bill-frequency').value = bill ? bill.frequency : 'monthly';

  // Populate category options
  const catSelect = document.getElementById('bill-category');
  catSelect.innerHTML = State.categories.filter(c => c.type === 'expense').map(c => `
    <option value="${c.id}" ${bill && bill.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>
  `).join('');

  openModal('modal-recurring-bill');
}

window.openAddRecurringBillModal = openAddRecurringBillModal;

async function handleSaveRecurringBill() {
  const id = document.getElementById('bill-id').value;
  const name = document.getElementById('bill-name').value.trim();
  const amountCentavos = toCentavos(document.getElementById('bill-amount').value);
  const dueDay = parseInt(document.getElementById('bill-due-day').value, 10) || 1;
  const frequency = document.getElementById('bill-frequency').value;
  const categoryId = document.getElementById('bill-category').value;

  if (!name || amountCentavos <= 0) {
    alert('Please enter a bill name and a valid amount.');
    return;
  }

  const bill = {
    id: id || undefined,
    name,
    amountCentavos,
    dueDay,
    frequency,
    categoryId,
    isArchived: false
  };

  await DB.saveRecurringBill(bill);
  await reloadAllState();
  closeModal('modal-recurring-bill');
  showToast(id ? 'Recurring bill updated' : 'Recurring bill added', 'success');
}

// ================= PAY RECURRING BILL MODAL =================

export function openPayBillModal(billId) {
  const bill = State.recurringBills.find(b => b.id === billId);
  if (!bill) return;

  const today = getTodayDateString();
  document.getElementById('pay-bill-id').value = bill.id;
  document.getElementById('pay-bill-title-label').textContent = bill.name;
  document.getElementById('pay-bill-amount').value = toPesos(bill.amountCentavos);
  document.getElementById('pay-bill-date').value = today;

  openModal('modal-pay-bill');
}

window.openPayBillModal = openPayBillModal;

async function handleConfirmPayBill() {
  const billId = document.getElementById('pay-bill-id').value;
  const amountStr = document.getElementById('pay-bill-amount').value;
  const date = document.getElementById('pay-bill-date').value || getTodayDateString();
  const paymentMethod = document.getElementById('pay-bill-account').value;

  const bill = State.recurringBills.find(b => b.id === billId);
  if (!bill) return;

  const amountCentavos = toCentavos(amountStr);

  // 1. Create expense transaction
  await DB.saveTransaction({
    type: 'expense',
    amountCentavos,
    categoryId: bill.categoryId || 'cat_util',
    date,
    description: `Bill Payment: ${bill.name}`,
    notes: `Recurring bill payment for ${date.slice(0, 7)}`,
    paymentMethod,
    source: 'bill',
    relatedId: bill.id
  });

  // 2. Update bill lastPaidDate
  bill.lastPaidDate = date;
  await DB.saveRecurringBill(bill);

  await reloadAllState();
  closeModal('modal-pay-bill');
  showToast(`Bill marked as paid: ${bill.name}`, 'success');
}

// ================= CATEGORY MODAL =================

export function openAddCategoryModal() {
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-type').value = 'expense';
  document.getElementById('cat-icon').value = 'tag';
  openModal('modal-category');
}

window.openAddCategoryModal = openAddCategoryModal;

async function handleSaveCategory() {
  const name = document.getElementById('cat-name').value.trim();
  const type = document.getElementById('cat-type').value;
  const icon = document.getElementById('cat-icon').value;

  if (!name) {
    alert('Please enter a category name');
    return;
  }

  await DB.saveCategory({
    name,
    type,
    icon,
    isTransfer: false,
    isArchived: false,
    isCustom: true
  });

  await reloadAllState();
  closeModal('modal-category');
  showToast(`Category "${name}" created`, 'success');
}

// ================= OPENING BALANCES MODAL =================

export function openOpeningBalancesModal() {
  const cash = State.accounts.find(a => a.id === 'cash');
  const savings = State.accounts.find(a => a.id === 'savings');
  const emergency = State.accounts.find(a => a.id === 'emergency');

  document.getElementById('balance-cash').value = toPesos(cash ? cash.openingBalanceCentavos : 0);
  document.getElementById('balance-savings').value = toPesos(savings ? savings.openingBalanceCentavos : 0);
  document.getElementById('balance-emergency').value = toPesos(emergency ? emergency.openingBalanceCentavos : 0);

  openModal('modal-opening-balances');
}

window.openOpeningBalancesModal = openOpeningBalancesModal;

async function handleSaveOpeningBalances() {
  const cashAmt = toCentavos(document.getElementById('balance-cash').value);
  const savAmt = toCentavos(document.getElementById('balance-savings').value);
  const emgAmt = toCentavos(document.getElementById('balance-emergency').value);

  await DB.saveAccount({ id: 'cash', name: 'Available Cash & Bank', openingBalanceCentavos: cashAmt });
  await DB.saveAccount({ id: 'savings', name: 'Savings Account', openingBalanceCentavos: savAmt });
  await DB.saveAccount({ id: 'emergency', name: 'Emergency Fund', openingBalanceCentavos: emgAmt });

  await reloadAllState();
  closeModal('modal-opening-balances');
  showToast('Opening balances adjusted', 'success');
}

// ================= RESET MODAL =================

export function openResetConfirmationModal() {
  const input = document.getElementById('reset-confirm-text');
  if (input) input.value = '';
  openModal('modal-reset-confirmation');
}

window.openResetConfirmationModal = openResetConfirmationModal;

// ================= IMPORT PREVIEW MODAL =================

export function openImportPreviewModal(jsonData) {
  window._pendingImportData = jsonData;

  const data = jsonData.data || {};
  const txCount = Array.isArray(data.transactions) ? data.transactions.length : 0;
  const catCount = Array.isArray(data.categories) ? data.categories.length : 0;
  const budgetCount = Array.isArray(data.budgets) ? data.budgets.length : 0;
  const billCount = Array.isArray(data.recurringBills) ? data.recurringBills.length : 0;

  document.getElementById('import-stat-tx').textContent = `${txCount} Transactions`;
  document.getElementById('import-stat-cat').textContent = `${catCount} Categories`;
  document.getElementById('import-stat-budget').textContent = `${budgetCount} Budgets`;
  document.getElementById('import-stat-bills').textContent = `${billCount} Bills`;

  openModal('modal-import-preview');
}

window.openImportPreviewModal = openImportPreviewModal;

// ================= SERVICE WORKER REGISTRATION =================

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative service-worker path for GitHub Pages compatibility
      navigator.serviceWorker.register('./service-worker.js', { scope: './' })
        .then(reg => {
          console.log('[FinanceiT SW] Registered successfully with scope:', reg.scope);
        })
        .catch(err => {
          console.warn('[FinanceiT SW] Registration failed:', err);
        });
    });
  }
}
