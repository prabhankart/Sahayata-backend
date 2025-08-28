import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};

// Step 1: start OAuth; capture desired frontend in state
router.get('/google', (req, res, next) => {
  const allowed = getAllowedOrigins();

  // Prefer explicit ?redirect=..., else Origin header, else first allowed
  const qRedirect = req.query.redirect;
  const viaOrigin = req.headers.origin;
  let frontend = allowed[0] || 'http://localhost:5173';
  if (qRedirect && allowed.includes(qRedirect)) frontend = qRedirect;
  else if (viaOrigin && allowed.includes(viaOrigin)) frontend = viaOrigin;

  const state = Buffer.from(JSON.stringify({ frontend })).toString('base64url');

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state
  })(req, res, next);
});

// Step 2: handle callback; decode state and send user to the right frontend
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const allowed = getAllowedOrigins();

    let frontend = allowed[0] || 'http://localhost:5173';
    try {
      if (req.query.state) {
        const parsed = JSON.parse(Buffer.from(req.query.state, 'base64url').toString());
        if (parsed.frontend && allowed.includes(parsed.frontend)) frontend = parsed.frontend;
      }
    } catch { /* ignore */ }

    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const userString = JSON.stringify({ _id: req.user._id, name: req.user.name, email: req.user.email, token });

    res.redirect(`${frontend}/auth/success?user=${encodeURIComponent(userString)}`);
  }
);

export default router;
