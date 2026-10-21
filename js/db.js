/**
 * FinanceiT - IndexedDB Database Module
 * Pure Vanilla JavaScript IndexedDB layer with Promise wrappers.
 * Stores transactions, categories, budgets, salary settings, recurring bills, accounts, and metadata.
 */

const DB_NAME = 'FinanceiT_DB';
const DB_VERSION = 1;

let dbInstance = null;

export const DEFAULT_CATEGORIES = [
  // Expenses
  { id: 'cat_food', name: 'Food and Groceries', type: 'expense', icon: 'cart', isTransfer: false },
  { id: 'cat_gas', name: 'Motorcycle Gas', type: 'expense', icon: 'fuel', isTransfer: false },
  { id: 'cat_oil', name: 'Motorcycle Oil and Maintenance', type: 'expense', icon: 'wrench', isTransfer: false },
  { id: 'cat_trans', name: 'Transportation', type: 'expense', icon: 'bus', isTransfer: false },
  { id: 'cat_clothes', name: 'Clothes', type: 'expense', icon: 'shirt', isTransfer: false },
  { id: 'cat_comp_acc', name: 'Computer Accessories', type: 'expense', icon: 'mouse', isTransfer: false },
  { id: 'cat_comp_eq', name: 'Computer Equipment', type: 'expense', icon: 'laptop', isTransfer: false },
  { id: 'cat_software', name: 'Software and Subscriptions', type: 'expense', icon: 'cloud', isTransfer: false },
  { id: 'cat_wifi', name: 'Wi-Fi / Internet', type: 'expense', icon: 'wifi', isTransfer: false },
  { id: 'cat_load', name: 'Mobile Load', type: 'expense', icon: 'phone', isTransfer: false },
  { id: 'cat_util', name: 'Electricity and Water', type: 'expense', icon: 'zap', isTransfer: false },
  { id: 'cat_house', name: 'Household Supplies', type: 'expense', icon: 'home', isTransfer: false },
  { id: 'cat_care', name: 'Personal Care', type: 'expense', icon: 'smile', isTransfer: false },
  { id: 'cat_church', name: 'Church Offering', type: 'expense', icon: 'heart', isTransfer: false },
  { id: 'cat_giving', name: 'Giving to Other People', type: 'expense', icon: 'gift', isTransfer: false },
  { id: 'cat_fam_allow', name: 'Family Allowance', type: 'expense', icon: 'users', isTransfer: false },
  { id: 'cat_pers_allow', name: 'Personal Allowance', type: 'expense', icon: 'user', isTransfer: false },
  { id: 'cat_debt', name: 'Debt Payments', type: 'expense', icon: 'credit-card', isTransfer: false },
  { id: 'cat_edu', name: 'Education', type: 'expense', icon: 'book', isTransfer: false },
  { id: 'cat_med', name: 'Medical Expenses', type: 'expense', icon: 'activity', isTransfer: false },
  { id: 'cat_ent', name: 'Entertainment', type: 'expense', icon: 'film', isTransfer: false },
  { id: 'cat_misc', name: 'Random / Miscellaneous', type: 'expense', icon: 'tag', isTransfer: false },
  { id: 'cat_other_exp', name: 'Other Expenses', type: 'expense', icon: 'more-horizontal', isTransfer: false },
  
  // Transfers (Own Savings & Emergency Funds - NOT consumption expenses!)
  { id: 'cat_savings', name: 'Savings', type: 'transfer', icon: 'shield', isTransfer: true },
  { id: 'cat_emergency', name: 'Emergency Fund', type: 'transfer', icon: 'umbrella', isTransfer: true },

  // Income sources
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'briefcase', isTransfer: false },
  { id: 'cat_freelance', name: 'Freelance & Side Income', type: 'income', icon: 'dollar-sign', isTransfer: false },
  { id: 'cat_other_inc', name: 'Other Income', type: 'income', icon: 'plus-circle', isTransfer: false }
];

export const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: 'Available Cash & Bank', openingBalanceCentavos: 0 },
  { id: 'savings', name: 'Savings Account', openingBalanceCentavos: 0 },
  { id: 'emergency', name: 'Emergency Fund', openingBalanceCentavos: 0 }
];

export const DEFAULT_SALARY_SETTINGS = {
  id: 'default',
  employer: 'Primary Employer',
  grossAmountCentavos: 0,
  takeHomeCentavos: 0,
  deductionsCentavos: 0,
  deductions: [],
  scheduleType: 'twice_monthly', // twice_monthly (15 & 30), monthly, every_15_days, weekly, custom
  firstPayday: 15,
  secondPayday: 30,
  monthlyDay: 30,
  anchorDate: new Date().toISOString().slice(0, 10),
  intervalDays: 15,
  notes: ''
};

/**
 * Open or upgrade the database.
 */
