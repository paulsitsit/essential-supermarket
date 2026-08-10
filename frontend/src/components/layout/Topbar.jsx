import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Menu,
  Search,
  UserCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import {
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

export default function Topbar({
  onMenu,
  alertCount = 0,
  alerts = []
}) {
  const { account } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close notifications and search suggestions when changing pages
  useEffect(() => {
    setNotificationsOpen(false);
    setSearchOpen(false);
    setSuggestions([]);
  }, [location.pathname, location.search]);

  // Close search suggestions when clicking outside the search box
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
        setSuggestions([]);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  // Search products while typing
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
          : data.products || data.data || [];

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

  function toggleNotifications() {
    setNotificationsOpen(value => !value);

    // Close search when opening notifications
    setSearchOpen(false);
    setSuggestions([]);
  }

  function submitSearch(event) {
    event.preventDefault();

    const term = searchTerm.trim();

    setSearchOpen(false);
    setSuggestions([]);

    if (!term) {
      navigate('/products');
      return;
    }

    navigate(`/products?search=${encodeURIComponent(term)}`);
  }

  function selectProduct(product) {
    const productName =
      product.name ||
      product.productName ||
      '';

    setSearchTerm(productName);
    setSearchOpen(false);
    setSuggestions([]);

    navigate(
      `/products?search=${encodeURIComponent(productName)}`
    );
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
                  key={product._id || product.id || index}
                  onClick={() => selectProduct(product)}
                >
                  <div>
                    <strong>
                      {product.name ||
                        product.productName ||
                        'Unnamed product'}
                    </strong>

                    <small>
                      {product.sku
                        ? `SKU: ${product.sku}`
                        : product.barcode
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
                      onClick={() => {
                        setNotificationsOpen(false);
                        setSearchOpen(false);
                        setSuggestions([]);
                      }}
                    >
                      <div className="notification-icon">
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
                  ))}
                </div>
              ) : (
                <div className="notification-empty">
                  {alertCount > 0 ? (
                    <>
                      <AlertTriangle size={25} />

                      <strong>
                        Low-stock alerts available
                      </strong>

                      <span>
                        Open alerts to view the affected products.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={25} />

                      <strong>
                        All clear
                      </strong>

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
                onClick={() => {
                  setNotificationsOpen(false);
                  setSearchOpen(false);
                  setSuggestions([]);
                }}
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
            <strong>
              {account?.fullName}
            </strong>

            <small className="role-text">
              {account?.role}
            </small>
          </div>
        </div>
      </div>
    </header>
  );
}