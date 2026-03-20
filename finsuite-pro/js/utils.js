/**
 * utils.js — Pure utilities, constants, and category configuration.
 * No imports from other project files. No side effects.
 */

'use strict';

// ── ID & Object Helpers ──────────────────────────────
export const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clone = o  => JSON.parse(JSON.stringify(o));
export const today = () => new Date().toISOString().split('T')[0];
export const nowDate = () => new Date();

/** Escape HTML to prevent XSS in template strings */
export const esc = s =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ── Month Constants ──────────────────────────────────
export const MOS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export const MO_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Number Formatters ────────────────────────────────

/**
 * Format a number as currency.
 * @param {number} v     - Value to format
 * @param {string} sym   - Currency symbol (e.g. '£')
 * @param {boolean} sign - Prefix with +/- sign
 */
export function formatCurrency(v, sym = '£', sign = false) {
  const a = Math.abs(+v || 0);
  const f = a.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sign && v < 0) return `-${sym}${f}`;
  if (sign && v > 0) return `+${sym}${f}`;
  return `${sym}${f}`;
}

/** Format a number as a percentage string */
export const formatPct = (v, decimals = 1) => (+( v || 0)).toFixed(decimals) + '%';

/** Format an ISO date string to locale display date */
export function formatDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Days until a given ISO date string (negative = past) */
export function daysUntil(s) {
  if (!s) return null;
  const target = new Date(s + 'T00:00:00');
  const now    = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 864e5);
}

// ── Category Configuration ───────────────────────────

/** Full category map with icon, colour, and subcategories */
export const CAT_MAP = {
  'Housing':       { i: '🏠', c: '#5ba4f5', subs: ['Rent','Mortgage','Repairs','Insurance'] },
  'Groceries':     { i: '🛒', c: '#4ade80', subs: ['Supermarket','Bakery','Market'] },
  'Food & Dining': { i: '🍽️', c: '#fb923c', subs: ['Restaurants','Takeaway','Coffee'] },
  'Transport':     { i: '🚗', c: '#c8a84b', subs: ['Fuel','Public Transport','Parking','Car Payment'] },
  'Shopping':      { i: '🛍️', c: '#a78bfa', subs: ['Clothing','Electronics','Home'] },
  'Entertainment': { i: '🎬', c: '#f472b6', subs: ['Cinema','Events','Hobbies'] },
  'Healthcare':    { i: '🏥', c: '#0ed2b0', subs: ['GP','Pharmacy','Gym','Mental Health'] },
  'Utilities':     { i: '⚡', c: '#5ac8fa', subs: ['Electric','Gas','Water','Internet','Phone'] },
  'Education':     { i: '📚', c: '#34d399', subs: ['Courses','Books','Subscriptions'] },
  'Savings':       { i: '💰', c: '#fbbf24', subs: ['Emergency Fund','Investments','ISA'] },
  'Subscriptions': { i: '🔄', c: '#818cf8', subs: ['Streaming','Software','News'] },
  'Travel':        { i: '✈️', c: '#38bdf8', subs: ['Flights','Hotels','Activities'] },
  'Gifts':         { i: '🎁', c: '#f472b6', subs: ['Birthdays','Christmas'] },
  'Insurance':     { i: '🛡️', c: '#64748b', subs: ['Life','Home','Car'] },
  'Salary':        { i: '💼', c: '#0ed2b0', subs: ['Base','Bonus'] },
  'Freelance':     { i: '💻', c: '#a78bfa', subs: ['Projects','Consulting'] },
  'Investment':    { i: '📈', c: '#c8a84b', subs: ['Dividends','Capital Gains'] },
  'Other Income':  { i: '💸', c: '#5ba4f5', subs: ['Gifts','Benefits'] },
  'Uncategorized': { i: '📁', c: '#64748b', subs: [] },
};

/** Get category config, falling back to Uncategorized */
export const catCfg = name => CAT_MAP[name] || CAT_MAP['Uncategorized'];

export const EXPENSE_CATS = [
  'Housing','Groceries','Food & Dining','Transport','Shopping','Entertainment',
  'Healthcare','Utilities','Education','Savings','Subscriptions','Travel',
  'Gifts','Insurance','Uncategorized',
];
export const INCOME_CATS = ['Salary','Freelance','Investment','Other Income','Gifts'];

/**
 * Build <option> HTML for category selects.
 * @param {string}  sel           - Currently selected value
 * @param {boolean} includeIncome - Include income categories at top
 */
export function catOptions(sel, includeIncome = false) {
  const list = includeIncome ? [...INCOME_CATS, ...EXPENSE_CATS] : EXPENSE_CATS;
  return list
    .map(c => `<option value="${c}"${c === sel ? ' selected' : ''}>${catCfg(c).i} ${c}</option>`)
    .join('');
}

/**
 * Build <option> HTML for subcategory selects, given a parent category.
 * @param {string} cat - Parent category name
 * @param {string} sel - Currently selected subcategory
 */
export function subCatOptions(cat, sel = '') {
  const subs = catCfg(cat).subs || [];
  return [
    '<option value="">— None —</option>',
    ...subs.map(s => `<option value="${s}"${s === sel ? ' selected' : ''}>${s}</option>`),
  ].join('');
}