export function openDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };

    request.onblocked = () => {
      console.warn('Database upgrade blocked. Close other tabs of FinanceiT.');
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Transactions Store
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('date', 'date', { unique: false });
        txStore.createIndex('type', 'type', { unique: false });
        txStore.createIndex('categoryId', 'categoryId', { unique: false });
        txStore.createIndex('relatedId', 'relatedId', { unique: false });
      }

      // 2. Categories Store
      if (!db.objectStoreNames.contains('categories')) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('type', 'type', { unique: false });
        catStore.createIndex('name', 'name', { unique: false });

        // Seed default categories
        DEFAULT_CATEGORIES.forEach((cat) => {
          catStore.put(cat);
        });
      }

      // 3. Budgets Store
      if (!db.objectStoreNames.contains('budgets')) {
        const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
        budgetStore.createIndex('period', 'period', { unique: false });
        budgetStore.createIndex('categoryId', 'categoryId', { unique: false });
      }

      // 4. Salary Settings Store
      if (!db.objectStoreNames.contains('salarySettings')) {
        const salaryStore = db.createObjectStore('salarySettings', { keyPath: 'id' });
        salaryStore.put(DEFAULT_SALARY_SETTINGS);
      }

      // 5. Salary History (prevents duplicate payday marks)
      if (!db.objectStoreNames.contains('salaryHistory')) {
        const salHistStore = db.createObjectStore('salaryHistory', { keyPath: 'id' });
        salHistStore.createIndex('paydayDate', 'paydayDate', { unique: false });
        salHistStore.createIndex('salaryId', 'salaryId', { unique: false });
      }

      // 6. Recurring Bills Store
      if (!db.objectStoreNames.contains('recurringBills')) {
        const billStore = db.createObjectStore('recurringBills', { keyPath: 'id' });
        billStore.createIndex('dueDay', 'dueDay', { unique: false });
      }

      // 7. Accounts Store
      if (!db.objectStoreNames.contains('accounts')) {
        const accStore = db.createObjectStore('accounts', { keyPath: 'id' });
        DEFAULT_ACCOUNTS.forEach((acc) => {
          accStore.put(acc);
        });
      }

      // 8. App Metadata Store
      if (!db.objectStoreNames.contains('meta')) {
        const metaStore = db.createObjectStore('meta', { keyPath: 'key' });
        metaStore.put({ key: 'appVersion', value: '1.0.0' });
        metaStore.put({ key: 'installedAt', value: new Date().toISOString() });
      }
    };
  });
}

/**
 * Generic helper for executing a transaction on an object store.
 */
function performTx(storeName, mode, callback) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(e.target.error);

      let result;
      try {
        result = callback(store, tx);
      } catch (err) {
        reject(err);
        return;
      }

      tx.oncomplete = () => resolve(result);
    });
  });
}

// ================= TRANSACTION CRUD =================

