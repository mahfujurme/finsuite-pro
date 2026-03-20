/**
 * modules/importer.js — Excel & CSV bulk import.
 * Upgraded: duplicate detection, enhanced error UI, data-action throughout.
 */
import { State }   from '../state.js';
import { esc, formatCurrency, catOptions } from '../utils.js';
import { parseFile, guessMapping, validateAndMap } from '../services/parser.js';
import { deduplicateImportRows } from '../services/validator.js';
import { toast } from '../components/toast.js';

let _headers=[], _rawRows=[], _mapped=[];

export const Importer = {
  render() {
    const el=document.getElementById('v-imp'); if(!el)return;
    el.innerHTML=`
    <div class="sec-row">
      <div class="sec-hdr" style="margin:0"><h2><span class="ico">📂</span> Import Data</h2><p>Upload CSV or Excel files to bulk-import transactions in seconds.</p></div>
    </div>
    <div class="card" style="margin-bottom:18px">
      <div class="card-hdr"><div class="card-ttl">📁 Upload File</div></div>
      <div class="drop-zone" id="drop-zone" data-action="imp-file">
        <div class="drop-zone-ico">📂</div>
        <div class="drop-zone-ttl">Drop your file here or click to browse</div>
        <div class="drop-zone-dsc">Supports CSV and Excel (.xlsx, .xls) files</div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <span class="badge b-go">CSV</span><span class="badge b-vi">XLSX</span><span class="badge b-sk">XLS</span>
        </div>
      </div>
      <input type="file" id="file-inp" accept=".csv,.xlsx,.xls" style="display:none">
    </div>
    <div id="imp-map-section" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-hdr">
          <div class="card-ttl">🗂️ Map Columns</div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge b-nu" id="imp-row-count">0 rows</span>
            <button class="btn btn-ghost btn-xs" data-action="imp-reset">✕ Clear</button>
          </div>
        </div>
        <p style="font-size:.78rem;color:var(--t3);margin-bottom:14px">Match your file columns to the required fields.</p>
        <div class="col-map" id="col-map"></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px">
          <div class="fg" style="margin:0;flex:1;min-width:160px"><label class="flbl">Default Type (if no type column)</label><select class="finp" id="imp-def-type"><option value="expense">💸 Expense</option><option value="income">💰 Income</option></select></div>
          <div class="fg" style="margin:0;flex:1;min-width:160px"><label class="flbl">Default Category</label><select class="finp" id="imp-def-cat">${catOptions('Uncategorized',false)}</select></div>
        </div>
        <button class="btn btn-gold" style="margin-top:14px" data-action="imp-preview">Preview Import →</button>
      </div>
      <div id="imp-preview-section" style="display:none">
        <div class="card" style="margin-bottom:14px">
          <div class="card-hdr">
            <div class="card-ttl">👁️ Preview</div>
            <div id="imp-preview-stats" style="display:flex;gap:8px"></div>
          </div>
          <div class="tbl-wrap" style="max-height:320px;overflow-y:auto"><table class="tbl" id="imp-preview-tbl"></table></div>
          <div id="imp-dup-notice" style="display:none;margin-top:8px;padding:8px 12px;background:var(--amber2);border:1px solid rgba(240,167,66,.3);border-radius:var(--r2);font-size:.75rem;color:var(--amber)"></div>
          <div id="imp-err-list"   style="display:none;margin-top:8px">
            <div style="font-size:.75rem;font-weight:700;color:var(--rose);margin-bottom:4px">⚠️ Rows with errors (will be skipped):</div>
            <div id="imp-err-msgs" style="font-size:.72rem;color:var(--rose);max-height:90px;overflow-y:auto"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-ghost" data-action="imp-reset">← Start Over</button>
          <button class="btn btn-gold" id="imp-confirm-btn" data-action="imp-confirm" disabled>✅ Import Valid Rows</button>
        </div>
      </div>
    </div>
    <div class="g2" style="margin-top:18px">
      <div class="card"><div class="card-hdr"><div class="card-ttl">📋 CSV Format Guide</div></div>
        <pre style="font-size:.72rem;color:var(--t2);background:var(--bg1);padding:12px;border-radius:var(--r2);overflow-x:auto;line-height:1.7">Date,Description,Amount,Type,Category
2024-01-15,Tesco,87.40,expense,Groceries
2024-01-16,Salary,3800,income,Salary</pre>
        <p style="font-size:.73rem;color:var(--t3);margin-top:8px">Date: YYYY-MM-DD · Amount: positive numbers only</p>
      </div>
      <div class="card"><div class="card-hdr"><div class="card-ttl">💡 Import Tips</div></div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${[['✅','Column names auto-detected from headers'],['✅','Manually remap any column if needed'],['✅','Duplicate transactions are automatically detected and skipped'],['✅','First sheet used for Excel files'],['⚠️','Rows missing Date or Amount are skipped']].map(([ic,t])=>`<div style="display:flex;gap:8px;font-size:.78rem;color:var(--t2)"><span>${ic}</span><span>${t}</span></div>`).join('')}
        </div>
      </div>
    </div>`;

    // Attach drag/drop and file input listeners after render
    const dz=document.getElementById('drop-zone');
    if(dz){
      dz.addEventListener('dragover', e=>{e.preventDefault();dz.classList.add('drag-over');});
      dz.addEventListener('dragleave',()=>dz.classList.remove('drag-over'));
      dz.addEventListener('drop', e=>{e.preventDefault();dz.classList.remove('drag-over');const f=e.dataTransfer?.files[0];if(f)_processFile(f);});
    }
    const fi=document.getElementById('file-inp');
    if(fi){ fi.addEventListener('change',e=>{const f=e.target.files[0];if(f)_processFile(f);fi.value='';}); }
  },

  // Also handle click on drop-zone from event delegation
  onFileClick() { document.getElementById('file-inp')?.click(); },

  preview() {
    const mapping=_readMapping();
    const defType=document.getElementById('imp-def-type')?.value||'expense';
    const defCat=document.getElementById('imp-def-cat')?.value||'Uncategorized';
    const sym=_sym();
    const {valid,errors}=validateAndMap(_rawRows,_headers,mapping,defType,defCat);

    // Duplicate detection
    const existing=State.get('tx');
    const {unique,duplicates}=deduplicateImportRows(valid,existing);
    _mapped=unique;

    // Stats
    document.getElementById('imp-preview-stats').innerHTML=
      `<span class="badge b-in">${unique.length} valid</span>${duplicates?`<span class="badge b-wa">${duplicates} duplicate${duplicates>1?'s':''}</span>`:''}<span class="badge b-ex">${errors.length} error${errors.length!==1?'s':''}</span>`;

    // Duplicate notice
    const dupDiv=document.getElementById('imp-dup-notice');
    if(duplicates){dupDiv.style.display='block';dupDiv.textContent=`⚠️ ${duplicates} duplicate transaction${duplicates>1?'s were':' was'} detected (same date, amount and description already in your records) and will be skipped.`;}
    else dupDiv.style.display='none';

    // Error list
    const errDiv=document.getElementById('imp-err-list');
    if(errors.length){errDiv.style.display='block';document.getElementById('imp-err-msgs').innerHTML=errors.map(e=>`<div>• ${e}</div>`).join('');}
    else errDiv.style.display='none';

    // Preview table
    document.getElementById('imp-preview-tbl').innerHTML=`
      <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th><th>Category</th></tr></thead>
      <tbody>${unique.slice(0,50).map(r=>`<tr><td>${r.date}</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.description)}</td><td class="tbl-amt ${r.type==='income'?'ca-in':'ca-ex'}">${formatCurrency(r.amount,sym)}</td><td><span class="badge ${r.type==='income'?'b-in':'b-ex'}">${r.type}</span></td><td>${esc(r.category)}</td></tr>`).join('')}${unique.length>50?`<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:8px">… and ${unique.length-50} more</td></tr>`:''}</tbody>`;

    const btn=document.getElementById('imp-confirm-btn');
    if(btn)btn.disabled=unique.length===0;
    document.getElementById('imp-preview-section').style.display='block';
  },

  confirm() {
    if(!_mapped.length){toast('Nothing valid to import.','w');return;}
    // Access Tx via module import to avoid window globals
    import('../modules/transactions.js').then(({Tx})=>{
      Tx.bulkAdd(_mapped);
      const count=_mapped.length;
      this.reset();
      toast(`Successfully imported ${count} transactions!`,'s','Import Complete');
      import('../router.js').then(({ROUTER})=>ROUTER.go('tx'));
    });
  },

  reset() { _headers=[]; _rawRows=[]; _mapped=[]; this.render(); },
};

