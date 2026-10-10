import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/common/ErrorBoundary';

import { useOnlineStatus } from './hooks/useOnlineStatus.js';
import {
  syncPendingProductDrafts,
  hasSyncableProductDrafts
} from './services/productOutbox.js';

import './styles.css';

function OfflineProductSyncWatcher() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    if (!hasSyncableProductDrafts()) {
      return;
    }

    let cancelled = false;

    async function runSync() {
      try {
        const result =
          await syncPendingProductDrafts();

        if (
          !cancelled &&
          result.synced > 0
        ) {
          console.log(
            `Synchronized ${result.synced} offline product draft(s).`
          );
        }
      } catch (error) {
        console.error(
          'Automatic offline product synchronization failed:',
          error
        );
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
            <OfflineProductSyncWatcher />

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