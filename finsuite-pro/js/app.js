/**
 * app.js — Application entry point. ES Module.
 *
 * Key upgrade: ALL interactions handled via event delegation.
 * No window.* globals. No inline onclick in HTML templates.
 * Modules are imported here and their methods called by the
 * central click/change/input dispatchers below.
 */

import { State }  from './state.js';
import { Store }  from './store.js';
import { uid, today, MOS } from './utils.js';
import { ROUTER } from './router.js';
import { Charts } from './components/chart.js';
import { Modal }  from './components/form.js';
import { toast }  from './components/toast.js';

import { Dash }     from './modules/dashboard.js';
import { Tx }       from './modules/transactions.js';
import { Importer } from './modules/importer.js';
import { Budget }   from './modules/budget.js';
import { NW }       from './modules/networth.js';
import { Debt }     from './modules/debt.js';
import { Savings }  from './modules/savings.js';
import { Subs }     from './modules/subscriptions.js';
import { Fore }     from './modules/forecast.js';
import { Settings, applyTheme, applyModuleVisibility } from './modules/settings.js';

ROUTER.register({
  dash: () => Dash.render(),
  tx:   () => Tx.render(),
  imp:  () => Importer.render(),
  bud:  () => Budget.render(),
  nw:   () => NW.render(),
  debt: () => Debt.render(),
  save: () => Savings.render(),
  subs: () => Subs.render(),
  fore: () => Fore.render(),
  cfg:  () => Settings.render(),
});

Charts.setRefresh(() => ROUTER.renderCurrent());

// ── Event Delegation ──────────────────────────────────

document.addEventListener('click',  _onClick);
document.addEventListener('change', _onChange);
document.addEventListener('input',  _onInput);

function _onClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, view, value, year, cat } = btn.dataset;
  switch (action) {
    case 'nav':           ROUTER.go(view); break;
    case 'dash-refresh':  Dash.render(); break;
    case 'tx-add':        Tx.openAdd(); break;
    case 'tx-edit':       Tx.openEdit(id); break;
    case 'tx-del':        Tx.del(id); break;
    case 'tx-export':     Tx.exportCSV(); break;
    case 'tx-sort':       Tx.sort(value); break;
    case 'tx-clear':      Tx.clearFilters(); break;
    case 'bud-add-cat':   Budget.openAddCat(); break;
    case 'bud-del-cat':   Budget.delCat(year, cat); break;
    case 'bud-view':      Budget.setView(value); break;
    case 'nw-add':        NW.openAdd(); break;
    case 'nw-add-asset':  NW.openAdd(false); break;
    case 'nw-add-liab':   NW.openAdd(true); break;
    case 'nw-edit':       NW.openEdit(id); break;
    case 'nw-del':        NW.del(id); break;
    case 'debt-add':      Debt.openAdd(); break;
    case 'debt-edit':     Debt.openEdit(id); break;
    case 'debt-del':      Debt.del(id); break;
    case 'debt-method':   Debt.setMethod(value); break;
    case 'sav-goal':      Savings.openGoalModal(); break;
    case 'sav-goal-edit': Savings.openGoalModal(id); break;
    case 'sav-contrib':   Savings.openContrib(id); break;
    case 'sav-del':       Savings.delGoal(id); break;
    case 'sub-add':       Subs.openAdd(); break;
    case 'sub-edit':      Subs.openEdit(id); break;
    case 'sub-del':       Subs.del(id); break;
    case 'sub-toggle':    Subs.toggle(id); break;
    case 'fore-months':   Fore.setMonths(+value); break;
    case 'imp-file':      document.getElementById('file-inp')?.click(); break;
    case 'imp-preview':   Importer.preview(); break;
    case 'imp-confirm':   Importer.confirm(); break;
    case 'imp-reset':     Importer.reset(); break;
    case 'cfg-save-profile': Settings.saveProfile(); break;
    case 'cfg-theme':     Settings.toggleTheme(); break;
    case 'cfg-mode':      Settings.setMode(value); break;
    case 'cfg-export-json': Store.exportJSON(); toast('Backup exported!','s'); break;
    case 'cfg-export-csv':  Tx.exportCSV(); break;
    case 'cfg-import-json': document.getElementById('imp-json')?.click(); break;
    case 'cfg-clear':
      Modal.confirm('Delete <strong>ALL</strong> data permanently? This cannot be undone.',
        () => { Store.clear(); location.reload(); }, 'Clear All Data');
      break;
    case 'cfg-sample':
      Modal.confirm('Add sample data alongside existing data?',
        () => { loadSample(); toast('Sample data loaded!','s'); ROUTER.go('dash'); }, 'Load Sample Data');
      break;
    case 'modal-close':   Modal.close(); break;
    case 'ob-next':       OB.next(); break;
    case 'ob-mode':       OB.setMode(value); break;
    case 'ob-finish':     OB.finish(); break;
    case 'quick-add':     Tx.openAdd(); break;
    case 'theme':         Settings.toggleTheme(); break;
  }
}

