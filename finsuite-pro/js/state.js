/**
 * state.js — Single source of truth for all application data.
 * Access via State.get() / State.patch(). Never mutate directly from outside.
 */

import { clone } from './utils.js';

const DEFAULT_STATE = {
  ver: '3.0',
  user: {
    name: '', currency: 'GBP', sym: '£', theme: 'dark', mode: 'advanced',
  },
  settings: {
    autoSave: true,
    defaultView: 'dash',
    disabledModules: {
      debt: false, savings: false, subscriptions: false,
      forecast: false, subcategories: false,
    },
  },
  tx:          [],   // Transaction[]
  budgets:     {},   // { year: { category: { _meta, _total: { jan..dec } } } }
  accounts:    [],   // Account[]
  goals:       [],   // Goal[]
  debts:       [],   // Debt[]
  savingsPlan: {},   // { year: { goalId: { jan..dec } } }
  subs:        [],   // Subscription[]
  snapshots:   [],   // { date: string, nw: number }[]
};

let _data = clone(DEFAULT_STATE);

export const State = {
  /** Return a deep clone of the entire state (or a top-level key) */
  get: k => (k ? clone(_data[k]) : clone(_data)),

  /** Expose the live reference — use only in Store.save() */
  raw: () => _data,

  /** Replace a top-level key */
  set: (k, v) => { _data[k] = v; },

  /**
   * Immutable patch — callback receives the live state object.
   * Keep mutations minimal and synchronous.
   * @param {(data: object) => void} fn
   */
  patch: fn => { fn(_data); },

  /** Hard reset to defaults (used on "Clear All Data") */
  reset: () => { _data = clone(DEFAULT_STATE); },

  /**
   * Merge a saved snapshot into current state.
   * Guards against missing keys and schema drift between versions.
   * @param {object} saved - The raw data object from localStorage
   */
  hydrate(saved) {
    try {
      if (!saved || typeof saved !== 'object') return;

      for (const k in DEFAULT_STATE) {
        if (!(k in saved)) continue;

        if (k === 'settings') {
          _data.settings = {
            ...clone(DEFAULT_STATE.settings),
            ...saved.settings,
            disabledModules: {
              ...clone(DEFAULT_STATE.settings.disabledModules),
              ...(saved.settings?.disabledModules || {}),
            },
          };
        } else if (k === 'user') {
          _data.user = { ...clone(DEFAULT_STATE.user), ...saved.user };
        } else {
          _data[k] = saved[k];
        }
      }
    } catch (e) {
      console.warn('[State] hydrate failed:', e);
    }
  },
};
