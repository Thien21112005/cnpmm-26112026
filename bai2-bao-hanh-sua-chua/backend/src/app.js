import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { errorHandler } from './middleware/errorHandler.js';
import customerRoutes from './routes/customerRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';

export function createApp() {
  const app = express();
  const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5174';

  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      db: mongoose.connection.name || 'repair_center_db',
      readyState: mongoose.connection.readyState,
    });
  });

  app.use('/api/customers', customerRoutes);
  app.use('/api/technicians', technicianRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/tickets', ticketRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Không tìm thấy đường dẫn API.', code: 'NOT_FOUND' });
  });

  app.use(errorHandler);
  return app;
}
