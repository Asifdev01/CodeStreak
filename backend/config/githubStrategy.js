import { Strategy as GitHubStrategy } from 'passport-github2';
import passport from 'passport';
import UserModel from '../models/User.js';
import generateTokens from '../utils/generateTokens.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/github/callback`,
    scope: ['user:email'] // Request access to user email
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('GitHub Profile:', profile);
      
      // Get the primary email from GitHub profile
      const primaryEmail = profile.emails.find(email => email.primary) || profile.emails[0];
      const email = primaryEmail.value;

      // Check if user already exists
      let user = await UserModel.findOne({ email });

      if (!user) {
        // Create new user with GitHub data
        const randomPass = profile.id.slice(-6) + '!Gh';
        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashedPassword = await bcrypt.hash(randomPass, salt);

        user = await UserModel.create({
          name: profile.displayName || profile.username,
          email: email,
          is_verified: true,
          password: hashedPassword,
        });
      }

      // Generate tokens
      const { accessToken: at, refreshToken: rt, accessTokenExp, refreshTokenExp } =
        await generateTokens(user);

      return done(null, { user, accessToken: at, refreshToken: rt, accessTokenExp, refreshTokenExp });
    } catch (error) {
      console.error('GitHub auth error:', error);
      return done(error);
    }
  }));
} else {
  console.log("GitHub OAuth credentials not provided. GitHub authentication disabled.");
}