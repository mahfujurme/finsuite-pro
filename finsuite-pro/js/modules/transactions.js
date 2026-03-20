/**
 * modules/transactions.js — Transaction CRUD + filtering.
 * All HTML uses data-action attributes. No inline onclick.
 * Uses validator.js for form validation.
 */
import { State } from '../state.js';
import { Store } from '../store.js';
import { uid, esc, today, formatCurrency, catOptions, subCatOptions } from '../utils.js';
import { moOf } from '../services/calculator.js';
import { validateTransaction, renderFormErrors } from '../services/validator.js';
import { Modal } from '../components/form.js';
import { toast } from '../components/toast.js';
import { buildTxTable } from '../components/table.js';

let F = { q:'', type:'all', cat:'all', from:'', to:'', sortBy:'date', sortDir:'desc' };

export const Tx = {
  render() {
    const el=document.getElementById('v-tx'); if(!el)return;
    const sym=State.get('user').sym||'£'; const cur=v=>formatCurrency(v,sym);
    const txs=_filtered();
    const ucats=[...new Set(State.get('tx').map(t=>t.category))].sort();
    const inc=txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const net=inc-exp;
    el.innerHTML=`
    <div class="sec-row">
      <div class="sec-hdr" style="margin:0"><h2><span class="ico">💳</span> Transactions</h2><p>Complete record of every income and expense.</p></div>
      <div class="sec-actions">
        <button class="btn btn-outline btn-sm" data-action="tx-export">📤 CSV</button>
        <button class="btn btn-sky btn-sm" data-action="nav" data-view="imp">📂 Import</button>
        <button class="btn btn-gold" data-action="tx-add">+ Add Transaction</button>
      </div>
    </div>
    <div class="filter-bar">
      <div class="search-wrap"><span class="search-ico">🔍</span><input class="search-inp" data-action="tx-search" placeholder="Search…" value="${esc(F.q)}"></div>
      <select class="finp" style="width:auto;min-width:115px" data-action="tx-filter-type"><option value="all" ${F.type==='all'?'selected':''}>All Types</option><option value="income" ${F.type==='income'?'selected':''}>Income</option><option value="expense" ${F.type==='expense'?'selected':''}>Expense</option></select>
      <select class="finp" style="width:auto;min-width:135px" data-action="tx-filter-cat"><option value="all">All Categories</option>${ucats.map(c=>`<option value="${c}" ${F.cat===c?'selected':''}>${c}</option>`).join('')}</select>
      <input type="date" class="finp" style="width:auto" value="${F.from}" data-action="tx-filter-from" title="From">
      <input type="date" class="finp" style="width:auto" value="${F.to}"   data-action="tx-filter-to"   title="To">
      <button class="btn btn-ghost btn-sm" data-action="tx-clear">✕ Clear</button>
    </div>
    <div class="kpi-row kpi-row-4" style="margin-bottom:14px">
      <div class="kpi" style="--kc:var(--teal);padding:12px 16px"><div class="kpi-lbl">Filtered Income</div><div class="kpi-val num" style="font-size:1.1rem;color:var(--teal)">${cur(inc)}</div></div>
      <div class="kpi" style="--kc:var(--rose);padding:12px 16px"><div class="kpi-lbl">Filtered Expenses</div><div class="kpi-val num" style="font-size:1.1rem;color:var(--rose)">${cur(exp)}</div></div>
      <div class="kpi" style="--kc:${net>=0?'var(--teal)':'var(--rose)'};padding:12px 16px"><div class="kpi-lbl">Net</div><div class="kpi-val num" style="font-size:1.1rem;color:${net>=0?'var(--teal)':'var(--rose)'}">${formatCurrency(net,sym,true)}</div></div>
      <div class="kpi" style="--kc:var(--sky);padding:12px 16px"><div class="kpi-lbl">Count</div><div class="kpi-val num" style="font-size:1.1rem">${txs.length}</div></div>
    </div>
    <div class="card" style="padding:0;overflow:hidden" id="tx-tbl-wrap"></div>`;
    _renderTable();
  },

  setFilter(k,v){ F[k]=v; _renderTable(); },
  clearFilters(){ F={q:'',type:'all',cat:'all',from:'',to:'',sortBy:'date',sortDir:'desc'}; this.render(); },
  sort(by){ F.sortDir=(F.sortBy===by&&F.sortDir==='desc')?'asc':'desc'; F.sortBy=by; _renderTable(); },
  openAdd()    { _openModal(null); },
  openEdit(id) { const t=State.get('tx').find(x=>x.id===id); if(t)_openModal(t); },

  del(id) {
    const t=State.get('tx').find(x=>x.id===id); if(!t)return;
    Modal.confirm(`Delete "<strong>${esc(t.description)}</strong>"? This cannot be undone.`,
      ()=>{ State.patch(D=>{D.tx=D.tx.filter(x=>x.id!==id);}); Store.queue(); toast('Transaction deleted.','i'); this.render(); },
      'Delete Transaction');
  },

  exportCSV() { Store.exportCSV(_filtered()); toast('Transactions exported!','s'); },
  bulkAdd(rows) {
    State.patch(D=>{rows.forEach(r=>D.tx.unshift({id:uid(),...r,createdAt:new Date().toISOString()}));});
    _snapNW(); Store.queue();
  },

  // Called by event delegation (change events on form selects)
  syncTypeOptions(type) { const s=document.getElementById('fcat'); if(s)s.innerHTML=catOptions('Uncategorized',type==='income'); },
  syncSubOptions(cat)   { const s=document.getElementById('fsub'); if(s)s.innerHTML=subCatOptions(cat,''); },
};

