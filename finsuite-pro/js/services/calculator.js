/**
 * services/calculator.js — Pure financial calculations.
 * Reads from State but never writes to it. No UI side effects.
 */

import { State } from '../state.js';
import { MOS, MO_LABELS } from '../utils.js';

export { MOS, MO_LABELS };

// ── Date Helpers ─────────────────────────────────────

export const curMo   = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
export const curYear = () => new Date().getFullYear();
export const moOf    = s  => (s ? s.slice(0, 7) : '');
export const moKey   = mo => MOS[parseInt(mo.split('-')[1]) - 1];

export function moLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
}

export function fmtDate(s) {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(s) {
  if (!s) return null;
  const t = new Date(s + 'T00:00:00'), n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.ceil((t - n) / 864e5);
}

/** Returns the last 6 month keys in 'YYYY-MM' format */
export function last6Mo() {
  const ms = [], now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ms.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  return ms;
}

// ── Transaction Aggregators ──────────────────────────

export function moInc(mo, txs) {
  return (txs || State.get('tx'))
    .filter(t => t.type === 'income' && moOf(t.date) === mo)
    .reduce((s, t) => s + t.amount, 0);
}

export function moExp(mo, txs) {
  return (txs || State.get('tx'))
    .filter(t => t.type === 'expense' && moOf(t.date) === mo)
    .reduce((s, t) => s + t.amount, 0);
}

/** Returns { category: totalSpend } for expenses in a given month, sorted desc */
export function catBreak(mo, txs) {
  const r = {};
  (txs || State.get('tx'))
    .filter(t => t.type === 'expense' && moOf(t.date) === mo)
    .forEach(t => { r[t.category] = (r[t.category] || 0) + t.amount; });
  return Object.fromEntries(Object.entries(r).sort((a, b) => b[1] - a[1]));
}

// ── Net Worth ────────────────────────────────────────

export function nwCalc(accounts) {
  const acc = accounts || State.get('accounts');
  const assets      = acc.filter(a => !a.isL).reduce((s, a) => s + a.value, 0);
  const liabilities = acc.filter(a =>  a.isL).reduce((s, a) => s + a.value, 0);
  return { assets, liabilities, nw: assets - liabilities };
}

export function totalBal(accounts) {
  return (accounts || State.get('accounts')).reduce((s, a) => s + (a.isL ? -a.value : a.value), 0);
}

/** NW growth % since first snapshot */
export function nwGrowth() {
  const snaps = State.get('snapshots');
  if (snaps.length < 2) return 0;
  const first = snaps[0].nw, last = snaps[snaps.length - 1].nw;
  return first === 0 ? 0 : (last - first) / Math.abs(first) * 100;
}

// ── Rates ────────────────────────────────────────────

export const savRate  = (inc, exp) => inc > 0 ? Math.max(0, Math.min(100, (inc - exp) / inc * 100)) : 0;
export const expRatio = (inc, exp) => inc > 0 ? Math.min(100, exp / inc * 100) : 0;

export function momChange(type, txs) {
  const ms = last6Mo();
  const fn = type === 'income' ? moInc : moExp;
  const cur  = fn(ms[5], txs);
  const prev = fn(ms[4], txs);
  return prev === 0 ? 0 : (cur - prev) / prev * 100;
}

// ── Trend Data ───────────────────────────────────────

export function moTrend(txs) {
  const ms = last6Mo();
  return {
    months:   ms.map(moLabel),
    income:   ms.map(m => moInc(m, txs)),
    expenses: ms.map(m => moExp(m, txs)),
  };
}

// ── Budget Analytics ─────────────────────────────────

/** Actual spend per category for a given 'YYYY-MM' month */
export const budActuals = (mo, txs) => catBreak(mo, txs);

/**
 * Planned amounts per category for a given year + month key.
 * Returns { category: plannedAmount }
 */
export function budPlanned(year, mk) {
  const bud = State.get('budgets');
  if (!bud[year]) return {};
  const out = {};
  for (const cat in bud[year]) {
    const data = bud[year][cat];
    out[cat] = data._total ? (data._total[mk] || 0) : 0;
  }
  return out;
}

/**
 * Budget accuracy as a percentage (100 = perfect match).
 * Uses absolute difference between planned and actual totals.
 */
export function budAccuracy(mo, txs) {
  const yr = parseInt(mo.split('-')[0]);
  const mk = moKey(mo);
  const planned = budPlanned(yr, mk);
  const actuals = budActuals(mo, txs);
  const totalPlan = Object.values(planned).reduce((s, v) => s + v, 0);
  const totalAct  = Object.values(actuals).reduce((s, v) => s + v, 0);
  if (totalPlan === 0) return 0;
  return Math.max(0, 100 - Math.abs(totalPlan - totalAct) / totalPlan * 100);
}

// ── Forecasting ──────────────────────────────────────

/**
 * Generate n months of projected cash flow.
 * @param {number}   n    - Number of months to project
 * @param {object[]} txs  - Optional transaction override
 * @param {object[]} subs - Optional subscriptions override
 */
export function forecast(n, txs, subs) {
  const ms = last6Mo().slice(-3);
  const avgInc = ms.reduce((s, m) => s + moInc(m, txs || State.get('tx')), 0) / 3 || 0;
  const avgExp = ms.reduce((s, m) => s + moExp(m, txs || State.get('tx')), 0) / 3 || 0;
  const subCost = (subs || State.get('subs'))
    .filter(s => s.active)
    .reduce((s, x) => s + (x.cycle === 'monthly' ? x.amount : x.amount / 12), 0);

  let bal = totalBal();
  const rows = [];
  const now = new Date();

  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
    const net   = avgInc - avgExp - subCost;
    bal += net;
    rows.push({
      label,
      inc: Math.round(avgInc * 100) / 100,
      exp: Math.round((avgExp + subCost) * 100) / 100,
      net: Math.round(net * 100) / 100,
      bal: Math.round(bal * 100) / 100,
    });
  }
  return rows;
}

// ── Debt Simulation ──────────────────────────────────

/**
 * Simulate debt payoff using Snowball or Avalanche method.
 * @param {object[]} debts  - Array of debt objects
 * @param {number}   extra  - Additional monthly payment above minimums
 * @param {string}   method - 'avalanche' | 'snowball'
 */
export function debtSim(debts, extra, method) {
  if (!debts || !debts.length) return { months: 0, interest: 0, label: 'N/A', order: [] };

  let ds = debts.map(d => ({ ...d, rem: d.balance, ip: 0 }));
  ds = method === 'avalanche'
    ? ds.sort((a, b) => b.rate - a.rate)
    : ds.sort((a, b) => a.balance - b.balance);

  let mo = 0;
  const MAX = 600;
  const order = [];

  while (ds.some(d => d.rem > 0) && mo < MAX) {
    mo++;
    ds.forEach(d => {
      if (d.rem <= 0) return;
      const interest = d.rem * (d.rate / 100 / 12);
      d.ip  += interest;
      d.rem += interest - d.minPmt;
      if (d.rem < 0) d.rem = 0;
    });
    const target = ds.find(d => d.rem > 0);
    if (target && extra > 0) {
      target.rem = Math.max(0, target.rem - extra);
      if (target.rem <= 0) { order.push({ name: target.name, month: mo }); target.rem = 0; }
    }
  }

  const totalInterest = Math.round(ds.reduce((s, d) => s + d.ip, 0) * 100) / 100;
  return {
    months:   mo,
    interest: totalInterest,
    label:    mo > 0 ? `${Math.floor(mo / 12)}y ${mo % 12}m` : 'Done',
    order,
  };
}
