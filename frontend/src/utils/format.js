export const peso = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0);
export const dateTime = value => value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const dateOnly = value => value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export const movementLabel = value => ({
  stock_in: 'Stock In',
  stock_out: 'Stock Out',
  sale: 'Sale',
  return: 'Return',
  stock_adjustment: 'Stock Adjustment',
  adjustment: 'Adjustment',
  damaged: 'Damaged',
  expired: 'Expired',
  returned_to_supplier: 'Returned to Supplier',
  return_to_supplier: 'Return to Supplier',
  branch_transfer: 'Branch Transfer',
  manual_correction: 'Manual Correction',
  customer_return: 'Customer Return',
  quarantine_release: 'Quarantine Release',
  quarantine_disposal: 'Quarantine Disposal'
}[value] || value || 'Unknown');


/*
 * Display label for a product's unit of measure.
 * "piece" is shown as "Pc" for exactly one and "Pcs" for any other quantity.
 * Other units (kg, box, ...) are shown unchanged.
 */
export const unitLabel = (unit, quantity = 2, fallback = 'piece') => {
  const raw = String(unit || '').trim() || fallback;
  const key = raw.toLowerCase();

  if (['piece', 'pieces', 'pc', 'pcs'].includes(key)) {
    return Number(quantity) === 1 ? 'Pc' : 'Pcs';
  }

  return raw;
};
