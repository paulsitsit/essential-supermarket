import { Edit3, Power, Trash2 } from 'lucide-react';
import { dateOnly } from '../../utils/format';

export default function ManagementTable({ columns, rows, onEdit, onDelete, onToggle, empty = 'No records found.' }) {
  if (!rows.length) return <div className="empty-state large-empty">{empty}</div>;
  return <div className="table-wrap"><table className="data-table management-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}<th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row._id}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : column.key === 'createdAt' ? dateOnly(row[column.key]) : row[column.key] ?? '—'}</td>)}<td><div className="row-actions">{onEdit && <button className="row-icon" title="Edit" onClick={() => onEdit(row)}><Edit3 size={15} /></button>}{onToggle && <button className="row-icon" title="Change status" onClick={() => onToggle(row)}><Power size={15} /></button>}{onDelete && <button className="row-icon danger-icon" title="Delete" onClick={() => onDelete(row)}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div>;
}