/*
 * Display label for a product's unit of measure.
 * "piece" is shown as "Pc" for exactly one and "Pcs" for any other quantity.
 * Other units (kg, box, ...) are returned unchanged.
 */
export function unitLabel(unit, quantity = 2, fallback = 'piece') {
  const raw = String(unit || '').trim() || fallback;
  const key = raw.toLowerCase();

  if (['piece', 'pieces', 'pc', 'pcs'].includes(key)) {
    return Number(quantity) === 1 ? 'Pc' : 'Pcs';
  }

  return raw;
}
