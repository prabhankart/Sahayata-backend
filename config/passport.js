import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export default function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        const googleEmail = profile.emails[0].value;
        const googleId = profile.id;

        try {
          // 1. Find user by their Google ID first
          let user = await User.findOne({ googleId: googleId });

          if (user) {
            // If user with Google ID exists, log them in
            return done(null, user);
          }

          // 2. If no user with Google ID, check if their email is already in use
          user = await User.findOne({ email: googleEmail });

          if (user) {
            // If email exists (from a manual signup), link the Google ID to that account
            user.googleId = googleId;
            await user.save();
            return done(null, user);
          }

          // 3. If no user is found by Google ID or email, create a new user
          const newUser = await User.create({
            googleId: googleId,
            name: profile.displayName,
            email: googleEmail,
          });
          return done(null, newUser);

        } catch (err) {
          console.error(err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
  });
}