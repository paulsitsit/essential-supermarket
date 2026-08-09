import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import ScannerPage from './pages/ScannerPage';
import AlertsPage from './pages/AlertsPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import AddProductPage from './pages/AddProductPage';
import InventoryPage from './pages/InventoryPage';
import StockMovementsPage from './pages/StockMovementsPage';
import EditProductPage from './pages/EditProductPage';
import AuditLogsPage from './pages/AuditLogsPage';



// Placeholder component for modules not yet implemented
function Placeholder({ title }) {
  return (
    <div className="placeholder-page">
      <p className="eyebrow">ESSENTIALSUPERMARKET</p>
      <h1>{title}</h1>
      <p>This module will be implemented in the next frontend part.</p>
    </div>
  );
}


export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />


      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Default redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />


          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />


          {/* Products (admin + manager) */}
          <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
            <Route path="products" element={<ProductsPage />} />
          </Route>


          {/* Add Product (admin only) */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="products/new" element={<AddProductPage />} />
          </Route>


          {/* Edit Product (admin + manager) */}
          <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
            import EditProductPage from './pages/EditProductPage';
          </Route>


          {/* Inventory & Stock Movements (all authenticated users) */}
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="stock-movements" element={<StockMovementsPage />} />


          {/* Other modules still placeholders */}
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="alerts" element={<AlertsPage />} />


          {/* Categories, Suppliers, Reports (admin + manager) */}
          <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>


          {/* Accounts, Settings & Audit Logs (admin only) */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>
      </Route>


      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}