function _onChange(e) {
  const el = e.target; const action = el.dataset.action;
  if (!action) return;
  switch (action) {
    case 'tx-filter-type': Tx.setFilter('type', el.value); break;
    case 'tx-filter-cat':  Tx.setFilter('cat',  el.value); break;
    case 'tx-filter-from': Tx.setFilter('from', el.value); break;
    case 'tx-filter-to':   Tx.setFilter('to',   el.value); break;
    case 'tx-type-change': Tx.syncTypeOptions(el.value); break;
    case 'tx-cat-change':  Tx.syncSubOptions(el.value); break;
    case 'bud-year-sel':   Budget.setYear(+el.value); break;
    case 'bud-month-sel':  Budget.setMo(el.value); break;
    case 'bud-cell':       Budget.setCell(el.dataset.year, el.dataset.cat, el.dataset.mo, +el.value); break;
    case 'sav-year-sel':   Savings.setYear(+el.value); break;
    case 'sav-plan':       Savings.setPlan(el.dataset.gid, el.dataset.mo, +el.value); break;
    case 'debt-extra':     Debt.setExtra(+el.value); break;
    case 'cfg-autosave':   Settings.setAutoSave(el.checked); break;
    case 'cfg-module':     Settings.toggleModule(el.dataset.key, !el.checked); break;
    case 'imp-json':       Settings.importJSON(el); break;
  }
}

function _onInput(e) {
  const el = e.target; const action = el.dataset.action;
  if (!action) return;
  if (action === 'tx-search') Tx.setFilter('q', el.value);
}

// ── Onboarding ────────────────────────────────────────

let _obMode = 'advanced';
const OB = {
  next() {
    const inp = document.getElementById('ob-name');
    const name = inp?.value.trim();
    if (!name) { inp?.classList.add('bad'); inp?.focus(); return; }
    inp.classList.remove('bad');
    document.getElementById('ob-s0')?.classList.remove('on');
    document.getElementById('ob-s1')?.classList.add('on');
    document.getElementById('ob-d0')?.classList.remove('on');
    document.getElementById('ob-d1')?.classList.add('on');
  },
  setMode(m) {
    _obMode = m;
    document.getElementById('ob-m-beg')?.classList.toggle('on', m === 'beginner');
    document.getElementById('ob-m-adv')?.classList.toggle('on', m === 'advanced');
  },
  finish() {
    const name = document.getElementById('ob-name')?.value.trim();
    const [code, sym] = (document.getElementById('ob-cur')?.value || 'GBP,£').split(',');
    State.patch(D => { D.user.name=name; D.user.currency=code; D.user.sym=sym; D.user.mode=_obMode; D.user.theme='dark'; });
    loadSample();
    Store.save();
    document.getElementById('ob')?.classList.add('off');
    Settings.applyAll();
    ROUTER.init();
    toast(`Welcome, ${name}! 🎉`, 's', 'FinSuite Pro v3');
  },
};

// ── Sample Data ───────────────────────────────────────

