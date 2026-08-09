export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  return <div className="modal-backdrop"><div className="modal-card compact-modal"><h3>{title}</h3><p>{message}</p><div className="modal-actions"><button className="secondary-btn" onClick={onCancel}>Cancel</button><button className={danger ? 'danger-btn' : 'primary-btn'} onClick={onConfirm}>{confirmText}</button></div></div></div>;
}