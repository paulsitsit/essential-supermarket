import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';

import app from './app.js';

import {
  closeDB,
  connectDB,
  getActiveDatabase
} from './config/db.js';

import {
  runDailyExpirationAlertSync
} from './services/expirationAlert.service.js';

import './models/Category.js';
import './models/Supplier.js';
import './models/Warehouse.js';
import './models/Notification.js';
import './models/ExpirationAlert.js';

const port = process.env.PORT || 5000;

const server = http.createServer(app);

/*
 * Socket.IO needs its own CORS configuration.
 *
 * Express HTTP CORS is configured in app.js.
 * Keep CLIENT_URL in Render as a comma-separated list:
 *
 * CLIENT_URL=https://essential-supermarket.vercel.app,https://essential-supermarket-pos.vercel.app
 */
const socketAllowedOrigins = (
  process.env.CLIENT_URL ||
  [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://essential-supermarket.vercel.app',
    'https://essential-supermarket-pos.vercel.app'
  ].join(',')
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: socketAllowedOrigins,
    methods: [
      'GET',
      'POST'
    ],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', socket => {
  console.log(
    `Socket connected: ${socket.id}`
  );

  socket.on('disconnect', () => {
    console.log(
      `Socket disconnected: ${socket.id}`
    );
  });
});

let expirationSyncRunning = false;

async function runExpirationSyncSafely(
  trigger
) {
  if (expirationSyncRunning) {
    console.log(
      `Expiration sync skipped (${trigger}): a previous sync is still running.`
    );

    return;
  }

  expirationSyncRunning = true;

  try {
    console.log(
      `Starting expiration sync (${trigger})...`
    );

    await runDailyExpirationAlertSync(io);
  } catch (error) {
    console.error(
      `Expiration sync failed (${trigger}):`,
      error
    );
  } finally {
    expirationSyncRunning = false;
  }
}

/*
 * Daily schedule: 6:00 AM Philippine time.
 *
 * node-cron format:
 * minute hour day-of-month month day-of-week
 */
function startExpirationScheduler() {
  cron.schedule(
    '0 6 * * *',
    () => {
      runExpirationSyncSafely('daily-schedule');
    },
    {
      timezone:
        process.env.EXPIRATION_ALERT_TIMEZONE ||
        'Asia/Manila'
    }
  );

  console.log(
    'Expiration scheduler registered: daily at 06:00 Asia/Manila.'
  );

  /*
   * Catch-up scan after application startup.
   * This ensures alerts are refreshed following a deploy/restart.
   */
  setTimeout(() => {
    runExpirationSyncSafely('startup-catch-up');
  }, 10_000);
}

async function start() {
  await connectDB({
    target: 'auto'
  });

  app.set(
    'databaseMode',
    getActiveDatabase()
  );

  startExpirationScheduler();

  server.listen(port, () => {
    console.log(
      `API listening on port ${port}`
    );

    console.log(
      `Database mode: ${getActiveDatabase()}`
    );
  });
}

start().catch(error => {
  console.error(
    'Server startup failed:',
    error.message
  );

  process.exit(1);
});

async function shutdown(signal) {
  console.log(
    `${signal} received. Closing server...`
  );

  io.close();

  server.close(async () => {
    await closeDB();

    process.exit(0);
  });
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});