export function loadSample() {
  const now=new Date(), y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,'0');
  const pm=now.getMonth()===0?12:now.getMonth();
  const py=now.getMonth()===0?y-1:y;
  const lm=String(pm).padStart(2,'0');
  const TXNS=[
    {desc:'Monthly Salary',    amt:3800,  type:'income',  cat:'Salary',       sub:'Base',             d:`${y}-${m}-01`},
    {desc:'Rent',              amt:1200,  type:'expense', cat:'Housing',       sub:'Rent',             d:`${y}-${m}-01`},
    {desc:'Tesco Weekly Shop', amt:87.4,  type:'expense', cat:'Groceries',     sub:'Supermarket',      d:`${y}-${m}-03`},
    {desc:'Netflix',           amt:15.99, type:'expense', cat:'Subscriptions', sub:'Streaming',        d:`${y}-${m}-05`},
    {desc:'EDF Energy',        amt:120,   type:'expense', cat:'Utilities',     sub:'Electric',         d:`${y}-${m}-07`},
    {desc:'Pure Gym',          amt:35,    type:'expense', cat:'Healthcare',    sub:'Gym',              d:`${y}-${m}-08`},
    {desc:'Dishoom Dinner',    amt:54.8,  type:'expense', cat:'Food & Dining', sub:'Restaurants',      d:`${y}-${m}-10`},
    {desc:'Oyster Card',       amt:148,   type:'expense', cat:'Transport',     sub:'Public Transport', d:`${y}-${m}-12`},
    {desc:'Freelance Invoice', amt:650,   type:'income',  cat:'Freelance',     sub:'Projects',         d:`${y}-${m}-14`},
    {desc:'Amazon Purchase',   amt:43.99, type:'expense', cat:'Shopping',      sub:'Home',             d:`${y}-${m}-16`},
    {desc:'Monthly Salary',    amt:3800,  type:'income',  cat:'Salary',       sub:'Base',             d:`${py}-${lm}-01`},
    {desc:'Rent',              amt:1200,  type:'expense', cat:'Housing',       sub:'Rent',             d:`${py}-${lm}-01`},
    {desc:'Tesco',             amt:92.1,  type:'expense', cat:'Groceries',     sub:'Supermarket',      d:`${py}-${lm}-05`},
    {desc:'Spotify',           amt:9.99,  type:'expense', cat:'Subscriptions', sub:'Streaming',        d:`${py}-${lm}-06`},
    {desc:'EDF Energy',        amt:115,   type:'expense', cat:'Utilities',     sub:'Electric',         d:`${py}-${lm}-07`},
    {desc:'Oyster Card',       amt:148,   type:'expense', cat:'Transport',     sub:'Public Transport', d:`${py}-${lm}-10`},
  ];
  State.patch(D=>{
    TXNS.forEach(t=>D.tx.unshift({id:uid(),description:t.desc,amount:t.amt,type:t.type,date:t.d,category:t.cat,subcat:t.sub,notes:'',createdAt:new Date().toISOString()}));
    const yr=String(y);
    if(!D.budgets[yr])D.budgets[yr]={};
    [['Housing',false,1300],['Groceries',false,400],['Transport',false,160],['Food & Dining',false,120],['Utilities',false,150],['Shopping',false,80],['Healthcare',false,50],['Subscriptions',false,30],['Salary',true,3800],['Freelance',true,500]].forEach(([cat,isInc,val])=>{
      if(!D.budgets[yr][cat])D.budgets[yr][cat]={_meta:{isIncome:isInc},_total:Object.fromEntries(MOS.map(mk=>[mk,val]))};
    });
    const accs=[{name:'Barclays Current',sub:'bank',value:4200,isL:false},{name:'Marcus Savings',sub:'savings',value:12500,isL:false},{name:'Vanguard ISA',sub:'investment',value:8300,isL:false},{name:'HSBC Credit Card',sub:'creditcard',value:1800,isL:true},{name:'Student Loan',sub:'loan',value:24000,isL:true}];
    accs.forEach(a=>{if(!D.accounts.find(x=>x.name===a.name))D.accounts.push({id:uid(),...a,createdAt:new Date().toISOString()});});
    const goals=[{name:'Emergency Fund',target:10000,current:5500,icon:'🛡️',color:'#0ed2b0',deadline:`${y+1}-06-01`},{name:'Japan Trip',target:3500,current:1200,icon:'✈️',color:'#5ba4f5',deadline:`${y+1}-03-01`},{name:'New Laptop',target:1800,current:950,icon:'💻',color:'#9b78f5',deadline:`${y}-12-31`}];
    goals.forEach(g=>{if(!D.goals.find(x=>x.name===g.name))D.goals.push({id:uid(),...g,createdAt:new Date().toISOString()});});
    const debts=[{name:'HSBC Credit Card',balance:1800,rate:22.9,minPmt:36,type:'credit_card'},{name:'Car Loan',balance:8500,rate:7.5,minPmt:220,type:'car'}];
    debts.forEach(d=>{if(!D.debts.find(x=>x.name===d.name))D.debts.push({id:uid(),...d,createdAt:new Date().toISOString()});});
    const nb=`${y}-${String(now.getMonth()+2).padStart(2,'0')}-01`;
    const subs=[{name:'Netflix',amount:15.99,cycle:'monthly',cat:'Entertainment',icon:'📺'},{name:'Spotify',amount:9.99,cycle:'monthly',cat:'Entertainment',icon:'🎵'},{name:'Adobe CC',amount:54.98,cycle:'monthly',cat:'Software',icon:'🎨'},{name:'Pure Gym',amount:35,cycle:'monthly',cat:'Fitness',icon:'🏋️'},{name:'iCloud',amount:2.99,cycle:'monthly',cat:'Software',icon:'☁️'}];
    subs.forEach(s=>{if(!D.subs.find(x=>x.name===s.name))D.subs.push({id:uid(),...s,nextDate:nb,active:true,createdAt:new Date().toISOString()});});
    const assets=D.accounts.filter(a=>!a.isL).reduce((s,a)=>s+a.value,0);
    const liabs=D.accounts.filter(a=>a.isL).reduce((s,a)=>s+a.value,0);
    if(!D.snapshots.length)D.snapshots.push({date:today(),nw:assets-liabs});
  });
}

// ── Boot ──────────────────────────────────────────────

(function boot() {
  const saved = Store.load();
  if (saved?.user?.name) {
    State.hydrate(saved);
    document.getElementById('ob')?.classList.add('off');
    Settings.applyAll();
    ROUTER.init();
  } else {
    document.getElementById('ob')?.classList.remove('off');
  }
})();
