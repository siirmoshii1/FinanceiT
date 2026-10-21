# FinanceiT — Your Money. Your Control.

> **Mobile-First Personal Finance Tracker**
> Minimalist iOS-Native Black & White Design &bull; Offline-First &bull; 100% Private (No Cloud, No Login, No Servers) &bull; Zero Build Process &bull; GitHub Pages Ready PWA

---

## 🌟 Overview

**FinanceiT** is a standalone, progressive web application (PWA) designed to give you complete visibility and control over your personal cashflow, paycheck schedules, recurring utility bills, expense category budgets, and savings allocations.

Built strictly with vanilla web standards (**HTML5**, **CSS3**, **Vanilla JavaScript**, **IndexedDB**, and **Web App Manifest**), FinanceiT requires **zero build steps**, no Node.js compilation, and communicates with **zero remote servers**. All financial records reside securely within your browser's local **IndexedDB** storage.

---

## 🎯 Key Features

### 1. iOS-Native Minimalist Monochrome Aesthetics
- **Apple iOS Design System**: SF Pro font hierarchy, high-contrast black & white palette, sleek segmented controls, and fluid bottom action sheets.
- **Light & Dark Themes**: Deep pitch-black background in dark mode, crisp clean white background in light mode. Theme preferences persist in `LocalStorage`.
- **Responsive & Safe-Area Aware**: Handles iPhone notches, Dynamic Island, and home indicators with native `viewport-fit=cover` and CSS safe-area insets.
- **Monochrome SVG Icons**: Fast, lightweight inline SVG icons with zero external CDN dependencies.

### 2. Salary & Income Scheduling
- **Flexible Payday Schedules**:
  - **Twice Monthly**: Fixed calendar dates (e.g., 15th and 30th / month-end).
  - **Monthly**: Configurable day of month (e.g., 25th or 30th).
  - **Every 15 Days**: Rolling interval schedule calculated from an anchor date.
  - **Weekly**: Rolling 7-day interval.
  - **Irregular / Custom**: Freeform income logging.
- **Strict Financial Integrity**: Expected future salary is **never** counted towards your available balance until you explicitly tap **"Mark Salary as Received"**.
- **Duplicate Payday Prevention**: Automatically checks history to prevent accidental double-recording of the same scheduled paycheck.

### 3. Safe Financial Arithmetic & Transactions
- **Integer Centavo Math**: Eliminates JavaScript floating-point rounding errors (`0.1 + 0.2 = 0.30000000000000004`) by processing and storing all monetary amounts as whole centavos.
- **PHP Currency Formatting**: Formatted cleanly as `₱1,250.50` with proper digit grouping.
- **Full Transaction Lifecycle**: Add, view, edit, and delete transactions with instant balance recalculation without double counting.
- **Date-Grouped History**: Grouped by date (Today, Yesterday, Date headers) with real-time text search, type filters (Expense, Income, Transfer), and category filters.
- **Transfers vs. Consumption**: Transfers into **Savings** or your **Emergency Fund** adjust your cash balance and increment your savings balance without falsely inflating your "expenses" or reducing your net worth.

### 4. Expense Categories & Budget Planning
- **25 Default Categories**: Covering Food & Groceries, Motorcycle Gas, Oil & Maintenance, Wi-Fi / Internet, Electricity & Water, Family & Personal Allowances, Church Offering, Education, Savings, and more.
- **Custom Categories**: Add, edit, archive, or restore categories with custom icons and types.
- **Category Budgets**: Set planned monthly spending limits per category.
  - $\text{Available Budget} = \text{Planned Budget} - \text{Actual Spending}$
  - $\text{Percentage Used} = (\text{Actual Spending} \div \text{Planned Budget}) \times 100$
  - Handled safely when planned budget is zero (no division by zero errors).
- **Salary Allocation Planner**: Compares your expected take-home salary against your planned expenses and savings targets, displaying your exact unallocated cushion or overallocated warning.

