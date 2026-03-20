/**
 * components/chart.js — Chart.js wrapper module.
 * All charts are theme-aware and registered in _cache for lifecycle management.
 * Charts.killAll() must be called before navigating away from a view.
 */

/* global Chart */

/** Registry of active Chart instances keyed by a string ID */
const _cache = {};

/** Callback invoked by Charts.refresh() — set from app.js to avoid circular dep */
let _refreshFn = () => {};

// ── Theme Helpers ────────────────────────────────────

function themeDefaults() {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    tc:  light ? '#4a5575' : '#8891b0',  // tick colour
    gc:  light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',  // grid colour
    bg:  light ? '#ffffff' : '#111828',  // background (for border)
    ff: '"Syne", system-ui, sans-serif',
  };
}

function tooltipDefaults() {
  return {
    backgroundColor: '#0c1220',
    borderColor:     'rgba(200,168,75,.3)',
    borderWidth: 1,
    titleColor:  '#e8eaf5',
    bodyColor:   '#8891b0',
    padding: 10,
    cornerRadius: 8,
  };
}

// ── Lifecycle ────────────────────────────────────────

function kill(key) {
  if (_cache[key]) { try { _cache[key].destroy(); } catch (_) {} delete _cache[key]; }
}

export const Charts = {
  kill,
  killAll() { Object.keys(_cache).forEach(kill); },

  /** Called by app.js to wire in the router's renderCurrent */
  setRefresh(fn) { _refreshFn = fn; },
  refresh()      { this.killAll(); _refreshFn(); },

  // ── Individual Chart Builders ──────────────────────

  /** 6-month income / expense bar + net savings line */
  trend(canvasId, data) {
    kill('trend');
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const d = themeDefaults();
    _cache['trend'] = new Chart(cv, {
      type: 'bar',
      data: {
        labels: data.months,
        datasets: [
          { label: 'Income',   data: data.income,   backgroundColor: 'rgba(14,210,176,.75)', borderRadius: 5, borderSkipped: false },
          { label: 'Expenses', data: data.expenses, backgroundColor: 'rgba(240,90,126,.7)',  borderRadius: 5, borderSkipped: false },
          {
            label: 'Net', type: 'line',
            data: data.income.map((v, i) => Math.max(0, v - data.expenses[i])),
            borderColor: '#c8a84b', backgroundColor: 'transparent',
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#c8a84b', tension: .4,
          },
        ],
      },
      options: _baseOptions(d, v => _sym() + v.toLocaleString()),
    });
  },

  /** Expense breakdown doughnut */
  donut(canvasId, breakdown) {
    kill('donut');
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);
    const d = themeDefaults();
    _cache['donut'] = new Chart(cv, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: labels.map(l => _catColor(l)), borderColor: d.bg, borderWidth: 3, hoverOffset: 5 }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipDefaults(),
            callbacks: { label: c => { const tot = values.reduce((a,b) => a+b, 0); return ` ${c.label}: ${_sym()}${c.parsed.toFixed(2)} (${(c.parsed/tot*100).toFixed(1)}%)`; } },
          },
        },
      },
    });
  },

  /** Cash flow forecast line chart */
  forecastLine(canvasId, rows) {
    kill('fore');
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const d = themeDefaults();
    _cache['fore'] = new Chart(cv, {
      type: 'line',
      data: {
        labels: rows.map(r => r.label),
        datasets: [
          { label: 'Balance',  data: rows.map(r => r.bal), borderColor: '#c8a84b', backgroundColor: 'rgba(200,168,75,.1)', fill: true, tension: .4, pointRadius: 4, pointBackgroundColor: '#c8a84b', borderWidth: 2.5 },
          { label: 'Income',   data: rows.map(r => r.inc), borderColor: '#0ed2b0', backgroundColor: 'transparent', borderDash: [5,4], pointRadius: 3, borderWidth: 1.5 },
          { label: 'Expenses', data: rows.map(r => r.exp), borderColor: '#f05a7e', backgroundColor: 'transparent', borderDash: [5,4], pointRadius: 3, borderWidth: 1.5 },
        ],
      },
      options: _baseOptions(d, v => _sym() + v.toLocaleString()),
    });
  },

  /** Net worth assets vs liabilities bar chart */
  nwBar(canvasId, data) {
    kill('nwBar');
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const d = themeDefaults();
    _cache['nwBar'] = new Chart(cv, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          { label: 'Assets',      data: data.assets,      backgroundColor: 'rgba(14,210,176,.7)',  borderRadius: 5 },
          { label: 'Liabilities', data: data.liabilities, backgroundColor: 'rgba(240,90,126,.7)', borderRadius: 5 },
        ],
      },
      options: _baseOptions(d, v => _sym() + v.toLocaleString()),
    });
  },

  /** Budget planned vs actual horizontal bar */
  budBar(canvasId, planned, actuals, cats) {
    kill('budBar');
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const d = themeDefaults();
    _cache['budBar'] = new Chart(cv, {
      type: 'bar',
      data: {
        labels: cats,
        datasets: [
          { label: 'Planned', data: cats.map(c => planned[c] || 0), backgroundColor: 'rgba(200,168,75,.6)', borderRadius: 4 },
          { label: 'Actual',  data: cats.map(c => actuals[c] || 0), backgroundColor: 'rgba(91,164,245,.6)', borderRadius: 4 },
        ],
      },
      options: {
        ..._baseOptions(d, v => _sym() + v.toLocaleString()),
        indexAxis: 'y',
      },
    });
  },
};

// ── Internal Helpers ─────────────────────────────────

function _baseOptions(d, yTickFmt) {
  return {
    responsive: true, maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: d.tc, font: { family: d.ff, size: 11 }, boxWidth: 13, padding: 12 } },
      tooltip: { ...tooltipDefaults(), callbacks: { label: c => ` ${c.dataset.label}: ${_sym()}${(c.parsed.y ?? c.parsed).toFixed(2)}` } },
    },
    scales: {
      x: { ticks: { color: d.tc, font: { family: d.ff, size: 10 } }, grid: { color: d.gc } },
      y: { ticks: { color: d.tc, font: { family: '"JetBrains Mono", monospace', size: 10 }, callback: yTickFmt }, grid: { color: d.gc } },
    },
  };
}

function _sym() {
  try { return JSON.parse(localStorage.getItem('finsuite_v3') || '{}')?.d?.user?.sym || '£'; }
  catch { return '£'; }
}

function _catColor(name) {
  const colors = { 'Housing':'#5ba4f5','Groceries':'#4ade80','Food & Dining':'#fb923c','Transport':'#c8a84b','Shopping':'#a78bfa','Entertainment':'#f472b6','Healthcare':'#0ed2b0','Utilities':'#5ac8fa','Education':'#34d399','Savings':'#fbbf24','Subscriptions':'#818cf8','Travel':'#38bdf8','Insurance':'#64748b' };
  return colors[name] || '#64748b';
}
