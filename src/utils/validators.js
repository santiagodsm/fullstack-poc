

/**
 * Strip non-digit characters and format phone to XXX-XXX-XXXX.
 * @param {string} raw
 * @returns {string}
 */
export function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : raw;
}

/**
 * Check if phone matches XXX-XXX-XXXX pattern.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  return /^\d{3}-\d{3}-\d{4}$/.test(phone);
}

/**
 * Simple email validation based on RFC 5322 pattern.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Check if a value is a valid finite number (integer or float).
 * @param {string|number} value
 * @returns {boolean}
 */
export function isNumber(value) {
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Check if a value is a valid currency format.
 * Allows optional leading '$', comma separators, and two decimal places.
 * Examples: '123', '$1,234.56', '1000.00'
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isCurrency(value) {
  if (typeof value !== 'string') return false;
  // Optional leading $, digits with optional comma grouping, optional 2 decimals
  return /^\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/.test(value);
}