import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function ProductQrCode({
  value,
  productName = 'Product'
}) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef(null);
  const qrValue = String(value || '').trim();

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const downloadQrCode = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const safeName = productName
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    const link = document.createElement('a');
    link.download = `${safeName || 'product'}-qr-code.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!qrValue) {
    return (
      <button
        type="button"
        className="row-icon"
        title="QR code unavailable"
        disabled
      >
        QR
      </button>
    );
  }

  const modal = open ? (
    <div
      className="modal-backdrop qr-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <div
        className="qr-modal glass-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">PRODUCT QR CODE</p>
            <h3 id="qr-modal-title">{productName}</h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            aria-label="Close QR code"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="qr-code-box">
          <QRCodeCanvas
            ref={canvasRef}
            value={qrValue}
            size={240}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#123d26"
          />
        </div>

        <p className="qr-value">
          Scan value: <strong>{qrValue}</strong>
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={downloadQrCode}
          >
            <Download size={15} />
            Download QR
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="row-icon"
        title={`Show QR code for ${productName}`}
        aria-label={`Show QR code for ${productName}`}
        onClick={() => setOpen(true)}
      >
        QR
      </button>

      {typeof document !== 'undefined' && modal
        ? createPortal(modal, document.body)
        : null}
    </>
  );
}