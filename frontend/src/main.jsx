import React, {
  useEffect,
  useRef
} from 'react';

import ReactDOM from 'react-dom/client';

import {
  BrowserRouter
} from 'react-router-dom';

import {
  Toaster
} from 'react-hot-toast';

import App from './App';

import {
  AuthProvider
} from './context/AuthContext';

import {
  SocketProvider
} from './context/SocketContext';

import ErrorBoundary from './components/common/ErrorBoundary';

import {
  useOnlineStatus
} from './hooks/useOnlineStatus.js';

import {
  hasSyncableProductDrafts,
  syncPendingProductDrafts
} from './services/productOutbox.js';

import {
  hasSyncableStockReceipts,
  syncPendingStockReceipts
} from './services/stockOutbox.js';

import './styles.css';

function OfflineSyncWatcher() {
  const isOnline = useOnlineStatus();

  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isOnline || syncingRef.current) {
      return;
    }

    const hasProductDrafts =
      hasSyncableProductDrafts();

    const hasStockReceipts =
      hasSyncableStockReceipts();

    if (
      !hasProductDrafts &&
      !hasStockReceipts
    ) {
      return;
    }

    let cancelled = false;

    async function runSync() {
      syncingRef.current = true;

      try {
        /*
         * Product creation must happen before stock
         * receiving in case a user created a product
         * offline, then prepared a stock receipt for it.
         */
        if (hasProductDrafts) {
          const productResult =
            await syncPendingProductDrafts();

          if (
            !cancelled &&
            productResult.synced > 0
          ) {
            console.log(
              `Synchronized ${productResult.synced} offline product draft(s).`
            );
          }
        }

        if (hasStockReceipts) {
          const stockResult =
            await syncPendingStockReceipts();

          if (
            !cancelled &&
            stockResult.synced > 0
          ) {
            console.log(
              `Synchronized ${stockResult.synced} offline stock receipt(s).`
            );
          }
        }
      } catch (error) {
        console.error(
          'Automatic offline synchronization failed:',
          error
        );
      } finally {
        syncingRef.current = false;
      }
    }

    runSync();

    return () => {
      cancelled = true;
    };
  }, [isOnline]);

  return null;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        console.log(
          'Essential Supermarket service worker registered.'
        );
      })
      .catch(error => {
        console.error(
          'Service worker registration failed:',
          error
        );
      });
  });
}

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <SocketProvider>
            <OfflineSyncWatcher />

            <App />

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3200
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);