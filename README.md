# FairShare™ — Rent & Utilities Split & Affordability Calculator

A web application designed for roommates to equitably divide housing expenses, track utilities, and visualize rent-to-income affordability thresholds in real-time.

![FairShare Demo](https://img.shields.io/badge/Status-Ready%20to%20Deploy-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

---

## ✨ Features

- 🏠 **Flexible Expense Inputs**: Base Rent + Itemized Utilities (Electricity, Water, Internet, Gas, Trash + custom entries) or Single Lump Sum.
- ⚖️ **Multiple Split Strategies**:
  - **Equal Split**: Equal division ($\text{Cost} \div N$).
  - **Income-Weighted Split**: Proportional to income ($\text{Cost} \times \frac{\text{Income}_i}{\sum \text{Income}}$).
  - **Custom Room-Size / Weight Split**: Assign weight factors per room (e.g. Master Bedroom = 1.4x).
- 📊 **Affordability Analysis**:
  - Configurable threshold slider (standard 30% guideline with quick chips).
  - Visual status badges (🟢 Safe $\le 30\%$, 🟡 Moderate 30–40%, 🔴 Severe $> 40\%$).
  - Surplus / Deficit dollar buffer tracking.
- 📈 **Interactive Visual Analytics (Chart.js)**:
  - Share vs. Affordable Cap Bar Chart.
  - Expense Allocation Donut Chart.
- 🌓 **Dark & Light Mode**: Smooth theme toggle with persistent preferences.
- 📅 **Time Horizon Switch**: Toggle between Monthly ($/mo) and Annual ($/yr) views.
- 💾 **Local Storage**: Automatically saves all inputs between sessions.
- 📤 **Exporting**: Copy executive summary to clipboard, export `.csv`, or print PDF reports.

---

## 🚀 GitHub Pages Deployment

This repository includes an automated GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys the app to GitHub Pages on every push.

### Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g. `fairshare-calculator`).
3. Leave it **Public** (or Private if you have GitHub Pro) and do **not** initialize with README.

### Step 2: Push your local repository
Run the following commands in your terminal:

```bash
git remote add origin https://github.com/YOUR-USERNAME/fairshare-calculator.git
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository **Settings** → **Pages** on GitHub.
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Your site will automatically go live at:
   `https://YOUR-USERNAME.github.io/fairshare-calculator/`

---

## 🛠️ Local Development

Open `index.html` directly in any web browser, or run a local web server:

```bash
# Using Python
python -m http.server 3000

# Using Node.js npx
npx serve .
```
