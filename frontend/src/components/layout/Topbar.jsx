import { useState } from 'react';
import {
  Bell,
  Menu,
  Search,
  UserCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({
  onMenu,
  alertCount = 0,
  alerts = []
}) {
  const { account } = useAuth();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  function toggleNotifications() {
    setNotificationsOpen(value => !value);
  }

  function submitSearch(event) {
    event.preventDefault();

    const term = searchTerm.trim();

    if (!term) {
      navigate('/products');
      return;
    }

    navigate(`/products?search=${encodeURIComponent(term)}`);
  }

  function getAlertName(alert) {
    return (
      alert.product?.name ||
      alert.productName ||
      alert.name ||
      'Inventory alert'
    );
  }

  function getAlertMessage(alert) {
    if (alert.message) {
      return alert.message;
    }

    if (alert.currentStock !== undefined) {
      return `${alert.currentStock} units remaining`;
    }

    return 'Product requires attention';
  }

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn menu-btn"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu size={23} />
      </button>

      <form
        className="global-search"
        onSubmit={submitSearch}
        role="search"
      >
        <Search size={18} aria-hidden="true" />

        <input
          type="search"
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          placeholder="Search products, SKU, or barcode..."
          aria-label="Search products, SKU, or barcode"
        />
      </form>

      <div className="topbar-actions">
        <div className="notification-wrapper">
          <button
            type="button"
            className="notification-btn"
            title="Low-stock alerts"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            onClick={toggleNotifications}
          >
            <Bell size={21} />

            {alertCount > 0 && (
              <span>
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <div>
                  <strong>Notifications</strong>

                  <small>
                    {alertCount
                      ? `${alertCount} alert${
                          alertCount === 1 ? '' : 's'
                        } need attention`
                      : 'No active alerts'}
                  </small>
                </div>

                <Bell size={17} />
              </div>

              {alerts.length > 0 ? (
                <div className="notification-list">
                  {alerts.slice(0, 5).map((alert, index) => (
                    <Link
                      to="/alerts"
                      className="notification-item"
                      key={alert._id || alert.id || index}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <div className="notification-icon">
                        <AlertTriangle size={15} />
                      </div>

                      <div className="notification-content">
                        <strong>{getAlertName(alert)}</strong>
                        <small>{getAlertMessage(alert)}</small>
                      </div>

                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="notification-empty">
                  {alertCount > 0 ? (
                    <>
                      <AlertTriangle size={25} />
                      <strong>Low-stock alerts available</strong>
                      <span>
                        Open alerts to view the affected products.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={25} />
                      <strong>All clear</strong>
                      <span>
                        There are no active inventory alerts.
                      </span>
                    </>
                  )}
                </div>
              )}

              <Link
                to="/alerts"
                className="notification-footer"
                onClick={() => setNotificationsOpen(false)}
              >
                View all alerts
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        <div className="topbar-account">
          <UserCircle size={29} />

          <div>
            <strong>{account?.fullName}</strong>
            <small className="role-text">{account?.role}</small>
          </div>
        </div>
      </div>
    </header>
  );
}