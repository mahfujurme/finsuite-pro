/**
 * modules/networth.js — Net Worth tracker. data-action throughout.
 */
import { State } from '../state.js';
import { Store } from '../store.js';
import { uid, esc, formatCurrency } from '../utils.js';
import { nwCalc } from '../services/calculator.js';
import { validateAccount, renderFormErrors } from '../services/validator.js';
import { Modal } from '../components/form.js';
import { toast } from '../components/toast.js';

const ICO={bank:'🏦',savings:'💰',investment:'📈',pension:'🧓',property:'🏠',crypto:'₿',vehicle:'🚗',mortgage:'🏡',loan:'💳',creditcard:'💳',other:'📋'};
const SUB_OPTS=[['bank','🏦 Bank Account'],['savings','💰 Savings'],['investment','📈 Investment'],['pension','🧓 Pension'],['property','🏠 Property'],['crypto','₿ Crypto'],['vehicle','🚗 Vehicle'],['mortgage','🏡 Mortgage'],['loan','💳 Loan'],['creditcard','💳 Credit Card'],['other','📋 Other']];

export const NW = {
  render() {
    const el=document.getElementById('v-nw'); if(!el)return;
    const sym=State.get('user').sym||'£'; const cur=v=>formatCurrency(v,sym);
    const accs=State.get('accounts'), nwd=nwCalc(accs);
    const assets=accs.filter(a=>!a.isL), liabs=accs.filter(a=>a.isL);
    const ratio=(nwd.assets+nwd.liabilities)>0?Math.round(nwd.assets/(nwd.assets+nwd.liabilities)*100):50;
    const row=a=>`<div class="acc-item"><div class="acc-ico" style="background:${a.isL?'var(--rose2)':'var(--teal2)'}">${ICO[a.sub]||'📋'}</div><div style="flex:1;min-width:0"><div style="font-size:.82rem;font-weight:600;color:var(--t1)">${esc(a.name)}</div><div style="font-size:.69rem;color:var(--t3)">${a.sub||'—'}</div></div><div class="num" style="font-weight:700;font-size:.9rem;color:${a.isL?'var(--rose)':'var(--teal)'};margin-right:8px">${cur(a.value)}</div><button class="btn btn-ghost btn-xs" data-action="nw-edit" data-id="${a.id}">✏️</button><button class="btn btn-ghost btn-xs" data-action="nw-del" data-id="${a.id}">🗑️</button></div>`;
    el.innerHTML=`
    <div class="sec-row"><div class="sec-hdr" style="margin:0"><h2><span class="ico">🏦</span> Net Worth</h2><p>Assets, liabilities and your overall financial position.</p></div><button class="btn btn-gold" data-action="nw-add">+ Add Account</button></div>
    <div class="card" style="text-align:center;margin-bottom:18px;padding:30px">
      <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--t3);margin-bottom:6px">Total Net Worth</div>
      <div class="num" style="font-size:clamp(2rem,5vw,3rem);font-weight:600;letter-spacing:-.04em;color:${nwd.nw>=0?'var(--teal)':'var(--rose)'}">${cur(nwd.nw)}</div>
      <div style="display:flex;justify-content:center;gap:36px;margin-top:18px;flex-wrap:wrap">
        <div><div class="kpi-lbl">Total Assets</div><div class="num" style="font-size:1.2rem;font-weight:700;color:var(--teal)">${cur(nwd.assets)}</div></div>
        <div style="width:1px;background:var(--bdr)"></div>
        <div><div class="kpi-lbl">Total Liabilities</div><div class="num" style="font-size:1.2rem;font-weight:700;color:var(--rose)">${cur(nwd.liabilities)}</div></div>
      </div>
      ${nwd.assets+nwd.liabilities>0?`<div style="margin-top:18px;max-width:360px;margin-left:auto;margin-right:auto"><div class="prog lg"><div class="prog-fill pf-teal" style="width:${ratio}%"></div></div><div style="display:flex;justify-content:space-between;margin-top:5px;font-size:.68rem;color:var(--t3)"><span>Assets ${ratio}%</span><span>Liabilities ${100-ratio}%</span></div></div>`:''}
    </div>
    <div class="g2">
      <div class="card"><div class="card-hdr"><div class="card-ttl">💚 Assets <span class="num" style="color:var(--teal);font-size:.9rem;margin-left:4px">${cur(nwd.assets)}</span></div><button class="btn btn-ghost btn-xs" data-action="nw-add-asset">+ Asset</button></div>${assets.length?assets.map(row).join(''):'<p style="color:var(--t3);font-size:.8rem;text-align:center;padding:12px">No assets yet.</p>'}</div>
      <div class="card"><div class="card-hdr"><div class="card-ttl">🔴 Liabilities <span class="num" style="color:var(--rose);font-size:.9rem;margin-left:4px">${cur(nwd.liabilities)}</span></div><button class="btn btn-ghost btn-xs" data-action="nw-add-liab">+ Liability</button></div>${liabs.length?liabs.map(row).join(''):'<p style="color:var(--t3);font-size:.8rem;text-align:center;padding:12px">No liabilities yet.</p>'}</div>
    </div>`;
  },
  openAdd(defaultLiab=false){ _openModal(null,defaultLiab); },
  openEdit(id){ const a=State.get('accounts').find(x=>x.id===id); if(a)_openModal(a,a.isL); },
  del(id){
    const a=State.get('accounts').find(x=>x.id===id); if(!a)return;
    Modal.confirm(`Delete "<strong>${esc(a.name)}</strong>"?`,()=>{State.patch(D=>{D.accounts=D.accounts.filter(x=>x.id!==id);});_snap();Store.queue();toast('Deleted.','i');NW.render();},'Delete Account');
  },
};

