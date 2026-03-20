/**
 * modules/budget.js — Multi-year budget planner. data-action throughout.
 */
import { State } from '../state.js';
import { Store } from '../store.js';
import { esc, formatCurrency, catOptions } from '../utils.js';
import { curYear, curMo, moKey, MOS, MO_LABELS, budActuals, budPlanned } from '../services/calculator.js';
import { Charts } from '../components/chart.js';
import { Modal } from '../components/form.js';
import { toast } from '../components/toast.js';

let _year=curYear(), _view='monthly', _selMo=curMo();

export const Budget = {
  render() {
    const el=document.getElementById('v-bud'); if(!el)return;
    _ensureYear(_year);
    const bud=State.get('budgets'), budYr=bud[_year]||{}, txs=State.get('tx');
    const totalPlan=Object.values(budYr).reduce((s,c)=>s+(c._total?MOS.reduce((ss,m)=>ss+(c._total[m]||0),0):0),0);
    const totalAct=txs.filter(t=>t.type==='expense'&&t.date.startsWith(String(_year))).reduce((s,t)=>s+t.amount,0);
    const yearsList=[...new Set([...Object.keys(bud).map(Number),_year,_year+1])].sort((a,b)=>b-a);
    el.innerHTML=`
    <div class="sec-row">
      <div class="sec-hdr" style="margin:0"><h2><span class="ico">🗂️</span> Budget Planner</h2><p>Multi-year income &amp; expense planning with actual vs planned tracking.</p></div>
      <div class="sec-actions">
        <select class="finp" style="width:auto" data-action="bud-year-sel">${yearsList.map(y=>`<option value="${y}" ${y===_year?'selected':''}>${y}</option>`).join('')}</select>
        <div class="tabs" style="max-width:220px">
          <button class="tab-btn ${_view==='yearly'?'on':''}"  data-action="bud-view" data-value="yearly">📅 Yearly</button>
          <button class="tab-btn ${_view==='monthly'?'on':''}" data-action="bud-view" data-value="monthly">📆 Monthly</button>
        </div>
        <button class="btn btn-gold" data-action="bud-add-cat">+ Category</button>
      </div>
    </div>
    <div class="kpi-row kpi-row-4" style="margin-bottom:18px">
      <div class="kpi" style="--kc:var(--gold)"><div class="kpi-ico">📋</div><div class="kpi-lbl">Total Planned (${_year})</div><div class="kpi-val num">${_cur(totalPlan)}</div></div>
      <div class="kpi" style="--kc:var(--rose)"><div class="kpi-ico">💸</div><div class="kpi-lbl">Actual Spent (${_year})</div><div class="kpi-val num">${_cur(totalAct)}</div></div>
      <div class="kpi" style="--kc:${totalAct<=totalPlan?'var(--teal)':'var(--rose)'}"><div class="kpi-ico">📊</div><div class="kpi-lbl">Variance</div><div class="kpi-val num" style="color:${totalAct<=totalPlan?'var(--teal)':'var(--rose)'}">${_cur(totalPlan-totalAct,true)}</div></div>
      <div class="kpi" style="--kc:var(--amber)"><div class="kpi-ico">🎯</div><div class="kpi-lbl">Categories</div><div class="kpi-val num">${Object.keys(budYr).length}</div></div>
    </div>
    ${_view==='monthly'?_renderMonthly(_year,budYr,txs):_renderYearly(_year,budYr)}`;
  },

  setYear(yr){_year=yr;this.render();},
  setView(v){_view=v;this.render();},
  setMo(m){_selMo=m;this.render();},
  setCell(yr,cat,mk,val){
    State.patch(D=>{if(!D.budgets[yr])D.budgets[yr]={};if(!D.budgets[yr][cat])D.budgets[yr][cat]={_meta:{},_total:_emptyMos()};if(!D.budgets[yr][cat]._total)D.budgets[yr][cat]._total=_emptyMos();D.budgets[yr][cat]._total[mk]=val;});
    Store.queue();
  },
  openAddCat() {
    Modal.open({title:'Add Budget Category',size:'sm',body:`
      <div class="fg"><label class="flbl">Category<span class="req">*</span></label><select class="finp" id="bc-cat">${catOptions('Housing',true)}</select></div>
      <div class="fg"><label class="flbl">Type</label><select class="finp" id="bc-type"><option value="expense">💸 Expense</option><option value="income">💰 Income</option></select></div>
      <div class="fg"><label class="flbl">Year</label><select class="finp" id="bc-yr">${[_year-1,_year,_year+1,_year+2].map(y=>`<option value="${y}" ${y===_year?'selected':''}>${y}</option>`).join('')}</select></div>
      <div id="form-err" style="display:none" class="ferr">⚠ <span></span></div>`,
      btns:[{lbl:'Cancel',cls:'btn-ghost',close:true},{lbl:'Add Category',cls:'btn-gold',fn:_addCat,close:false}]});
  },
  delCat(yr,cat) {
    Modal.confirm(`Remove "<strong>${esc(cat)}</strong>" from ${yr} budget?`,()=>{State.patch(D=>{if(D.budgets[yr])delete D.budgets[yr][cat];});Store.queue();this.render();toast('Category removed.','i');},'Remove Category');
  },
};

