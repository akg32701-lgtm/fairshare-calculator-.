/* FairShare calculator: monthly expense splitting and affordability checks. */
(function () {
  'use strict';

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
  let idCounter = 0;
  const DEFAULT_STATE = {
    rent: 2400, utilitiesMode: 'itemized', utilitiesLump: 350,
    utilitiesItemized: [
      { id: 'u1', name: 'Electricity', amount: 120 }, { id: 'u2', name: 'Water & Sewer', amount: 65 },
      { id: 'u3', name: 'Internet', amount: 85 }, { id: 'u4', name: 'Gas / Heating', amount: 50 }
    ],
    splitMethod: 'equal', affordabilityThreshold: 30, theme: 'dark',
    roommates: [
      { id: 'r1', name: 'Alex', income: 4400, weight: 1, color: COLORS[0] },
      { id: 'r2', name: 'Jordan', income: 3400, weight: 1, color: COLORS[1] },
      { id: 'r3', name: 'Taylor', income: 2700, weight: 1, color: COLORS[2] }
    ]
  };
  let state = clone(DEFAULT_STATE);
  let barChartInstance = null;
  let warnings = [];

  const el = {
    themeToggleBtn: byId('themeToggleBtn'), themeIconDark: byId('themeIconDark'), themeIconLight: byId('themeIconLight'), resetBtn: byId('resetBtn'),
    kpiTotalCost: byId('kpiTotalCost'), kpiRentUtilBreakdown: byId('kpiRentUtilBreakdown'), kpiTotalIncome: byId('kpiTotalIncome'), kpiRoommateCount: byId('kpiRoommateCount'),
    kpiHouseholdRatio: byId('kpiHouseholdRatio'), kpiHouseholdStatus: byId('kpiHouseholdStatus'), kpiRatioCard: byId('kpiRatioCard'), kpiBurdenCount: byId('kpiBurdenCount'), kpiBurdenSubtitle: byId('kpiBurdenSubtitle'), kpiBurdenCard: byId('kpiBurdenCard'),
    baseRentInput: byId('baseRentInput'), tabUtilItemized: byId('tabUtilItemized'), tabUtilLump: byId('tabUtilLump'), utilLumpContainer: byId('utilLumpContainer'), utilLumpInput: byId('utilLumpInput'), utilItemizedContainer: byId('utilItemizedContainer'), itemizedUtilityList: byId('itemizedUtilityList'), btnAddUtilityRow: byId('btnAddUtilityRow'), totalUtilitiesDisplay: byId('totalUtilitiesDisplay'),
    splitMethodRadios: document.querySelectorAll('input[name="splitMethod"]'), thresholdSlider: byId('thresholdSlider'), thresholdBadge: byId('thresholdBadge'), chipBtns: document.querySelectorAll('.chip-btn'), roommatesCard: byId('roommatesCard'), roommateCountBadge: byId('roommateCountBadge'), roommatesList: byId('roommatesList'), btnAddRoommate: byId('btnAddRoommate'),
    resultsTableBody: byId('resultsTableBody'), emptyState: byId('emptyState'), remediation: byId('remediation'), affordabilityBarChart: byId('affordabilityBarChart'), btnExportCSV: byId('btnExportCSV'), btnCopyShareLink: byId('btnCopyShareLink'), toastContainer: byId('toastContainer'), warningContainer: byId('warningContainer')
  };

  function byId(id) { return document.getElementById(id); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function money(value, cents = true) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(Number.isFinite(value) ? value : 0); }
  function percent(value) { return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`; }
  function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }
  function newId(prefix) { return typeof crypto !== 'undefined' && crypto.randomUUID ? `${prefix}_${crypto.randomUUID()}` : `${prefix}_${Date.now()}_${++idCounter}`; }
  function numberOrZero(value, label, notify = false) {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) { if (notify) warn(`${label} must be a non-negative number — set to 0.`); return 0; }
    return parsed;
  }
  function warn(message) { if (!warnings.includes(message)) warnings.push(message); }
  function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast'; toast.innerHTML = `<span>${escapeHtml(message)}</span><button aria-label="Dismiss">×</button>`; toast.querySelector('button').onclick = () => toast.remove(); el.toastContainer.appendChild(toast); setTimeout(() => toast.remove(), 5000); }
  function renderWarnings() { el.warningContainer.innerHTML = warnings.map(message => `<div class="warning-message"><span>⚠ ${escapeHtml(message)}</span><button type="button" aria-label="Dismiss warning">×</button></div>`).join(''); el.warningContainer.querySelectorAll('button').forEach((button, i) => button.onclick = () => { warnings.splice(i, 1); renderWarnings(); }); }

  function computeCalculations() {
    const rent = numberOrZero(state.rent, 'Rent');
    const utilitiesTotal = state.utilitiesMode === 'itemized' ? state.utilitiesItemized.reduce((sum, item) => sum + numberOrZero(item.amount, `${item.name || 'Utility'} amount`), 0) : numberOrZero(state.utilitiesLump, 'Utility amount');
    const totalMonthlyCost = rent + utilitiesTotal;
    const count = state.roommates.length;
    const incomes = state.roommates.map(r => numberOrZero(r.income, `${r.name || 'Roommate'} income`));
    const weights = state.roommates.map(r => numberOrZero(r.weight, `${r.name || 'Roommate'} weight`));
    const totalIncome = incomes.reduce((a, b) => a + b, 0);
    const totalWeights = weights.reduce((a, b) => a + b, 0);
    let fallback = '';
    if (count && state.splitMethod === 'income' && totalIncome === 0) fallback = 'Income-weighted split needs at least one non-zero income — showing equal split instead.';
    if (count && state.splitMethod === 'custom' && totalWeights === 0) fallback = 'Custom-weight split needs at least one non-zero weight — showing equal split instead.';
    if (fallback) warn(fallback);
    const rawShares = state.roommates.map((roommate, index) => {
      if (!count) return 0;
      if (state.splitMethod === 'income' && totalIncome > 0) return totalMonthlyCost * incomes[index] / totalIncome;
      if (state.splitMethod === 'custom' && totalWeights > 0) return totalMonthlyCost * weights[index] / totalWeights;
      return totalMonthlyCost / count;
    });
    // Reconcile currency rounding by assigning the cent remainder to the largest share.
    const shares = rawShares.map(value => Math.round(value * 100) / 100);
    if (shares.length) { const largest = shares.indexOf(Math.max(...shares)); shares[largest] = Math.round((shares[largest] + (Math.round(totalMonthlyCost * 100) / 100 - shares.reduce((a, b) => a + b, 0))) * 100) / 100; }
    const roommateBreakdowns = state.roommates.map((r, index) => {
      const income = incomes[index], monthlyShare = shares[index], cap = income * state.affordabilityThreshold / 100, ratio = income > 0 ? monthlyShare / income * 100 : 0;
      const over = income > 0 && ratio > state.affordabilityThreshold;
      return { id: r.id, name: r.name || `Roommate ${index + 1}`, color: r.color || COLORS[index % COLORS.length], income, weight: weights[index], monthlyShare, monthlyBuffer: cap - monthlyShare, maxAffordable: cap, incomeRatio: ratio, status: income === 0 && totalMonthlyCost > 0 ? 'warn' : over ? 'danger' : 'safe', statusLabel: income === 0 && totalMonthlyCost > 0 ? 'No Income' : over ? 'Over Threshold' : 'Affordable', statusIcon: income === 0 && totalMonthlyCost > 0 ? '⚠️' : over ? '🔴' : '🟢' };
    });
    return { rent, utilitiesTotal, totalMonthlyCost, totalIncome, count, roommateBreakdowns, householdRatio: totalIncome ? totalMonthlyCost / totalIncome * 100 : 0, rentBurdenedCount: roommateBreakdowns.filter(r => r.income > 0 && r.incomeRatio > state.affordabilityThreshold).length };
  }

  function renderKPIs(calc) {
    el.kpiTotalCost.textContent = money(calc.totalMonthlyCost, false); el.kpiRentUtilBreakdown.textContent = `Rent: ${money(calc.rent, false)} + Utils: ${money(calc.utilitiesTotal, false)} · ≈ ${money(calc.totalMonthlyCost * 12, false)}/year`;
    el.kpiTotalIncome.textContent = money(calc.totalIncome, false); el.kpiRoommateCount.textContent = `Across ${calc.count} roommate${calc.count === 1 ? '' : 's'}`;
    el.kpiHouseholdRatio.textContent = percent(calc.householdRatio); const householdOver = calc.totalIncome > 0 && calc.householdRatio > state.affordabilityThreshold; el.kpiHouseholdStatus.textContent = householdOver ? `Over ${state.affordabilityThreshold}% target` : `Within ${state.affordabilityThreshold}% target`; el.kpiRatioCard.className = `kpi-card ${householdOver ? 'danger' : 'safe'}`;
    el.kpiBurdenCount.textContent = `${calc.rentBurdenedCount} of ${calc.count}`; el.kpiBurdenSubtitle.textContent = calc.rentBurdenedCount ? `Exceed ${state.affordabilityThreshold}% cap` : 'All within target budget'; el.kpiBurdenCard.className = `kpi-card ${calc.rentBurdenedCount ? 'danger' : 'safe'}`;
  }
  function renderRoommates() {
    el.roommateCountBadge.textContent = `${state.roommates.length} Roommate${state.roommates.length === 1 ? '' : 's'}`; el.roommatesCard.classList.toggle('custom-split-active', state.splitMethod === 'custom');
    el.roommatesList.innerHTML = state.roommates.map((r, i) => `<div class="roommate-row-card" data-id="${r.id}"><div class="roommate-card-top"><div class="roommate-avatar" style="background:${r.color || COLORS[i % COLORS.length]}">${escapeHtml((r.name || 'R')[0].toUpperCase())}</div><input class="form-control roommate-name-input" data-action="name" value="${escapeHtml(r.name)}" aria-label="Roommate name"><button type="button" class="btn btn-danger-ghost" data-action="remove" aria-label="Remove roommate">×</button></div><div class="roommate-card-inputs ${state.splitMethod === 'custom' ? '' : 'no-weight'}"><div class="form-group"><label class="form-label">Monthly Income</label><div class="input-currency-wrapper"><span class="currency-symbol">$</span><input type="number" min="0" class="form-control has-currency" data-action="income" value="${r.income}" aria-label="Monthly income"></div></div><div class="form-group custom-weight-field"><label class="form-label">Room Weight</label><input type="number" min="0" step="0.1" class="form-control" data-action="weight" value="${r.weight}" aria-label="Room weight"></div></div></div>`).join('');
  }
  function renderUtilities() { el.itemizedUtilityList.innerHTML = state.utilitiesItemized.map(item => `<div class="utility-row" data-id="${item.id}"><div class="utility-row-label"><input class="form-control" data-action="name" value="${escapeHtml(item.name)}" aria-label="Utility name"></div><div class="input-currency-wrapper"><span class="currency-symbol">$</span><input type="number" min="0" class="form-control has-currency" data-action="amount" value="${item.amount}" aria-label="Utility amount"></div><button type="button" class="btn btn-danger-ghost" data-action="remove" aria-label="Remove utility">×</button></div>`).join(''); }
  function renderResults(calc) {
    el.resultsTableBody.innerHTML = calc.roommateBreakdowns.map(item => { const over = item.monthlyBuffer < 0; return `<tr><td><div class="td-roommate"><div class="roommate-avatar" style="background:${item.color}">${escapeHtml(item.name[0].toUpperCase())}</div><div>${escapeHtml(item.name)}<div style="font-size:.75rem;color:var(--text-muted)">${money(item.income, false)}/mo income</div></div></div></td><td class="td-number">${money(item.monthlyShare)}</td><td><div class="td-number" style="color:var(--status-${item.status})">${item.income ? percent(item.incomeRatio) : 'N/A'}</div></td><td class="td-number">${money(item.maxAffordable, false)}</td><td class="td-number" style="color:${over ? 'var(--status-danger)' : 'var(--status-safe)'}">${item.income ? `${over ? '-' : '+'}${money(Math.abs(item.monthlyBuffer), false)} ${over ? 'over' : 'under'}` : '—'}</td><td><span class="status-badge ${item.status}"><span>${item.statusIcon}</span>${item.statusLabel}</span></td></tr>`; }).join('');
    el.emptyState.hidden = calc.count !== 0;
    const over = calc.roommateBreakdowns.filter(r => r.income > 0 && r.incomeRatio > state.affordabilityThreshold);
    el.remediation.innerHTML = over.map(r => { const neededIncome = r.monthlyShare / (state.affordabilityThreshold / 100); const maxCost = r.income * state.affordabilityThreshold / 100; return `<div><strong>${escapeHtml(r.name)}:</strong> needs ${money(neededIncome)} monthly income to meet the ${state.affordabilityThreshold}% target at this share, or a ${money(r.monthlyShare - maxCost)} lower monthly share.</div>`; }).join('');
  }
  function updateChart(calc) {
    if (!window.Chart || !el.affordabilityBarChart) return; if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(el.affordabilityBarChart.getContext('2d'), { type: 'bar', data: { labels: calc.roommateBreakdowns.map(r => r.name), datasets: [{ label: 'Monthly Share', data: calc.roommateBreakdowns.map(r => r.monthlyShare), backgroundColor: calc.roommateBreakdowns.map(r => r.status === 'safe' ? '#10b981' : '#ef4444') }, { label: `Affordable Cap (${state.affordabilityThreshold}%)`, data: calc.roommateBreakdowns.map(r => r.maxAffordable), backgroundColor: 'rgba(148,163,184,.45)' }] }, options: { responsive: true, maintainAspectRatio: false } });
  }
  function updateAll() { warnings = []; const calc = computeCalculations(); if (calc.rent > 0 && calc.utilitiesTotal === 0) warn('Rent is set but utilities are all $0 — check that utilities were not omitted.'); calc.roommateBreakdowns.filter(r => r.income > 0 && r.monthlyShare > r.income).forEach(r => warn(`${r.name}'s share exceeds their entire monthly income.`)); renderWarnings(); renderKPIs(calc); renderResults(calc); updateChart(calc); el.totalUtilitiesDisplay.textContent = `${money(calc.utilitiesTotal)} / mo`; persist(); }
  function persist() { try { localStorage.setItem('fairshare_calculator_state', JSON.stringify(state)); } catch (_) {} }
  function load() { const params = new URLSearchParams(location.search); const encoded = params.get('state'); try { state = encoded ? { ...DEFAULT_STATE, ...JSON.parse(decodeURIComponent(escape(atob(encoded)))) } : { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem('fairshare_calculator_state') || '{}') }; } catch (_) { state = clone(DEFAULT_STATE); } state.roommates = Array.isArray(state.roommates) ? state.roommates : []; }
  function sync() { el.baseRentInput.value = state.rent; el.utilLumpInput.value = state.utilitiesLump; el.thresholdSlider.value = state.affordabilityThreshold; el.thresholdBadge.textContent = `${state.affordabilityThreshold}%`; el.tabUtilItemized.classList.toggle('active', state.utilitiesMode === 'itemized'); el.tabUtilLump.classList.toggle('active', state.utilitiesMode === 'lump'); el.utilItemizedContainer.style.display = state.utilitiesMode === 'itemized' ? 'block' : 'none'; el.utilLumpContainer.style.display = state.utilitiesMode === 'lump' ? 'block' : 'none'; el.splitMethodRadios.forEach(r => r.checked = r.value === state.splitMethod); el.chipBtns.forEach(b => b.classList.toggle('active', +b.dataset.threshold === +state.affordabilityThreshold)); renderUtilities(); renderRoommates(); applyTheme(state.theme); }
  function applyTheme(theme) { state.theme = theme; document.documentElement.setAttribute('data-theme', theme); el.themeIconDark.style.display = theme === 'dark' ? 'block' : 'none'; el.themeIconLight.style.display = theme === 'light' ? 'block' : 'none'; }
  function clampInput(event, label, setter) { const value = numberOrZero(event.target.value, label, true); setter(value); event.target.value = value; updateAll(); }
  function exportCSV() { const calc = computeCalculations(); const rows = calc.roommateBreakdowns.map(r => [`"${r.name.replace(/"/g, '""')}"`, r.income.toFixed(2), r.monthlyShare.toFixed(2), `${r.incomeRatio.toFixed(1)}%`, r.maxAffordable.toFixed(2), r.monthlyBuffer.toFixed(2), `"${r.statusLabel}"`].join(',')); const csv = ['FairShare Rent & Utilities Summary', `Base Rent,${calc.rent}`, `Total Utilities,${calc.utilitiesTotal}`, `Total Monthly Cost,${calc.totalMonthlyCost}`, `Split Method,${state.splitMethod}`, `Affordability Threshold,${state.affordabilityThreshold}%`, '', 'Roommate Name,Monthly Income,Monthly Share,% of Income,Max Affordable Cap,Difference / Buffer,Status', ...rows].join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'FairShare_Split_Report.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV report exported.'); }
  function copyShareLink() { const shareState = { rent: state.rent, utilitiesMode: state.utilitiesMode, utilitiesLump: state.utilitiesLump, utilitiesItemized: state.utilitiesItemized, roommates: state.roommates, splitMethod: state.splitMethod, affordabilityThreshold: state.affordabilityThreshold, theme: state.theme }; const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareState)))); const url = `${location.origin}${location.pathname}?state=${encodeURIComponent(encoded)}`; history.replaceState(null, '', url); navigator.clipboard.writeText(url).then(() => showToast('Share link copied.')).catch(() => showToast('Share link is in the address bar.')); }
  function attach() {
    el.baseRentInput.oninput = e => clampInput(e, 'Rent', v => state.rent = v); el.utilLumpInput.oninput = e => clampInput(e, 'Utility amount', v => state.utilitiesLump = v);
    el.tabUtilItemized.onclick = () => { state.utilitiesMode = 'itemized'; sync(); updateAll(); }; el.tabUtilLump.onclick = () => { state.utilitiesMode = 'lump'; sync(); updateAll(); };
    el.btnAddUtilityRow.onclick = () => { state.utilitiesItemized.push({ id: newId('u'), name: 'New Utility', amount: 0 }); renderUtilities(); updateAll(); };
    el.itemizedUtilityList.oninput = e => { const row = e.target.closest('.utility-row'), item = row && state.utilitiesItemized.find(u => u.id === row.dataset.id); if (!item) return; if (e.target.dataset.action === 'name') item.name = e.target.value; else if (e.target.dataset.action === 'amount') { item.amount = numberOrZero(e.target.value, `${item.name || 'Utility'} amount`, true); e.target.value = item.amount; } updateAll(); };
    el.itemizedUtilityList.onclick = e => { const row = e.target.closest('.utility-row'); if (e.target.closest('[data-action="remove"]') && row) { state.utilitiesItemized = state.utilitiesItemized.filter(u => u.id !== row.dataset.id); renderUtilities(); updateAll(); } };
    el.splitMethodRadios.forEach(r => r.onchange = e => { state.splitMethod = e.target.value; renderRoommates(); updateAll(); }); el.thresholdSlider.oninput = e => { state.affordabilityThreshold = +e.target.value; sync(); updateAll(); }; el.chipBtns.forEach(b => b.onclick = () => { state.affordabilityThreshold = +b.dataset.threshold; sync(); updateAll(); });
    el.btnAddRoommate.onclick = () => { const n = state.roommates.length + 1; state.roommates.push({ id: newId('r'), name: `Roommate ${n}`, income: 3000, weight: 1, color: COLORS[(n - 1) % COLORS.length] }); renderRoommates(); updateAll(); };
    el.roommatesList.oninput = e => { const row = e.target.closest('.roommate-row-card'), r = row && state.roommates.find(x => x.id === row.dataset.id); if (!r) return; const action = e.target.dataset.action; if (action === 'name') r.name = e.target.value; else { r[action] = numberOrZero(e.target.value, `${r.name || 'Roommate'} ${action}`, true); e.target.value = r[action]; } updateAll(); };
    el.roommatesList.onclick = e => { const row = e.target.closest('.roommate-row-card'); if (e.target.closest('[data-action="remove"]') && row) { state.roommates = state.roommates.filter(r => r.id !== row.dataset.id); renderRoommates(); updateAll(); } };
    el.themeToggleBtn.onclick = () => { applyTheme(state.theme === 'dark' ? 'light' : 'dark'); updateAll(); }; el.resetBtn.onclick = () => { state = clone(DEFAULT_STATE); history.replaceState(null, '', location.pathname); sync(); updateAll(); }; el.btnExportCSV.onclick = exportCSV; el.btnCopyShareLink.onclick = copyShareLink;
  }
  function init() { load(); attach(); sync(); updateAll(); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
