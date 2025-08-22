import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

// @desc    Auth with Google
// @route   GET /api/auth/google
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'], 
    prompt: 'select_account' // This line forces the account chooser
}));

// @desc    Google auth callback
// @route   GET /api/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Successful authentication, generate a token
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    // Redirect back to the frontend with the user data and token
    const userString = JSON.stringify({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        token: token
    });
    res.redirect(`http://localhost:5173/auth/success?user=${encodeURIComponent(userString)}`);
  }
);

export default router;