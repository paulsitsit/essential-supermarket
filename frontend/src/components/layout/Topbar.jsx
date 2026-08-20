import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Menu,
  Search
} from 'lucide-react';
import {
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';

import client from '../../api/client';

export default function Topbar({
  onMenu,
  alertCount = 0,
  alerts = []
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setSearchTerm('');
    setSuggestions([]);
    setSearchLoading(false);
    setSearchOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
        setSuggestions([]);
        setSearchLoading(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();

    if (term.length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      setSearchOpen(false);
      return;
    }

    setSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);

        const { data } = await client.get('/products', {
          params: {
            search: term,
            limit: 6
          }
        });

        const products = Array.isArray(data)
          ? data
          : data?.products || data?.data || [];

        setSuggestions(products.slice(0, 6));
      } catch (error) {
        console.error('Product search failed:', error);
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  function closeSearch() {
    setSearchTerm('');
    setSuggestions([]);
    setSearchLoading(false);
    setSearchOpen(false);
  }

  function handleMenuClick() {
    closeSearch();
    setNotificationsOpen(false);
    onMenu?.();
  }

  function toggleNotifications() {
    closeSearch();
    setNotificationsOpen(value => !value);
  }

  function closeNotifications() {
    setNotificationsOpen(false);
  }

  function submitSearch(event) {
    event.preventDefault();

    const term = searchTerm.trim();

    closeSearch();

    if (!term) {
      navigate('/products');
      return;
    }

    navigate(
      `/products?search=${encodeURIComponent(term)}`
    );
  }

  function selectProduct(product) {
    const productName =
      product.name ||
      product.productName ||
      '';

    closeSearch();

    navigate(
      `/products?search=${encodeURIComponent(productName)}`
    );
  }

  function getAlertName(alert) {
    return (
      alert?.product?.name ||
      alert?.productName ||
      alert?.name ||
      'Inventory alert'
    );
  }

  function getAlertMessage(alert) {
    if (alert?.type === 'expiration') {
      if (alert.message) {
        return alert.message;
      }

      if (
        alert.daysUntilExpiration !== undefined
      ) {
        if (alert.daysUntilExpiration <= 0) {
          return 'Product expires today';
        }

        return `Product expires in ${
          alert.daysUntilExpiration
        } day${
          alert.daysUntilExpiration === 1
            ? ''
            : 's'
        }`;
      }

      return 'Product expiration is near';
    }

    if (alert?.message) {
      return alert.message;
    }

    if (alert?.currentStock !== undefined) {
      return `${alert.currentStock} units remaining`;
    }

    return 'Product requires attention';
  }

  const safeAlerts = Array.isArray(alerts)
    ? alerts
    : [];

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn menu-btn"
        onClick={handleMenuClick}
        aria-label="Open menu"
      >
        <Menu size={23} />
      </button>

      <div
        className="global-search-container"
        ref={searchRef}
      >
        <form
          className="global-search"
          onSubmit={submitSearch}
          role="search"
        >
          <Search
            size={18}
            aria-hidden="true"
          />

          <input
            type="search"
            value={searchTerm}
            onChange={event => {
              setSearchTerm(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim().length >= 2) {
                setSearchOpen(true);
              }
            }}
            placeholder="Search products, SKU, or barcode..."
            aria-label="Search products, SKU, or barcode"
          />
        </form>

        {searchOpen && searchLoading && (
          <div className="search-status">
            Searching...
          </div>
        )}

        {searchOpen &&
          !searchLoading &&
          searchTerm.trim().length >= 2 &&
          suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((product, index) => (
                <button
                  type="button"
                  className="search-suggestion"
                  key={
                    product?._id ||
                    product?.id ||
                    index
                  }
                  onClick={() => selectProduct(product)}
                >
                  <div>
                    <strong>
                      {product?.name ||
                        product?.productName ||
                        'Unnamed product'}
                    </strong>

                    <small>
                      {product?.sku
                        ? `SKU: ${product.sku}`
                        : product?.barcode
                          ? `Barcode: ${product.barcode}`
                          : 'Product'}
                    </small>
                  </div>

                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          )}

        {searchOpen &&
          !searchLoading &&
          searchTerm.trim().length >= 2 &&
          suggestions.length === 0 && (
            <div className="search-status">
              No matching products
            </div>
          )}
      </div>

      <div className="topbar-actions">
        <div className="notification-wrapper">
          <button
            type="button"
            className="notification-btn"
            title="Low-stock and expiration alerts"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            onClick={toggleNotifications}
          >
            <Bell size={21} />

            {alertCount > 0 && (
              <span>
                {alertCount > 99
                  ? '99+'
                  : alertCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="notification-dropdown"
              role="dialog"
              aria-label="Notifications"
            >
              <div className="notification-header">
                <div>
                  <strong>Notifications</strong>

                  <small>
                    {alertCount
                      ? `${alertCount} alert${
                          alertCount === 1
                            ? ''
                            : 's'
                        } need attention`
                      : 'No active alerts'}
                  </small>
                </div>

                <Bell size={17} />
              </div>

              {safeAlerts.length > 0 ? (
                <div className="notification-list">
                  {safeAlerts.slice(0, 5).map(
                    (alert, index) => (
                      <Link
                        to="/alerts"
                        className="notification-item"
                        key={
                          alert?._id ||
                          alert?.id ||
                          index
                        }
                        onClick={() => {
                          closeNotifications();
                          closeSearch();
                        }}
                      >
                        <div
                          className={`notification-icon ${
                            alert?.type === 'expiration'
                              ? 'expiration-icon'
                              : ''
                          }`}
                        >
                          <AlertTriangle size={15} />
                        </div>

                        <div className="notification-content">
                          <strong>
                            {getAlertName(alert)}
                          </strong>

                          <small>
                            {getAlertMessage(alert)}
                          </small>
                        </div>

                        <ArrowRight size={14} />
                      </Link>
                    )
                  )}
                </div>
              ) : (
                <div className="notification-empty">
                  {alertCount > 0 ? (
                    <>
                      <AlertTriangle size={25} />

                      <strong>
                        Alerts available
                      </strong>

                      <span>
                        Open alerts to view affected
                        products.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={25} />

                      <strong>All clear</strong>

                      <span>
                        There are no active inventory
                        alerts.
                      </span>
                    </>
                  )}
                </div>
              )}

              <Link
                to="/alerts"
                className="notification-footer"
                onClick={() => {
                  closeNotifications();
                  closeSearch();
                }}
              >
                View all alerts
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}