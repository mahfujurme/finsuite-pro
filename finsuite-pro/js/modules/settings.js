/**
 * modules/settings.js — Settings view + trust layer. data-action throughout.
 */
import { State } from '../state.js';
import { Store } from '../store.js';
import { esc } from '../utils.js';
import { Charts } from '../components/chart.js';
import { Modal }  from '../components/form.js';
import { toast }  from '../components/toast.js';

export const Settings = {
  render() {
    const el=document.getElementById('v-cfg'); if(!el)return;
    const user=State.get('user'), cfg=State.get('settings'), dm=cfg.disabledModules||{};
    el.innerHTML=`
    <div class="sec-hdr"><h2><span class="ico">⚙️</span> Settings</h2><p>Customise your experience and manage your data.</p></div>

    <!-- Trust Banner -->
    <div style="background:var(--teal2);border:1px solid rgba(14,210,176,.25);border-radius:var(--r3);padding:14px 18px;display:flex;align-items:flex-start;gap:12px;margin-bottom:18px">
      <span style="font-size:1.3rem;flex-shrink:0">🔒</span>
      <div>
        <div style="font-weight:700;font-size:.85rem;color:var(--teal)">Your data stays on your device</div>
        <div style="font-size:.78rem;color:var(--t2);margin-top:3px">All financial data is stored locally in your browser using localStorage. Nothing is ever sent to any server. Export a backup regularly to protect your data.</div>
      </div>
      <button class="btn btn-teal btn-sm" style="flex-shrink:0;margin-left:auto" data-action="cfg-export-json">📤 Backup Now</button>
    </div>

    <div class="g2">
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">👤 Profile</div></div>
        <div class="fg"><label class="flbl">Your Name</label><input type="text" class="finp" id="cfg-name" value="${esc(user.name)}" maxlength="50"></div>
        <div class="fg"><label class="flbl">Currency</label>
          <select class="finp" id="cfg-cur">
            ${[['GBP','£','🇬🇧 British Pound (£)'],['USD','$','🇺🇸 US Dollar ($)'],['EUR','€','🇪🇺 Euro (€)'],['JPY','¥','🇯🇵 Yen (¥)'],['CAD','CA$','🇨🇦 CAD (CA$)'],['AUD','A$','🇦🇺 AUD (A$)'],['INR','₹','🇮🇳 Rupee (₹)']].map(([code,s,l])=>`<option value="${code},${s}" ${user.currency===code?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-gold btn-full" data-action="cfg-save-profile">Save Profile</button>
      </div>

      <div class="card">
        <div class="card-hdr"><div class="card-ttl">🎨 Preferences</div></div>
        <div class="cfg-row"><div><div class="cfg-lbl">Dark Mode</div><div class="cfg-dsc">Switch between dark and light themes</div></div><label class="tgl"><input type="checkbox" ${user.theme!=='light'?'checked':''} data-action="cfg-module" data-key="__theme__" onchange="Settings.toggleTheme()"><span class="tgl-sl"></span></label></div>
        <div class="cfg-row"><div><div class="cfg-lbl">Experience Mode</div><div class="cfg-dsc">Beginner hides advanced modules</div></div>
          <div class="tabs"><button class="tab-btn ${user.mode==='beginner'?'on':''}" data-action="cfg-mode" data-value="beginner">🌱 Beginner</button><button class="tab-btn ${user.mode!=='beginner'?'on':''}" data-action="cfg-mode" data-value="advanced">🚀 Advanced</button></div>
        </div>
        <div class="cfg-row"><div><div class="cfg-lbl">Auto Save</div><div class="cfg-dsc">Save data automatically as you work</div></div><label class="tgl"><input type="checkbox" ${cfg.autoSave!==false?'checked':''} data-action="cfg-autosave"><span class="tgl-sl"></span></label></div>
      </div>

      <div class="card adv-only">
        <div class="card-hdr"><div class="card-ttl">🔧 Feature Toggles</div></div>
        <p style="font-size:.76rem;color:var(--t3);margin-bottom:12px">Disable modules you don't use.</p>
        ${[['debt','🔗 Debt Planner','Track and simulate debt payoff'],['savings','💎 Savings Plan','Goals and monthly contribution planning'],['subscriptions','🔄 Subscriptions','Track recurring service costs'],['forecast','📈 Forecast','Cash flow projection'],['subcategories','📁 Subcategories','Show subcategory on transactions']].map(([k,lbl,dsc])=>`<div class="cfg-row"><div><div class="cfg-lbl">${lbl}</div><div class="cfg-dsc">${dsc}</div></div><label class="tgl"><input type="checkbox" ${!dm[k]?'checked':''} data-action="cfg-module" data-key="${k}"><span class="tgl-sl"></span></label></div>`).join('')}
      </div>

      <div class="card">
        <div class="card-hdr"><div class="card-ttl">💾 Data Management</div><span style="font-size:.72rem;color:var(--t3)">Used: ${Store.size()}</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-outline btn-full" data-action="cfg-export-json">📤 Export Full Backup (JSON)</button>
          <button class="btn btn-outline btn-full" data-action="cfg-import-json">📥 Import Backup</button>
          <input type="file" id="imp-json" accept=".json" style="display:none" data-action="imp-json">
          <button class="btn btn-outline btn-full" data-action="cfg-export-csv">📊 Export Transactions CSV</button>
        </div>
      </div>

      <div class="card">
        <div class="card-hdr"><div class="card-ttl">⚠️ Danger Zone</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-rose btn-full" data-action="cfg-clear">🗑️ Clear All Data</button>
          <button class="btn btn-outline btn-full" data-action="cfg-sample">🔄 Reload Sample Data</button>
        </div>
      </div>
    </div>`;
  },

  saveProfile() {
    const name=document.getElementById('cfg-name')?.value.trim();
    const curVal=document.getElementById('cfg-cur')?.value;
    if(!name){toast('Name cannot be empty.','e');return;}
    const[code,sym]=curVal.split(',');
    State.patch(D=>{D.user.name=name;D.user.currency=code;D.user.sym=sym;});
    Store.queue();_updateHeader();toast('Profile saved.','s');
  },

  toggleTheme() {
    const current=document.documentElement.getAttribute('data-theme');
    const next=current==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    State.patch(D=>{D.user.theme=next;});
    Store.queue();
    const btn=document.getElementById('theme-btn');
    if(btn)btn.textContent=next==='dark'?'☀️':'🌙';
    setTimeout(()=>Charts.refresh(),50);
    this.render();
  },

  setMode(mode) {
    State.patch(D=>{D.user.mode=mode;});
    Store.queue();
    document.documentElement.setAttribute('data-mode',mode);
    document.getElementById('mode-chip').textContent=mode==='beginner'?'Beginner':'Advanced';
    applyModuleVisibility();
    toast(`Switched to ${mode} mode.`,'i');
    this.render();
  },

  setAutoSave(enabled) { State.patch(D=>{D.settings.autoSave=enabled;}); Store.queue(); },

  toggleModule(key,disabled) {
    State.patch(D=>{if(!D.settings.disabledModules)D.settings.disabledModules={};D.settings.disabledModules[key]=disabled;});
    Store.queue();applyModuleVisibility();
    toast(`${key} ${disabled?'disabled':'enabled'}.`,'i');
    this.render();
  },

  importJSON(inp) {
    const file=inp.files[0]; if(!file)return;
    Store.importJSON(file).then(data=>{
      if(!data){toast('Invalid backup file.','e');return;}
      Modal.confirm('Replace ALL current data with this backup? This cannot be undone.',()=>{
        State.hydrate(data);Store.save();_updateHeader();applyTheme(State.get('user').theme);applyModuleVisibility();
        toast('Data restored!','s','Restore Complete');
        import('../router.js').then(({ROUTER})=>ROUTER.go('dash'));
      },'Restore Backup');
    }).catch(e=>toast(e.message,'e','Import Error'));
    inp.value='';
  },

  applyAll() { _updateHeader(); applyTheme(State.get('user').theme); applyModuleVisibility(); },
};

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme',theme||'dark');
  const btn=document.getElementById('theme-btn');
  if(btn)btn.textContent=theme==='light'?'🌙':'☀️';
}

export function applyModuleVisibility() {
  const dm=State.get('settings').disabledModules||{};
  const MAP={debt:'nav-debt',savings:'nav-save',subscriptions:'nav-subs',forecast:'nav-fore'};
  Object.entries(MAP).forEach(([k,navId])=>document.getElementById(navId)?.classList.toggle('sb-disabled',!!dm[k]));
  document.documentElement.setAttribute('data-mode',State.get('user').mode||'advanced');
}

function _updateHeader() {
  const u=State.get('user');
  const av=document.getElementById('sb-av');const un=document.getElementById('sb-un');const mc=document.getElementById('mode-chip');
  if(av)av.textContent=(u.name||'U')[0].toUpperCase();
  if(un)un.textContent=u.name||'User';
  if(mc)mc.textContent=u.mode==='beginner'?'Beginner':'Advanced';
}
