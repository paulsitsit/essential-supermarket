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
  Users,
  X
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import Logo from '../../assets/logo.png';

const items = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'staff']
  },
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
    label: 'Batch Trace',
    path: '/batch-trace',
    icon: ClipboardList,
    roles: ['admin', 'manager', 'staff']
  },
  {
    label: 'Expiring Soon',
    path: '/expiring-soon',
    icon: CalendarClock,
    roles: ['admin', 'manager', 'staff']
  },
  {
    label: 'Sales',
    path: '/sales',
    icon: ShoppingCart,
    roles: ['admin', 'manager', 'staff']
  },
  {
    label: 'Categories',
    path: '/categories',
    icon: Tags,
    roles: ['admin', 'manager']
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: Boxes,
    roles: ['admin', 'manager', 'staff']
  },
  {
    label: 'Stock Movements',
    path: '/stock-movements',
    icon: ClipboardList,
    roles: ['admin', 'manager', 'staff']
  },
  {
    label: 'QR & Barcode Scanner',
    path: '/scanner',
    icon: ScanLine,
    roles: ['admin', 'manager', 'staff']
  },
  {
    label: 'Low Stock & Expiration Alerts',
    path: '/alerts',
    icon: ShieldAlert,
    roles: ['admin', 'manager', 'staff']
  },
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
    label: 'Account Management',
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
];

export default function Sidebar({ open, onClose }) {
  const { account, logout } = useAuth();

  const visibleItems = items.filter(item =>
    item.roles.includes(account?.role)
  );

  function handleNavClick() {
    onClose?.();
  }

  return (
    <aside
      className={`sidebar ${open ? 'sidebar-open' : ''}`}
      aria-hidden={!open}
    >
      <div className="sidebar-brand">
        <div className="brand-mark">
          <img
            src={Logo}
            alt="Essential Supermarket"
            className="brand-logo-img"
          />
        </div>

        <div>
          <strong>Essential</strong>
          <span>Supermarket</span>
        </div>

        <button
          type="button"
          className="icon-btn sidebar-close"
          aria-label="Close sidebar"
          onClick={handleNavClick}
        >
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-label">
        MAIN MENU
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(item => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                isActive
                  ? 'nav-item active'
                  : 'nav-item'
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
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
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}