import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import sequelize from './db.js'; // Commented out
// import Election from './models/elections.js'; // Commented out
// import Candidate from './models/candidates.js'; // Commented out
// import User from './models/user.js'; // Commented out
import electionRoutes from './routes/election.js';
import userRoutes from './routes/user.js';
import checkLoggedIn from './middleware/checkLoggedIn.js';
import { EventEmitter } from 'events';

// Increase max listeners (review if necessary)
EventEmitter.defaultMaxListeners = 20;

dotenv.config();

const app = express();

// Log environment variables for debugging
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[REDACTED]' : 'undefined');

// // Database sync function
// const syncDatabase = async () => {
//   try {
//     console.log('Attempting to connect to database...');
//     await sequelize.authenticate();
//     console.log('Database connection established.');
//     await Election.sync();
//     await Candidate.sync();
//     await User.sync();
//     await sequelize.sync({ alter: true });
//     console.log('📦 Database synced');
//   } catch (err) {
//     console.error('❌ Database sync failed:', err.message, err.stack);
//     throw new Error(`Database sync failed: ${err.message}`);
//   }
// };

// // Initialize database
// (async () => {
//   try {
//     await syncDatabase();
//   } catch (err) {
//     console.error('❌ Failed to initialize app:', err.message, err.stack);
//     throw err;
//   }
// })();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/election', (req, res, next) => {
  console.log('Election route accessed:', req.method, req.url);
  checkLoggedIn(req, res, next);
});
app.use('/api/user', (req, res, next) => {
  console.log('User route accessed:', req.method, req.url);
  userRoutes(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health endpoint accessed');
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  res.status(200).json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
export default app;