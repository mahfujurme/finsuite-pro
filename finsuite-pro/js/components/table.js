/**
 * components/table.js — Reusable table-building utilities.
 * Returns HTML strings only. No direct DOM manipulation.
 * All action buttons use data-action attributes (no inline onclick).
 */

import { catCfg, esc, formatCurrency } from '../utils.js';

/**
 * Build a standard data table HTML string.
 * @param {Array<{key,label,align?,sortable?}>} columns
 * @param {object[]} rows
 * @param {(row) => string} rowRenderer
 * @param {{ emptyTitle?, emptyDesc? }} opts
 */
export function buildTable(columns, rows, rowRenderer, opts = {}) {
  if (!rows.length) return buildEmpty(opts.emptyTitle, opts.emptyDesc);
  const thead = columns
    .map(c => `<th${c.sortable ? ' class="sort"' : ''}${c.align ? ` style="text-align:${c.align}"` : ''}>${c.label}</th>`)
    .join('');
  return `
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr>${thead}</tr></thead>
        <tbody>${rows.map(rowRenderer).join('')}</tbody>
      </table>
    </div>`;
}

/**
 * Build the main transactions table.
 * Action buttons use data-action="tx-edit|tx-del" data-id="<id>".
 * Sort headers use data-action="tx-sort" data-value="<field>".
 */
export function buildTxTable(txs, sym, showSubcat = false) {
  if (!txs.length) return buildEmpty('No Transactions Found', 'Try adjusting filters or add your first transaction.');
  const subCol = showSubcat ? '<th class="adv-only">Subcategory</th>' : '';
  return `
    <div class="tbl-wrap" style="border:none">
      <table class="tbl">
        <thead>
          <tr>
            <th>Description</th>
            <th class="sort" data-action="tx-sort" data-value="date" style="cursor:pointer">Date ↕</th>
            <th>Category</th>
            ${subCol}
            <th>Type</th>
            <th class="sort" style="text-align:right;cursor:pointer" data-action="tx-sort" data-value="amount">Amount ↕</th>
            <th style="text-align:center">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${txs.map(t => _txRow(t, sym, showSubcat)).join('')}
        </tbody>
      </table>
    </div>`;
}

/** Build a single transaction row — fully data-action driven */
function _txRow(t, sym, showSubcat) {
  const c   = catCfg(t.category);
  const amt = formatCurrency(t.amount, sym);
  const isInc = t.type === 'income';
  const sub = showSubcat
    ? `<td class="adv-only"><span style="font-size:.75rem;color:var(--t3)">${esc(t.subcat || '—')}</span></td>`
    : '';
  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:9px">
          <div class="tx-ico" style="background:${c.c}22;color:${c.c};width:30px;height:30px;flex-shrink:0">${c.i}</div>
          <div>
            <div style="font-weight:600;color:var(--t1);font-size:.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.description)}</div>
            ${t.notes ? `<div style="font-size:.68rem;color:var(--t3)">${esc(t.notes)}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="white-space:nowrap;font-size:.78rem">${_fmtDate(t.date)}</td>
      <td><span class="badge b-nu" style="font-size:.65rem">${c.i} ${esc(t.category)}</span></td>
      ${sub}
      <td><span class="badge ${isInc ? 'b-in' : 'b-ex'}">${t.type}</span></td>
      <td style="text-align:right">
        <span class="tbl-amt ${isInc ? 'ca-in' : 'ca-ex'}">${isInc ? '+' : '-'}${amt}</span>
      </td>
      <td>
        <div style="display:flex;gap:3px;justify-content:center">
          <button class="btn btn-ghost btn-xs" data-action="tx-edit" data-id="${t.id}" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-xs" data-action="tx-del"  data-id="${t.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>`;
}

/**
 * Build an empty-state block.
 */
export function buildEmpty(title = 'Nothing Here', desc = '', actionHtml = '') {
  return `
    <div class="empty">
      <div class="empty-ico">📋</div>
      <div class="empty-ttl">${esc(title)}</div>
      <div class="empty-dsc">${esc(desc)}</div>
      ${actionHtml}
    </div>`;
}

function _fmtDate(s) {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
