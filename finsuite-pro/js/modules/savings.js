/**
 * modules/savings.js — Savings goals + contribution plan. data-action throughout.
 */
import { State } from '../state.js';
import { Store } from '../store.js';
import { uid, esc, formatCurrency, MOS, MO_LABELS } from '../utils.js';
import { curYear, daysUntil, fmtDate } from '../services/calculator.js';
import { validateGoal, renderFormErrors } from '../services/validator.js';
import { Modal } from '../components/form.js';
import { toast } from '../components/toast.js';

let _year=curYear();
const ICONS=['🎯','🏠','🚗','✈️','🎓','💍','💰','🏦','🏖️','💻','📦','🌍','🎸','🛡️'];

export const Savings = {
  render() {
    const el=document.getElementById('v-save'); if(!el)return;
    const sym=State.get('user').sym||'£'; const cur=v=>formatCurrency(v,sym);
    const goals=State.get('goals'), plans=State.get('savingsPlan'), planYr=plans[_year]||{};
    const totalSaved=goals.reduce((s,g)=>s+g.current,0), totalTarget=goals.reduce((s,g)=>s+g.target,0);
    const monthlyBudget=goals.reduce((s,g)=>s+MOS.reduce((ss,m)=>ss+((planYr[g.id]||{})[m]||0),0)/12,0);
    el.innerHTML=`
    <div class="sec-row">
      <div class="sec-hdr" style="margin:0"><h2><span class="ico">💎</span> Savings Plan</h2><p>Goals, monthly contributions and progress.</p></div>
      <div class="sec-actions">
        <select class="finp" style="width:auto" data-action="sav-year-sel">${[_year-1,_year,_year+1,_year+2].map(y=>`<option value="${y}" ${y===_year?'selected':''}>${y}</option>`).join('')}</select>
        <button class="btn btn-gold" data-action="sav-goal">+ New Goal</button>
      </div>
    </div>
    <div class="kpi-row kpi-row-4" style="margin-bottom:18px">
      <div class="kpi" style="--kc:var(--gold)"><div class="kpi-ico">🏆</div><div class="kpi-lbl">Goals</div><div class="kpi-val num">${goals.length}</div></div>
      <div class="kpi" style="--kc:var(--teal)"><div class="kpi-ico">💰</div><div class="kpi-lbl">Total Saved</div><div class="kpi-val num">${cur(totalSaved)}</div></div>
      <div class="kpi" style="--kc:var(--amber)"><div class="kpi-ico">🎯</div><div class="kpi-lbl">Total Target</div><div class="kpi-val num">${cur(totalTarget)}</div></div>
      <div class="kpi" style="--kc:var(--violet)"><div class="kpi-ico">📅</div><div class="kpi-lbl">Avg Monthly Budget</div><div class="kpi-val num">${cur(monthlyBudget)}</div></div>
    </div>
    ${goals.length?_goalsGrid(goals,planYr,cur):_empty()}`;
  },
  setYear(yr){_year=yr;this.render();},
  setPlan(gid,mo,val){
    State.patch(D=>{if(!D.savingsPlan[_year])D.savingsPlan[_year]={};if(!D.savingsPlan[_year][gid])D.savingsPlan[_year][gid]={};D.savingsPlan[_year][gid][mo]=val;});
    Store.queue();
  },
  openGoalModal(id){
    const g=id?State.get('goals').find(x=>x.id===id):null; const isEdit=!!g;
    const sym=State.get('user').sym||'£';
    Modal.open({title:isEdit?'Edit Goal':'New Savings Goal',body:`
      <div class="fg"><label class="flbl">Goal Name<span class="req">*</span></label><input type="text" class="finp" id="gn" value="${g?esc(g.name):''}" placeholder="e.g. Emergency Fund" maxlength="80"></div>
      <div class="frow">
        <div class="fg"><label class="flbl">Target<span class="req">*</span></label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="gt" value="${g?.target||''}" min="0.01" step="0.01"></div></div>
        <div class="fg"><label class="flbl">Current</label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="gc" value="${g?.current??0}" min="0" step="0.01"></div></div>
      </div>
      <div class="frow">
        <div class="fg"><label class="flbl">Deadline</label><input type="date" class="finp" id="gd" value="${g?.deadline||''}"></div>
        <div class="fg"><label class="flbl">Icon</label><select class="finp" id="gi">${ICONS.map(ic=>`<option value="${ic}" ${g?.icon===ic?'selected':''}>${ic}</option>`).join('')}</select></div>
      </div>
      <div class="fg"><label class="flbl">Colour</label><input type="color" class="finp" id="gcol" value="${g?.color||'#c8a84b'}" style="height:38px;padding:4px;cursor:pointer;width:80px"></div>
      <div id="err-name"    style="display:none" class="ferr">⚠ <span></span></div>
      <div id="err-target"  style="display:none" class="ferr">⚠ <span></span></div>
      <div id="err-current" style="display:none" class="ferr">⚠ <span></span></div>
      <div id="form-err"    style="display:none" class="ferr">⚠ <span></span></div>`,
      btns:[{lbl:'Cancel',cls:'btn-ghost',close:true},{lbl:isEdit?'Save Changes':'Create Goal',cls:'btn-gold',fn:()=>_saveGoal(g?.id),close:false}]});
  },
  openContrib(id){
    const g=State.get('goals').find(x=>x.id===id); if(!g)return;
    const sym=State.get('user').sym||'£'; const cur=v=>formatCurrency(v,sym);
    Modal.open({title:`Contribute to ${esc(g.name)}`,size:'sm',body:`
      <p style="font-size:.82rem;color:var(--t2);margin-bottom:12px">Current: <strong>${cur(g.current)}</strong> / ${cur(g.target)}</p>
      <div class="fg"><label class="flbl">Amount<span class="req">*</span></label><div class="iwrap"><span class="ipre">${sym}</span><input type="number" class="finp" id="ca" placeholder="100.00" min="0.01" step="0.01"></div></div>
      <div id="form-err" style="display:none" class="ferr">⚠ <span>Enter a valid amount.</span></div>`,
      btns:[{lbl:'Cancel',cls:'btn-ghost',close:true},{lbl:'Add Contribution',cls:'btn-gold',fn:()=>{
        const a=parseFloat(document.getElementById('ca')?.value);
        if(!a||a<=0){Modal.showError('form-err','Enter a valid amount.');return;}
        State.patch(D=>{const i=D.goals.findIndex(x=>x.id===id);if(i>-1)D.goals[i].current=Math.min(D.goals[i].target,D.goals[i].current+a);});
        Store.queue();Modal.close();toast(`${cur(a)} added to "${g.name}"!`,'s');Savings.render();
      },close:false}]});
  },
  delGoal(id){
    const g=State.get('goals').find(x=>x.id===id); if(!g)return;
    Modal.confirm(`Delete goal "<strong>${esc(g.name)}</strong>"?`,()=>{State.patch(D=>{D.goals=D.goals.filter(x=>x.id!==id);});Store.queue();toast('Deleted.','i');this.render();},'Delete Goal');
  },
};

