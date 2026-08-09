import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import useLowStockAlerts from '../hooks/useLowStockAlerts';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    alerts = [],
    unreadCount = 0
  } = useLowStockAlerts();

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-shell">
        <Topbar
          alerts={alerts}
          alertCount={unreadCount}
          onMenu={() => setSidebarOpen(true)}
        />

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}