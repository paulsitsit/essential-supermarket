import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

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

import { errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

const defaultAllowedOrigins = [
  // Capacitor Android and local development
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',

  // Vite development servers
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',

  // Other local development ports
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',

  // Production web applications
  'https://essential-supermarket.vercel.app',
  'https://essential-supermarket-pos.vercel.app'
];

const allowedOrigins = [
  ...new Set([
    ...defaultAllowedOrigins,
    ...(process.env.CLIENT_URL ?? '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  ])
];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header, such as curl,
    // server-to-server requests, and health checks.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    console.warn(`Blocked by CORS: ${origin}`);
    callback(null, false);
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
    'Accept',
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],

  optionsSuccessStatus: 204
};

app.use(helmet());

app.use(cors(corsOptions));

/*
 * Express 5-compatible wildcard route.
 * This handles browser preflight requests.
 */
app.options('/{*splat}', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(
  '/exports',
  express.static(path.join(__dirname, '../exports'))
);

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok'
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

app.use(errorHandler);

export default app;