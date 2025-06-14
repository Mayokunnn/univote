import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './db.js';
import Election from './models/elections.js';
import Candidate from './models/candidates.js';
import User from './models/user.js';
import electionRoutes from './routes/election.js';
import userRoutes from './routes/user.js';
import checkLoggedIn from './middleware/checkLoggedIn.js';
import { EventEmitter } from 'events';

// Increase max listeners (review if necessary)
EventEmitter.defaultMaxListeners = 20;

dotenv.config();

const app = express();

// Log environment variables for debugging (remove DB_PASS log in production)
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[REDACTED]' : 'undefined');

// Database sync function
const syncDatabase = async () => {
  try {
    console.log('Attempting to connect to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');
    await Election.sync();
    await Candidate.sync();
    await User.sync();
    await sequelize.sync({ alter: true }); // Use { force: false } in production
    console.log('📦 Database synced');
  } catch (err) {
    console.error('❌ Database sync failed:', err.message, err.stack);
    throw new Error('Database initialization failed'); // Stop app if DB fails
  }
};

// Initialize database
(async () => {
  try {
    await syncDatabase();
  } catch (err) {
    console.error('❌ Failed to initialize app:', err.message, err.stack);
    process.exit(1); // Exit to ensure Vercel logs the error
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/election', checkLoggedIn, electionRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate(); // Test DB connection
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Health check failed:', err.message, err.stack);
    res.status(500).json({ status: 'ERROR', error: 'Database connection failed' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Disable local server in Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;