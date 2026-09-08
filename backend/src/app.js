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
import stockLedgerRoutes from './routes/stockLedger.routes.js';

// Import middleware
import { errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust Render's proxy. This is needed for secure deployments and
// middleware that checks the request IP/protocol behind the proxy.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

/*
 * CORS allowlist.
 *
 * Both web applications use the same Render API:
 * - Inventory management frontend
 * - POS frontend
 *
 * The POS origin must be present here or login preflight requests
 * will fail before they reach /api/auth/login.
 */
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',

  // Inventory management frontend
  'https://essential-supermarket.vercel.app',

  // Point-of-sale frontend
  'https://essential-supermarket-pos.vercel.app'
];

const corsOptions = {
  origin(origin, callback) {
    /*
     * No-Origin requests can come from Render health checks,
     * curl, Postman, native mobile clients, or server-to-server calls.
     */
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('Blocked by CORS:', origin);

    return callback(
      new Error(`Origin not allowed by CORS: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ],

  optionsSuccessStatus: 204
};

/*
 * Must appear before body parsing, authentication, and API routes.
 * The cors package automatically answers browser OPTIONS preflight
 * requests using the allowed origins above.
 */
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morgan('dev'));

// Static files for generated exports
app.use(
  '/exports',
  express.static(
    path.join(__dirname, '../exports')
  )
);

// API routes
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
app.use('/api/stock-ledger', stockLedgerRoutes);

// Health check for Render
app.get('/health', (req, res) => {
  res.json({
    status: 'ok'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Error handler must be last
app.use(errorHandler);

export default app;