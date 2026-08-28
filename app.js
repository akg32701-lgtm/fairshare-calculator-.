/**
 * FairShare™ - Rent & Utilities Split & Affordability Calculator
 * Logic, State Management, Split Algorithms, Visualizations & Data Persistence
 */

(function () {
  'use strict';

  // --- Avatar Color Palette ---
  const AVATAR_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#10b981',
    '#f59e0b', '#06b6d4', '#6366f1', '#14b8a6'
  ];

  // --- Presets ---
  const PRESETS = {
    balanced2: {
      rent: 2000,
      utilitiesMode: 'itemized',
      utilitiesLump: 250,
      utilitiesItemized: [
        { id: 'u1', name: 'Electricity', amount: 90 },
        { id: 'u2', name: 'Water & Sewer', amount: 50 },
        { id: 'u3', name: 'Internet / WiFi', amount: 70 },
        { id: 'u4', name: 'Gas / Heating', amount: 40 }
      ],
      splitMethod: 'equal',
      affordabilityThreshold: 30,
      roommates: [
        { id: 'r1', name: 'Alex', income: 4000, weight: 1.0, color: AVATAR_COLORS[0] },
        { id: 'r2', name: 'Jordan', income: 4000, weight: 1.0, color: AVATAR_COLORS[1] }
      ]
    },
    disparity3: {
      rent: 2700,
      utilitiesMode: 'itemized',
      utilitiesLump: 300,
      utilitiesItemized: [
        { id: 'u1', name: 'Electricity', amount: 110 },
        { id: 'u2', name: 'Water & Sewer', amount: 60 },
        { id: 'u3', name: 'Internet / WiFi', amount: 80 },
        { id: 'u4', name: 'Gas / Heating', amount: 50 }
      ],
      splitMethod: 'income',
      affordabilityThreshold: 30,
      roommates: [
        { id: 'r1', name: 'Morgan (Senior Dev)', income: 6200, weight: 1.0, color: AVATAR_COLORS[0] },
        { id: 'r2', name: 'Casey (Designer)', income: 3800, weight: 1.0, color: AVATAR_COLORS[1] },
        { id: 'r3', name: 'Riley (Graduate Student)', income: 2400, weight: 1.0, color: AVATAR_COLORS[2] }
      ]
    },
    custom4: {
      rent: 3600,
      utilitiesMode: 'itemized',
      utilitiesLump: 400,
      utilitiesItemized: [
        { id: 'u1', name: 'Electricity', amount: 150 },
        { id: 'u2', name: 'Water & Sewer', amount: 80 },
        { id: 'u3', name: 'Gigabit Fiber Internet', amount: 100 },
        { id: 'u4', name: 'Gas & Heating', amount: 70 }
      ],
      splitMethod: 'custom',
      affordabilityThreshold: 30,
      roommates: [
        { id: 'r1', name: 'Sam (Master Suite + Bath)', income: 5500, weight: 1.4, color: AVATAR_COLORS[0] },
        { id: 'r2', name: 'Jamie (Large Bedroom)', income: 4600, weight: 1.1, color: AVATAR_COLORS[1] },
        { id: 'r3', name: 'Taylor (Standard Bedroom)', income: 4000, weight: 1.0, color: AVATAR_COLORS[2] },
        { id: 'r4', name: 'Chris (Cozy Bedroom)', income: 3200, weight: 0.8, color: AVATAR_COLORS[3] }
      ]
    },
    single: {
      rent: 1600,
      utilitiesMode: 'itemized',
      utilitiesLump: 180,
      utilitiesItemized: [
        { id: 'u1', name: 'Electricity', amount: 75 },
        { id: 'u2', name: 'Water', amount: 35 },
        { id: 'u3', name: 'Internet', amount: 70 }
      ],
      splitMethod: 'equal',
      affordabilityThreshold: 30,
      roommates: [
        { id: 'r1', name: 'Alex', income: 5500, weight: 1.0, color: AVATAR_COLORS[0] }
      ]
    }
  };

  // --- Default State ---
  const DEFAULT_STATE = {
    rent: 2400,
    utilitiesMode: 'itemized', // 'itemized' | 'lump'
    utilitiesLump: 350,
    utilitiesItemized: [
      { id: 'u1', name: 'Electricity', amount: 120 },
      { id: 'u2', name: 'Water & Sewer', amount: 65 },
      { id: 'u3', name: 'High-Speed Internet', amount: 85 },
      { id: 'u4', name: 'Gas / Heating', amount: 50 },
      { id: 'u5', name: 'Trash & Recycling', amount: 30 }
    ],
    splitMethod: 'equal', // 'equal' | 'income' | 'custom'
    affordabilityThreshold: 30,
    timeHorizon: 'monthly', // 'monthly' | 'annual'
    theme: 'dark',
    roommates: [
      { id: 'r1', name: 'Alex', income: 4400, weight: 1.0, color: AVATAR_COLORS[0] },
      { id: 'r2', name: 'Jordan', income: 3400, weight: 1.0, color: AVATAR_COLORS[1] },
      { id: 'r3', name: 'Taylor', income: 2700, weight: 1.0, color: AVATAR_COLORS[2] }
    ]
  };

  // Clone default state
  let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

  // --- Chart Instances ---
  let barChartInstance = null;
  let donutChartInstance = null;

  // --- Formatters ---
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const currencyNoCentsFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  function formatCurrency(amount, includeCents = true) {
    if (isNaN(amount) || amount === null) return '$0.00';
    return includeCents ? currencyFormatter.format(amount) : currencyNoCentsFormatter.format(amount);
  }

  function formatPercent(pct) {
    if (isNaN(pct) || pct === null) return '0.0%';
    return `${pct.toFixed(1)}%`;
  }

  // --- DOM Elements ---
  const el = {
    presetSelector: document.getElementById('presetSelector'),
    btnMonthly: document.getElementById('btnMonthly'),
    btnAnnual: document.getElementById('btnAnnual'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIconDark: document.getElementById('themeIconDark'),
    themeIconLight: document.getElementById('themeIconLight'),
    resetBtn: document.getElementById('resetBtn'),

    // KPIs
    kpiTotalCost: document.getElementById('kpiTotalCost'),
    kpiRentUtilBreakdown: document.getElementById('kpiRentUtilBreakdown'),
    kpiTotalIncome: document.getElementById('kpiTotalIncome'),
    kpiRoommateCount: document.getElementById('kpiRoommateCount'),
    kpiHouseholdRatio: document.getElementById('kpiHouseholdRatio'),
    kpiHouseholdStatus: document.getElementById('kpiHouseholdStatus'),
    kpiRatioCard: document.getElementById('kpiRatioCard'),
    kpiBurdenCount: document.getElementById('kpiBurdenCount'),
    kpiBurdenSubtitle: document.getElementById('kpiBurdenSubtitle'),
    kpiBurdenCard: document.getElementById('kpiBurdenCard'),

    // Inputs
    baseRentInput: document.getElementById('baseRentInput'),
    tabUtilItemized: document.getElementById('tabUtilItemized'),
    tabUtilLump: document.getElementById('tabUtilLump'),
    utilLumpContainer: document.getElementById('utilLumpContainer'),
    utilLumpInput: document.getElementById('utilLumpInput'),
    utilItemizedContainer: document.getElementById('utilItemizedContainer'),
    itemizedUtilityList: document.getElementById('itemizedUtilityList'),
    btnAddUtilityRow: document.getElementById('btnAddUtilityRow'),
    totalUtilitiesDisplay: document.getElementById('totalUtilitiesDisplay'),

    // Strategy & Rules
    splitMethodRadios: document.querySelectorAll('input[name="splitMethod"]'),
    thresholdSlider: document.getElementById('thresholdSlider'),
    thresholdBadge: document.getElementById('thresholdBadge'),
    chipBtns: document.querySelectorAll('.chip-btn'),
    roommatesCard: document.getElementById('roommatesCard'),

    // Roommates
    roommateCountBadge: document.getElementById('roommateCountBadge'),
    roommatesList: document.getElementById('roommatesList'),
    btnAddRoommate: document.getElementById('btnAddRoommate'),

    // Results Table & Insights
    resultsTableBody: document.getElementById('resultsTableBody'),
    fairShareInsightBox: document.getElementById('fairShareInsightBox'),
    insightTitle: document.getElementById('insightTitle'),
    insightDescription: document.getElementById('insightDescription'),

    // Charts
    btnChartBar: document.getElementById('btnChartBar'),
    btnChartDonut: document.getElementById('btnChartDonut'),
    barChartWrapper: document.getElementById('barChartWrapper'),
    donutChartWrapper: document.getElementById('donutChartWrapper'),
    affordabilityBarChart: document.getElementById('affordabilityBarChart'),
    costDonutChart: document.getElementById('costDonutChart'),

    // Action buttons
    btnCopySummary: document.getElementById('btnCopySummary'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnPrintReport: document.getElementById('btnPrintReport'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Storage Helper ---
  function loadPersistedState() {
    try {
      const saved = localStorage.getItem('fairshare_calculator_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('Could not load saved state from localStorage', e);
    }
  }

  function persistState() {
    try {
      localStorage.setItem('fairshare_calculator_state', JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state to localStorage', e);
    }
  }

  // --- Calculation Engine ---
  function computeCalculations() {
    const rent = Math.max(0, parseFloat(state.rent) || 0);

    let utilitiesTotal = 0;
    if (state.utilitiesMode === 'itemized') {
      utilitiesTotal = state.utilitiesItemized.reduce((sum, item) => sum + (Math.max(0, parseFloat(item.amount) || 0)), 0);
    } else {
      utilitiesTotal = Math.max(0, parseFloat(state.utilitiesLump) || 0);
    }

    const totalMonthlyCost = rent + utilitiesTotal;
    const isAnnual = state.timeHorizon === 'annual';
    const multiplier = isAnnual ? 12 : 1;

    const numRoommates = Math.max(1, state.roommates.length);
    const totalHouseholdMonthlyIncome = state.roommates.reduce((sum, r) => sum + (Math.max(0, parseFloat(r.income) || 0)), 0);
    const totalWeights = state.roommates.reduce((sum, r) => sum + (Math.max(0, parseFloat(r.weight) || 0)), 0);

    // Calculate individual shares
    const roommateBreakdowns = state.roommates.map((r, idx) => {
      const income = Math.max(0, parseFloat(r.income) || 0);
      const weight = Math.max(0, parseFloat(r.weight) || 1.0);
      let monthlyShare = 0;

      if (state.splitMethod === 'equal') {
        monthlyShare = totalMonthlyCost / numRoommates;
      } else if (state.splitMethod === 'income') {
        if (totalHouseholdMonthlyIncome > 0) {
          monthlyShare = totalMonthlyCost * (income / totalHouseholdMonthlyIncome);
        } else {
          monthlyShare = totalMonthlyCost / numRoommates;
        }
      } else if (state.splitMethod === 'custom') {
        if (totalWeights > 0) {
          monthlyShare = totalMonthlyCost * (weight / totalWeights);
        } else {
          monthlyShare = totalMonthlyCost / numRoommates;
        }
      }

      // Rent-to-income percentage
      const incomeRatio = income > 0 ? (monthlyShare / income) * 100 : 0;
      const targetThreshold = state.affordabilityThreshold;
      const maxAffordableMonthly = income * (targetThreshold / 100);
      const monthlyBuffer = maxAffordableMonthly - monthlyShare;

      // Status classification
      let status = 'safe'; // under threshold
      let statusLabel = 'Affordable';
      let statusIcon = '✅';

      if (income === 0) {
        status = 'warn';
        statusLabel = 'No Income';
        statusIcon = '⚠️';
      } else if (incomeRatio > targetThreshold + 10) {
        status = 'danger';
        statusLabel = 'Severe Burden';
        statusIcon = '🚨';
      } else if (incomeRatio > targetThreshold) {
        status = 'warn';
        statusLabel = 'Over Threshold';
        statusIcon = '⚠️';
      }

      return {
        id: r.id,
        name: r.name || `Roommate ${idx + 1}`,
        color: r.color || AVATAR_COLORS[idx % AVATAR_COLORS.length],
        income,
        weight,
        monthlyShare,
        displayShare: monthlyShare * multiplier,
        displayIncome: income * multiplier,
        displayMaxAffordable: maxAffordableMonthly * multiplier,
        displayBuffer: monthlyBuffer * multiplier,
        incomeRatio,
        status,
        statusLabel,
        statusIcon
      };
    });

    const rentBurdenedCount = roommateBreakdowns.filter(r => r.income > 0 && r.incomeRatio > state.affordabilityThreshold).length;
    const householdRatio = totalHouseholdMonthlyIncome > 0 ? (totalMonthlyCost / totalHouseholdMonthlyIncome) * 100 : 0;
    const avgPerPerson = totalMonthlyCost / numRoommates;

    return {
      rent,
      utilitiesTotal,
      totalMonthlyCost,
      displayTotalCost: totalMonthlyCost * multiplier,
      displayTotalIncome: totalHouseholdMonthlyIncome * multiplier,
      totalHouseholdMonthlyIncome,
      avgPerPerson: avgPerPerson * multiplier,
      householdRatio,
      rentBurdenedCount,
      numRoommates,
      roommateBreakdowns,
      isAnnual
    };
  }

  // --- UI Render Functions ---

  function renderKPIs(calc) {
    const period = calc.isAnnual ? '/ yr' : '/ mo';
    el.kpiTotalCost.textContent = formatCurrency(calc.displayTotalCost, false);
    el.kpiRentUtilBreakdown.textContent = `Rent: ${formatCurrency(calc.rent * (calc.isAnnual ? 12 : 1), false)} + Utils: ${formatCurrency(calc.utilitiesTotal * (calc.isAnnual ? 12 : 1), false)}`;

    el.kpiTotalIncome.textContent = formatCurrency(calc.displayTotalIncome, false);
    el.kpiRoommateCount.textContent = `Across ${calc.numRoommates} roommate${calc.numRoommates === 1 ? '' : 's'} (${formatCurrency(calc.avgPerPerson, false)} avg)`;

    el.kpiHouseholdRatio.textContent = formatPercent(calc.householdRatio);
    if (calc.householdRatio <= state.affordabilityThreshold) {
      el.kpiHouseholdStatus.textContent = `✅ Within ${state.affordabilityThreshold}% target`;
      el.kpiRatioCard.className = 'kpi-card safe';
    } else if (calc.householdRatio <= state.affordabilityThreshold + 10) {
      el.kpiHouseholdStatus.textContent = `⚠️ Elevated (> ${state.affordabilityThreshold}%)`;
      el.kpiRatioCard.className = 'kpi-card warn';
    } else {
      el.kpiHouseholdStatus.textContent = `🚨 High Burden (> ${state.affordabilityThreshold + 10}%)`;
      el.kpiRatioCard.className = 'kpi-card danger';
    }

    el.kpiBurdenCount.textContent = `${calc.rentBurdenedCount} of ${calc.numRoommates}`;
    if (calc.rentBurdenedCount === 0) {
      el.kpiBurdenSubtitle.textContent = 'All within target budget';
      el.kpiBurdenCard.className = 'kpi-card safe';
    } else {
      el.kpiBurdenSubtitle.textContent = `${calc.rentBurdenedCount} roommate${calc.rentBurdenedCount > 1 ? 's' : ''} exceed ${state.affordabilityThreshold}% cap`;
      el.kpiBurdenCard.className = calc.rentBurdenedCount > calc.numRoommates / 2 ? 'kpi-card danger' : 'kpi-card warn';
    }
  }

  function renderItemizedUtilities() {
    el.itemizedUtilityList.innerHTML = '';
    state.utilitiesItemized.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'utility-row';
      row.dataset.id = item.id;

      row.innerHTML = `
        <div class="utility-row-label">
          <input type="text" class="form-control" style="font-size:0.8125rem; padding:0.35rem 0.5rem;" value="${escapeHtml(item.name)}" data-action="edit-util-name" aria-label="Utility Category Name">
        </div>
        <div class="input-currency-wrapper">
          <span class="currency-symbol" style="font-size:0.8125rem; left:0.6rem;">$</span>
          <input type="number" class="form-control has-currency" style="padding-left:1.5rem; font-size:0.8125rem; padding-top:0.35rem; padding-bottom:0.35rem;" min="0" step="5" value="${item.amount}" data-action="edit-util-amount" aria-label="Utility Amount">
        </div>
        <button type="button" class="btn btn-danger-ghost" data-action="remove-util" title="Delete Utility" aria-label="Delete Utility">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      `;

      el.itemizedUtilityList.appendChild(row);
    });
  }

  function renderRoommatesList() {
    el.roommatesList.innerHTML = '';
    const isCustom = state.splitMethod === 'custom';

    if (isCustom) {
      el.roommatesCard.classList.add('custom-split-active');
    } else {
      el.roommatesCard.classList.remove('custom-split-active');
    }

    el.roommateCountBadge.textContent = `${state.roommates.length} Roommate${state.roommates.length === 1 ? '' : 's'}`;

    state.roommates.forEach((roommate, idx) => {
      const card = document.createElement('div');
      card.className = 'roommate-row-card';
      card.dataset.id = roommate.id;

      card.innerHTML = `
        <div class="roommate-card-top">
          <div class="roommate-avatar" style="background-color: ${roommate.color || AVATAR_COLORS[idx % AVATAR_COLORS.length]};">
            ${escapeHtml((roommate.name || 'R').charAt(0).toUpperCase())}
          </div>
          <input type="text" class="form-control roommate-name-input" value="${escapeHtml(roommate.name)}" data-action="edit-roommate-name" placeholder="Roommate Name" aria-label="Roommate Name">
          ${state.roommates.length > 1 ? `
            <button type="button" class="btn btn-danger-ghost" data-action="remove-roommate" title="Remove Roommate" aria-label="Remove Roommate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : ''}
        </div>

        <div class="roommate-card-inputs ${isCustom ? '' : 'no-weight'}">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:0.75rem; margin-bottom:0.25rem;">Monthly Income</label>
            <div class="input-currency-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" class="form-control has-currency" style="font-size:0.875rem;" min="0" step="50" value="${roommate.income}" data-action="edit-roommate-income" placeholder="4000" aria-label="Monthly Income">
            </div>
          </div>

          <div class="form-group custom-weight-field" style="margin-bottom:0;">
            <label class="form-label" style="font-size:0.75rem; margin-bottom:0.25rem;">Room Weight</label>
            <input type="number" class="form-control" style="font-size:0.875rem;" min="0.1" step="0.1" value="${roommate.weight || 1.0}" data-action="edit-roommate-weight" placeholder="1.0" title="Relative weight (e.g. 1.3 for master bedroom)" aria-label="Room Weight">
          </div>
        </div>
      `;

      el.roommatesList.appendChild(card);
    });
  }

  function renderResultsTable(calc) {
    el.resultsTableBody.innerHTML = '';
    const period = calc.isAnnual ? '/ yr' : '/ mo';

    calc.roommateBreakdowns.forEach(item => {
      const tr = document.createElement('tr');

      const progressColor = item.status === 'safe' ? 'var(--status-safe)' : (item.status === 'warn' ? 'var(--status-warn)' : 'var(--status-danger)');
      const progressWidth = Math.min(100, Math.max(0, (item.incomeRatio / (state.affordabilityThreshold * 1.5)) * 100));

      const isUnder = item.displayBuffer >= 0;
      const bufferText = isUnder
        ? `+${formatCurrency(item.displayBuffer, false)} under`
        : `-${formatCurrency(Math.abs(item.displayBuffer), false)} over`;
      const bufferColor = isUnder ? 'var(--status-safe)' : 'var(--status-danger)';

      tr.innerHTML = `
        <td>
          <div class="td-roommate">
            <div class="roommate-avatar" style="background-color: ${item.color};">
              ${escapeHtml(item.name.charAt(0).toUpperCase())}
            </div>
            <div>
              <div>${escapeHtml(item.name)}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">
                ${formatCurrency(item.displayIncome, false)}${period} inc.
              </div>
            </div>
          </div>
        </td>
        <td class="td-number" style="font-size:1rem; color:var(--text-primary);">
          ${formatCurrency(item.displayShare, true)}
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${period}</span>
        </td>
        <td>
          <div class="td-number" style="color: ${progressColor}; font-size:0.9375rem;">
            ${item.income > 0 ? formatPercent(item.incomeRatio) : 'N/A'}
          </div>
          <div class="person-progress-wrapper" title="${formatPercent(item.incomeRatio)} of income">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${progressWidth}%; background: ${progressColor};"></div>
            </div>
          </div>
        </td>
        <td class="td-number" style="color:var(--text-secondary);">
          ${item.income > 0 ? formatCurrency(item.displayMaxAffordable, false) : '$0'}
        </td>
        <td class="td-number" style="color: ${bufferColor}; font-size:0.8125rem;">
          ${item.income > 0 ? bufferText : '—'}
        </td>
        <td>
          <span class="status-badge ${item.status}">
            <span>${item.statusIcon}</span>
            <span>${item.statusLabel}</span>
          </span>
        </td>
      `;

      el.resultsTableBody.appendChild(tr);
    });
  }

  function renderSmartInsight(calc) {
    let title = 'FairShare Strategy Analysis';
    let message = '';

    const burdened = calc.roommateBreakdowns.filter(r => r.income > 0 && r.incomeRatio > state.affordabilityThreshold);
    const safeCount = calc.roommateBreakdowns.filter(r => r.income > 0 && r.incomeRatio <= state.affordabilityThreshold).length;

    if (state.splitMethod === 'equal') {
      if (burdened.length > 0) {
        const names = burdened.map(b => b.name).join(', ');
        title = `⚠️ Equal Split creates housing burden for ${names}`;
        message = `Under an equal split, ${names} spend ${burdened.map(b => formatPercent(b.incomeRatio)).join(', ')} of their income on housing (exceeding your ${state.affordabilityThreshold}% target). Switching to <strong>Income-Weighted Split</strong> will balance costs according to ability to pay and reduce rent burden.`;
      } else {
        title = `✅ Equal Split is balanced and affordable`;
        message = `All ${calc.numRoommates} roommates remain comfortably under their ${state.affordabilityThreshold}% income guideline with an equal division of ${formatCurrency(calc.avgPerPerson, false)}/person.`;
      }
    } else if (state.splitMethod === 'income') {
      if (burdened.length > 0) {
        title = `⚠️ High Overall Household Rent-to-Income Ratio (${formatPercent(calc.householdRatio)})`;
        message = `Even with proportional income weighting, total housing costs exceed the ${state.affordabilityThreshold}% threshold relative to combined earnings. To relieve financial stress, look for opportunities to reduce utility usage or lower base rent.`;
      } else {
        title = `🌟 Income-Weighted split maximizes fairness`;
        message = `Every roommate pays exactly the same ${formatPercent(calc.householdRatio)} proportion of their respective income, ensuring no single person is unfairly burdened relative to their earnings.`;
      }
    } else if (state.splitMethod === 'custom') {
      title = `📐 Custom Room Size / Weight Distribution Active`;
      message = `Costs are allocated based on your room size/weight inputs. Make sure weights accurately reflect room square footage, private bathrooms, or parking privileges.`;
    }

    el.insightTitle.innerHTML = title;
    el.insightDescription.innerHTML = message;
  }

  // --- Chart.js Rendering ---
  function updateCharts(calc) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#9ca3af' : '#4b5563';

    const labels = calc.roommateBreakdowns.map(r => r.name);
    const shares = calc.roommateBreakdowns.map(r => r.displayShare);
    const caps = calc.roommateBreakdowns.map(r => r.displayMaxAffordable);
    const backgroundColors = calc.roommateBreakdowns.map(r => r.status === 'safe' ? 'rgba(16, 185, 129, 0.85)' : (r.status === 'warn' ? 'rgba(245, 158, 11, 0.85)' : 'rgba(239, 68, 68, 0.85)'));

    // --- 1. Bar Chart: Share vs Threshold ---
    if (barChartInstance) {
      barChartInstance.destroy();
    }

    const ctxBar = el.affordabilityBarChart.getContext('2d');
    barChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: `Actual Share (${calc.isAnnual ? '$/yr' : '$/mo'})`,
            data: shares,
            backgroundColor: backgroundColors,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: `Affordable Cap (${state.affordabilityThreshold}%)`,
            data: caps,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
              boxWidth: 14
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            titleColor: isDark ? '#f9fafb' : '#111827',
            bodyColor: isDark ? '#e5e7eb' : '#374151',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y, true)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '500' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: function (val) {
                return '$' + val.toLocaleString();
              }
            }
          }
        }
      }
    });

    // --- 2. Donut Chart: Cost Breakdown ---
    if (donutChartInstance) {
      donutChartInstance.destroy();
    }

    const donutLabels = ['Base Rent'];
    const donutData = [calc.rent];
    const donutColors = ['#3b82f6'];

    if (state.utilitiesMode === 'itemized') {
      state.utilitiesItemized.forEach((item, i) => {
        donutLabels.push(item.name);
        donutData.push(Math.max(0, parseFloat(item.amount) || 0));
        donutColors.push(AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length]);
      });
    } else {
      donutLabels.push('Utilities (Lump Sum)');
      donutData.push(calc.utilitiesTotal);
      donutColors.push('#8b5cf6');
    }

    const ctxDonut = el.costDonutChart.getContext('2d');
    donutChartInstance = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: donutLabels,
        datasets: [{
          data: donutData,
          backgroundColor: donutColors,
          borderWidth: 2,
          borderColor: isDark ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            titleColor: isDark ? '#f9fafb' : '#111827',
            bodyColor: isDark ? '#e5e7eb' : '#374151',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            callbacks: {
              label: function (context) {
                const val = context.parsed;
                const pct = calc.totalMonthlyCost > 0 ? ((val / calc.totalMonthlyCost) * 100).toFixed(1) : '0.0';
                return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // --- Main Full Render Cycle ---
  function updateAll() {
    const calc = computeCalculations();

    // Render Components
    renderKPIs(calc);
    renderResultsTable(calc);
    renderSmartInsight(calc);
    updateCharts(calc);

    // Sync Total Utilities display
    const utilPeriod = calc.isAnnual ? '/ yr' : '/ mo';
    const utilAmount = calc.isAnnual ? calc.utilitiesTotal * 12 : calc.utilitiesTotal;
    el.totalUtilitiesDisplay.textContent = `${formatCurrency(utilAmount, true)} ${utilPeriod}`;

    // Persist
    persistState();
  }

  // --- Toast Notification Helper ---
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>${escapeHtml(message)}</span>
    `;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Utility: Escape HTML ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Export Handlers ---
  function exportCSV() {
    const calc = computeCalculations();
    const headers = ['Roommate Name', 'Monthly Income', 'Monthly Share', '% of Income', 'Max Affordable Cap', 'Difference / Buffer', 'Status'];
    
    const rows = calc.roommateBreakdowns.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      r.income.toFixed(2),
      r.monthlyShare.toFixed(2),
      r.incomeRatio.toFixed(1) + '%',
      (r.income * (state.affordabilityThreshold / 100)).toFixed(2),
      r.monthlyBuffer.toFixed(2),
      `"${r.statusLabel}"`
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `FairShare Rent & Utilities Summary\n`;
    csvContent += `Base Rent,${calc.rent}\n`;
    csvContent += `Total Utilities,${calc.utilitiesTotal}\n`;
    csvContent += `Total Monthly Cost,${calc.totalMonthlyCost}\n`;
    csvContent += `Split Method,${state.splitMethod}\n`;
    csvContent += `Affordability Threshold,${state.affordabilityThreshold}%\n\n`;
    csvContent += headers.join(',') + '\n';
    csvContent += rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FairShare_Split_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSV report exported successfully!');
  }

  function copySummaryToClipboard() {
    const calc = computeCalculations();
    const period = calc.isAnnual ? 'Annual' : 'Monthly';

    let summaryText = `🏠 FairShare™ Housing & Utilities Split Summary (${period})\n`;
    summaryText += `═══════════════════════════════════════\n`;
    summaryText += `• Base Rent: ${formatCurrency(calc.rent * (calc.isAnnual ? 12 : 1))}\n`;
    summaryText += `• Utilities: ${formatCurrency(calc.utilitiesTotal * (calc.isAnnual ? 12 : 1))}\n`;
    summaryText += `• Total Housing Cost: ${formatCurrency(calc.displayTotalCost)}\n`;
    summaryText += `• Total Household Income: ${formatCurrency(calc.displayTotalIncome)}\n`;
    summaryText += `• Household Rent-to-Income: ${formatPercent(calc.householdRatio)}\n`;
    summaryText += `• Split Strategy: ${state.splitMethod.toUpperCase()} SPLIT\n`;
    summaryText += `• Target Affordability Threshold: ${state.affordabilityThreshold}%\n\n`;
    summaryText += `Individual Breakdown:\n`;

    calc.roommateBreakdowns.forEach(r => {
      summaryText += `👉 ${r.name}: ${formatCurrency(r.displayShare)} (${formatPercent(r.incomeRatio)} of income) [${r.statusLabel}]\n`;
    });

    if (calc.rentBurdenedCount > 0) {
      summaryText += `\n⚠️ Note: ${calc.rentBurdenedCount} roommate(s) exceed the ${state.affordabilityThreshold}% affordability threshold.`;
    } else {
      summaryText += `\n✅ All roommates are within their target housing budget.`;
    }

    navigator.clipboard.writeText(summaryText).then(() => {
      showToast('Summary copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy to clipboard.');
    });
  }

  // --- Theme Controller ---
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      el.themeIconDark.style.display = 'block';
      el.themeIconLight.style.display = 'none';
    } else {
      el.themeIconDark.style.display = 'none';
      el.themeIconLight.style.display = 'block';
    }
    updateAll();
  }

  // --- Event Listeners Setup ---
  function attachEventListeners() {
    // 1. Rent Input
    el.baseRentInput.addEventListener('input', (e) => {
      state.rent = Math.max(0, parseFloat(e.target.value) || 0);
      updateAll();
    });

    // 2. Utilities Mode Tabs
    el.tabUtilItemized.addEventListener('click', () => {
      state.utilitiesMode = 'itemized';
      el.tabUtilItemized.classList.add('active');
      el.tabUtilLump.classList.remove('active');
      el.utilItemizedContainer.style.display = 'block';
      el.utilLumpContainer.style.display = 'none';
      updateAll();
    });

    el.tabUtilLump.addEventListener('click', () => {
      state.utilitiesMode = 'lump';
      el.tabUtilLump.classList.add('active');
      el.tabUtilItemized.classList.remove('active');
      el.utilItemizedContainer.style.display = 'none';
      el.utilLumpContainer.style.display = 'block';
      updateAll();
    });

    // 3. Lump Sum Input
    el.utilLumpInput.addEventListener('input', (e) => {
      state.utilitiesLump = Math.max(0, parseFloat(e.target.value) || 0);
      updateAll();
    });

    // 4. Add Utility Row
    el.btnAddUtilityRow.addEventListener('click', () => {
      const newId = 'u_' + Date.now();
      state.utilitiesItemized.push({
        id: newId,
        name: 'New Utility',
        amount: 50
      });
      renderItemizedUtilities();
      updateAll();
    });

    // 5. Itemized Utilities Delegated Events
    el.itemizedUtilityList.addEventListener('input', (e) => {
      const row = e.target.closest('.utility-row');
      if (!row) return;
      const id = row.dataset.id;
      const item = state.utilitiesItemized.find(u => u.id === id);
      if (!item) return;

      if (e.target.dataset.action === 'edit-util-name') {
        item.name = e.target.value;
      } else if (e.target.dataset.action === 'edit-util-amount') {
        item.amount = Math.max(0, parseFloat(e.target.value) || 0);
      }
      updateAll();
    });

    el.itemizedUtilityList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="remove-util"]');
      if (!btn) return;
      const row = btn.closest('.utility-row');
      if (!row) return;
      const id = row.dataset.id;

      state.utilitiesItemized = state.utilitiesItemized.filter(u => u.id !== id);
      renderItemizedUtilities();
      updateAll();
    });

    // 6. Split Method Radios
    el.splitMethodRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.splitMethod = e.target.value;
        renderRoommatesList();
        updateAll();
      });
    });

    // 7. Affordability Slider & Chips
    el.thresholdSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.affordabilityThreshold = val;
      el.thresholdBadge.textContent = `${val}%`;
      
      // Update chips active state
      el.chipBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.threshold, 10) === val);
      });

      updateAll();
    });

    el.chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.threshold, 10);
        state.affordabilityThreshold = val;
        el.thresholdSlider.value = val;
        el.thresholdBadge.textContent = `${val}%`;

        el.chipBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        updateAll();
      });
    });

    // 8. Add Roommate
    el.btnAddRoommate.addEventListener('click', () => {
      const count = state.roommates.length + 1;
      const newRoommate = {
        id: 'r_' + Date.now(),
        name: `Roommate ${count}`,
        income: 3500,
        weight: 1.0,
        color: AVATAR_COLORS[(count - 1) % AVATAR_COLORS.length]
      };
      state.roommates.push(newRoommate);
      renderRoommatesList();
      updateAll();
      showToast(`Added Roommate ${count}`);
    });

    // 9. Roommate Card Delegated Events
    el.roommatesList.addEventListener('input', (e) => {
      const card = e.target.closest('.roommate-row-card');
      if (!card) return;
      const id = card.dataset.id;
      const roommate = state.roommates.find(r => r.id === id);
      if (!roommate) return;

      if (e.target.dataset.action === 'edit-roommate-name') {
        roommate.name = e.target.value;
        const avatar = card.querySelector('.roommate-avatar');
        if (avatar) avatar.textContent = (roommate.name || 'R').charAt(0).toUpperCase();
      } else if (e.target.dataset.action === 'edit-roommate-income') {
        roommate.income = Math.max(0, parseFloat(e.target.value) || 0);
      } else if (e.target.dataset.action === 'edit-roommate-weight') {
        roommate.weight = Math.max(0.1, parseFloat(e.target.value) || 1.0);
      }

      updateAll();
    });

    el.roommatesList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="remove-roommate"]');
      if (!btn) return;
      if (state.roommates.length <= 1) {
        showToast('At least 1 roommate is required.');
        return;
      }
      const card = btn.closest('.roommate-row-card');
      if (!card) return;
      const id = card.dataset.id;

      state.roommates = state.roommates.filter(r => r.id !== id);
      renderRoommatesList();
      updateAll();
      showToast('Roommate removed.');
    });

    // 10. Horizon Toggle
    el.btnMonthly.addEventListener('click', () => {
      state.timeHorizon = 'monthly';
      el.btnMonthly.classList.add('active');
      el.btnAnnual.classList.remove('active');
      updateAll();
    });

    el.btnAnnual.addEventListener('click', () => {
      state.timeHorizon = 'annual';
      el.btnAnnual.classList.add('active');
      el.btnMonthly.classList.remove('active');
      updateAll();
    });

    // 11. Chart Toggle (Bar vs Donut)
    el.btnChartBar.addEventListener('click', () => {
      el.btnChartBar.classList.add('active');
      el.btnChartDonut.classList.remove('active');
      el.barChartWrapper.style.display = 'block';
      el.donutChartWrapper.style.display = 'none';
      if (barChartInstance) barChartInstance.resize();
    });

    el.btnChartDonut.addEventListener('click', () => {
      el.btnChartDonut.classList.add('active');
      el.btnChartBar.classList.remove('active');
      el.donutChartWrapper.style.display = 'block';
      el.barChartWrapper.style.display = 'none';
      if (donutChartInstance) donutChartInstance.resize();
    });

    // 12. Presets Selector
    el.presetSelector.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      if (PRESETS[presetKey]) {
        state = JSON.parse(JSON.stringify({ ...state, ...PRESETS[presetKey] }));
        syncInputsWithState();
        showToast(`Loaded ${e.target.options[e.target.selectedIndex].text}`);
      }
    });

    // 13. Theme Toggle
    el.themeToggleBtn.addEventListener('click', () => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });

    // 14. Reset Button
    el.resetBtn.addEventListener('click', () => {
      if (confirm('Reset calculator to default values?')) {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        localStorage.removeItem('fairshare_calculator_state');
        syncInputsWithState();
        showToast('Reset to default values.');
      }
    });

    // 15. Action Buttons
    el.btnCopySummary.addEventListener('click', copySummaryToClipboard);
    el.btnExportCSV.addEventListener('click', exportCSV);
    el.btnPrintReport.addEventListener('click', () => window.print());
  }

  // --- Synchronize UI Inputs with Current State ---
  function syncInputsWithState() {
    el.baseRentInput.value = state.rent;
    el.utilLumpInput.value = state.utilitiesLump;

    // Utilities mode
    if (state.utilitiesMode === 'itemized') {
      el.tabUtilItemized.classList.add('active');
      el.tabUtilLump.classList.remove('active');
      el.utilItemizedContainer.style.display = 'block';
      el.utilLumpContainer.style.display = 'none';
    } else {
      el.tabUtilLump.classList.add('active');
      el.tabUtilItemized.classList.remove('active');
      el.utilItemizedContainer.style.display = 'none';
      el.utilLumpContainer.style.display = 'block';
    }

    // Split method radio
    el.splitMethodRadios.forEach(r => {
      r.checked = (r.value === state.splitMethod);
    });

    // Affordability Threshold
    el.thresholdSlider.value = state.affordabilityThreshold;
    el.thresholdBadge.textContent = `${state.affordabilityThreshold}%`;
    el.chipBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.threshold, 10) === state.affordabilityThreshold);
    });

    // Time horizon
    if (state.timeHorizon === 'annual') {
      el.btnAnnual.classList.add('active');
      el.btnMonthly.classList.remove('active');
    } else {
      el.btnMonthly.classList.add('active');
      el.btnAnnual.classList.remove('active');
    }

    renderItemizedUtilities();
    renderRoommatesList();
    applyTheme(state.theme || 'dark');
  }

  // --- App Initialization ---
  function init() {
    loadPersistedState();
    attachEventListeners();
    syncInputsWithState();
    updateAll();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
