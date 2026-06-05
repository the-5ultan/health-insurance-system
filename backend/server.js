require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session'); 
const passport = require('passport');       
const claimRoutes = require('./routes/claimRoutes');
const authRoutes = require('./routes/auth'); 
const Session = require('./models/Session');

// Load Passport configurations
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;
const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

class MongoSessionStore extends session.Store {
  get(sid, callback) {
    Session.findById(sid)
      .lean()
      .then((record) => callback(null, record ? record.session : null))
      .catch(callback);
  }

  set(sid, sessionData, callback) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + THIRTY_DAYS);

    Session.findByIdAndUpdate(
      sid,
      { session: sessionData, expires },
      { upsert: true, setDefaultsOnInsert: true }
    )
      .then(() => callback(null))
      .catch(callback);
  }

  destroy(sid, callback) {
    Session.findByIdAndDelete(sid)
      .then(() => callback(null))
      .catch(callback);
  }

  touch(sid, sessionData, callback) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + THIRTY_DAYS);

    Session.findByIdAndUpdate(sid, { expires })
      .then(() => callback(null))
      .catch(callback);
  }
}

// Updated CORS middleware to handle cookies/credentials between Frontend & Backend
app.use(cors({ 
  origin: 'http://localhost:5173', 
  credentials: true 
}));

// Global Request Logger for debugging route issues
app.use((req, res, next) => {
  console.log(`[Incoming Request] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static('uploads'));

// Session Support (Required for Passport Google Strategy to preserve login status)
app.use(session({
  name: 'carezone.sid',
  store: new MongoSessionStore(),
  secret: process.env.SESSION_SECRET || 'carezone-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    maxAge: THIRTY_DAYS,
    sameSite: 'lax',
    secure: false
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Bind routes
app.use('/api/claims', claimRoutes);
app.use('/auth', authRoutes); 

// Root Global Central Error Middleware Layer
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Fatal structural middleware exception caught.' });
});

// Fallback connection string updated to standard port 27017, matching your mongo configurations
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carezone')
  .then(async () => {
    console.log('📦 Connected to MongoDB Engine');
    
    // FORCE INITIALIZATION: This builds the collections and indexes in the DB instantly
    const User = require('./models/User');
    const OTP = require('./models/OTP');
    
    await User.init();
    await OTP.init();
    await Session.init();

    const adminEmail = 'devsultan@sultan.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      existingAdmin.role = 'admin';
      existingAdmin.username = existingAdmin.username || 'devsultan';
      const adminPasswordMatches = await existingAdmin.comparePassword('sultanmsb');
      if (!adminPasswordMatches) existingAdmin.password = 'sultanmsb';
      await existingAdmin.save();
    } else {
      await User.create({
        firstName: 'Dev',
        lastName: 'Sultan',
        username: 'devsultan',
        email: adminEmail,
        password: 'sultanmsb',
        role: 'admin',
        termsAccepted: true
      });
    }
    console.log('✅ Database Models and Indexes synchronized successfully.');
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// PORT LISTENER BINDING: Fixes the ERR_CONNECTION_REFUSED bottleneck
app.listen(PORT, () => {
  console.log(`🚀 CareZone Backend Engine live on port ${PORT}`);
});
