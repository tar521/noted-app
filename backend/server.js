const express = require('express');
const cors = require('cors');
const { init } = require('./db');

const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://notes-app'] }));
app.use(express.json());

// DB must be ready before routes are used
init().then(dbClient => {
  // Pass dbClient to routes via app.locals
  app.locals.db = dbClient;

  app.use('/api/folders', require('./routes/folders'));
  app.use('/api/notes', require('./routes/notes'));
  app.use('/api/todos', require('./routes/todos'));
  app.use('/api/activity', require('./routes/activity'));
  app.use('/api/config', require('./routes/config'))

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.listen(PORT, () => {
    console.log(`Noted backend running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
