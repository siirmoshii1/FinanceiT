/**
 * FinanceiT - Comprehensive Verification Test Suite
 * Tests financial calculations, centavos arithmetic, salary scheduling,
 * budget formulas, internal transfers, and PWA asset integrity.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

import {
  toCentavos,
  toPesos,
  formatPHP,
  getNextPaydayInfo,
  calculateBalances,
  calculateBudgetStatus,
  calculateSalaryAllocation,
  calculatePeriodSummary,
  State
} from './js/state.js';

import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from './js/db.js';

console.log('=== STARTING FINANCEIT VERIFICATION TEST SUITE ===\n');

let testsPassed = 0;
let testsFailed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    testsPassed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${err.message}`);
    testsFailed++;
  }
}

// -------------------------------------------------------------
console.log('Test Group 1: Centavo Arithmetic & Currency Formatting');
// -------------------------------------------------------------
it('converts pesos string and float to exact integer centavos', () => {
  assert.strictEqual(toCentavos('1500.50'), 150050);
  assert.strictEqual(toCentavos('₱1,250.75'), 125075);
  assert.strictEqual(toCentavos('0.10'), 10);
  assert.strictEqual(toCentavos(0.1 + 0.2), 30); // Eliminates JS float bug (0.30000000000000004 -> 30)
  assert.strictEqual(toCentavos(''), 0);
  assert.strictEqual(toCentavos(null), 0);
});

it('converts centavos back to 2-decimal pesos string', () => {
  assert.strictEqual(toPesos(150050), '1500.50');
  assert.strictEqual(toPesos(10), '0.10');
  assert.strictEqual(toPesos(0), '0.00');
});

it('formats currency with PHP symbol, commas, and decimals', () => {
  assert.strictEqual(formatPHP(125050), '₱1,250.50');
  assert.strictEqual(formatPHP(100000000), '₱1,000,000.00');
  assert.strictEqual(formatPHP(-50000), '-₱500.00');
});

// -------------------------------------------------------------
console.log('\nTest Group 2: Financial Integrity & Account Balances');
// -------------------------------------------------------------
it('calculates available cash, savings, and net worth correctly', () => {
  // Set up mock state
  State.accounts = [
    { id: 'cash', name: 'Cash', openingBalanceCentavos: 1000000 }, // ₱10,000 opening
    { id: 'savings', name: 'Savings', openingBalanceCentavos: 500000 }, // ₱5,000 opening
    { id: 'emergency', name: 'Emergency', openingBalanceCentavos: 200000 } // ₱2,000 opening
  ];

  State.transactions = [
    // Income: +₱25,000
    { id: 'tx_1', type: 'income', amountCentavos: 2500000, categoryId: 'cat_salary', date: '2026-10-15' },
    // Consumption Expense: -₱3,000
    { id: 'tx_2', type: 'expense', amountCentavos: 300000, categoryId: 'cat_food', date: '2026-10-16' },
    // Transfer to Savings: ₱5,000 (Internal transfer)
    { id: 'tx_3', type: 'transfer', amountCentavos: 500000, categoryId: 'cat_savings', date: '2026-10-17' },
    // Transfer to Emergency: ₱2,000 (Internal transfer)
    { id: 'tx_4', type: 'transfer', amountCentavos: 200000, categoryId: 'cat_emergency', date: '2026-10-18' }
  ];

  const balances = calculateBalances();

  // Cash = Opening(10,000) + Income(25,000) - Expense(3,000) - SavingsTransfer(5,000) - EmergencyTransfer(2,000) = 25,000
  assert.strictEqual(balances.availableCash, 2500000, 'Available cash should be ₱25,000');
  
  // Total Savings = Opening(5,000) + Transfer(5,000) = 10,000
  assert.strictEqual(balances.totalSavings, 1000000, 'Savings should be ₱10,000');
  
  // Total Emergency = Opening(2,000) + Transfer(2,000) = 4,000
  assert.strictEqual(balances.totalEmergency, 400000, 'Emergency fund should be ₱4,000');
  
  // Net Worth = Cash(25,000) + Savings(10,000) + Emergency(4,000) = 39,000
  assert.strictEqual(balances.netWorth, 3900000, 'Net worth should be ₱39,000');

  // Verify internal transfers are excluded from ordinary expenses
  assert.strictEqual(balances.allTimeExpense, 300000, 'All time expense must only count consumption, not transfers');
  assert.strictEqual(balances.allTimeIncome, 2500000, 'All time income must only count income, not transfers');
});

// -------------------------------------------------------------
console.log('\nTest Group 3: Salary Scheduling & Duplicate Prevention');
// -------------------------------------------------------------
it('calculates twice_monthly paydays (15th and 30th) accurately', () => {
  const settings = {
    id: 'default',
    scheduleType: 'twice_monthly',
    firstPayday: 15,
    secondPayday: 30,
    takeHomeCentavos: 2500000,
    employer: 'Test Corp'
  };

  State.salaryHistory = [];

  // When today is Oct 10, next payday is Oct 15
  const infoBefore15 = getNextPaydayInfo(settings, '2026-10-10');
  assert.strictEqual(infoBefore15.dateStr, '2026-10-15');
  assert.strictEqual(infoBefore15.isAlreadyReceived, false);

  // When today is Oct 16, next payday is Oct 30
  const infoBefore30 = getNextPaydayInfo(settings, '2026-10-16');
  assert.strictEqual(infoBefore30.dateStr, '2026-10-30');

  // When Oct 15 was already logged in salary history, it flags isAlreadyReceived: true
  State.salaryHistory = [{ paydayDate: '2026-10-15', amountCentavos: 2500000 }];
  const infoReceived = getNextPaydayInfo(settings, '2026-10-10');
  assert.strictEqual(infoReceived.isAlreadyReceived, true);
});

it('calculates every_15_days rolling schedule correctly without confusing fixed dates', () => {
  const settings = {
    id: 'default',
    scheduleType: 'every_15_days',
    anchorDate: '2026-10-01',
    intervalDays: 15,
    takeHomeCentavos: 2000000
  };

  // From Oct 2, next is Oct 16
  const next = getNextPaydayInfo(settings, '2026-10-02');
  assert.strictEqual(next.dateStr, '2026-10-16');

  // From Oct 17, next is Oct 31
  const next2 = getNextPaydayInfo(settings, '2026-10-17');
  assert.strictEqual(next2.dateStr, '2026-10-31');
});

// -------------------------------------------------------------
console.log('\nTest Group 4: Budget Formulas & Zero-Division Safety');
// -------------------------------------------------------------
it('calculates budget remaining and percentage used safely', () => {
  State.selectedPeriod = '2026-10';
  State.categories = DEFAULT_CATEGORIES;
  State.budgets = [
    { period: '2026-10', categoryId: 'cat_food', amountCentavos: 1000000 }, // ₱10,000 budget
    { period: '2026-10', categoryId: 'cat_gas', amountCentavos: 200000 }    // ₱2,000 budget
  ];

  State.transactions = [
    { id: 'b_1', type: 'expense', categoryId: 'cat_food', amountCentavos: 400000, date: '2026-10-05' }, // ₱4,000 spent (40%)
    { id: 'b_2', type: 'expense', categoryId: 'cat_gas', amountCentavos: 250000, date: '2026-10-06' },  // ₱2,500 spent (125% - exceeded)
    { id: 'b_3', type: 'expense', categoryId: 'cat_clothes', amountCentavos: 150000, date: '2026-10-07' } // No budget set, ₱1,500 spent
  ];

  const status = calculateBudgetStatus('2026-10');

  const foodItem = status.items.find(i => i.category.id === 'cat_food');
  assert.strictEqual(foodItem.remainingCentavos, 600000, 'Food remaining should be ₱6,000');
  assert.strictEqual(foodItem.percentUsed, 40, 'Food percent used should be 40%');
  assert.strictEqual(foodItem.status, 'good');

  const gasItem = status.items.find(i => i.category.id === 'cat_gas');
  assert.strictEqual(gasItem.remainingCentavos, -50000, 'Gas remaining should be -₱500');
  assert.strictEqual(gasItem.percentUsed, 125, 'Gas percent used should be 125%');
  assert.strictEqual(gasItem.status, 'exceeded');

  const clothesItem = status.items.find(i => i.category.id === 'cat_clothes');
  assert.strictEqual(clothesItem.status, 'no_budget');
  assert.strictEqual(isFinite(clothesItem.percentUsed), true, 'Percent used must not be NaN or Infinity');
});

it('calculates salary allocation planner accurately', () => {
  State.salarySettings = { takeHomeCentavos: 3000000 }; // ₱30,000 take-home
  State.budgets = [
    { period: '2026-10', categoryId: 'cat_food', amountCentavos: 1000000 }, // 10,000 exp
    { period: '2026-10', categoryId: 'cat_wifi', amountCentavos: 200000 },  // 2,000 exp
    { period: '2026-10', categoryId: 'cat_savings', amountCentavos: 800000 } // 8,000 savings
  ];

  const alloc = calculateSalaryAllocation(3000000);
  assert.strictEqual(alloc.plannedExpenses, 1200000, 'Planned expenses = 12,000');
  assert.strictEqual(alloc.plannedSavings, 800000, 'Planned savings = 8,000');
  assert.strictEqual(alloc.totalAllocated, 2000000, 'Total allocated = 20,000');
  assert.strictEqual(alloc.unallocatedCentavos, 1000000, 'Unallocated cushion = 10,000');
  assert.strictEqual(alloc.isOverallocated, false);
});

// -------------------------------------------------------------
console.log('\nTest Group 5: PWA & Pre-Cache Asset Integrity');
// -------------------------------------------------------------
it('verifies all required PWA files and precache assets exist on disk', () => {
  const rootDir = process.cwd();
  const requiredFiles = [
    'index.html',
    'styles.css',
    'manifest.webmanifest',
    'service-worker.js',
    'README.md',
    '.gitignore',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-512.png',
    'icons/apple-touch-icon.png',
    'js/app.js',
    'js/db.js',
    'js/state.js',
    'js/ui.js',
    'js/views/dashboard.js',
    'js/views/transactions.js',
    'js/views/budget.js',
    'js/views/calendar.js',
    'js/views/reports.js',
    'js/views/settings.js'
  ];

  requiredFiles.forEach(file => {
    const fullPath = path.join(rootDir, file);
    assert.strictEqual(fs.existsSync(fullPath), true, `File missing: ${file}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 0, `File is empty: ${file}`);
  });
});

it('verifies manifest.webmanifest format and relative paths', () => {
  const manifestRaw = fs.readFileSync(path.join(process.cwd(), 'manifest.webmanifest'), 'utf8');
  const manifest = JSON.parse(manifestRaw);

  assert.strictEqual(manifest.name, 'FinanceiT');
  assert.strictEqual(manifest.short_name, 'FinanceiT');
  assert.strictEqual(manifest.start_url, './');
  assert.strictEqual(manifest.scope, './');
  assert.strictEqual(manifest.display, 'standalone');
  assert.ok(manifest.icons.length >= 3);
});

console.log(`\n=== SUITE COMPLETE: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  process.exit(1);
}
