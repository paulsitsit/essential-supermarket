import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app.js';
import { closeDB, connectDB, getActiveDatabase } from './config/db.js';
import './models/Category.js';
import './models/Supplier.js';
import './models/Warehouse.js';
import './models/Notification.js';
import cors from 'cors';

// Allowed origins from env (comma-separated)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// Apply CORS to Express app
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', socket => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

async function start() {
  await connectDB({ target: 'auto' });

  app.set('databaseMode', getActiveDatabase());

  server.listen(port, () => {
    console.log(`API listening on port ${port}`);
    console.log(`Database mode: ${getActiveDatabase()}`);
  });
}

start().catch(error => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);
  io.close();

  server.close(async () => {
    await closeDB();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));