import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import passport from "passport";
import UserModel from "../models/User.js";
import generateTokens from "../utils/generateTokens.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/auth/linkedin/callback`, // FIXED: Added BACKEND_URL
        scope: ["r_emailaddress", "r_liteprofile"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // check if user exists
          let user = await UserModel.findOne({ email: profile.emails[0].value });

          if (!user) {
            const randomPass = profile.id.slice(-6) + "!Li";
            const salt = await bcrypt.genSalt(Number(process.env.SALT));
            const hashedPassword = await bcrypt.hash(randomPass, salt);

            user = await UserModel.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              is_verified: true,
              password: hashedPassword,
            });
          }

          // generate tokens
          const { accessToken: at, refreshToken: rt, accessTokenExp, refreshTokenExp } =
            await generateTokens(user);

          return done(null, { user, accessToken: at, refreshToken: rt, accessTokenExp, refreshTokenExp });
        } catch (error) {
          return done(error);
        }
      }
    )
  );
} else {
  console.log("LinkedIn OAuth credentials not provided. LinkedIn authentication disabled.");
}