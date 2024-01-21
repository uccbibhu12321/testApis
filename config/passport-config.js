// config/passportConfig.js

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Your User model
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const keys = require('./keys');
passport.use(new LocalStrategy({
    usernameField: 'emailOrMobileNo', // Use 'identifier' as the field for both email and mobileNo
    passwordField: 'password',
}, async (emailOrMobileNo, password, done) => {
    try {
        const user = await User.findOne({
            $or: [{ email: emailOrMobileNo }, { mobileNo: emailOrMobileNo }]
        });

        if (!user) {
            return done(null, false, { message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            return done(null, user);
        } else {
            return done(null, false, { message: 'Incorrect password' });
        }
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});
const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = keys.secretOrKey;

passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
    // Find the user by the ID in the JWT payload
    User.findById(jwt_payload.id)
        .then(user => {
            if (user) {
                return done(null, user);
            }
            return done(null, false);
        })
        .catch(err => console.error(err));
}));
module.exports = passport;
