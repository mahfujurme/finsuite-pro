/**
 * store.js — All persistence concerns: localStorage, JSON/CSV export, file import.
 * Uses a 280ms debounce for auto-save to avoid thrashing storage.
 */

import { State } from './state.js';
import { today } from './utils.js';

const STORAGE_KEY = 'finsuite_v3';
let _timer;

export const Store = {
  /** Persist current state immediately */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: '3.0', ts: Date.now(), d: State.raw(),
      }));
    } catch (e) {
      console.error('[Store] save failed:', e);
    }
  },

  /** Schedule a debounced save (called on every state mutation) */
  queue() {
    clearTimeout(_timer);
    _timer = setTimeout(() => Store.save(), 280);
  },

  /** Load and return raw data from localStorage, or null if absent */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.d || null;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  /** Delete all stored data */
  clear() { localStorage.removeItem(STORAGE_KEY); },

  /** Human-readable storage usage */
  size() {
    try {
      return (new Blob([localStorage.getItem(STORAGE_KEY) || '']).size / 1024).toFixed(1) + ' KB';
    } catch { return '?'; }
  },

  // ── Export ────────────────────────────────────────

  /** Download full state as a JSON backup file */
  exportJSON() {
    _dl(
      new Blob([JSON.stringify({ app: 'FinSuite Pro v3', v: '3.0', ts: new Date().toISOString(), d: State.raw() }, null, 2)], { type: 'application/json' }),
      `finsuite-backup-${today()}.json`,
    );
  },

  /**
   * Download transactions as CSV.
   * @param {object[]} txs - Filtered transaction array
   * @param {string}   sym - Currency symbol for header context
   */
  exportCSV(txs) {
    const rows = [
      ['Date','Description','Category','Subcategory','Type','Amount','Notes'],
      ...txs.map(t => [
        t.date,
        `"${t.description}"`,
        t.category,
        t.subcat || '',
        t.type,
        t.amount.toFixed(2),
        `"${t.notes || ''}"`,
      ]),
    ];
    _dl(
      new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }),
      `finsuite-transactions-${today()}.csv`,
    );
  },

  // ── Import ────────────────────────────────────────

  /**
   * Read a JSON backup file and resolve with the raw data object.
   * @param {File} file
   * @returns {Promise<object|null>}
   */
  importJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== 'application/json') {
        reject(new Error('Please select a valid JSON file'));
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          resolve(parsed?.d || parsed?.data || null);
        } catch {
          reject(new Error('Failed to parse JSON — file may be corrupted'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  },
};

/** Trigger a browser file download */
function _dl(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
