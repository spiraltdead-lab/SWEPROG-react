require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET saknas i .env — servern startar inte');
}

// mysql2 pool — routes använder db.promise().query(...)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

db.query('SELECT 1', (err) => {
  if (err) {
    console.error('❌ Kunde inte ansluta till databasen:', err.message);
    process.exit(1);
  }
  console.log('✅ Databasanslutning OK');
});

app.locals.db = db;

const corsOptions = {
  origin: true, // speglar tillbaka Origin — tillåter alla (auth sköts med JWT, ej cookies)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes     = require('./src/routes/auth');
const projectRoutes  = require('./src/routes/projects');
const adminRoutes    = require('./src/routes/admin');
const contactRoutes  = require('./src/routes/contact');
const passwordRoutes = require('./src/routes/password');

app.use('/api/auth',     authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/contact',  contactRoutes);
app.use('/api/password', passwordRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route hittades inte: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('Ohanterat fel:', err);
  res.status(500).json({ error: 'Internt serverfel' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server körs på ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
});