function _cur(v,s){return formatCurrency(v,State.get('user').sym||'£',s);}
function _emptyMos(){return Object.fromEntries(MOS.map(m=>[m,0]));}
function _ensureYear(yr){State.patch(D=>{if(!D.budgets[yr])D.budgets[yr]={};});}
function _addCat(){
  const cat=document.getElementById('bc-cat')?.value;const isInc=document.getElementById('bc-type')?.value==='income';const yr=parseInt(document.getElementById('bc-yr')?.value)||_year;
  const bud=State.get('budgets');
  if(bud[yr]?.[cat]){Modal.showError('form-err','Category already exists for this year.');return;}
  State.patch(D=>{if(!D.budgets[yr])D.budgets[yr]={};D.budgets[yr][cat]={_meta:{isIncome:isInc},_total:_emptyMos()};});
  Store.queue();Modal.close();_year=yr;Budget.render();toast('Category added.','s');
}

function _renderMonthly(yr,budYr,txs){
  const cats=Object.keys(budYr); if(!cats.length)return _emptyState();
  const moIdx=parseInt((_selMo||curMo()).split('-')[1])-1;const mk=MOS[moIdx];
  const actuals=budActuals(_selMo,txs);
  const moOpts=MOS.map((k,i)=>{const val=`${yr}-${String(i+1).padStart(2,'0')}`;return`<option value="${val}" ${val===_selMo?'selected':''}>${MO_LABELS[i]}</option>`;}).join('');
  const incCats=cats.filter(c=>budYr[c]._meta?.isIncome), expCats=cats.filter(c=>!budYr[c]._meta?.isIncome);
  let html=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><select class="finp" style="width:auto" data-action="bud-month-sel">${moOpts}</select></div>`;
  html+=_section('Income',incCats,budYr,actuals,mk,yr,true);
  html+=_section('Expenses',expCats,budYr,actuals,mk,yr,false);
  if(expCats.length){
    const planned=budPlanned(yr,mk);
    html+=`<div class="card"><div class="card-hdr"><div class="card-ttl">📊 Planned vs Actual</div></div><div class="chart-wrap"><canvas id="budBarCv"></canvas></div></div>`;
    setTimeout(()=>Charts.budBar('budBarCv',planned,actuals,expCats),20);
  }
  return html;
}

function _section(label,cats,budYr,actuals,mk,yr,isInc){
  if(!cats.length)return'';
  const totPlan=cats.reduce((s,c)=>s+(budYr[c]._total?.[mk]||0),0);
  const totAct=isInc?cats.reduce((s,c)=>s+State.get('tx').filter(t=>t.type==='income'&&t.category===c&&t.date.startsWith(_selMo?_selMo.slice(0,7):'')).reduce((ss,t)=>ss+t.amount,0),0):cats.reduce((s,c)=>s+(actuals[c]||0),0);
  const rows=cats.map(cat=>{
    const plan=budYr[cat]._total?.[mk]||0;
    const act=isInc?State.get('tx').filter(t=>t.type==='income'&&t.category===cat&&t.date.slice(0,7)===_selMo).reduce((s,t)=>s+t.amount,0):(actuals[cat]||0);
    const v=isInc?act-plan:plan-act; const pct=plan>0?Math.min(100,act/plan*100):0;
    return`<tr><td><div style="display:flex;align-items:center;gap:8px"><strong style="font-size:.82rem">${esc(cat)}</strong></div></td>
      <td style="text-align:right"><input class="bud-cell-inp" type="number" value="${plan||''}" placeholder="0.00" min="0" step="0.01" data-action="bud-cell" data-year="${yr}" data-cat="${esc(cat)}" data-mo="${mk}"></td>
      <td style="text-align:right"><span class="num" style="font-size:.8rem;color:${isInc?'var(--teal)':'var(--rose)'}">${_cur(act)}</span></td>
      <td style="text-align:right"><span class="${v>=0?'bud-var-pos':'bud-var-neg'}">${_cur(v,true)}</span></td>
      <td style="width:90px"><div class="prog"><div class="prog-fill ${pct>100?'pf-rose':isInc?'pf-teal':'pf-gold'}" style="width:${Math.min(100,pct)}%"></div></div></td>
      <td><button class="btn btn-ghost btn-xs" data-action="bud-del-cat" data-year="${yr}" data-cat="${esc(cat)}">🗑️</button></td></tr>`;
  }).join('');
  return`<div class="card" style="margin-bottom:14px;padding:0;overflow:hidden">
    <div style="padding:12px 16px;background:var(--bg3);border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between"><div style="font-family:var(--fd);font-size:.9rem">${isInc?'💰':'💸'} ${label}</div><div style="display:flex;gap:14px;font-size:.78rem"><span style="color:var(--t3)">Planned: <strong class="num">${_cur(totPlan)}</strong></span><span style="color:var(--t3)">Actual: <strong class="num" style="color:${isInc?'var(--teal)':'var(--rose)'}">${_cur(totAct)}</strong></span></div></div>
    <table class="bud-table"><thead><tr><th>Category</th><th style="text-align:right">Planned</th><th style="text-align:right">Actual</th><th style="text-align:right">Variance</th><th>Progress</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr class="bud-total-row"><td>Total</td><td style="text-align:right;font-family:var(--fm);font-size:.8rem">${_cur(totPlan)}</td><td style="text-align:right;font-family:var(--fm);font-size:.8rem;color:${isInc?'var(--teal)':'var(--rose)'}">${_cur(totAct)}</td><td style="text-align:right;font-family:var(--fm);font-size:.8rem" class="${totAct<=totPlan?'bud-var-pos':'bud-var-neg'}">${_cur((isInc?totAct-totPlan:totPlan-totAct),true)}</td><td colspan="2"></td></tr></tfoot>
    </table></div>`;
}

function _renderYearly(yr,budYr){
  const cats=Object.keys(budYr); if(!cats.length)return _emptyState();
  const incCats=cats.filter(c=>budYr[c]._meta?.isIncome), expCats=cats.filter(c=>!budYr[c]._meta?.isIncome);
  const sec=(label,list)=>{if(!list.length)return'';return`<div class="card" style="margin-bottom:14px;padding:0;overflow:hidden">
    <div style="padding:12px 16px;background:var(--bg3);border-bottom:1px solid var(--bdr)"><div style="font-family:var(--fd);font-size:.9rem">${label==='Income'?'💰':'💸'} ${label}</div></div>
    <div style="overflow-x:auto"><table class="bud-table" style="min-width:900px"><thead><tr><th>Category</th>${MO_LABELS.map(m=>`<th style="text-align:right;min-width:70px">${m}</th>`).join('')}<th style="text-align:right">Total</th></tr></thead>
    <tbody>${list.map(cat=>{const bd=budYr[cat];const tot=MOS.reduce((s,m)=>s+(bd._total?.[m]||0),0);return`<tr><td><strong style="font-size:.8rem">${esc(cat)}</strong></td>${MOS.map(mk=>`<td style="text-align:right"><input class="bud-cell-inp" type="number" value="${bd._total?.[mk]||''}" placeholder="0" min="0" step="10" data-action="bud-cell" data-year="${yr}" data-cat="${esc(cat)}" data-mo="${mk}"></td>`).join('')}<td style="text-align:right;font-family:var(--fm);font-weight:700;font-size:.8rem">${_cur(tot)}</td></tr>`;}).join('')}</tbody>
    </table></div></div>`;};
  return sec('Income',incCats)+sec('Expenses',expCats);
}

function _emptyState(){return`<div class="empty"><div class="empty-ico">🗂️</div><div class="empty-ttl">No Budget Categories</div><div class="empty-dsc">Add income and expense categories to start planning.</div><button class="btn btn-gold" data-action="bud-add-cat">+ Add Category</button></div>`;}
