import { NavLink } from 'react-router-dom';
import { BarChart3, Boxes, ClipboardList, FileBarChart, Gauge, LayoutDashboard, LogOut, Package, ScanLine, Settings, ShieldAlert, Truck, Users, X, Tags } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const items = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
  { label: 'Products', path: '/products', icon: Package, roles: ['admin', 'manager'] },
  { label: 'Categories', path: '/categories', icon: Tags, roles: ['admin', 'manager'] },
  { label: 'Inventory', path: '/inventory', icon: Boxes, roles: ['admin', 'manager', 'staff'] },
  { label: 'Stock Movements', path: '/stock-movements', icon: ClipboardList, roles: ['admin', 'manager', 'staff'] },
  { label: 'QR & Barcode Scanner', path: '/scanner', icon: ScanLine, roles: ['admin', 'manager', 'staff'] },
  { label: 'Low-Stock Alerts', path: '/alerts', icon: ShieldAlert, roles: ['admin', 'manager', 'staff'] },
  { label: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['admin', 'manager'] },
  { label: 'Reports', path: '/reports', icon: FileBarChart, roles: ['admin', 'manager'] },
  { label: 'Account Management', path: '/accounts', icon: Users, roles: ['admin'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] }
];

export default function Sidebar({ open, onClose }) {
  const { account, logout } = useAuth();
  return <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
    <div className="sidebar-brand"><div className="brand-mark">ES</div><div><strong>Essential</strong><span>Supermarket</span></div><button className="icon-btn sidebar-close" onClick={onClose}><X size={20} /></button></div>
    <div className="sidebar-label">MAIN MENU</div>
    <nav>{items.filter(item => item.roles.includes(account?.role)).map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} onClick={onClose} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-user"><div className="avatar">{account?.fullName?.charAt(0) || 'U'}</div><div><strong>{account?.fullName}</strong><small>{account?.role}</small></div></div><button className="logout-btn" onClick={logout}><LogOut size={18} /> Logout</button></div>
  </aside>;
}