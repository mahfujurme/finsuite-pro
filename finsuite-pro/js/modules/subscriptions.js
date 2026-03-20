/**
 * modules/subscriptions.js — Subscriptions tracker. data-action throughout.
 */
import { State } from '../state.js';
import { Store } from '../store.js';
import { uid, esc, formatCurrency } from '../utils.js';
import { validateSubscription, renderFormErrors } from '../services/validator.js';
import { Modal } from '../components/form.js';
import { toast } from '../components/toast.js';

const ICONS=['💳','📺','🎵','🎮','📰','☁️','🛡️','📧','💼','🏋️','📦','🎨','🔧','🌐'];

export const Subs = {
  render() {
    const el=document.getElementById('v-subs'); if(!el)return;
    const sym=State.get('user').sym||'£'; const cur=v=>formatCurrency(v,sym);
    const subs=State.get('subs');
    const toMo=s=>s.cycle==='monthly'?s.amount:s.cycle==='yearly'?s.amount/12:s.amount*4.33;
    const mc=subs.filter(s=>s.active).reduce((t,s)=>t+toMo(s),0), yc=mc*12, active=subs.filter(s=>s.active).length;
    el.innerHTML=`
    <div class="sec-row"><div class="sec-hdr" style="margin:0"><h2><span class="ico">🔄</span> Subscriptions</h2><p>Track recurring services and their monthly impact.</p></div><button class="btn btn-gold" data-action="sub-add">+ Add Subscription</button></div>
    <div class="kpi-row kpi-row-3">
      <div class="kpi" style="--kc:var(--gold)"><div class="kpi-ico">📅</div><div class="kpi-lbl">Monthly Cost</div><div class="kpi-val num">${cur(mc)}</div></div>
      <div class="kpi" style="--kc:var(--sky)"><div class="kpi-ico">📆</div><div class="kpi-lbl">Yearly Cost</div><div class="kpi-val num">${cur(yc)}</div></div>
      <div class="kpi" style="--kc:var(--teal)"><div class="kpi-ico">🔄</div><div class="kpi-lbl">Active</div><div class="kpi-val num">${active}</div></div>
    </div>
    ${subs.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px">${subs.map(s=>`<div class="sub-card" style="opacity:${s.active?1:.55}"><div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;background:var(--bg4);border-radius:var(--r2);display:flex;align-items:center;justify-content:center;font-size:1.1rem">${s.icon||'💳'}</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.83rem;color:var(--t1)">${esc(s.name)}</div><div style="font-size:.68rem;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">${esc(s.cat||'')}</div></div><span class="badge ${s.active?'b-in':'b-nu'}">${s.active?'Active':'Paused'}</span></div><div style="display:flex;align-items:center;justify-content:space-between"><div class="num" style="font-size:1.1rem;font-weight:700;color:var(--t1)">${cur(s.amount)}<span style="font-size:.7rem;color:var(--t3);font-weight:400"> /${s.cycle}</span></div><div style="font-size:.72rem;color:var(--t3)">${cur(toMo(s))}/mo</div></div>${s.nextDate?`<div style="font-size:.71rem;color:var(--t3)">📅 Next: ${_fmtDate(s.nextDate)}</div>`:''}<div style="display:flex;gap:5px;padding-top:9px;border-top:1px solid var(--bdr2)"><button class="btn btn-outline btn-sm" style="flex:1" data-action="sub-toggle" data-id="${s.id}">${s.active?'⏸ Pause':'▶ Resume'}</button><button class="btn btn-ghost btn-xs" data-action="sub-edit" data-id="${s.id}">✏️</button><button class="btn btn-ghost btn-xs" data-action="sub-del" data-id="${s.id}">🗑️</button></div></div>`).join('')}</div>`
    :`<div class="empty"><div class="empty-ico">🔄</div><div class="empty-ttl">No Subscriptions</div><div class="empty-dsc">Track recurring services to monitor monthly costs.</div><button class="btn btn-gold" data-action="sub-add">+ Add Subscription</button></div>`}`;
  },
  toggle(id){ State.patch(D=>{const i=D.subs.findIndex(x=>x.id===id);if(i>-1)D.subs[i].active=!D.subs[i].active;}); Store.queue(); this.render(); },
  openAdd(){ _openModal(null); },
  openEdit(id){ const s=State.get('subs').find(x=>x.id===id); if(s)_openModal(s); },
  del(id){ const s=State.get('subs').find(x=>x.id===id); if(!s)return; Modal.confirm(`Delete "<strong>${esc(s.name)}</strong>"?`,()=>{State.patch(D=>{D.subs=D.subs.filter(x=>x.id!==id);});Store.queue();toast('Deleted.','i');this.render();},'Delete Subscription'); },
};

function _openModal(s){
  const sym=State.get('user').sym||'£'; const isEdit=!!s;
  const catOpts=['Entertainment','Software','Fitness','News','Shopping','Utilities','Professional','Other'].map(c=>`<option value="${c}" ${s?.cat===c?'selected':''}>${c}</option>`).join('');
  Modal.open({title:isEdit?'Edit Subscription':'Add Subscription',body:`
    <div class="frow">
      <div class="fg"><label class="flbl">Name<span class="req">*</span></label><input type="text" class="finp" id="sn" value="${s?esc(s.name):''}" placeholder="e.g. Netflix" maxlength="60"></div>
      <div class="fg"><label class="flbl">Icon</label><select class="finp" id="si">${ICONS.map(ic=>`<option value="${ic}" ${s?.icon===ic?'selected':''}>${ic}</option>`).join('')}</select></div>
    </div>
    <div class="frow">
      <div class="fg"><label class="flbl">Amount<span class="req">*</span></label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="sa" value="${s?.amount||''}" min="0.01" step="0.01"></div></div>
      <div class="fg"><label class="flbl">Billing Cycle</label><select class="finp" id="sc"><option value="monthly" ${!s||s.cycle==='monthly'?'selected':''}>Monthly</option><option value="yearly" ${s?.cycle==='yearly'?'selected':''}>Yearly</option><option value="weekly" ${s?.cycle==='weekly'?'selected':''}>Weekly</option></select></div>
    </div>
    <div class="frow">
      <div class="fg"><label class="flbl">Category</label><select class="finp" id="scat">${catOpts}</select></div>
      <div class="fg"><label class="flbl">Next Billing</label><input type="date" class="finp" id="snd" value="${s?.nextDate||''}"></div>
    </div>
    <div id="err-name"   style="display:none" class="ferr">⚠ <span></span></div>
    <div id="err-amount" style="display:none" class="ferr">⚠ <span></span></div>
    <div id="form-err"   style="display:none" class="ferr">⚠ <span></span></div>`,
    btns:[{lbl:'Cancel',cls:'btn-ghost',close:true},{lbl:isEdit?'Save Changes':'Add Subscription',cls:'btn-gold',fn:()=>_save(s?.id),close:false}]});
}
function _save(id){
  const name=document.getElementById('sn')?.value.trim(), amount=document.getElementById('sa')?.value, cycle=document.getElementById('sc')?.value, cat=document.getElementById('scat')?.value, icon=document.getElementById('si')?.value, nextDate=document.getElementById('snd')?.value;
  const result=validateSubscription({name,amount,cycle});
  if(!result.valid){renderFormErrors(result.errors);return;}
  State.patch(D=>{const sub={name,amount:parseFloat(amount),cycle,cat,icon,nextDate};if(id){const i=D.subs.findIndex(x=>x.id===id);if(i>-1)D.subs[i]={...D.subs[i],...sub};}else D.subs.push({id:uid(),...sub,active:true,createdAt:new Date().toISOString()});});
  Store.queue();Modal.close();toast(id?'Updated.':'Subscription added.','s');Subs.render();
}
function _fmtDate(s){if(!s)return'';return new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
