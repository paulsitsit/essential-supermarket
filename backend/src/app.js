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
import salesRoutes from './routes/sales.routes.js';
import batchRoutes from './routes/batch.routes.js';
import pushRoutes from './routes/push.routes.js';
import returnsRoutes from './routes/returns.routes.js';
import quarantineRoutes from './routes/quarantine.routes.js';

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

/*
 * CLIENT_URL can contain multiple comma-separated domains.
 *
 * Render environment variable example:
 * CLIENT_URL=https://essential-supermarket.vercel.app
 *
 * For previews or additional frontend deployments:
 * CLIENT_URL=https://essential-supermarket.vercel.app,https://your-preview.vercel.app
 */
const allowedOrigins = [
  ...(
    process.env.CLIENT_URL ||
    'http://localhost:5173'
  )
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),

  'http://localhost:5173',
  'http://localhost:3000',
  'https://localhost',
  'http://localhost'
];

const corsOptions = {
  origin(origin, callback) {
    /*
     * Allow requests without an Origin header:
     * - curl/Postman
     * - server-to-server calls
     * - some Capacitor/mobile requests
     */
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`Blocked CORS request from origin: ${origin}`);

    return callback(
      new Error(`Origin is not allowed by CORS: ${origin}`)
    );
  },

  /*
   * PATCH is required for:
   * PATCH /api/quarantine/:id/dispose
   * PATCH /api/quarantine/:id/returnToSupplier
   * PATCH /api/quarantine/:id/release
   */
  methods: [
    'GET',
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

  credentials: true,

  optionsSuccessStatus: 204
};

/*
 * Must come before every API route.
 * This adds the CORS headers for normal API requests.
 */
app.use(cors(corsOptions));

/*
 * Explicitly handles browser preflight OPTIONS requests.
 * PATCH requests with Authorization headers trigger preflight.
 *
 * Use a RegExp instead of '*' for Express compatibility.
 */
app.options(/.*/, cors(corsOptions));

app.use(helmet());

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

app.use(
  '/api/low-stock-alerts',
  alertRoutes
);

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

app.use('/api/sales', salesRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/push', pushRoutes);

app.use('/api/returns', returnsRoutes);
app.use('/api/quarantine', quarantineRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;