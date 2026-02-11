import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3000);
const MONGODB_URI = process.env['MONGODB_URI'] as string;

if (!MONGODB_URI) {
  console.error(' MONGODB_URI is not set in .env');
  process.exit(1);
}

app.use(
  cors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200', 'https://smart-winnr-assignment.vercel.app'],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(' Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(` Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error(' MongoDB connection failed:', err.message);
    process.exit(1);
  });
