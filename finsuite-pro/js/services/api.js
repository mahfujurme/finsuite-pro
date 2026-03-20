/**
 * services/api.js — Mock API layer.
 *
 * Wraps all data operations in async functions so the codebase is
 * immediately backend-ready. Swap the internals for real fetch() calls
 * without touching any module code.
 *
 * Every method resolves after a minimal simulated latency so the
 * architecture demonstrates real async patterns.
 */

import { State } from '../state.js';
import { Store } from '../store.js';
import { clone } from '../utils.js';

/** Simulated network round-trip (ms). Set to 0 in tests. */
const LATENCY = 0;

const delay = ms => new Promise(res => setTimeout(res, ms));

// ── Transactions ─────────────────────────────────────

/**
 * Fetch all transactions, optionally filtered.
 * @param {{ type?: string, category?: string, from?: string, to?: string }} filters
 * @returns {Promise<object[]>}
 */
export async function getTransactions(filters = {}) {
  await delay(LATENCY);
  let rows = State.get('tx');
  if (filters.type     && filters.type     !== 'all') rows = rows.filter(t => t.type     === filters.type);
  if (filters.category && filters.category !== 'all') rows = rows.filter(t => t.category === filters.category);
  if (filters.from)  rows = rows.filter(t => t.date >= filters.from);
  if (filters.to)    rows = rows.filter(t => t.date <= filters.to);
  return rows;
}

/**
 * Persist a single new or updated transaction.
 * @param {object} tx
 * @returns {Promise<object>} The saved transaction
 */
export async function saveTransaction(tx) {
  await delay(LATENCY);
  State.patch(D => {
    const i = D.tx.findIndex(x => x.id === tx.id);
    if (i > -1) D.tx[i] = { ...D.tx[i], ...tx, updatedAt: new Date().toISOString() };
    else         D.tx.unshift({ ...tx, createdAt: new Date().toISOString() });
  });
  Store.queue();
  return clone(tx);
}

/**
 * Delete a transaction by ID.
 * @param {string} id
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteTransaction(id) {
  await delay(LATENCY);
  State.patch(D => { D.tx = D.tx.filter(x => x.id !== id); });
  Store.queue();
  return { success: true };
}

/**
 * Bulk-insert transactions (used by Importer).
 * @param {object[]} rows
 * @returns {Promise<{ inserted: number }>}
 */
export async function bulkInsertTransactions(rows) {
  await delay(LATENCY);
  State.patch(D => {
    rows.forEach(r => D.tx.unshift({ ...r, createdAt: new Date().toISOString() }));
  });
  Store.queue();
  return { inserted: rows.length };
}

// ── Budgets ──────────────────────────────────────────

/**
 * Fetch budget data for a given year.
 * @param {number} year
 * @returns {Promise<object>}
 */
export async function getBudgets(year) {
  await delay(LATENCY);
  return State.get('budgets')[year] || {};
}

/**
 * Update a single budget cell value.
 * @param {number} year
 * @param {string} category
 * @param {string} monthKey  - e.g. 'jan'
 * @param {number} value
 * @returns {Promise<{ success: boolean }>}
 */
export async function saveBudgetCell(year, category, monthKey, value) {
  await delay(LATENCY);
  State.patch(D => {
    if (!D.budgets[year])           D.budgets[year]           = {};
    if (!D.budgets[year][category]) D.budgets[year][category] = { _meta: {}, _total: {} };
    if (!D.budgets[year][category]._total) D.budgets[year][category]._total = {};
    D.budgets[year][category]._total[monthKey] = value;
  });
  Store.queue();
  return { success: true };
}

// ── Accounts / Net Worth ─────────────────────────────

/**
 * Fetch all accounts.
 * @returns {Promise<object[]>}
 */
export async function getAccounts() {
  await delay(LATENCY);
  return State.get('accounts');
}

/**
 * Save (create or update) an account.
 * @param {object} account
 * @returns {Promise<object>}
 */
export async function saveAccount(account) {
  await delay(LATENCY);
  State.patch(D => {
    const i = D.accounts.findIndex(x => x.id === account.id);
    if (i > -1) D.accounts[i] = { ...D.accounts[i], ...account, updatedAt: new Date().toISOString() };
    else         D.accounts.push({ ...account, createdAt: new Date().toISOString() });
  });
  Store.queue();
  return clone(account);
}

/**
 * Delete an account.
 * @param {string} id
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteAccount(id) {
  await delay(LATENCY);
  State.patch(D => { D.accounts = D.accounts.filter(x => x.id !== id); });
  Store.queue();
  return { success: true };
}

// ── Goals ────────────────────────────────────────────

export async function getGoals()         { await delay(LATENCY); return State.get('goals'); }
export async function saveGoal(goal)     { await delay(LATENCY); State.patch(D => { const i = D.goals.findIndex(x => x.id === goal.id); if (i > -1) D.goals[i] = { ...D.goals[i], ...goal }; else D.goals.push({ ...goal, createdAt: new Date().toISOString() }); }); Store.queue(); return clone(goal); }
export async function deleteGoal(id)     { await delay(LATENCY); State.patch(D => { D.goals = D.goals.filter(x => x.id !== id); }); Store.queue(); return { success: true }; }

// ── Debts ────────────────────────────────────────────

export async function getDebts()         { await delay(LATENCY); return State.get('debts'); }
export async function saveDebt(debt)     { await delay(LATENCY); State.patch(D => { const i = D.debts.findIndex(x => x.id === debt.id); if (i > -1) D.debts[i] = { ...D.debts[i], ...debt }; else D.debts.push({ ...debt, createdAt: new Date().toISOString() }); }); Store.queue(); return clone(debt); }
export async function deleteDebt(id)     { await delay(LATENCY); State.patch(D => { D.debts = D.debts.filter(x => x.id !== id); }); Store.queue(); return { success: true }; }

// ── Subscriptions ────────────────────────────────────

export async function getSubs()          { await delay(LATENCY); return State.get('subs'); }
export async function saveSub(sub)       { await delay(LATENCY); State.patch(D => { const i = D.subs.findIndex(x => x.id === sub.id); if (i > -1) D.subs[i] = { ...D.subs[i], ...sub }; else D.subs.push({ ...sub, createdAt: new Date().toISOString() }); }); Store.queue(); return clone(sub); }
export async function deleteSub(id)      { await delay(LATENCY); State.patch(D => { D.subs = D.subs.filter(x => x.id !== id); }); Store.queue(); return { success: true }; }

// ── Settings ─────────────────────────────────────────

export async function getSettings()      { await delay(LATENCY); return State.get('settings'); }
export async function saveSettings(cfg)  { await delay(LATENCY); State.patch(D => { D.settings = { ...D.settings, ...cfg }; }); Store.queue(); return clone(cfg); }
export async function getUser()          { await delay(LATENCY); return State.get('user'); }
export async function saveUser(user)     { await delay(LATENCY); State.patch(D => { D.user = { ...D.user, ...user }; }); Store.queue(); return clone(user); }
