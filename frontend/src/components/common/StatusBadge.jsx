const labels = { normal: 'Normal', low_stock: 'Low Stock', out_of_stock: 'Out of Stock', damaged: 'Damaged', expired: 'Expired' };

export default function StatusBadge({ status = 'normal' }) {
  return <span className={`status-badge status-${status}`}>{labels[status] || status.replaceAll('_', ' ')}</span>;
}