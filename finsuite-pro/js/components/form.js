/**
 * components/form.js — Modal dialog system.
 * Manages the single shared modal overlay (#mveil / #mbox).
 */

/**
 * @typedef {{ lbl: string, cls?: string, fn?: () => void, close?: boolean }} ModalButton
 * @typedef {{ title: string, body?: string, btns?: ModalButton[], size?: 'sm'|'lg'|'xl' }} ModalConfig
 */

export const Modal = {
  /**
   * Open the modal with given config.
   * @param {ModalConfig} cfg
   */
  open(cfg) {
    const veil = document.getElementById('mveil');
    const box  = document.getElementById('mbox');
    if (!veil || !box) return;

    document.getElementById('m-ttl').textContent  = cfg.title || '';
    document.getElementById('m-body').innerHTML   = cfg.body  || '';

    const foot = document.getElementById('m-foot');
    foot.innerHTML = '';
    (cfg.btns || []).forEach(b => {
      const el = document.createElement('button');
      el.className   = 'btn ' + (b.cls || 'btn-outline');
      el.textContent = b.lbl;
      el.onclick = () => { if (b.fn) b.fn(); if (b.close !== false) Modal.close(); };
      foot.appendChild(el);
    });

    box.className = 'modal' + (cfg.size ? ' ' + cfg.size : '');
    veil.classList.remove('off');

    // Auto-focus first input
    setTimeout(() => {
      const first = box.querySelector('input:not([type=hidden]), select, textarea');
      if (first) first.focus();
    }, 80);
  },

  /** Close the modal overlay */
  close() {
    document.getElementById('mveil')?.classList.add('off');
  },

  /**
   * Open a simple confirmation dialog.
   * @param {string}   msg   - HTML message body
   * @param {Function} onConfirm
   * @param {string}   title
   */
  confirm(msg, onConfirm, title = 'Confirm') {
    Modal.open({
      title,
      size: 'sm',
      body: `<p style="text-align:center;padding:6px 0;color:var(--t2);font-size:.85rem">${msg}</p>`,
      btns: [
        { lbl: 'Cancel',  cls: 'btn-ghost', close: true },
        { lbl: 'Confirm', cls: 'btn-rose',  fn: onConfirm, close: true },
      ],
    });
  },

  /**
   * Show an inline error message inside the modal.
   * Expects an element with id `{elId}` containing a <span> for the message.
   * @param {string} elId
   * @param {string} msg
   */
  showError(elId, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.style.display = 'flex';
    const span = el.querySelector('span');
    if (span) span.textContent = msg;
  },

  clearError(elId) {
    const el = document.getElementById(elId);
    if (el) el.style.display = 'none';
  },
};
