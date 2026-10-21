/**
 * FinanceiT - Settings View
 * Salary configuration, recurring bills, categories, accounts, backup/restore, PWA install instructions.
 */

import { State, formatPHP, toCentavos, toPesos, reloadAllState } from '../state.js';
import * as DB from '../db.js';
import { getIcon, openModal, closeModal, showToast, escapeHtml } from '../ui.js';

export function renderSettings() {
  const container = document.getElementById('view-settings');
  if (!container) return;

  const salary = State.salarySettings || DB.DEFAULT_SALARY_SETTINGS;
  const recurringBills = State.recurringBills.filter(b => !b.isArchived);
  const categories = State.categories;
  const accounts = State.accounts;

  let html = `
    <!-- Top Header -->
    <div class="ios-card settings-header-card">
      <div class="card-section-header">
        <div>
          <h2 class="card-title">Preferences & Settings</h2>
          <span class="card-subtitle">FinanceiT v1.0.0 &bull; Offline & Private</span>
        </div>
      </div>
      <p class="settings-intro-text">
        All financial records are stored strictly on this device inside IndexedDB. No servers, no tracking, and no external APIs.
      </p>
    </div>

    <!-- Salary Configuration Card -->
    <div class="ios-card" id="salary-config-card">
      <div class="card-section-header">
        <div>
          <h3 class="card-title">Salary & Income Configuration</h3>
          <span class="card-subtitle">Automate your expected paydays & allocation</span>
        </div>
        <button class="ios-btn-compact" id="btn-edit-salary-config">
          ${getIcon('edit', 14)} Edit
        </button>
      </div>

      <div class="settings-display-grid">
        <div class="settings-display-item">
          <span class="set-label">Primary Source</span>
          <span class="set-val">${escapeHtml(salary.employer || 'Not set')}</span>
        </div>
        <div class="settings-display-item">
          <span class="set-label">Schedule Type</span>
          <span class="set-val font-capitalize">${formatScheduleType(salary.scheduleType)}</span>
        </div>
        <div class="settings-display-item">
          <span class="set-label">Expected Take-Home</span>
          <span class="set-val font-bold text-income">${formatPHP(salary.takeHomeCentavos)}</span>
        </div>
        <div class="settings-display-item">
          <span class="set-label">Gross / Deductions</span>
          <span class="set-val">${formatPHP(salary.grossAmountCentavos)} / -${formatPHP(salary.deductionsCentavos)}</span>
        </div>
      </div>
    </div>

    <!-- Recurring Bills Manager -->
    <div class="ios-card">
      <div class="card-section-header">
        <div>
          <h3 class="card-title">Recurring Bills & Subscriptions</h3>
          <span class="card-subtitle">${recurringBills.length} Active Schedules</span>
        </div>
        <button class="ios-btn-compact" id="btn-add-recurring-bill">
          ${getIcon('plus', 14)} Add Bill
        </button>
      </div>

      ${recurringBills.length === 0 ? `
        <div class="empty-list-notice">No recurring bills added. Add Wi-Fi, utilities, subscriptions, or load.</div>
      ` : `
        <div class="settings-items-list">
          ${recurringBills.map(b => `
            <div class="settings-row-item">
              <div class="set-item-left">
                <span class="set-item-title">${escapeHtml(b.name)}</span>
                <span class="set-item-sub">Due every ${b.dueDay}${getOrdinal(b.dueDay)} &bull; ${formatPHP(b.amountCentavos)}</span>
              </div>
              <div class="set-item-actions">
                <button class="btn-icon-subtle btn-edit-bill" data-bill-id="${b.id}" title="Edit Bill">
                  ${getIcon('edit', 14)}
                </button>
                <button class="btn-icon-subtle btn-delete-bill" data-bill-id="${b.id}" title="Delete Bill">
                  ${getIcon('trash', 14)}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Categories Manager -->
    <div class="ios-card">
      <div class="card-section-header">
        <div>
          <h3 class="card-title">Expense & Income Categories</h3>
          <span class="card-subtitle">${categories.filter(c => !c.isArchived).length} Active Categories</span>
        </div>
        <button class="ios-btn-compact" id="btn-add-custom-cat">
          ${getIcon('plus', 14)} New Category
        </button>
      </div>

      <div class="categories-scroll-list">
        ${categories.map(c => `
          <div class="category-pill-item ${c.isArchived ? 'archived' : ''}">
            <span class="cat-pill-icon">${getIcon(c.icon || 'tag', 14)}</span>
            <span class="cat-pill-name">${escapeHtml(c.name)}</span>
            ${c.isTransfer ? `<span class="badge-mini">Transfer</span>` : ''}
            <button class="btn-archive-cat" data-cat-id="${c.id}" title="${c.isArchived ? 'Restore' : 'Archive'}">
              ${c.isArchived ? getIcon('repeat', 12) : getIcon('close', 12)}
            </button>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Accounts / Opening Balances -->
    <div class="ios-card">
      <div class="card-section-header">
        <div>
          <h3 class="card-title">Account Opening Balances</h3>
          <span class="card-subtitle">Starting capital balance</span>
        </div>
        <button class="ios-btn-compact" id="btn-edit-opening-balances">
          ${getIcon('edit', 14)} Adjust
        </button>
      </div>

      <div class="settings-display-grid">
        ${accounts.map(acc => `
          <div class="settings-display-item">
            <span class="set-label">${escapeHtml(acc.name)}</span>
            <span class="set-val">${formatPHP(acc.openingBalanceCentavos)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Data Safety, Backup & Restore -->
    <div class="ios-card data-safety-card">
      <div class="card-section-header">
        <div>
          <h3 class="card-title">Data Backup & Restore</h3>
          <span class="card-subtitle">Keep your financial records safe</span>
        </div>
      </div>

      <div class="data-safety-warning">
        ${getIcon('alertCircle', 16)}
        <p>
          Your data lives exclusively in this browser's IndexedDB. Clearing website storage or resetting your browser will erase your data. <strong>Export regular JSON backups to preserve your history.</strong>
        </p>
      </div>

      <div class="backup-actions-grid">
        <button class="ios-btn ios-btn-secondary" id="btn-export-json">
          ${getIcon('download', 16)} Export JSON Backup
        </button>
        <button class="ios-btn ios-btn-secondary" id="btn-export-csv">
          ${getIcon('download', 16)} Export CSV (Excel)
        </button>
        <button class="ios-btn ios-btn-secondary" id="btn-trigger-import-json">
          ${getIcon('upload', 16)} Import JSON Backup
        </button>
        <input type="file" id="json-file-input" accept=".json" style="display:none;" />
      </div>

      <div class="destructive-zone">
        <button class="ios-btn ios-btn-danger" id="btn-reset-database">
          ${getIcon('trash', 16)} Reset All Application Data
        </button>
      </div>
    </div>

    <!-- PWA Installation Guide -->
    <div class="ios-card install-guide-card">
      <div class="card-section-header">
        <div>
          <h3 class="card-title">Install FinanceiT as PWA</h3>
          <span class="card-subtitle">Use like a native app with offline support</span>
        </div>
      </div>

      <div class="install-platform-box">
        <h4>${getIcon('phone', 16)} iPhone (Safari)</h4>
        <ol class="install-steps">
          <li>Open this site in <strong>Apple Safari</strong> on your iPhone.</li>
          <li>Tap the <strong>Share</strong> button (the square with an arrow pointing upward) at the bottom toolbar.</li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
          <li>Tap <strong>Add</strong> at the top right. FinanceiT will appear on your home screen.</li>
        </ol>
      </div>

      <div class="install-platform-box">
        <h4>${getIcon('phone', 16)} Android (Chrome)</h4>
        <ol class="install-steps">
          <li>Open this site in <strong>Google Chrome</strong>.</li>
          <li>Tap the three vertical dots menu in the top-right corner.</li>
          <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
          <li>Confirm by tapping <strong>Install</strong>.</li>
        </ol>
      </div>
    </div>
  `;

  container.innerHTML = html;
  attachSettingsEvents();
}

function formatScheduleType(type) {
  switch (type) {
    case 'twice_monthly': return 'Twice Monthly (15th & 30th)';
    case 'monthly': return 'Monthly';
    case 'every_15_days': return 'Every 15 Days';
    case 'weekly': return 'Weekly';
    case 'irregular': return 'Irregular / Custom';
    default: return type || 'Not configured';
  }
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function attachSettingsEvents() {
  // Edit Salary Config
  const btnEditSalary = document.getElementById('btn-edit-salary-config');
  if (btnEditSalary) {
    btnEditSalary.addEventListener('click', () => {
      window.openSalaryConfigModal();
    });
  }

  // Add Recurring Bill
  const btnAddBill = document.getElementById('btn-add-recurring-bill');
  if (btnAddBill) {
    btnAddBill.addEventListener('click', () => {
      window.openAddRecurringBillModal();
    });
  }

  // Edit / Delete Recurring Bill
  document.querySelectorAll('.btn-edit-bill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-bill-id');
      window.openAddRecurringBillModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-bill').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-bill-id');
      if (confirm('Delete this recurring bill schedule?')) {
        await DB.deleteRecurringBill(id);
        await reloadAllState();
        renderSettings();
        showToast('Recurring bill deleted', 'info');
      }
    });
  });

  // Categories
  const btnAddCat = document.getElementById('btn-add-custom-cat');
  if (btnAddCat) {
    btnAddCat.addEventListener('click', () => {
      window.openAddCategoryModal();
    });
  }

  document.querySelectorAll('.btn-archive-cat').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-cat-id');
      const cat = State.categories.find(c => c.id === id);
      if (cat) {
        cat.isArchived = !cat.isArchived;
        await DB.saveCategory(cat);
        await reloadAllState();
        renderSettings();
        showToast(cat.isArchived ? `Archived "${cat.name}"` : `Restored "${cat.name}"`, 'info');
      }
    });
  });

  // Edit opening balances
  const btnBalances = document.getElementById('btn-edit-opening-balances');
  if (btnBalances) {
    btnBalances.addEventListener('click', () => {
      window.openOpeningBalancesModal();
    });
  }

  // Export JSON
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', async () => {
      try {
        const backupData = await DB.exportAllData();
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `financeit-backup-${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Backup exported successfully', 'success');
      } catch (err) {
        showToast('Export failed: ' + err.message, 'error');
      }
    });
  }

  // Export CSV
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      try {
        const headers = ['ID', 'Date', 'Type', 'Amount_PHP', 'Category', 'Description', 'PaymentMethod', 'Notes'];
        const rows = State.transactions.map(tx => {
          const cat = State.categories.find(c => c.id === tx.categoryId);
          return [
            `"${tx.id}"`,
            `"${tx.date}"`,
            `"${tx.type}"`,
            `"${toPesos(tx.amountCentavos)}"`,
            `"${cat ? cat.name.replace(/"/g, '""') : ''}"`,
            `"${(tx.description || '').replace(/"/g, '""')}"`,
            `"${(tx.paymentMethod || '').replace(/"/g, '""')}"`,
            `"${(tx.notes || '').replace(/"/g, '""')}"`
          ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `financeit-transactions-${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Transactions exported as CSV', 'success');
      } catch (err) {
        showToast('CSV export failed: ' + err.message, 'error');
      }
    });
  }

  // Import JSON
  const btnTriggerImport = document.getElementById('btn-trigger-import-json');
  const fileInput = document.getElementById('json-file-input');
  if (btnTriggerImport && fileInput) {
    btnTriggerImport.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          window.openImportPreviewModal(parsed);
        } catch (err) {
          showToast('Invalid JSON file format', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset database
  const btnReset = document.getElementById('btn-reset-database');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      window.openResetConfirmationModal();
    });
  }
}
