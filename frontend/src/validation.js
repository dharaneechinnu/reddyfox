/**
 * Form validation helpers.
 *
 * Deliberately practical rather than RFC-exhaustive: the goal is to catch real
 * typos (missing @, 9 digits instead of 10) without rejecting valid input.
 * Anything genuinely ambiguous is allowed through — a customer blocked by an
 * over-strict regex is a lost enquiry.
 */

// Indian mobile numbers: 10 digits starting 6-9, with an optional +91 / 91 / 0
// prefix. Spaces, dashes, dots and brackets are stripped before checking, so
// "+91 99414 56261", "099414-56261" and "9941456261" all pass.
const PHONE_CLEAN = /[\s\-().]/g;
const PHONE_RE = /^(?:\+?91|0)?([6-9]\d{9})$/;

export function cleanPhone(value) {
  return String(value || '').replace(PHONE_CLEAN, '');
}

/** Returns the bare 10-digit number, or null if the input isn't a valid one. */
export function normalizePhone(value) {
  const match = PHONE_RE.exec(cleanPhone(value));
  return match ? match[1] : null;
}

export function validatePhone(value, { required = true } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return required ? 'Please enter a phone number.' : null;

  const digitsOnly = cleanPhone(raw);
  if (/[^\d+]/.test(digitsOnly)) return 'Phone number should contain digits only.';
  if (!normalizePhone(raw)) {
    const bare = digitsOnly.replace(/^(?:\+?91|0)/, '');
    if (bare.length < 10) return 'That number is too short — Indian mobile numbers have 10 digits.';
    if (bare.length > 10) return 'That number is too long — Indian mobile numbers have 10 digits.';
    return 'Enter a valid Indian mobile number starting with 6, 7, 8 or 9.';
  }
  return null;
}

export function validateRequired(value, label) {
  return String(value || '').trim() ? null : `Please enter your ${label}.`;
}

/**
 * Mirrors validate_amount in backend/content/validators.py — keep the two in
 * step. The ceiling is not arbitrary: past it we want the customer on the phone
 * with a dealer, not filling in a web form.
 */
export function validateAmount(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return required ? 'Please enter how much you need.' : null;
  const n = Number(raw.replace(/,/g, ''));
  if (Number.isNaN(n)) return 'Enter the amount in numbers only.';
  if (n <= 0) return 'Amount must be greater than zero.';
  if (n > 100000000) return 'That amount is too large for an online request — please call us.';
  return null;
}

/** Runs a {field: validatorFn} map over values; returns {field: message} for failures only. */
export function runValidators(values, validators) {
  const errors = {};
  for (const [field, validator] of Object.entries(validators)) {
    const message = validator(values[field], values);
    if (message) errors[field] = message;
  }
  return errors;
}
