// Load environment variables FIRST
require('dotenv').config();
console.log('✅ Environment variables loaded');

try {
  const express = require('express');
  console.log('✅ Express loaded');

  const cors = require('cors');
  console.log('✅ CORS loaded');

  const helmet = require('helmet');
  console.log('✅ Helmet loaded');

  const morgan = require('morgan');
  console.log('✅ Morgan loaded');

  const compression = require('compression');
  console.log('✅ Compression loaded');

  const rateLimit = require('express-rate-limit');
  console.log('✅ Rate limit loaded');

  // Import database connection
  const connectDB = require('./config/database');
  console.log('✅ Database config loaded');

  // Import routes
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded');

  const topicRoutes = require('./routes/topics');
  console.log('✅ Topic routes loaded');

  const predictionRoutes = require('./routes/predictions');
  console.log('✅ Prediction routes loaded');

  const adminRoutes = require('./routes/admin');
  console.log('✅ Admin routes loaded');

  const statisticsRoutes = require('./routes/statistics');
  console.log('✅ Statistics routes loaded');

  const predictionSyncRoutes = require('./routes/predictionSync');
  console.log('✅ Prediction sync routes loaded');

  const systemSettingsRoutes = require('./routes/systemSettings');
  console.log('✅ System settings routes loaded');

  const positionsRoutes = require('./routes/positions');
  console.log('✅ Positions routes loaded');

  // Import services
  const eventListener = require('./services/eventListener');
  console.log('✅ Event listener service loaded');

  // Import middleware
  const { errorHandler } = require('./middleware/errorHandler');
  console.log('✅ Error handler loaded');

  const app = express();
  console.log('✅ Express app created');

  // Connect to database asynchronously and start server after connection
  connectDB().then(async () => {
    console.log('✅ Database connected successfully');

    // Initialize event listener service - TEMPORARILY DISABLED
    try {
      console.log('⚠️ Event listener service disabled for testing dashboard');
      // await eventListener.initialize();
      // console.log('✅ Event listener service initialized');
    } catch (error) {
      console.error('❌ Event listener initialization failed:', error);
      // Continue without event listener for now
    }

    startServer();
  }).catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

  function startServer() {

  // Simple CORS for development
  app.use(cors({
    origin: '*',
    credentials: false
  }));
  console.log('✅ CORS configured');

  // Basic security with CORS-friendly config
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
  }));
  console.log('✅ Helmet configured');

  app.use(compression());
  console.log('✅ Compression configured');

  // Logging
  app.use(morgan('dev'));
  console.log('✅ Morgan configured');

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  console.log('✅ JSON parser configured');

  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  console.log('✅ URL encoder configured');

  // Serve static files (uploaded images) from PROJECT ROOT
  const path = require('path');
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
  console.log('✅ Static uploads folder configured');

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes configured');

  app.use('/api/topics', topicRoutes);
  console.log('✅ Topic routes configured');

  app.use('/api/predictions', predictionRoutes);
  console.log('✅ Prediction routes configured');

  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes configured');

  app.use('/api/statistics', statisticsRoutes);
  console.log('✅ Statistics routes configured');

  app.use('/api/prediction-sync', predictionSyncRoutes);
  console.log('✅ Prediction sync routes configured');

  app.use('/api/system-settings', systemSettingsRoutes);
  console.log('✅ System settings routes configured');

  app.use('/api/positions', positionsRoutes);
  console.log('✅ Positions routes configured');

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`,
    });
  });
  console.log('✅ 404 handler configured');

  // Error handling middleware
  app.use(errorHandler);
  console.log('✅ Error handler configured');

  const PORT = process.env.PORT || 3001;
  const HOST = '127.0.0.1';
  console.log('✅ Port configured:', PORT);

  const server = app.listen(PORT, HOST, () => {
    console.log(`
🚀 Server running on port ${PORT}
📁 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
🔗 Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}
    `);
    console.log('✅ Backend server successfully started and listening');
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });

  console.log('✅ Server listen called');

  } // End of startServer function

  module.exports = app;
} catch (error) {
  console.error('❌ Import error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
// restart trigger - force reload user positions routes
