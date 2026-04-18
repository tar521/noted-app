require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { init } = require('./db');

const app = express();
const PORT = 3001;

const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:5173', 
  'http://notes-app', 
  'http://10.238.137.13:3001',
  'http://10.238.137.13:5173',
  'http://10.238.137.13.sslip.io:3001', 
  'http://10.238.137.13.sslip.io:5173'
];

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('sslip.io')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// Serve the built Vite frontend
app.use(express.static(path.join(__dirname, 'public')));

// DB must be ready before routes are used
init().then(dbClient => {
  app.locals.db = dbClient;

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/folders', require('./routes/folders'));
  app.use('/api/notes', require('./routes/notes'));
  app.use('/api/todos', require('./routes/todos'));
  app.use('/api/activity', require('./routes/activity'));
  app.use('/api/config', require('./routes/config'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // SPA catch-all — must come after all API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Noted backend running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});