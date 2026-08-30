import {
  Navigate,
  Route,
  Routes
} from 'react-router-dom';

import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import AddProductPage from './pages/AddProductPage';
import EditProductPage from './pages/EditProductPage';
import BatchesPage from './pages/BatchesPage';
import BatchTracePage from './pages/BatchTracePage';
import ExpiringSoonPage from './pages/ExpiringSoonPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import SalesPage from './pages/SalesPage';
import InventoryPage from './pages/InventoryPage';
import StockMovementsPage from './pages/StockMovementsPage';
import ScannerPage from './pages/ScannerPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import AccountsPage from './pages/AccountsPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReturnsPage from './pages/ReturnsPage';
import QuarantinePage from './pages/QuarantinePage';

const MANAGEMENT_ROLES = [
  'admin',
  'manager'
];

const ADMIN_ROLES = [
  'admin'
];

const STAFF_ROLES = [
  'admin',
  'manager',
  'staff'
];

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <Navigate
                to="/sales"
                replace
              />
            }
          />

          {/* Admin and Manager only */}
          <Route
            element={
              <ProtectedRoute
                roles={MANAGEMENT_ROLES}
              />
            }
          >
            <Route
              path="dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="products"
              element={<ProductsPage />}
            />

            <Route
              path="products/:id/edit"
              element={<EditProductPage />}
            />

            <Route
              path="batches"
              element={<BatchesPage />}
            />

            <Route
              path="batch-trace"
              element={<BatchTracePage />}
            />

            <Route
              path="expiring-soon"
              element={<ExpiringSoonPage />}
            />

            <Route
              path="inventory"
              element={<InventoryPage />}
            />

            <Route
              path="stock-movements"
              element={<StockMovementsPage />}
            />

            <Route
              path="categories"
              element={<CategoriesPage />}
            />

            <Route
              path="suppliers"
              element={<SuppliersPage />}
            />

            <Route
              path="reports"
              element={<ReportsPage />}
            />

            <Route
              path="returns"
              element={<ReturnsPage />}
            />

            <Route
              path="quarantine"
              element={<QuarantinePage />}
            />
          </Route>

          {/* Admin only */}
          <Route
            element={
              <ProtectedRoute
                roles={ADMIN_ROLES}
              />
            }
          >
            <Route
              path="products/new"
              element={<AddProductPage />}
            />

            <Route
              path="accounts"
              element={<AccountsPage />}
            />

            <Route
              path="settings"
              element={<SettingsPage />}
            />

            <Route
              path="audit-logs"
              element={<AuditLogsPage />}
            />
          </Route>

          {/* All signed-in roles, including staff */}
          <Route
            element={
              <ProtectedRoute
                roles={STAFF_ROLES}
              />
            }
          >
            <Route
              path="sales"
              element={<SalesPage />}
            />

            <Route
              path="sales/:id/returns"
              element={<ReturnsPage />}
            />

            <Route
              path="scanner"
              element={<ScannerPage />}
            />

            <Route
              path="alerts"
              element={<AlertsPage />}
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/sales"
            replace
          />
        }
      />
    </Routes>
  );
}
