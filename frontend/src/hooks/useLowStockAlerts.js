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
  'lowStockAlertUpdated',
  'lowStockAlertResolved',
  'expirationAlertCreated',
  'expirationAlertUpdated',
  'expirationAlertResolved',
  'stockUpdated',
  'productUpdated',
  'notificationCreated'
];

function getRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.alerts || [];
}

export default function useLowStockAlerts() {
  const { lastEvent } = useSocket();

  const [
    lowStockAlerts,
    setLowStockAlerts
  ] = useState([]);

  const [
    expirationAlerts,
    setExpirationAlerts
  ] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [
        lowStockResponse,
        expirationResponse
      ] = await Promise.all([
        client.get('/low-stock-alerts'),
        client.get('/expiration-alerts')
      ]);

      setLowStockAlerts(
        getRows(lowStockResponse.data)
      );

      setExpirationAlerts(
        getRows(expirationResponse.data)
      );

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

  const alerts = useMemo(() => {
    return [
      ...lowStockAlerts.map(alert => ({
        ...alert,
        alertType: 'low_stock'
      })),

      ...expirationAlerts.map(alert => ({
        ...alert,
        alertType: 'expiration'
      }))
    ];
  }, [lowStockAlerts, expirationAlerts]);

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

  const expirationUnreadCount = useMemo(() => {
    return expirationAlerts.filter(
      alert => alert.status === 'unread'
    ).length;
  }, [expirationAlerts]);

  const expirationActiveCount = useMemo(() => {
    return expirationAlerts.filter(
      alert => alert.status !== 'resolved'
    ).length;
  }, [expirationAlerts]);

  async function markRead(id, alertType) {
    const endpoint =
      alertType === 'expiration'
        ? '/expiration-alerts'
        : '/low-stock-alerts';

    await client.put(
      `${endpoint}/${id}/read`
    );

    const updateRows = rows =>
      rows.map(alert =>
        alert._id === id
          ? {
              ...alert,
              status: 'read'
            }
          : alert
      );

    if (alertType === 'expiration') {
      setExpirationAlerts(updateRows);
    } else {
      setLowStockAlerts(updateRows);
    }
  }

  async function resolve(id, alertType) {
    const endpoint =
      alertType === 'expiration'
        ? '/expiration-alerts'
        : '/low-stock-alerts';

    await client.put(
      `${endpoint}/${id}/resolve`
    );

    const updateRows = rows =>
      rows.map(alert =>
        alert._id === id
          ? {
              ...alert,
              status: 'resolved',
              resolvedAt: new Date().toISOString()
            }
          : alert
      );

    if (alertType === 'expiration') {
      setExpirationAlerts(updateRows);
    } else {
      setLowStockAlerts(updateRows);
    }
  }

  return {
    alerts,
    lowStockAlerts,
    expirationAlerts,
    loading,
    error,
    unreadCount,
    activeCount,
    expirationUnreadCount,
    expirationActiveCount,
    load,
    markRead,
    resolve
  };
}