/**
 * services/validator.js — Centralised validation layer.
 *
 * Pure functions. No DOM access. No side effects.
 * Returns { valid: boolean, errors: { [field]: string } }.
 */

// ── Result Helpers ────────────────────────────────────

/** Build a passing result */
const pass = () => ({ valid: true, errors: {} });

/** Build a failing result with one or more field errors */
const fail = errors => ({ valid: false, errors });

// ── Transaction Validation ────────────────────────────

/**
 * Validate a transaction form payload.
 * @param {{ description, amount, date, type, category }} data
 * @returns {{ valid: boolean, errors: object }}
 */
export function validateTransaction(data) {
  const errors = {};

  if (!data.description || !String(data.description).trim()) {
    errors.description = 'Description is required.';
  } else if (String(data.description).trim().length > 100) {
    errors.description = 'Description must be 100 characters or less.';
  }

  const amt = parseFloat(data.amount);
  if (isNaN(amt) || amt <= 0) {
    errors.amount = 'Amount must be a positive number.';
  } else if (amt > 10_000_000) {
    errors.amount = 'Amount seems unrealistically large. Please check.';
  }

  if (!data.date) {
    errors.date = 'Date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.date = 'Date must be in YYYY-MM-DD format.';
  } else {
    const d = new Date(data.date + 'T00:00:00');
    if (isNaN(d)) errors.date = 'Invalid date.';
    else if (d.getFullYear() < 2000) errors.date = 'Date seems too far in the past.';
    else if (d > new Date(Date.now() + 365 * 3 * 864e5)) errors.date = 'Date seems too far in the future.';
  }

  if (!['income', 'expense'].includes(data.type)) {
    errors.type = 'Type must be "income" or "expense".';
  }

  return Object.keys(errors).length ? fail(errors) : pass();
}

// ── Budget Validation ─────────────────────────────────

/**
 * Validate a budget cell value.
 * @param {number|string} value
 * @returns {{ valid: boolean, errors: object }}
 */
export function validateBudgetCell(value) {
  const n = parseFloat(value);
  if (isNaN(n) || n < 0) return fail({ value: 'Amount must be zero or positive.' });
  if (n > 10_000_000)    return fail({ value: 'Amount seems unrealistically large.' });
  return pass();
}

// ── Account Validation ────────────────────────────────

/**
 * Validate an account form payload.
 * @param {{ name, value, type }} data
 * @returns {{ valid: boolean, errors: object }}
 */
export function validateAccount(data) {
  const errors = {};

  if (!data.name || !String(data.name).trim()) {
    errors.name = 'Account name is required.';
  } else if (String(data.name).trim().length > 80) {
    errors.name = 'Name must be 80 characters or less.';
  }

  const val = parseFloat(data.value);
  if (isNaN(val) || val < 0) {
    errors.value = 'Value must be zero or a positive number.';
  }

  if (!['asset', 'liability'].includes(data.type)) {
    errors.type = 'Type must be "asset" or "liability".';
  }

  return Object.keys(errors).length ? fail(errors) : pass();
}

// ── Goal Validation ───────────────────────────────────

export function validateGoal(data) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Goal name is required.';
  const t = parseFloat(data.target);
  if (isNaN(t) || t <= 0) errors.target = 'Target amount must be a positive number.';
  const c = parseFloat(data.current ?? 0);
  if (isNaN(c) || c < 0) errors.current = 'Current amount must be zero or positive.';
  else if (c > t)         errors.current = 'Current amount cannot exceed target.';
  if (data.deadline) {
    const d = new Date(data.deadline + 'T00:00:00');
    if (isNaN(d)) errors.deadline = 'Invalid date.';
  }
  return Object.keys(errors).length ? fail(errors) : pass();
}

// ── Debt Validation ───────────────────────────────────

export function validateDebt(data) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Debt name is required.';
  const b = parseFloat(data.balance);
  if (isNaN(b) || b <= 0)       errors.balance = 'Balance must be a positive number.';
  const r = parseFloat(data.rate);
  if (isNaN(r) || r < 0 || r > 100) errors.rate = 'APR must be between 0 and 100.';
  const m = parseFloat(data.minPmt);
  if (isNaN(m) || m < 0)        errors.minPmt  = 'Minimum payment must be zero or positive.';
  return Object.keys(errors).length ? fail(errors) : pass();
}

// ── Subscription Validation ───────────────────────────

export function validateSubscription(data) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Name is required.';
  const a = parseFloat(data.amount);
  if (isNaN(a) || a <= 0) errors.amount = 'Amount must be a positive number.';
  if (!['monthly','yearly','weekly'].includes(data.cycle)) errors.cycle = 'Invalid billing cycle.';
  return Object.keys(errors).length ? fail(errors) : pass();
}

// ── Import Row Validation ─────────────────────────────

/**
 * Validate a single mapped import row.
 * @param {{ date, amount, description }} row
 * @param {number} rowNum - 1-indexed for error messages
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImportRow(row, rowNum) {
  if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    return { valid: false, error: `Row ${rowNum}: Invalid or missing date "${row.date || ''}"` };
  }
  const amt = parseFloat(row.amount);
  if (isNaN(amt) || amt <= 0) {
    return { valid: false, error: `Row ${rowNum}: Invalid or missing amount "${row.amount || ''}"` };
  }
  return { valid: true };
}

// ── Duplicate Detection ───────────────────────────────

/**
 * Generate a deduplication key for a transaction.
 * Matches on date + rounded amount + normalised description.
 */
const dupKey = t => `${t.date}|${(+t.amount).toFixed(2)}|${String(t.description || '').toLowerCase().trim().replace(/\s+/g, ' ')}`;

/**
 * Filter out rows that already exist in the current transaction list.
 * @param {object[]} rows       - Candidate import rows
 * @param {object[]} existing   - Current transactions from State
 * @returns {{ unique: object[], duplicates: number }}
 */
export function deduplicateImportRows(rows, existing) {
  const existingKeys = new Set(existing.map(dupKey));
  const unique     = [];
  let   duplicates = 0;

  rows.forEach(r => {
    if (existingKeys.has(dupKey(r))) {
      duplicates++;
    } else {
      unique.push(r);
      // Add to set immediately so intra-batch duplicates are also caught
      existingKeys.add(dupKey(r));
    }
  });

  return { unique, duplicates };
}

// ── Form Error Renderer ───────────────────────────────

/**
 * Display validation errors inside a modal form.
 * Looks for elements with id="err-{field}" containing a <span>.
 * @param {object} errors - { [field]: message }
 * @param {string} summaryId - ID of the top-level error summary element
 */
export function renderFormErrors(errors, summaryId = 'form-err') {
  // Clear all field errors first
  document.querySelectorAll('[id^="err-"]').forEach(el => { el.style.display = 'none'; });

  const msgs = Object.entries(errors);
  if (!msgs.length) return;

  // Show per-field errors where elements exist
  msgs.forEach(([field, msg]) => {
    const el = document.getElementById('err-' + field);
    if (el) {
      el.style.display = 'flex';
      const span = el.querySelector('span');
      if (span) span.textContent = msg;
    }
  });

  // Fall back to summary element for any un-matched fields
  const summary = document.getElementById(summaryId);
  if (summary) {
    const unmatched = msgs.filter(([f]) => !document.getElementById('err-' + f));
    if (unmatched.length) {
      summary.style.display = 'flex';
      const span = summary.querySelector('span');
      if (span) span.textContent = unmatched.map(([, m]) => m).join(' ');
    }
  }
}
