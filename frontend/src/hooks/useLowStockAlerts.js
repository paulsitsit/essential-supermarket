import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import client from '../api/client';
import { useSocket } from '../context/SocketContext';
import { getErrorMessage } from '../utils/errors';

const socketEvents = [
  'lowStockAlertCreated',
  'lowStockAlertResolved',
  'stockUpdated',
  'productUpdated',
  'notificationCreated'
];

function isExpirationAlert(alert) {
  return alert.type === 'expiration';
}

export default function useLowStockAlerts() {
  const { lastEvent } = useSocket();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await client.get('/low-stock-alerts');

      const alertList = Array.isArray(data)
        ? data
        : data.alerts || [];

      setAlerts(alertList);
      setError('');
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load inventory alerts'
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (
      lastEvent &&
      socketEvents.includes(lastEvent.event)
    ) {
      load();
    }
  }, [lastEvent, load]);

  const unreadCount = useMemo(() => {
    return alerts.filter(
      alert => alert.status === 'unread'
    ).length;
  }, [alerts]);

  const activeCount = useMemo(() => {
    return alerts.filter(
      alert => alert.status !== 'resolved'
    ).length;
  }, [alerts]);

  async function markRead(id) {
    const alert = alerts.find(
      item => item._id === id || item.id === id
    );

    if (!alert) return;

    // Expiration alerts are generated dynamically
    // and do not exist in the LowStockAlert collection.
    if (isExpirationAlert(alert)) {
      setAlerts(current =>
        current.map(item =>
          item._id === id || item.id === id
            ? { ...item, status: 'read' }
            : item
        )
      );

      return;
    }

    await client.put(
      `/low-stock-alerts/${id}/read`
    );

    setAlerts(current =>
      current.map(item =>
        item._id === id
          ? { ...item, status: 'read' }
          : item
      )
    );
  }

  async function resolve(id) {
    const alert = alerts.find(
      item => item._id === id || item.id === id
    );

    if (!alert) return;

    // Expiration alerts are dynamic and cannot be
    // resolved in the LowStockAlert database.
    if (isExpirationAlert(alert)) {
      setAlerts(current =>
        current.map(item =>
          item._id === id || item.id === id
            ? {
                ...item,
                status: 'resolved',
                resolvedAt: new Date().toISOString()
              }
            : item
        )
      );

      return;
    }

    await client.put(
      `/low-stock-alerts/${id}/resolve`
    );

    setAlerts(current =>
      current.map(item =>
        item._id === id
          ? {
              ...item,
              status: 'resolved',
              resolvedAt: new Date().toISOString()
            }
          : item
      )
    );
  }

  return {
    alerts,
    loading,
    error,
    unreadCount,
    activeCount,
    load,
    markRead,
    resolve
  };
}