/**
 * modules/forecast.js — Cash flow forecast. data-action throughout.
 */
import { State } from '../state.js';
import { formatCurrency } from '../utils.js';
import { forecast } from '../services/calculator.js';
import { Charts }   from '../components/chart.js';

let _months=3;

export const Fore = {
  render() {
    const el=document.getElementById('v-fore'); if(!el)return;
    const sym=State.get('user').sym||'£'; const cur=(v,s)=>formatCurrency(v,sym,s);
    const rows=forecast(_months,State.get('tx'),State.get('subs'));
    el.innerHTML=`
    <div class="sec-row">
      <div class="sec-hdr" style="margin:0"><h2><span class="ico">📈</span> Cash Flow Forecast</h2><p>Projected income, expenses and balance — 3-month trailing average.</p></div>
      <div class="sec-actions">${[3,6,12].map(m=>`<button class="btn ${_months===m?'btn-gold':'btn-outline'} btn-sm" data-action="fore-months" data-value="${m}">${m}mo</button>`).join('')}</div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">
      <div class="tbl-wrap" style="border:none"><table class="tbl"><thead><tr><th>Month</th><th>Projected Income</th><th>Projected Expenses</th><th>Net Cash Flow</th><th>Running Balance</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td style="font-weight:600;color:var(--t1)">${r.label}</td><td class="ca-in num">${cur(r.inc)}</td><td class="ca-ex num">${cur(r.exp)}</td><td class="${r.net>=0?'ca-in':'ca-ex'} num">${cur(r.net,true)}</td><td class="num" style="font-weight:700;color:${r.bal>=0?'var(--t1)':'var(--rose)'}">${cur(r.bal)}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="card"><div class="card-hdr"><div class="card-ttl">📊 Balance Projection</div></div><div class="chart-wrap lg"><canvas id="foreCv"></canvas></div></div>
    <p style="font-size:.7rem;color:var(--t3);margin-top:12px;text-align:center">⚠️ Based on 3-month trailing average. Subscription costs included. Actual results may vary.</p>`;
    setTimeout(()=>Charts.forecastLine('foreCv',rows),20);
  },
  setMonths(m){_months=m;this.render();},
};
