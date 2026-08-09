import { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import { useSocket } from '../context/SocketContext';
import { getErrorMessage } from '../utils/errors';

export default function useLowStockAlerts() {
  const { lastEvent } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/low-stock-alerts');
      setAlerts(data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load low-stock alerts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (lastEvent && ['lowStockAlertCreated', 'lowStockAlertResolved', 'stockUpdated', 'productUpdated', 'notificationCreated'].includes(lastEvent.event)) load();
  }, [lastEvent, load]);

  const unreadCount = useMemo(() => alerts.filter(alert => alert.status === 'unread').length, [alerts]);
  const activeCount = useMemo(() => alerts.filter(alert => alert.status !== 'resolved').length, [alerts]);

  async function markRead(id) {
    await client.put(`/low-stock-alerts/${id}/read`);
    setAlerts(current => current.map(alert => alert._id === id ? { ...alert, status: 'read' } : alert));
  }

  async function resolve(id) {
    await client.put(`/low-stock-alerts/${id}/resolve`);
    setAlerts(current => current.map(alert => alert._id === id ? { ...alert, status: 'resolved', resolvedAt: new Date().toISOString() } : alert));
  }

  return { alerts, loading, error, unreadCount, activeCount, load, markRead, resolve };
}