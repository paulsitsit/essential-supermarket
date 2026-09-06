import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import alertRoutes from './routes/alert.routes.js';
import auditRoutes from './routes/audit.routes.js';
import batchRoutes from './routes/batch.routes.js';
import categoryRoutes from './routes/category.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import expirationAlertRoutes from './routes/expirationAlert.routes.js';
import exportRoutes from './routes/export.routes.js';
import productRoutes from './routes/product.routes.js';
import pushRoutes from './routes/push.routes.js';
import quarantineRoutes from './routes/quarantine.routes.js';
import reportRoutes from './routes/report.routes.js';
import returnsRoutes from './routes/returns.routes.js';
import salesRoutes from './routes/sales.routes.js';
import stockMovementRoutes from './routes/stockMovement.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import stockLedgerRoutes from './routes/stockLedger.routes.js'; // ADD THIS

// Import middleware
import { errorHandler } from './middleware/error.js';
import { protect } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // <-- app must be initialized BEFORE using it

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Static files for exports
app.use('/exports', express.static(path.join(__dirname, '../exports')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expiration-alerts', expirationAlertRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/quarantine', quarantineRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stock-ledger', stockLedgerRoutes); // ADD THIS LINE

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;