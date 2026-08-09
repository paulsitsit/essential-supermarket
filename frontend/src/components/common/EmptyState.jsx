import { PackageOpen } from 'lucide-react';

export default function EmptyState({ title = 'No records found', description = 'Try changing your filters.' }) {
  return <div className="empty-state large-empty"><PackageOpen size={28} /><strong>{title}</strong><span>{description}</span></div>;
}