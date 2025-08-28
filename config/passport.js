// config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Use: import configurePassport from './config/passport.js';  then configurePassport(passport)
export default function configurePassport(pass) {
  // Google OAuth strategy
  pass.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g. http://localhost:5000/api/auth/google/callback
      },
      // Verify callback
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const photo = profile.photos?.[0]?.value || '';
          const displayName = profile.displayName || (email ? email.split('@')[0] : 'User');

          // 1) Existing by googleId?
          let user = await User.findOne({ googleId });

          // 2) If not, link by email if account already exists
          if (!user && email) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = googleId;
              if (!user.avatar) user.avatar = photo;
              if (!user.name) user.name = displayName;
              await user.save();
            }
          }

          // 3) If still none, create
          if (!user) {
            user = await User.create({
              name: displayName,
              email,                 // may be undefined if Google didn’t return email (rare)
              googleId,
              avatar: photo,
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Sessions (safe even if you use session: false in routes)
  pass.serializeUser((user, done) => done(null, user.id));
  pass.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (e) {
      done(e);
    }
  });
}