function _openModal(a,defaultLiab){
  const sym=State.get('user').sym||'£'; const isEdit=!!a;
  const subOpts=SUB_OPTS.map(([v,l])=>`<option value="${v}" ${a?.sub===v?'selected':''}>${l}</option>`).join('');
  Modal.open({title:isEdit?'Edit Account':'Add Account',body:`
    <div class="fg"><label class="flbl">Account Name<span class="req">*</span></label><input type="text" class="finp" id="an" value="${a?esc(a.name):''}" placeholder="e.g. Barclays Current Account" maxlength="80"></div>
    <div class="frow">
      <div class="fg"><label class="flbl">Type</label><select class="finp" id="at"><option value="asset" ${!a||!a.isL?'selected':''}>💚 Asset</option><option value="liability" ${a?.isL||defaultLiab?'selected':''}>🔴 Liability</option></select></div>
      <div class="fg"><label class="flbl">Category</label><select class="finp" id="as">${subOpts}</select></div>
    </div>
    <div class="fg"><label class="flbl">Current Value<span class="req">*</span></label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="av" value="${a?.value??''}" min="0" step="0.01" placeholder="0.00"></div></div>
    <div id="err-name"  style="display:none" class="ferr">⚠ <span></span></div>
    <div id="err-value" style="display:none" class="ferr">⚠ <span></span></div>
    <div id="form-err"  style="display:none" class="ferr">⚠ <span></span></div>`,
    btns:[{lbl:'Cancel',cls:'btn-ghost',close:true},{lbl:isEdit?'Save Changes':'Add Account',cls:'btn-gold',fn:()=>_save(a?.id),close:false}]});
}

function _save(id){
  const name=document.getElementById('an')?.value.trim();
  const type=document.getElementById('at')?.value;
  const sub=document.getElementById('as')?.value;
  const value=document.getElementById('av')?.value;
  const isL=type==='liability';
  const result=validateAccount({name,type,value});
  if(!result.valid){renderFormErrors(result.errors);return;}
  State.patch(D=>{const acc={name,sub,value:parseFloat(value),isL,updatedAt:new Date().toISOString()};if(id){const i=D.accounts.findIndex(x=>x.id===id);if(i>-1)D.accounts[i]={...D.accounts[i],...acc};}else D.accounts.push({id:uid(),...acc,createdAt:new Date().toISOString()});});
  _snap();Store.queue();Modal.close();toast(id?'Account updated.':'Account added.','s');NW.render();
}

function _snap(){
  State.patch(D=>{
    const assets=D.accounts.filter(a=>!a.isL).reduce((s,a)=>s+a.value,0);
    const liabs=D.accounts.filter(a=>a.isL).reduce((s,a)=>s+a.value,0);
    const nw=assets-liabs,date=new Date().toISOString().split('T')[0];
    const last=D.snapshots[D.snapshots.length-1];
    if(!last||last.date!==date){D.snapshots.push({date,nw});if(D.snapshots.length>365)D.snapshots.shift();}
  });
}
