/**
 * router.js — Hash-based client-side router.
 *
 * URL format: /#/dash  /#/tx  /#/bud  …
 *
 * Features:
 *  - Browser back / forward buttons work via hashchange
 *  - ROUTER.go(v) pushes a new hash entry (adds to browser history)
 *  - Direct URL access (bookmark, share) reads the hash on load
 *  - Charts.killAll() called on every navigation to prevent canvas errors
 */

import { Charts } from './components/chart.js';

export const VIEWS = {
  dash:  { t: 'Dashboard',      i: '📊' },
  tx:    { t: 'Transactions',   i: '💳' },
  imp:   { t: 'Import Data',    i: '📂' },
  bud:   { t: 'Budget Planner', i: '🗂️' },
  nw:    { t: 'Net Worth',      i: '🏦' },
  debt:  { t: 'Debt Planner',   i: '🔗' },
  save:  { t: 'Savings Plan',   i: '💎' },
  subs:  { t: 'Subscriptions',  i: '🔄' },
  fore:  { t: 'Forecast',       i: '📈' },
  cfg:   { t: 'Settings',       i: '⚙️' },
};

const _renderers = {};
let _current = 'dash';

function _viewFromHash() {
  const raw = location.hash.replace(/^#\/?/, '').trim();
  return VIEWS[raw] ? raw : 'dash';
}

function _activate(v) {
  if (!VIEWS[v]) v = 'dash';
  Charts.killAll();

  document.querySelectorAll('.view').forEach(el => el.classList.remove('on'));
  document.getElementById('v-' + v)?.classList.add('on');

  document.querySelectorAll('[data-nav]').forEach(el =>
    el.classList.toggle('on', el.dataset.nav === v));

  const meta = VIEWS[v];
  const ttlEl = document.getElementById('pg-ttl');
  const icoEl = document.getElementById('pg-ico');
  if (ttlEl) ttlEl.textContent = meta.t;
  if (icoEl) icoEl.textContent = meta.i;

  _current = v;
  const fn = _renderers[v];
  if (typeof fn === 'function') fn();
}

export const ROUTER = {
  register(map) { Object.assign(_renderers, map); },

  go(v) {
    if (!VIEWS[v]) v = 'dash';
    const newHash = '#/' + v;
    if (location.hash === newHash) {
      _activate(v);
    } else {
      location.hash = newHash;
    }
  },

  init() {
    window.addEventListener('hashchange', () => _activate(_viewFromHash()));
    _activate(_viewFromHash());
  },

  renderCurrent() {
    const fn = _renderers[_current];
    if (typeof fn === 'function') fn();
  },

  get current() { return _current; },
};
