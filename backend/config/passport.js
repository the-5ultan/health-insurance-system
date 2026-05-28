const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // FIX: Changed relative path to an absolute localhost URL matching Google Cloud Console
    callbackURL: "http://localhost:5000/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Find or create user based on email or googleId
            let user = await User.findOne({
                $or: [{ googleId: profile.id }, { email: profile.emails[0].value }]
            });

            if (user) {
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
                return done(null, user);
            }

            // Automatically register them if they don't exist
            // Inside backend/config/passport.js initialization block:
            user = new User({
                googleId: profile.id,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                profilePic: profile.photos && profile.photos[0] ? profile.photos[0].value : '', // Captures profile image
                termsAccepted: true
            });
            await user.save();
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

// This part converts the user profile record down to an ID string for the session cookie
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// FIXED: Modern asynchronous Promise syntax for Mongoose findById
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});