/**
 * modules/debt.js — Debt planner. data-action throughout. Uses validator.
 */
import { State } from '../state.js';
import { Store } from '../store.js';
import { uid, esc, formatCurrency } from '../utils.js';
import { debtSim } from '../services/calculator.js';
import { validateDebt, renderFormErrors } from '../services/validator.js';
import { Modal } from '../components/form.js';
import { toast } from '../components/toast.js';

let _method='avalanche', _extra=0;

export const Debt = {
  render() {
    const el=document.getElementById('v-debt'); if(!el)return;
    const sym=State.get('user').sym||'£'; const cur=v=>formatCurrency(v,sym);
    const debts=State.get('debts'), sim=debtSim(debts,_extra,_method);
    const tot=debts.reduce((s,d)=>s+d.balance,0), minP=debts.reduce((s,d)=>s+d.minPmt,0);
    el.innerHTML=`
    <div class="sec-row"><div class="sec-hdr" style="margin:0"><h2><span class="ico">🔗</span> Debt Planner</h2><p>Simulate payoff strategies. Debts link to your Net Worth.</p></div><button class="btn btn-gold" data-action="debt-add">+ Add Debt</button></div>
    <div class="kpi-row kpi-row-3">
      <div class="kpi" style="--kc:var(--rose)"><div class="kpi-ico">💳</div><div class="kpi-lbl">Total Debt</div><div class="kpi-val num" style="color:var(--rose)">${cur(tot)}</div></div>
      <div class="kpi" style="--kc:var(--amber)"><div class="kpi-ico">📅</div><div class="kpi-lbl">Min Monthly</div><div class="kpi-val num">${cur(minP)}</div></div>
      <div class="kpi" style="--kc:var(--sky)"><div class="kpi-ico">📆</div><div class="kpi-lbl">Payoff Time</div><div class="kpi-val">${sim.label}</div></div>
    </div>
    ${debts.length?`
    <div class="card" style="margin-bottom:16px">
      <div class="card-hdr"><div class="card-ttl">⚙️ Payoff Strategy</div></div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <span style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--t3)">Method:</span>
        <div class="tabs" style="max-width:340px">
          <button class="tab-btn ${_method==='avalanche'?'on':''}" data-action="debt-method" data-value="avalanche">🏔️ Avalanche (High APR first)</button>
          <button class="tab-btn ${_method==='snowball' ?'on':''}" data-action="debt-method" data-value="snowball">⛄ Snowball (Low balance first)</button>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg" style="margin:0;flex:1;min-width:180px">
          <label class="flbl">Extra Monthly Payment</label>
          <div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" value="${_extra}" min="0" step="25" data-action="debt-extra" placeholder="0"></div>
        </div>
        ${sim.interest>0?`<div style="background:var(--sky2);border:1px solid rgba(91,164,245,.25);border-radius:var(--r2);padding:10px 14px"><div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:var(--t3)">Total Interest</div><div class="num" style="font-weight:700;color:var(--sky)">${cur(sim.interest)}</div></div>`:''}
      </div>
      ${sim.order.length?`<div style="margin-top:14px"><div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--t3);margin-bottom:8px">Payoff Order</div><div>${sim.order.map((p,i,arr)=>`<div class="pf-step"><div style="position:relative"><div class="pf-dot"></div>${i<arr.length-1?'<div class="pf-line"></div>':''}</div><div><div style="font-size:.82rem;font-weight:700;color:var(--t1)">${esc(p.name)}</div><div style="font-size:.72rem;color:var(--t3)">Month ${p.month} — ${Math.floor(p.month/12)}y ${p.month%12}m</div></div></div>`).join('')}</div></div>`:''}
    </div>
    <div>${debts.map(d=>`<div class="debt-item"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-weight:700;font-size:.88rem;color:var(--t1)">${esc(d.name)}</div><div style="font-size:.72rem;color:var(--t3)">${d.type||'Loan'} · Min: ${cur(d.minPmt)}/mo</div></div><div style="text-align:right"><div class="num" style="font-weight:700;color:var(--rose);font-size:1.05rem">${cur(d.balance)}</div><div style="font-size:.72rem;color:var(--rose)">${d.rate}% APR</div></div></div><div class="prog md"><div class="prog-fill pf-rose" style="width:100%"></div></div><div style="display:flex;gap:7px;margin-top:10px"><button class="btn btn-outline btn-sm" data-action="debt-edit" data-id="${d.id}">✏️ Edit</button><button class="btn btn-rose btn-sm" data-action="debt-del" data-id="${d.id}">🗑️ Delete</button></div></div>`).join('')}</div>`
    :`<div class="empty"><div class="empty-ico">🔗</div><div class="empty-ttl">No Debts Tracked</div><div class="empty-dsc">Add debts to simulate payoff strategies.</div><button class="btn btn-gold" data-action="debt-add">+ Add Debt</button></div>`}`;
  },
  setMethod(m){_method=m;this.render();},
  setExtra(v){_extra=v;this.render();},
  openAdd(){ _openModal(null); },
  openEdit(id){ const d=State.get('debts').find(x=>x.id===id); if(d)_openModal(d); },
  del(id){
    const d=State.get('debts').find(x=>x.id===id); if(!d)return;
    Modal.confirm(`Delete "<strong>${esc(d.name)}</strong>"?`,()=>{State.patch(D=>{D.debts=D.debts.filter(x=>x.id!==id);});Store.queue();toast('Deleted.','i');this.render();},'Delete Debt');
  },
};

