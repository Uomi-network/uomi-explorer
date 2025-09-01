require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const tokenCache = require('./utils/tokenCache');

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const transactionRoutes = require('./routes/transactions');
const blockRoutes = require('./routes/blocks');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const tokensRoutes = require('./routes/tokensRoutes');
const addressTagsRoutes = require('./routes/addressTagsRoutes');

// Middleware imports
const { errorHandler } = require('./middleware/errorHandler');
const { 
  checkJwt, 
  loadUserProfile, 
  localAuthMiddleware 
} = require('./middleware/auth0');

// Initialize express app
const app = express();

// Set up security and utility middleware
app.use(helmet());
app.use(cors({
  origin: ['https://admin.explorer-finney.uomi.ai', 'https://admin.explorer.uomi.ai', 'http://localhost:3010'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use('/uploads', express.static('uploads'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to auth endpoints
app.use('/api/auth', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);

// Protected routes using Auth0 JWT validation
// First try Auth0 authentication, then fall back to local JWT if needed
// Aggiungiamo middleware di debug per ogni richiesta
const debugMiddleware = (req, res, next) => {
  console.log(`[DEBUG] Richiesta API: ${req.method} ${req.originalUrl}`);
  console.log(`[DEBUG] Auth header: ${req.headers.authorization ? 'Presente' : 'Assente'}`);
  next();
};

const authMiddleware = [debugMiddleware, checkJwt, loadUserProfile, localAuthMiddleware];
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/blocks', authMiddleware, blockRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/tokens', authMiddleware, tokensRoutes);
app.use('/api/address-tags', authMiddleware, addressTagsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 4000;

// Start the server
const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    logger.info('Token cache inizializzata - riduce le chiamate ad Auth0');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = app;
