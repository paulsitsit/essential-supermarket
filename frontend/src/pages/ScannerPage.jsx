import { useState } from 'react';
import { Keyboard, ScanLine, Search } from 'lucide-react';
import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import ReceiveStockModal from '../components/inventory/ReceiveStockModal';
import CameraScanner from '../components/scanner/CameraScanner';
import ScannedProductCard from '../components/scanner/ScannedProductCard';
import { getErrorMessage } from '../utils/errors';

export default function ScannerPage() {
  const [product, setProduct] = useState(null);
  const [notFoundCode, setNotFoundCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  async function findProduct(code) {
    const cleanCode = String(code || '').trim();

    console.log('Decoded QR or barcode value:', cleanCode);

    if (!cleanCode) {
      setError('The scanned code was empty.');
      return;
    }

    setSearching(true);
    setError('');
    setProduct(null);
    setNotFoundCode('');

    try {
      const response = await client.get(
        `/products/scan/${encodeURIComponent(cleanCode)}`
      );

      console.log('Product scan response:', response.data);

      const result = response.data?.product || response.data;

      if (!result) {
        setError('The server returned no product.');
        return;
      }

      setProduct(result);
    } catch (err) {
      console.error(
        'Product scan error:',
        err.response?.data || err
      );

      if (err.response?.status === 404) {
        setNotFoundCode(cleanCode);
      } else {
        setError(
          getErrorMessage(
            err,
            'Unable to search for this product'
          )
        );
      }
    } finally {
      setSearching(false);
    }
  }

  function reset() {
    setProduct(null);
    setNotFoundCode('');
    setError('');
    setManualCode('');
  }

  function handleManualSubmit(event) {
    event.preventDefault();
    findProduct(manualCode);
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MOBILE INVENTORY TOOL</p>
          <h1>QR and Barcode Scanner</h1>
          <p>
            Scan an existing registered product to receive stock.
          </p>
        </div>
      </div>

      <div className="scanner-layout">
        <GlassCard className="scanner-panel">
          <div className="scanner-panel-heading">
            <div className="scanner-title-icon">
              <ScanLine size={21} />
            </div>

            <div>
              <h3>Scan product code</h3>
              <p>Use your phone's rear camera for best results.</p>
            </div>
          </div>

          <CameraScanner onDetected={findProduct} />

          <button
            type="button"
            className="manual-toggle"
            onClick={() =>
              setManualOpen(value => !value)
            }
          >
            <Keyboard size={16} />

            {manualOpen
              ? 'Hide manual search'
              : 'Enter barcode or SKU manually'}
          </button>

          {manualOpen && (
            <form
              className="manual-search"
              onSubmit={handleManualSubmit}
            >
              <div className="filter-search">
                <Search size={17} />

                <input
                  value={manualCode}
                  onChange={event =>
                    setManualCode(event.target.value)
                  }
                  placeholder="ES-000001 or product SKU"
                />
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>
          )}
        </GlassCard>

        <GlassCard className="scan-result-panel">
          <div className="scanner-panel-heading">
            <div className="scanner-title-icon light-icon">
              <Search size={21} />
            </div>

            <div>
              <h3>Scan result</h3>
              <p>
                Only registered products can receive stock.
              </p>
            </div>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {!product && !notFoundCode && (
            <div className="scan-empty">
              <ScanLine size={36} />
              <strong>Ready to scan</strong>
              <span>
                The product details will appear here.
              </span>
            </div>
          )}

          <ScannedProductCard
            product={product}
            notFoundCode={notFoundCode}
            onReceive={setSelectedProduct}
            onScanAgain={reset}
          />
        </GlassCard>
      </div>

      {selectedProduct && (
        <ReceiveStockModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSaved={() => {
            setSelectedProduct(null);
            reset();
          }}
        />
      )}
    </div>
  );
}