function _filtered() {
  let rows=[...State.get('tx')];
  if(F.q){const q=F.q.toLowerCase();rows=rows.filter(t=>t.description.toLowerCase().includes(q)||t.category.toLowerCase().includes(q)||(t.notes||'').toLowerCase().includes(q));}
  if(F.type!=='all')rows=rows.filter(t=>t.type===F.type);
  if(F.cat!=='all') rows=rows.filter(t=>t.category===F.cat);
  if(F.from)rows=rows.filter(t=>t.date>=F.from);
  if(F.to)  rows=rows.filter(t=>t.date<=F.to);
  rows.sort((a,b)=>{const c=F.sortBy==='date'?a.date.localeCompare(b.date):a.amount-b.amount;return F.sortDir==='desc'?-c:c;});
  return rows;
}

function _renderTable() {
  const wrap=document.getElementById('tx-tbl-wrap'); if(!wrap)return;
  const sym=State.get('user').sym||'£';
  const mode=document.documentElement.getAttribute('data-mode');
  const showSub=mode==='advanced'&&!State.get('settings').disabledModules?.subcategories;
  wrap.innerHTML=buildTxTable(_filtered(),sym,showSub);
}

function _openModal(t) {
  const sym=State.get('user').sym||'£'; const isEdit=!!t;
  const mode=document.documentElement.getAttribute('data-mode');
  const showSub=mode==='advanced'&&!State.get('settings').disabledModules?.subcategories;
  Modal.open({
    title:isEdit?'Edit Transaction':'Add Transaction',
    body:`
      <div class="frow">
        <div class="fg"><label class="flbl">Type<span class="req">*</span></label>
          <select class="finp" id="ft" data-action="tx-type-change">
            <option value="expense" ${!t||t.type==='expense'?'selected':''}>💸 Expense</option>
            <option value="income"  ${t?.type==='income'?'selected':''}>💰 Income</option>
          </select></div>
        <div class="fg"><label class="flbl">Date<span class="req">*</span></label><input type="date" class="finp" id="fd" value="${t?.date||today()}" required></div>
      </div>
      <div class="fg"><label class="flbl">Description<span class="req">*</span></label><input type="text" class="finp" id="fdesc" value="${t?esc(t.description):''}" placeholder="e.g. Tesco Weekly Shop" maxlength="100"></div>
      <div class="frow">
        <div class="fg"><label class="flbl">Amount<span class="req">*</span></label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="famt" value="${t?.amount||''}" min="0.01" step="0.01"></div></div>
        <div class="fg"><label class="flbl">Category</label><select class="finp" id="fcat" data-action="tx-cat-change">${catOptions(t?.category||'Uncategorized',t?.type==='income')}</select></div>
      </div>
      ${showSub?`<div class="fg adv-only"><label class="flbl">Subcategory</label><select class="finp" id="fsub">${subCatOptions(t?.category||'Uncategorized',t?.subcat||'')}</select></div>`:''}
      <div class="fg"><label class="flbl">Notes</label><input type="text" class="finp" id="fnotes" value="${t?esc(t.notes||'):''}" maxlength="200" placeholder="Optional…"></div>
      <div id="err-description" style="display:none" class="ferr">⚠ <span></span></div>
      <div id="err-amount"      style="display:none" class="ferr">⚠ <span></span></div>
      <div id="err-date"        style="display:none" class="ferr">⚠ <span></span></div>
      <div id="form-err"        style="display:none" class="ferr">⚠ <span></span></div>
    `,
    btns:[{lbl:'Cancel',cls:'btn-ghost',close:true},{lbl:isEdit?'Save Changes':'Add Transaction',cls:'btn-gold',fn:()=>_save(t?.id),close:false}],
  });
}

function _save(id) {
  const desc=document.getElementById('fdesc')?.value.trim();
  const amt=document.getElementById('famt')?.value;
  const type=document.getElementById('ft')?.value;
  const date=document.getElementById('fd')?.value;
  const cat=document.getElementById('fcat')?.value;
  const subcat=document.getElementById('fsub')?.value||'';
  const notes=document.getElementById('fnotes')?.value.trim();
  const result=validateTransaction({description:desc,amount:amt,date,type});
  if(!result.valid){renderFormErrors(result.errors);return;}
  State.patch(D=>{
    const tx={description:desc,amount:parseFloat(amt),type,date,category:cat,subcat,notes,updatedAt:new Date().toISOString()};
    if(id){const i=D.tx.findIndex(x=>x.id===id);if(i>-1)D.tx[i]={...D.tx[i],...tx};}
    else D.tx.unshift({id:uid(),...tx,createdAt:new Date().toISOString()});
  });
  _snapNW(); Store.queue(); Modal.close();
  toast(id?'Transaction updated.':'Transaction added.','s');
  Tx.render();
}

function _snapNW() {
  State.patch(D=>{
    const assets=D.accounts.filter(a=>!a.isL).reduce((s,a)=>s+a.value,0);
    const liabs=D.accounts.filter(a=>a.isL).reduce((s,a)=>s+a.value,0);
    const nw=assets-liabs; const d=new Date().toISOString().split('T')[0];
    const last=D.snapshots[D.snapshots.length-1];
    if(!last||last.date!==d){D.snapshots.push({date:d,nw});if(D.snapshots.length>365)D.snapshots.shift();}
  });
}
