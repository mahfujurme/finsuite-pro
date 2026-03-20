/**
 * modules/dashboard.js — Dashboard view.
 * Uses data-action attributes — no inline onclick.
 */
import { State }    from '../state.js';
import { formatCurrency, formatPct, catCfg, esc } from '../utils.js';
import { curMo, moLabel, moInc, moExp, catBreak, nwCalc, totalBal,
         savRate, expRatio, momChange, moTrend, budAccuracy, nwGrowth, fmtDate, daysUntil } from '../services/calculator.js';
import { renderInsights } from '../services/insights.js';
import { Charts }   from '../components/chart.js';

export const Dash = {
  render() {
    const el = document.getElementById('v-dash'); if (!el) return;
    const sym = State.get('user').sym||'£';
    const cur = (v,s)=>formatCurrency(v,sym,s);
    const mo=curMo(), txs=State.get('tx'), accs=State.get('accounts'), goals=State.get('goals');
    const inc=moInc(mo,txs), exp=moExp(mo,txs), sr=savRate(inc,exp), er=expRatio(inc,exp);
    const nwd=nwCalc(accs), bal=totalBal(accs), ba=budAccuracy(mo,txs), nwg=nwGrowth();
    const ic=momChange('income',txs), ec=momChange('expenses',txs);
    const trend=moTrend(txs), cb=catBreak(mo,txs), recent=txs.slice(0,6);

    el.innerHTML=`
    <div class="kpi-row kpi-row-4" style="margin-bottom:14px">
      <div class="kpi" style="--kc:var(--gold)"><div class="kpi-ico">💼</div><div class="kpi-lbl">Total Balance</div><div class="kpi-val num">${cur(bal)}</div><div class="kpi-foot"><div class="kpi-sub kpi-ne">All accounts</div></div></div>
      <div class="kpi" style="--kc:var(--teal)"><div class="kpi-ico">💰</div><div class="kpi-lbl">Monthly Income</div><div class="kpi-val num">${cur(inc)}</div><div class="kpi-foot"><div class="kpi-sub ${ic>=0?'kpi-up':'kpi-dn'}">${ic>=0?'▲':'▼'} ${formatPct(Math.abs(ic))} mom</div></div></div>
      <div class="kpi" style="--kc:var(--rose)"><div class="kpi-ico">💸</div><div class="kpi-lbl">Monthly Expenses</div><div class="kpi-val num">${cur(exp)}</div><div class="kpi-foot"><div class="kpi-sub ${ec<=0?'kpi-up':'kpi-dn'}">${ec>0?'▲':'▼'} ${formatPct(Math.abs(ec))} mom</div></div></div>
      <div class="kpi" style="--kc:var(--sky)"><div class="kpi-ico">📊</div><div class="kpi-lbl">Savings Rate</div><div class="kpi-val num">${formatPct(sr)}</div><div class="kpi-foot"><div class="kpi-sub ${sr>=20?'kpi-up':'kpi-dn'}">${sr>=20?'✅ On Target':'Aim for 20%'}</div></div></div>
    </div>
    <div class="kpi-row kpi-row-4 adv-only" style="margin-bottom:18px">
      <div class="kpi" style="--kc:var(--violet)"><div class="kpi-ico">📉</div><div class="kpi-lbl">Expense Ratio</div><div class="kpi-val num">${formatPct(er)}</div><div class="kpi-foot"><div class="kpi-sub ${er<=70?'kpi-up':'kpi-dn'}">${er<=70?'Healthy':'Overspending'}</div></div></div>
      <div class="kpi" style="--kc:${nwd.nw>=0?'var(--teal)':'var(--rose)'}"><div class="kpi-ico">🏦</div><div class="kpi-lbl">Net Worth</div><div class="kpi-val num" style="color:${nwd.nw>=0?'var(--teal)':'var(--rose)'}">${cur(nwd.nw)}</div><div class="kpi-foot"><div class="kpi-sub ${nwg>=0?'kpi-up':'kpi-dn'}">${nwg>=0?'▲':'▼'} ${formatPct(Math.abs(nwg))}</div></div></div>
      <div class="kpi" style="--kc:var(--amber)"><div class="kpi-ico">🎯</div><div class="kpi-lbl">Budget Accuracy</div><div class="kpi-val num">${formatPct(ba)}</div><div class="kpi-foot"><div class="kpi-sub ${ba>=80?'kpi-up':'kpi-dn'}">${ba>=80?'On Track':'Needs Review'}</div></div></div>
      <div class="kpi" style="--kc:${inc-exp>=0?'var(--teal)':'var(--rose)'}"><div class="kpi-ico">📈</div><div class="kpi-lbl">Monthly Net</div><div class="kpi-val num" style="color:${inc-exp>=0?'var(--teal)':'var(--rose)'}">${cur(inc-exp,true)}</div><div class="kpi-foot"><div class="kpi-sub ${inc-exp>=0?'kpi-up':'kpi-dn'}">${inc-exp>=0?'Surplus':'Deficit'}</div></div></div>
    </div>
    <div class="dash-main">
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">📈 6-Month Trend</div><span class="badge b-go">${moLabel(mo)}</span></div>
        <div class="chart-wrap"><canvas id="trendCv"></canvas></div>
      </div>
      <div class="card" style="display:flex;flex-direction:column">
        <div class="card-hdr"><div class="card-ttl">🤖 Smart Insights</div><button class="btn btn-ghost btn-xs" data-action="dash-refresh">↻</button></div>
        <div id="ins-wrap" style="flex:1;overflow-y:auto;max-height:280px;display:flex;flex-direction:column;gap:7px"></div>
      </div>
    </div>
    ${goals.length?`
    <div class="card" style="margin-bottom:18px">
      <div class="card-hdr"><div class="card-ttl">🏆 Financial Goals</div><button class="btn btn-outline btn-sm" data-action="sav-goal">+ Goal</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${goals.map(g=>{const p=Math.min(100,Math.round(g.current/g.target*100));const dl=daysUntil(g.deadline);const dlLabel=dl!==null?(dl>0?`${dl}d left`:dl===0?'Today!':'Overdue'):'';
        return`<div class="goal-card" style="--gc:${g.color||'var(--gold)'}"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:1.25rem">${g.icon||'🎯'}</span><div><div style="font-weight:700;font-size:.83rem;color:var(--t1)">${esc(g.name)}</div>${g.deadline?`<div style="font-size:.68rem;color:var(--t3)">📅 ${dlLabel}</div>`:''}</div>${p>=100?'<span class="badge b-in" style="margin-left:auto">✅</span>':''}</div><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px"><div class="num" style="font-size:1.05rem;font-weight:700;color:var(--t1)">${cur(g.current)}</div><div style="font-size:.73rem;color:var(--t3)">of ${cur(g.target)}</div></div><div class="prog lg"><div class="prog-fill pf-gold" style="width:${p}%;background:${g.color||'var(--gold)'}"></div></div><div style="font-size:.72rem;font-weight:600;color:var(--t3);text-align:right;margin-top:5px">${p}% ${p<100?'· '+cur(g.target-g.current)+' to go':'🎉'}</div></div>`;}).join('')}
      </div>
    </div>`:''}
    <div class="dash-bot">
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">🍩 By Category</div></div>
        ${Object.keys(cb).length?`<div class="chart-wrap"><canvas id="donutCv"></canvas></div><div class="chart-legend">${Object.entries(cb).slice(0,6).map(([k,v])=>`<div class="cl-item"><span class="cl-dot" style="background:${catCfg(k).c}"></span>${k}: ${cur(v)}</div>`).join('')}</div>`:'<div class="empty"><div class="empty-ico">📊</div><div class="empty-dsc">No expense data this month</div></div>'}
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">💳 Recent</div><button class="btn btn-ghost btn-xs" data-action="nav" data-view="tx">All →</button></div>
        <div>${recent.length?recent.map(t=>{const c=catCfg(t.category);return`<div class="tx-row"><div class="tx-ico" style="background:${c.c}22;color:${c.c}">${c.i}</div><div style="flex:1;min-width:0"><div style="font-size:.8rem;font-weight:600;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.description)}</div><div style="font-size:.69rem;color:var(--t3)">${fmtDate(t.date)}</div></div><div class="tbl-amt ${t.type==='income'?'ca-in':'ca-ex'}">${t.type==='income'?'+':'-'}${cur(t.amount)}</div></div>`;}).join(''):'<div class="empty" style="padding:20px 0"><div class="empty-ico">💳</div><div class="empty-dsc">No transactions yet</div></div>'}</div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-ttl">🏦 Net Worth</div><button class="btn btn-ghost btn-xs" data-action="nav" data-view="nw">Detail →</button></div>
        <div style="text-align:center;padding:12px 0"><div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t3);margin-bottom:6px">Total Net Worth</div><div class="num" style="font-size:clamp(1.5rem,4vw,2.2rem);font-weight:600;color:${nwd.nw>=0?'var(--teal)':'var(--rose)'}">${cur(nwd.nw)}</div></div>
        <div class="sum-row"><div class="sum-key">Assets</div><div class="sum-val" style="color:var(--teal)">${cur(nwd.assets)}</div></div>
        <div class="sum-row"><div class="sum-key">Liabilities</div><div class="sum-val" style="color:var(--rose)">${cur(nwd.liabilities)}</div></div>
        ${nwd.assets+nwd.liabilities>0?`<div style="margin-top:10px"><div class="prog"><div class="prog-fill pf-teal" style="width:${Math.round(nwd.assets/(nwd.assets+nwd.liabilities)*100)}%"></div></div></div>`:''}
        <button class="btn btn-outline btn-sm btn-full" style="margin-top:12px" data-action="nav" data-view="nw">Manage Accounts</button>
      </div>
    </div>`;

    setTimeout(()=>{
      Charts.trend('trendCv',trend);
      if(Object.keys(cb).length)Charts.donut('donutCv',cb);
      renderInsights('ins-wrap');
    },20);
  },
};