function _openModal(d){
  const sym=State.get('user').sym||'£'; const isEdit=!!d;
  const typeOpts=[['credit_card','💳 Credit Card'],['personal_loan','💼 Personal Loan'],['student_loan','🎓 Student Loan'],['mortgage','🏡 Mortgage'],['car','🚗 Car Finance'],['other','📋 Other']].map(([v,l])=>`<option value="${v}" ${d?.type===v?'selected':''}>${l}</option>`).join('');
  Modal.open({title:isEdit?'Edit Debt':'Add Debt',body:`
    <div class="fg"><label class="flbl">Debt Name<span class="req">*</span></label><input type="text" class="finp" id="dn" value="${d?esc(d.name):''}" placeholder="e.g. HSBC Credit Card" maxlength="80"></div>
    <div class="frow">
      <div class="fg"><label class="flbl">Balance<span class="req">*</span></label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="db" value="${d?.balance||''}" min="0.01" step="0.01"></div></div>
      <div class="fg"><label class="flbl">APR %<span class="req">*</span></label><div class="iwrap"><input type="number" class="finp has-suf" id="dr" value="${d?.rate||''}" min="0" max="100" step="0.1"><span class="isuf">%</span></div></div>
    </div>
    <div class="frow">
      <div class="fg"><label class="flbl">Min Monthly Payment<span class="req">*</span></label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="dm" value="${d?.minPmt||''}" min="0" step="0.01"></div></div>
      <div class="fg"><label class="flbl">Debt Type</label><select class="finp" id="dt">${typeOpts}</select></div>
    </div>
    <div id="err-name"    style="display:none" class="ferr">⚠ <span></span></div>
    <div id="err-balance" style="display:none" class="ferr">⚠ <span></span></div>
    <div id="err-rate"    style="display:none" class="ferr">⚠ <span></span></div>
    <div id="err-minPmt"  style="display:none" class="ferr">⚠ <span></span></div>
    <div id="form-err"    style="display:none" class="ferr">⚠ <span></span></div>`,
    btns:[{lbl:'Cancel',cls:'btn-ghost',close:true},{lbl:isEdit?'Save Changes':'Add Debt',cls:'btn-gold',fn:()=>_save(d?.id),close:false}]});
}

function _save(id){
  const name=document.getElementById('dn')?.value.trim(), balance=document.getElementById('db')?.value, rate=document.getElementById('dr')?.value, minPmt=document.getElementById('dm')?.value, type=document.getElementById('dt')?.value;
  const result=validateDebt({name,balance,rate,minPmt});
  if(!result.valid){renderFormErrors(result.errors);return;}
  State.patch(D=>{const debt={name,balance:parseFloat(balance),rate:parseFloat(rate),minPmt:parseFloat(minPmt),type};if(id){const i=D.debts.findIndex(x=>x.id===id);if(i>-1)D.debts[i]={...D.debts[i],...debt};}else D.debts.push({id:uid(),...debt,createdAt:new Date().toISOString()});});
  Store.queue();Modal.close();toast(id?'Updated.':'Debt added.','s');Debt.render();
}
