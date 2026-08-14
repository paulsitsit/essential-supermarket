import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import movementRoutes from './routes/stockMovement.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

import alertRoutes from './routes/alert.routes.js';
import expirationAlertRoutes from './routes/expirationAlert.routes.js';

import categoryRoutes from './routes/category.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import accountRoutes from './routes/account.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditRoutes from './routes/audit.routes.js';
import exportRoutes from './routes/export.routes.js';

import {
  apiLimiter,
  compressResponses
} from './middleware/security.js';

import {
  notFound,
  errorHandler
} from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);

// Allowed origins from env (comma-separated)
const allowedOrigins = (
  process.env.CLIENT_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl) if needed
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin is not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(compressResponses);
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'EssentialSupermarket API',
    database: app.get('databaseMode') || 'starting',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);

app.use('/api/products', productRoutes);

app.use(
  '/api/stock-movements',
  movementRoutes
);

app.use('/api/dashboard', dashboardRoutes);

// Low-stock alerts
app.use(
  '/api/low-stock-alerts',
  alertRoutes
);

// Expiration alerts
app.use(
  '/api/expiration-alerts',
  expirationAlertRoutes
);

app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports/export', exportRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;