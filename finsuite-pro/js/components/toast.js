/**
 * components/toast.js — Lightweight toast notification system.
 * Appends to #toasts container. Auto-removes after timeout.
 */

const ICONS  = { s: '✅', e: '❌', w: '⚠️', i: 'ℹ️' };
const TITLES = { s: 'Success', e: 'Error', w: 'Warning', i: 'Info' };

/**
 * Show a toast notification.
 * @param {string} msg   - Body message (optional)
 * @param {string} type  - 's' | 'e' | 'w' | 'i'
 * @param {string} title - Override default title
 */
export function toast(msg, type = 'i', title = '') {
  const container = document.getElementById('toasts');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast t${type}`;
  el.innerHTML = `
    <span class="t-ico">${ICONS[type] || '📢'}</span>
    <div>
      <div class="t-ttl">${title || TITLES[type] || 'Notice'}</div>
      ${msg ? `<div class="t-msg">${msg}</div>` : ''}
    </div>
  `;

  container.appendChild(el);

  const duration = type === 'e' ? 6000 : 3200;
  setTimeout(() => {
    el.classList.add('bye');
    setTimeout(() => el.remove(), 220);
  }, duration);
}
