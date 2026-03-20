/**
 * services/parser.js — File parsing for the Import Data module.
 * Handles CSV and Excel (.xlsx/.xls) via SheetJS (global XLSX).
 * Returns clean, validated transaction objects ready for State.
 */

import { catCfg } from '../utils.js';

// ── File Parsing ─────────────────────────────────────

/**
 * Parse a CSV or Excel file into { headers, rows }.
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: any[][] }>}
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      reject(new Error('Unsupported file type. Use CSV, XLSX, or XLS.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read error'));
    reader.onload = e => {
      try {
        /* global XLSX */
        const wb = ext === 'csv'
          ? XLSX.read(e.target.result, { type: 'string' })
          : XLSX.read(e.target.result, { type: 'array' });

        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!json.length) { reject(new Error('File is empty')); return; }

        const headers = json[0].map(h => String(h).trim());
        const rows    = json.slice(1).filter(r => r.some(c => c !== '' && c !== null && c !== undefined));
        resolve({ headers, rows });
      } catch (err) {
        reject(new Error('Failed to parse file: ' + err.message));
      }
    };

    if (ext === 'csv') reader.readAsText(file);
    else               reader.readAsArrayBuffer(file);
  });
}

// ── Column Auto-Detection ────────────────────────────

const FIELD_PATTERNS = {
  date:        /^(date|datum|dat|transaction.?date|posted)/i,
  description: /^(desc|description|name|merchant|payee|narration|detail|particulars|memo)/i,
  amount:      /^(amount|amt|value|debit|credit|sum|total|money)/i,
  type:        /^(type|category.?type|dr.?cr|dc|in.?out|direction)/i,
  category:    /^(category|cat|group|tag|class|label)/i,
  subcat:      /^(sub.?cat|sub.?category|subcategory|subgroup)/i,
  notes:       /^(note|notes|comment|remarks|reference|ref)/i,
};

/**
 * Attempt to auto-detect which header maps to each field.
 * @param {string[]} headers
 * @returns {{ [field: string]: string }} - field → header name
 */
export function guessMapping(headers) {
  const map = { date: '', description: '', amount: '', type: '', category: '', subcat: '', notes: '' };
  headers.forEach(h => {
    for (const field in FIELD_PATTERNS) {
      if (FIELD_PATTERNS[field].test(h) && !map[field]) {
        map[field] = h;
      }
    }
  });
  return map;
}

// ── Row Validation & Transformation ─────────────────

/**
 * Map raw rows to validated transaction objects.
 * @param {any[][]}  rows       - Raw data rows from parseFile
 * @param {string[]} headers    - Column header names
 * @param {{ [field]: string }} mapping - Field → column name
 * @param {string}   defType    - Default type if no type column
 * @param {string}   defCat     - Default category if no category column
 * @returns {{ valid: object[], errors: string[] }}
 */
export function validateAndMap(rows, headers, mapping, defType = 'expense', defCat = 'Uncategorized') {
  const valid  = [];
  const errors = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // 1-indexed, +1 for header
    const get = field => {
      const col = mapping[field];
      if (!col) return '';
      const idx = headers.indexOf(col);
      return idx >= 0 ? String(row[idx] || '').trim() : '';
    };

    const rawDate = get('date');
    const rawAmt  = get('amount');
    const desc    = get('description') || `Imported Row ${rowNum}`;

    const date   = parseDate(rawDate);
    const amount = parseFloat(String(rawAmt).replace(/[£$€,\s]/g, ''));

    if (!date) {
      errors.push(`Row ${rowNum}: Invalid or missing date "${rawDate}"`);
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${rowNum}: Invalid or missing amount "${rawAmt}"`);
      return;
    }

    const type = detectType(get('type'), defType);
    const cat  = get('category') || defCat;

    valid.push({
      date,
      description: desc,
      amount,
      type,
      category: cat,
      subcat: get('subcat'),
      notes:  get('notes'),
    });
  });

  return { valid, errors };
}

// ── Date Parser ──────────────────────────────────────

/**
 * Parse a variety of date string formats to 'YYYY-MM-DD'.
 * Returns null if unparseable.
 * @param {string} s
 * @returns {string|null}
 */
export function parseDate(s) {
  if (!s) return null;
  s = String(s).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;

  // Excel serial date (days since 1900-01-00)
  const serial = parseInt(s);
  if (!isNaN(serial) && serial > 40_000 && serial < 60_000) {
    const d = new Date((serial - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }

  // Native Date parse fallback
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split('T')[0];

  return null;
}

// ── Type Detection ───────────────────────────────────

/**
 * Infer transaction type from a raw string value.
 * @param {string} raw     - Raw string from the 'type' column
 * @param {string} defType - Fallback type
 */
function detectType(raw, defType) {
  const v = raw.toLowerCase();
  if (/inc|credit|cr\b|salary|deposit|\bin\b/.test(v)) return 'income';
  if (/exp|debit|dr\b|spend|\bout\b/.test(v))           return 'expense';
  return defType;
}
