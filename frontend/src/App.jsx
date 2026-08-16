import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import BatchesPage from './pages/BatchesPage';

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
import ExpiringSoonPage from './pages/ExpiringSoonPage';
import BatchTracePage from './pages/BatchTracePage';
import SalesPage from './pages/SalesPage';

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
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="dashboard"
            element={<DashboardPage />}
          />

          <Route
            element={
              <ProtectedRoute
                roles={['admin', 'manager']}
              />
            }
          >
            <Route
              path="products"
              element={<ProductsPage />}
            />

            <Route
              path="/batches" 
              element={<BatchesPage />} 
            /> 

            <Route 
              path="/expiring-soon" 
              element={<ExpiringSoonPage />}
            />

            <Route 
              path="/batch-trace" 
              element={<BatchTracePage />} 
            />

            <Route 
              path="/sales" 
              element={<SalesPage />} 
            />

            <Route
              path="products/:id/edit"
              element={<EditProductPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute roles={['admin']} />
            }
          >
            <Route
              path="products/new"
              element={<AddProductPage />}
            />
          </Route>

          <Route
            path="inventory"
            element={<InventoryPage />}
          />

          <Route
            path="stock-movements"
            element={<StockMovementsPage />}
          />

          <Route
            path="scanner"
            element={<ScannerPage />}
          />

          <Route
            path="alerts"
            element={<AlertsPage />}
          />

          <Route
            element={
              <ProtectedRoute
                roles={['admin', 'manager']}
              />
            }
          >
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
          </Route>

          <Route
            element={
              <ProtectedRoute roles={['admin']} />
            }
          >
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
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
}