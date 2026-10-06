/**
 * DealSense AI — Number formatting utilities
 * All functions return null if value is null/undefined (so callers can show "—").
 */

/**
 * Compact format for large raw integers/counts.
 * 2_500_000_000 → "2.5B"
 * 15_000_000    → "15M"
 * 250_000       → "250K"
 * 1_500         → "1.5K"
 * 750           → "750"
 */
export function compact(value, { prefix = "", suffix = "" } = {}) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (isNaN(n)) return String(value);

  const abs = Math.abs(n);
  let s;
  if      (abs >= 1_000_000_000) s = _trim(n / 1_000_000_000) + "B";
  else if (abs >= 1_000_000)     s = _trim(n / 1_000_000)     + "M";
  else if (abs >= 1_000)         s = _trim(n / 1_000)         + "K";
  else                            s = String(n);

  return `${prefix}${s}${suffix}`;
}

/**
 * Format a value already in Indian Crores (1 Cr = 10M).
 * 0.25 → "₹25L"   (25 Lakhs)
 * 1.8  → "₹1.8Cr"
 * 150  → "₹150Cr"
 */
export function cr(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  if (n < 1)        return `₹${_trim(n * 100)}L`;
  if (n >= 10_000)  return `₹${_trim(n / 1_000, 1)}K Cr`;
  return `₹${_trim(n, 1)}Cr`;
}

/**
 * Format a raw INR amount.
 * 12_000_000 → "₹1.2Cr"
 * 500_000    → "₹5L"
 * 75_000     → "₹75K"
 * 800        → "₹800"
 */
export function inr(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  if (n >= 10_000_000) return `₹${_trim(n / 10_000_000, 1)}Cr`;
  if (n >= 100_000)    return `₹${_trim(n / 100_000,    1)}L`;
  if (n >= 1_000)      return `₹${_trim(n / 1_000,      1)}K`;
  return `₹${n}`;
}

/**
 * Format a market-size value — unknown unit, apply compact with given prefix.
 * Prefer using `tam_text` (pre-formatted string) over `tam_value`.
 */
export function marketSize(textVal, numVal, currencyPrefix = "$") {
  if (textVal) return textVal;
  return compact(numVal, { prefix: currencyPrefix });
}

// ── internal ──────────────────────────────────────────────────────────────────

function _trim(n, dec = 1) {
  // Remove trailing zeros: 2.50 → "2.5", 2.00 → "2"
  return parseFloat(n.toFixed(dec)).toString();
}