function _saveGoal(id){
  const name=document.getElementById('gn')?.value.trim(), target=document.getElementById('gt')?.value, current=document.getElementById('gc')?.value||0, deadline=document.getElementById('gd')?.value, icon=document.getElementById('gi')?.value, color=document.getElementById('gcol')?.value;
  const result=validateGoal({name,target,current,deadline});
  if(!result.valid){renderFormErrors(result.errors);return;}
  State.patch(D=>{const g={name,target:parseFloat(target),current:parseFloat(current),deadline,icon,color};if(id){const i=D.goals.findIndex(x=>x.id===id);if(i>-1)D.goals[i]={...D.goals[i],...g};}else D.goals.push({id:uid(),...g,createdAt:new Date().toISOString()});});
  Store.queue();Modal.close();toast(id?'Goal updated.':'Goal created!','s');Savings.render();
}

function _goalsGrid(goals,planYr,cur){
  return`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:20px">
    ${goals.map(g=>{const p=Math.min(100,Math.round(g.current/g.target*100));const rem=g.target-g.current;const dl=daysUntil(g.deadline);const dlLabel=dl!==null?(dl>0?`${dl}d left`:dl===0?'Today!':'Overdue'):fmtDate(g.deadline);
    return`<div class="goal-card" style="--gc:${g.color||'var(--gold)'}"><div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px"><span style="font-size:1.3rem">${g.icon||'🎯'}</span><div style="flex:1"><div style="font-family:var(--fd);font-size:.95rem;color:var(--t1)">${esc(g.name)}</div>${g.deadline?`<div style="font-size:.7rem;color:var(--t3)">📅 ${dlLabel}</div>`:''}</div>${p>=100?'<span class="badge b-in">✅</span>':''}<div style="display:flex;gap:4px"><button class="btn btn-ghost btn-xs" data-action="sav-contrib" data-id="${g.id}" title="Contribute">+</button><button class="btn btn-ghost btn-xs" data-action="sav-goal-edit" data-id="${g.id}">✏️</button><button class="btn btn-ghost btn-xs" data-action="sav-del" data-id="${g.id}">🗑️</button></div></div><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><div class="num" style="font-size:1.1rem;font-weight:700;color:var(--t1)">${cur(g.current)}</div><div style="font-size:.73rem;color:var(--t3)">of ${cur(g.target)}</div></div><div class="prog lg"><div class="prog-fill pf-gold" style="width:${p}%;background:${g.color||'var(--gold)'}"></div></div><div style="font-size:.72rem;font-weight:600;text-align:right;margin-top:5px;color:${g.color||'var(--gold2)'}">${p}% ${p<100?'· '+cur(rem)+' to go':'🎉'}</div></div>`;}).join('')}
  </div>
  <div class="card adv-only">
    <div class="card-hdr"><div class="card-ttl">📅 Monthly Contribution Plan (${_year})</div></div>
    <p style="font-size:.76rem;color:var(--t3);margin-bottom:14px">Set contributions per goal per month.</p>
    <div style="overflow-x:auto"><table class="bud-table" style="min-width:900px">
      <thead><tr><th>Goal</th>${MO_LABELS.map(m=>`<th style="text-align:right;min-width:65px">${m}</th>`).join('')}<th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${goals.map(g=>{const gp=planYr[g.id]||{};const tot=MOS.reduce((s,m)=>s+(gp[m]||0),0);return`<tr><td><span>${g.icon||'🎯'}</span> <strong style="font-size:.8rem">${esc(g.name)}</strong></td>${MOS.map(m=>`<td style="text-align:right"><input class="bud-cell-inp" type="number" value="${gp[m]||''}" placeholder="0" min="0" step="10" data-action="sav-plan" data-gid="${g.id}" data-mo="${m}"></td>`).join('')}<td style="text-align:right;font-family:var(--fm);font-weight:700;font-size:.8rem">${cur(tot)}</td></tr>`;}).join('')}
        <tr class="bud-total-row"><td>Monthly Total</td>${MOS.map(m=>`<td style="text-align:right;font-family:var(--fm);font-size:.78rem">${cur(goals.reduce((s,g)=>s+((planYr[g.id]||{})[m]||0),0))}</td>`).join('')}<td style="text-align:right;font-family:var(--fm);font-weight:700">${cur(goals.reduce((s,g)=>s+MOS.reduce((ss,m)=>ss+((planYr[g.id]||{})[m]||0),0),0))}</td></tr>
      </tbody>
    </table></div>
  </div>`;
}
function _empty(){return`<div class="empty"><div class="empty-ico">🏆</div><div class="empty-ttl">No Savings Goals</div><div class="empty-dsc">Create financial goals and plan monthly contributions.</div><button class="btn btn-gold" data-action="sav-goal">+ Create First Goal</button></div>`;}