function _processFile(file) {
  parseFile(file).then(({headers,rows})=>{
    _headers=headers; _rawRows=rows;
    _showMapping(headers,rows.length);
    toast(`Loaded ${rows.length} rows from "${file.name}"`, 's');
  }).catch(err=>toast(err.message,'e','Parse Error'));
}

function _showMapping(headers,rowCount) {
  document.getElementById('imp-map-section').style.display='block';
  document.getElementById('imp-preview-section').style.display='none';
  document.getElementById('imp-row-count').textContent=rowCount+' rows';
  const guess=guessMapping(headers);
  const fields=[{k:'date',l:'Date *'},{k:'description',l:'Description *'},{k:'amount',l:'Amount *'},{k:'type',l:'Type'},{k:'category',l:'Category'},{k:'subcat',l:'Subcategory'},{k:'notes',l:'Notes'}];
  const colOpts=['<option value="">— Skip —</option>',...headers.map(h=>`<option value="${esc(h)}">${esc(h)}</option>`)].join('');
  document.getElementById('col-map').innerHTML=fields.map(f=>`<div class="fg" style="margin:0"><label class="flbl">${f.l}</label><select class="finp" id="map-${f.k}">${colOpts.replace(`value="${esc(guess[f.k]||'')}"`,`value="${esc(guess[f.k]||'')}" selected`)}</select></div>`).join('');
}

function _readMapping() {
  const map={};
  ['date','description','amount','type','category','subcat','notes'].forEach(f=>{map[f]=document.getElementById('map-'+f)?.value||'';});
  return map;
}

function _sym() {
  try{return JSON.parse(localStorage.getItem('finsuite_v3')||'{}')?.d?.user?.sym||'£';}catch{return'£';}
}
