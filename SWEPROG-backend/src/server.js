const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware - dessa MÅSTE komma före routes
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// Globally handle CORS
app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 handler - ska vara SIST
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Något gick fel' });
});

// Starta server
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Databas synkroniserad');
    app.listen(PORT, () => {
      console.log(`🚀 Server körs på http://localhost:${PORT}`);
      console.log('📌 Tillgängliga endpoints:');
      console.log('   GET  /api/health');
      console.log('   POST /api/auth/login');
      console.log('   POST /api/auth/logout');
      console.log('   GET  /api/auth/me');
      // ... fler routes
    });
  })
  .catch(err => {
    console.error('❌ Kunde inte ansluta till databas:', err);
  });