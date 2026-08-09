import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { setSocket(null); return undefined; }
    const instance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { transports: ['websocket', 'polling'] });
    const events = ['stockUpdated', 'productUpdated', 'lowStockAlertCreated', 'lowStockAlertResolved', 'notificationCreated'];
    events.forEach(event => instance.on(event, payload => setLastEvent({ event, payload, at: Date.now() })));
    setSocket(instance);
    return () => instance.disconnect();
  }, [isAuthenticated]);

  return <SocketContext.Provider value={{ socket, lastEvent }}>{children}</SocketContext.Provider>;
}

export function useSocket() { return useContext(SocketContext); }