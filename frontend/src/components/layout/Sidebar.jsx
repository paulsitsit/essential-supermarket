import { NavLink } from 'react-router-dom';
import {
  Boxes,
  CalendarClock,
  ClipboardList,
  FileBarChart,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  ScanLine,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tags,
  Truck,
  Users
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import Logo from '../../assets/logo.png';

const groups = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'manager', 'staff']
      }
    ]
  },
  {
    label: 'Catalog',
    items: [
      {
        label: 'Products',
        path: '/products',
        icon: Package,
        roles: ['admin', 'manager']
      },
      {
        label: 'Batches',
        path: '/batches',
        icon: Layers,
        roles: ['admin', 'manager']
      },
      {
        label: 'Batch trace',
        path: '/batch-trace',
        icon: ClipboardList,
        roles: ['admin', 'manager', 'staff']
      },
      {
        label: 'Categories',
        path: '/categories',
        icon: Tags,
        roles: ['admin', 'manager']
      },
      {
        label: 'Expiring soon',
        path: '/expiring-soon',
        icon: CalendarClock,
        roles: ['admin', 'manager', 'staff']
      }
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Sales',
        path: '/sales',
        icon: ShoppingCart,
        roles: ['admin', 'manager', 'staff']
      },
      {
        label: 'Inventory',
        path: '/inventory',
        icon: Boxes,
        roles: ['admin', 'manager', 'staff']
      },
      {
        label: 'Stock movements',
        path: '/stock-movements',
        icon: ClipboardList,
        roles: ['admin', 'manager', 'staff']
      },
      {
        label: 'QR and barcode scanner',
        path: '/scanner',
        icon: ScanLine,
        roles: ['admin', 'manager', 'staff']
      },
      {
        label: 'Low stock and expiration alerts',
        path: '/alerts',
        icon: ShieldAlert,
        roles: ['admin', 'manager', 'staff']
      }
    ]
  },
  {
    label: 'Business',
    items: [
      {
        label: 'Suppliers',
        path: '/suppliers',
        icon: Truck,
        roles: ['admin', 'manager']
      },
      {
        label: 'Reports',
        path: '/reports',
        icon: FileBarChart,
        roles: ['admin', 'manager']
      },
      {
        label: 'Account management',
        path: '/accounts',
        icon: Users,
        roles: ['admin']
      },
      {
        label: 'Settings',
        path: '/settings',
        icon: Settings,
        roles: ['admin']
      }
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  const { account, logout } = useAuth();

  function handleNavigation() {
    onClose?.();
  }

  return (
    <aside
      className={`sidebar compact-sidebar ${
        open ? 'sidebar-open' : ''
      }`}
      aria-hidden={!open}
    >
      <div className="sidebar-brand compact-brand">
        <div className="brand-mark">
          <img
            src={Logo}
            alt="Essential Supermarket"
            className="brand-logo-img"
          />
        </div>

        <div className="brand-copy">
          <strong>Essential</strong>
          <span>Supermarket</span>
        </div>
      </div>

      <nav className="compact-sidebar-nav">
        {groups.map(group => {
          const visibleItems = group.items.filter(item =>
            item.roles.includes(account?.role)
          );

          if (!visibleItems.length) {
            return null;
          }

          return (
            <div
              className="sidebar-group"
              key={group.label}
            >
              <div className="sidebar-group-label">
                {group.label}
              </div>

              <div className="sidebar-group-items">
                {visibleItems.map(item => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={handleNavigation}
                      className={({ isActive }) =>
                        isActive
                          ? 'nav-item compact-nav-item active'
                          : 'nav-item compact-nav-item'
                      }
                    >
                      <Icon size={15} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-bottom compact-sidebar-bottom">
        <div className="sidebar-user">
          <div className="avatar">
            {account?.fullName?.charAt(0) || 'U'}
          </div>

          <div>
            <strong>
              {account?.fullName || 'User'}
            </strong>

            <small>
              {account?.role || 'user'}
            </small>
          </div>
        </div>

        <button
          type="button"
          className="logout-btn"
          onClick={logout}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}