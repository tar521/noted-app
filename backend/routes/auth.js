const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// Passport Google Strategy Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    // This will be called when Google returns the profile
    return done(null, profile);
  }
));

// LOCAL REGISTER
router.post('/register', async (req, res) => {
  const { db } = req.app.locals;
  const { email, password, name } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  try {
    const existingUser = db.get("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 12);
    const { lastInsertRowid: userId } = db.run(
      "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
      [email, hash, name || email.split('@')[0]]
    );

    // Create default config for the new user
    const defaults = db.get("SELECT data FROM configuration_data WHERE user_id = (SELECT id FROM users WHERE email = ?) AND key_name = ?", ['default@noted.app', 'PRIORITY_LIST']);
    if (defaults) {
        // Simple clone of default user's config
        const configs = db.all("SELECT key_name, data FROM configuration_data WHERE user_id = (SELECT id FROM users WHERE email = ?)", ['default@noted.app']);
        configs.forEach(c => {
            // Use INSERT OR IGNORE in case data already exists for this ID
            db.run("INSERT OR IGNORE INTO configuration_data (user_id, key_name, data) VALUES (?, ?, ?)", [userId, c.key_name, c.data]);
        });
    }

    res.json({ success: true, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOCAL LOGIN
router.post('/login', async (req, res) => {
  const { db } = req.app.locals;
  const { email, password } = req.body;

  try {
    const user = db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GOOGLE OAUTH
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    const { db } = req.app.locals;
    const profile = req.user; // From passport
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const name = profile.displayName;
    const avatar = profile.photos[0]?.value;

    try {
      let user = db.get("SELECT * FROM users WHERE google_id = ? OR email = ?", [googleId, email]);

      if (!user) {
        // Create new OAuth user
        const { lastInsertRowid: userId } = db.run(
          "INSERT INTO users (email, google_id, name, avatar_url) VALUES (?, ?, ?, ?)",
          [email, googleId, name, avatar]
        );
        user = { id: userId, email, name };

        // Seed default config
        const configs = db.all("SELECT key_name, data FROM configuration_data WHERE user_id = (SELECT id FROM users WHERE email = ?)", ['default@noted.app']);
        configs.forEach(c => {
            db.run("INSERT INTO configuration_data (user_id, key_name, data) VALUES (?, ?, ?)", [userId, c.key_name, c.data]);
        });
      } else if (!user.google_id) {
        // Link existing local account to Google
        db.run("UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?", [googleId, avatar, user.id]);
      }

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      // Redirect back to frontend
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
    } catch (err) {
      console.error(err);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// RESET PASSWORD (Simple version for personal use)
router.post('/reset', async (req, res) => {
  const { db } = req.app.locals;
  const { email, newPassword } = req.body;

  if (!email || !newPassword) return res.status(400).json({ error: 'Missing email or new password' });

  try {
    const user = db.get("SELECT id FROM users WHERE email = ?", [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hash = await bcrypt.hash(newPassword, 12);
    db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// GET ME (Verify Session)
router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
