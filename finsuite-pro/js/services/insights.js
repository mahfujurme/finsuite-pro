/**
 * services/insights.js — Rule-based financial insights engine.
 * Reads from State and Calc. Produces structured insight objects.
 * Rendering is separated so this service stays UI-free.
 */

import { State } from '../state.js';
import { formatCurrency, formatPct, esc } from '../utils.js';
import {
  curMo, moInc, moExp, catBreak, savRate, expRatio, momChange, nwGrowth,
} from './calculator.js';

/**
 * @typedef {{ t: string, i: string, ttl: string, dsc: string }} Insight
 * t = 'pos' | 'warn' | 'bad' | 'info' | 'gold' | 'vi'
 */

/**
 * Generate an array of insight objects based on current state.
 * @returns {Insight[]}
 */
export function generateInsights() {
  const user   = State.get('user');
  const sym    = user.sym || '£';
  const cur    = (v, sign) => formatCurrency(v, sym, sign);

  const mo    = curMo();
  const txs   = State.get('tx');
  const debts = State.get('debts');
  const goals = State.get('goals');
  const subs  = State.get('subs');

  const inc = moInc(mo, txs);
  const exp = moExp(mo, txs);
  const sr  = savRate(inc, exp);
  const er  = expRatio(inc, exp);
  const top = Object.entries(catBreak(mo, txs))[0];
  const out = [];

  // ── Spending vs Income ──────────────────────────────
  if (inc > 0) {
    if (er >= 100)
      out.push({ t:'bad',  i:'🚨', ttl:'Spending Exceeds Income',   dsc:`Overspending by ${cur(exp - inc)}. Immediate action required.` });
    else if (er >= 90)
      out.push({ t:'warn', i:'⚠️', ttl:'Critical Expense Ratio',    dsc:`${formatPct(er)} of income spent. Very little room for savings or emergencies.` });
    else if (er >= 80)
      out.push({ t:'warn', i:'💡', ttl:'High Spending',             dsc:`${formatPct(er)} of income goes to expenses. Aim below 70% for healthy savings.` });
  }

  // ── Savings Rate ────────────────────────────────────
  if (inc > 0) {
    if (sr >= 25)
      out.push({ t:'pos',  i:'🌟', ttl:'Outstanding Savings Rate',  dsc:`Saving ${formatPct(sr)} — well above the 20% benchmark. Excellent!` });
    else if (sr >= 20)
      out.push({ t:'pos',  i:'✅', ttl:'Healthy Savings Rate',      dsc:`${formatPct(sr)} savings rate. You're on track for long-term stability.` });
    else if (sr >= 10)
      out.push({ t:'info', i:'💰', ttl:'Moderate Savings',          dsc:`${formatPct(sr)} saved. Push towards 20% by trimming discretionary spend.` });
    else
      out.push({ t:'warn', i:'📉', ttl:'Low Savings Rate',          dsc:`Only ${formatPct(sr)} saved this month. Review your biggest expense categories.` });
  }

  // ── Top Category ────────────────────────────────────
  if (top)
    out.push({ t:'info', i:'📊', ttl:`Top Spend: ${top[0]}`,       dsc:`${esc(top[0])} is your biggest expense at ${cur(top[1])} this month.` });

  // ── Subscriptions ───────────────────────────────────
  const activeSubs = subs.filter(s => s.active);
  if (activeSubs.length) {
    const mc = activeSubs.reduce((s, x) => s + (x.cycle === 'monthly' ? x.amount : x.amount / 12), 0);
    const subPct = inc > 0 ? mc / inc * 100 : 0;
    if (subPct > 10)
      out.push({ t:'warn', i:'🔄', ttl:'Subscriptions Cost Alert',  dsc:`${activeSubs.length} subscriptions = ${cur(mc)}/mo (${formatPct(subPct)} of income).` });
    else
      out.push({ t:'info', i:'🔄', ttl:`${activeSubs.length} Active Subscriptions`, dsc:`Recurring cost: ${cur(mc)}/month. Review for unused services.` });
  }

  // ── Debt ────────────────────────────────────────────
  if (debts.length) {
    const hiRate = debts.filter(d => d.rate > 15);
    if (hiRate.length)
      out.push({ t:'bad',  i:'💳', ttl:'High-Interest Debt Detected', dsc:`${hiRate.length} debt(s) above 15% APR. Consider the Avalanche strategy for faster payoff.` });
    else {
      const tot = debts.reduce((s, d) => s + d.balance, 0);
      out.push({ t:'vi',   i:'🔗', ttl:`Total Debt: ${cur(tot)}`,   dsc:'Use the Debt Planner to simulate your optimal payoff strategy.' });
    }
  }

  // ── Goals Near Completion ───────────────────────────
  goals
    .filter(g => { const p = g.current / g.target * 100; return p >= 70 && p < 100; })
    .slice(0, 1)
    .forEach(g => out.push({
      t: 'gold', i: '🏆',
      ttl: `Almost There: ${esc(g.name)}`,
      dsc: `${Math.round(g.current / g.target * 100)}% complete — ${cur(g.target - g.current)} more to go!`,
    }));

  // ── Net Worth Growth ────────────────────────────────
  const nwg = nwGrowth();
  if (nwg > 5)
    out.push({ t:'pos',  i:'📈', ttl:'Net Worth Growing',          dsc:`Net worth up ${formatPct(nwg)} since tracking began. Great progress!` });

  // ── Month-over-Month Expense Change ─────────────────
  const ec = momChange('expenses', txs);
  if (ec < -10)
    out.push({ t:'pos',  i:'✨', ttl:'Spending Down',              dsc:`Expenses dropped ${formatPct(Math.abs(ec))} vs last month. Keep it up!` });
  else if (ec > 15)
    out.push({ t:'warn', i:'📊', ttl:'Spending Increased',         dsc:`Expenses up ${formatPct(ec)} vs last month. Check what changed.` });

  // ── Fallback ────────────────────────────────────────
  if (!out.length)
    out.push({ t:'info', i:'📝', ttl:'Start Tracking',             dsc:'Add transactions to unlock personalised financial insights.' });

  return out;
}

/**
 * Render insights into a DOM container.
 * @param {string} containerId - ID of the target element
 */
export function renderInsights(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const items = generateInsights();
  el.innerHTML = items.map(i => `
    <div class="ins-card it-${i.t}">
      <div class="ins-ico">${i.i}</div>
      <div>
        <div class="ins-ttl">${i.ttl}</div>
        <div class="ins-dsc">${i.dsc}</div>
      </div>
    </div>
  `).join('');
}
