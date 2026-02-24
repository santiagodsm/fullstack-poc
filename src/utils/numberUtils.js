

/**
 * Safely parse a value into a number by stripping non-numeric characters.
 * @param {string|number} value - The input value to parse.
 * @returns {number} Parsed float value, or 0 if parsing fails.
 */
export function parseNumber(value) {
  const str = String(value || '').trim();
  // Remove any characters except digits, minus sign, and decimal point
  const cleaned = str.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}