### 5. Recurring Bills & Interactive Calendar
- **Bills Scheduler**: Set due dates, amounts, categories, and frequencies for recurring utility bills, internet subscriptions, or mobile loads.
- **One-Tap "Pay Bill" Action**: Logs an expense transaction directly for that bill and marks it paid for the current cycle.
- **Interactive Calendar**:
  - Month navigation (previous/next).
  - Colored indicator dots for **Salary**, **Bills Due**, **Income**, and **Expenses**.
  - **Day Inspector**: Tap any day to review all scheduled bills and recorded transactions for that exact date.

### 6. Local Reports & Visual Analytics
- **Pure SVG & CSS Charts**: No heavy third-party charting libraries (no Chart.js, no D3).
- **Spending by Category Donut Chart**: Interactive SVG donut chart with category percentage breakdown.
- **Monthly Cashflow Trend**: Multi-month comparative bar chart for income vs. outflow.
- **Category Outflow Ranking**: Top expense categories ranked by percentage with visual progress tracks.
- **Savings Rate KPI**: Evaluates the percentage of income preserved in capital.

### 7. Data Safety, Backup & Restore
- **Export JSON Backup**: Complete, versioned backup file (`financeit-backup-YYYY-MM-DD.json`) containing all transactions, categories, budgets, salary configurations, recurring bills, and accounts.
- **Export CSV**: Standard CSV file compatible with Microsoft Excel, Google Sheets, or Apple Numbers.
- **Import JSON**: Validates backup schemas, provides record previews, and offers two restore modes:
  - **Replace**: Wipes and replaces current data with the backup.
  - **Merge**: Safely merges imported records into your existing dataset.
- **Safe Reset**: Secure workflow requiring typing `RESET` to clear database.

---

## 📱 Progressive Web App (PWA) & Offline Use

FinanceiT is an offline-ready PWA with a custom Service Worker and Web App Manifest.

### Installing on iPhone (Apple Safari)
1. Open your FinanceiT URL in **Apple Safari**.
2. Tap the **Share** button (square with upward arrow) in the bottom navigation bar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the upper-right corner. FinanceiT will launch as a standalone, fullscreen iOS app with notch and safe-area support.

### Installing on Android (Google Chrome)
1. Open your FinanceiT URL in **Google Chrome**.
2. Tap the three-dot menu at the top-right.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. Confirm by tapping **Install**.

---

## 🚀 GitHub Pages Deployment Guide

Deploying FinanceiT to **GitHub Pages** takes less than 2 minutes and requires **no build step**:

1. **Create a GitHub Repository**:
   - Go to [github.com/new](https://github.com/new).
   - Name your repository (e.g., `FinanceiT`).
   - Choose **Public** (or Private if using GitHub Pro).
   - Leave "Initialize with README" unchecked.

2. **Push Project Files to GitHub**:
   Open PowerShell in this project folder:
   ```powershell
   git init
   git add .
   git commit -m "Initial release of FinanceiT PWA"
   git branch -M main
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/FinanceiT.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - In your GitHub repository, click **Settings** (top tab).
   - In the left sidebar, click **Pages**.
   - Under **Build and deployment > Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and `/ (root)`.
   - Click **Save**.

4. **Open Your App**:
   - After 1–2 minutes, your site will be live at:
     ```
     https://<YOUR-GITHUB-USERNAME>.github.io/FinanceiT/
     ```
   - Open that link on your iPhone or Android to install it!

---

## 💻 Local Testing & Verification

To run FinanceiT locally without installing any build tools:

### Using Python's built-in HTTP server:
```powershell
python -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### Using Node.js `npx serve`:
```powershell
npx serve . -p 8080
```

---

## 🔒 Privacy & License

- **100% Client-Side**: No telemetry, no third-party cookies, no remote database.
- **MIT License**: Free to use, modify, and host on your personal GitHub Pages account.