export function getAllTransactions() {
  return performTx('transactions', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function getTransactionById(id) {
  return performTx('transactions', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function saveTransaction(tx) {
  if (!tx.id) {
    tx.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }
  const now = new Date().toISOString();
  if (!tx.createdAt) tx.createdAt = now;
  tx.updatedAt = now;

  return performTx('transactions', 'readwrite', (store) => {
    store.put(tx);
    return tx;
  });
}

export function deleteTransaction(id) {
  return performTx('transactions', 'readwrite', (store) => {
    store.delete(id);
    return true;
  });
}

// ================= CATEGORIES CRUD =================

export function getAllCategories() {
  return performTx('categories', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        let list = req.result || [];
        if (list.length === 0) {
          list = [...DEFAULT_CATEGORIES];
        }
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function saveCategory(category) {
  if (!category.id) {
    category.id = 'cat_custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }
  return performTx('categories', 'readwrite', (store) => {
    store.put(category);
    return category;
  });
}

export function deleteCategory(id) {
  return performTx('categories', 'readwrite', (store) => {
    store.delete(id);
    return true;
  });
}

// ================= BUDGETS CRUD =================

export function getBudgetsByPeriod(period) {
  return performTx('budgets', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const index = store.index('period');
      const req = index.getAll(period);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function getAllBudgets() {
  return performTx('budgets', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function saveBudget(budget) {
  // Key format: b_${period}_${categoryId}
  if (!budget.id) {
    budget.id = `b_${budget.period}_${budget.categoryId}`;
  }
  budget.updatedAt = new Date().toISOString();
  return performTx('budgets', 'readwrite', (store) => {
    store.put(budget);
    return budget;
  });
}

export function deleteBudget(id) {
  return performTx('budgets', 'readwrite', (store) => {
    store.delete(id);
    return true;
  });
}

// ================= SALARY SETTINGS & HISTORY =================

export function getSalarySettings() {
  return performTx('salarySettings', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get('default');
      req.onsuccess = () => resolve(req.result || DEFAULT_SALARY_SETTINGS);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function saveSalarySettings(settings) {
  settings.id = 'default';
  settings.updatedAt = new Date().toISOString();
  return performTx('salarySettings', 'readwrite', (store) => {
    store.put(settings);
    return settings;
  });
}

export function getSalaryHistory() {
  return performTx('salaryHistory', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function recordSalaryReceipt(paydayDate, amountCentavos, transactionId) {
  const record = {
    id: `sal_default_${paydayDate}`,
    salaryId: 'default',
    paydayDate: paydayDate,
    amountCentavos: amountCentavos,
    transactionId: transactionId,
    receivedAt: new Date().toISOString()
  };
  return performTx('salaryHistory', 'readwrite', (store) => {
    store.put(record);
    return record;
  });
}

export function isPaydayReceived(paydayDate) {
  return performTx('salaryHistory', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(`sal_default_${paydayDate}`);
      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

// ================= RECURRING BILLS CRUD =================

export function getAllRecurringBills() {
  return performTx('recurringBills', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function saveRecurringBill(bill) {
  if (!bill.id) {
    bill.id = 'bill_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }
  bill.updatedAt = new Date().toISOString();
  return performTx('recurringBills', 'readwrite', (store) => {
    store.put(bill);
    return bill;
  });
}

export function deleteRecurringBill(id) {
  return performTx('recurringBills', 'readwrite', (store) => {
    store.delete(id);
    return true;
  });
}

// ================= ACCOUNTS / OPENING BALANCES =================

export function getAllAccounts() {
  return performTx('accounts', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        let accs = req.result || [];
        if (accs.length === 0) accs = [...DEFAULT_ACCOUNTS];
        resolve(accs);
      };
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function saveAccount(account) {
  return performTx('accounts', 'readwrite', (store) => {
    store.put(account);
    return account;
  });
}

// ================= METADATA =================

export function getMeta(key) {
  return performTx('meta', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  }).then(p => p);
}

export function setMeta(key, value) {
  return performTx('meta', 'readwrite', (store) => {
    store.put({ key, value });
    return value;
  });
}

// ================= BACKUP & RESTORE & RESET =================

export async function exportAllData() {
  const [
    transactions,
    categories,
    budgets,
    salarySettings,
    salaryHistory,
    recurringBills,
    accounts
  ] = await Promise.all([
    getAllTransactions(),
    getAllCategories(),
    getAllBudgets(),
    getSalarySettings(),
    getSalaryHistory(),
    getAllRecurringBills(),
    getAllAccounts()
  ]);

  return {
    financeItVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      categories,
      budgets,
      salarySettings,
      salaryHistory,
      recurringBills,
      accounts
    }
  };
}

export async function importData(jsonData, mode = 'replace') {
  if (!jsonData || typeof jsonData !== 'object' || !jsonData.data) {
    throw new Error('Invalid FinanceiT backup format: missing root data object.');
  }

  const { data } = jsonData;
  const db = await openDB();

  const storeNames = [
    'transactions',
    'categories',
    'budgets',
    'salarySettings',
    'salaryHistory',
    'recurringBills',
    'accounts'
  ];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    tx.onerror = (e) => reject(e.target.error);

    // If replace mode, clear all existing stores first
    if (mode === 'replace') {
      storeNames.forEach((name) => {
        tx.objectStore(name).clear();
      });
    }

    // Populate data
    if (Array.isArray(data.transactions)) {
      const txStore = tx.objectStore('transactions');
      data.transactions.forEach((item) => txStore.put(item));
    }

    if (Array.isArray(data.categories)) {
      const catStore = tx.objectStore('categories');
      data.categories.forEach((item) => catStore.put(item));
    }

    if (Array.isArray(data.budgets)) {
      const bStore = tx.objectStore('budgets');
      data.budgets.forEach((item) => bStore.put(item));
    }

    if (data.salarySettings) {
      const salStore = tx.objectStore('salarySettings');
      salStore.put(data.salarySettings);
    }

    if (Array.isArray(data.salaryHistory)) {
      const salHistStore = tx.objectStore('salaryHistory');
      data.salaryHistory.forEach((item) => salHistStore.put(item));
    }

    if (Array.isArray(data.recurringBills)) {
      const billStore = tx.objectStore('recurringBills');
      data.recurringBills.forEach((item) => billStore.put(item));
    }

    if (Array.isArray(data.accounts)) {
      const accStore = tx.objectStore('accounts');
      data.accounts.forEach((item) => accStore.put(item));
    }

    tx.oncomplete = () => resolve(true);
  });
}

export async function resetAllData() {
  const db = await openDB();
  const storeNames = [
    'transactions',
    'categories',
    'budgets',
    'salarySettings',
    'salaryHistory',
    'recurringBills',
    'accounts'
  ];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    tx.onerror = (e) => reject(e.target.error);

    storeNames.forEach((name) => {
      tx.objectStore(name).clear();
    });

    // Re-seed defaults
    const catStore = tx.objectStore('categories');
    DEFAULT_CATEGORIES.forEach((cat) => catStore.put(cat));

    const salStore = tx.objectStore('salarySettings');
    salStore.put(DEFAULT_SALARY_SETTINGS);

    const accStore = tx.objectStore('accounts');
    DEFAULT_ACCOUNTS.forEach((acc) => accStore.put(acc));

    tx.oncomplete = () => resolve(true);
  });
}
