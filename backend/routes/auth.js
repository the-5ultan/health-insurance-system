const express = require('express');
const router = express.Router();
const passport = require('passport');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const AuditLog = require('../models/AuditLog');
const Session = require('../models/Session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// Configure Multer for Profile Picture Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only images (JPG, PNG, WEBP) are supported."));
  }
});

const { 
  sendEmail, 
  getWelcomeTemplate, 
  getGoogleAuthTemplate, 
  getOTPTemplate,
  getRoleChangedTemplate,
  getRoleRequestDecisionTemplate
} = require('../services/emailService');
const RoleRequest = require('../models/RoleRequest');

const requireAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ success: false, message: 'Unauthorized.' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });
  return next();
};

const isProtectedSystemAccount = (user) => {
  const email = (user?.email || '').toLowerCase();
  return email.includes('devsultan');
};

/**
 * 1. DYNAMIC LOOKUP: Checks if email is taken in real-time while typing
 * Endpoint: POST /auth/check-email
 */
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email parameters required.' });

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    
    if (user) {
      if (user.googleId) {
        return res.json({ taken: true, type: 'google', message: 'Email already in use as a Google account.' });
      }
      return res.json({ taken: true, type: 'standard', message: 'Email already in use.' });
    }
    return res.json({ taken: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint: POST /auth/check-username
 * Real-time Instagram-style check
 */
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ available: false, message: 'Username is required.' });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Constraints validation
    if (cleanUsername.length < 3) {
      return res.json({ available: false, message: 'Minimum 3 characters required.' });
    }
    if (cleanUsername.length > 30) {
      return res.json({ available: false, message: 'Maximum 30 characters allowed.' });
    }
    if (/\s/.test(cleanUsername)) {
      return res.json({ available: false, message: 'Spaces are not allowed.' });
    }
    // Only allow letters, numbers, underscores, and periods
    if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
      return res.json({ available: false, message: 'Only letters, numbers, underscores, and periods are allowed.' });
    }

    // Exclude self if checking from edit profile (authenticated user)
    const query = { username: cleanUsername };
    if (req.isAuthenticated()) {
      query._id = { $ne: req.user._id };
    }

    const user = await User.findOne(query);
    if (user) {
      return res.json({ available: false, message: 'Username is already taken.' });
    }

    return res.json({ available: true, message: 'Username is available.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * 2. TRIGGER OTP: Generates a 6-digit verification code and emails it
 * Endpoint: POST /auth/send-otp
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email address missing.' });

    const cleanEmail = email.toLowerCase().trim();

    // Enforce one-email-one-account (across Google + standard)
    const existing = await User.findOne({ email: cleanEmail }).lean();
    if (existing) {
      const isGoogle = Boolean(existing.googleId);
      return res.status(409).json({
        success: false,
        type: isGoogle ? 'google' : 'standard',
        message: isGoogle
          ? 'This email is already registered with Google Sign-In. Please continue with Cloud Identity.'
          : 'Email already in use. Please log in instead.'
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`\n🔑 [DEV DEBUG] Active OTP Code generated for ${cleanEmail} is: ${otpCode}\n`);
    
    await OTP.deleteMany({ email: cleanEmail });
    const newOTP = new OTP({ email: cleanEmail, code: otpCode });
    await newOTP.save();

    await sendEmail(
      cleanEmail,
      'Verify Your Care Zone Security Token',
      getOTPTemplate(otpCode)
    );

    res.json({ success: true, message: 'OTP token pushed to user inbox.' });
  } catch (error) {
    console.error("❌ CRITICAL OTP ROUTE FAILURE:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. VALIDATE OTP ONLY: Verifies token code before collecting password
 * Endpoint: POST /auth/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpToken } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const cleanToken = otpToken ? otpToken.trim() : '';

    console.log("====== OTP VERIFICATION HANDSHAKE ======");
    const validToken = await OTP.findOne({ email: cleanEmail, code: cleanToken });
    if (!validToken) {
      return res.status(400).json({ success: false, message: "Invalid or expired authorization code token." });
    }

    // Issue a short-lived onboarding token for secure uploads before full auth
    const onboardingUploadToken = jwt.sign(
      { email: cleanEmail, purpose: 'onboarding-upload' },
      process.env.SESSION_SECRET || 'carezone-secret-key',
      { expiresIn: '20m' }
    );

    res.json({ success: true, message: "OTP identity validation certified.", onboardingUploadToken });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. FINALIZE SIGNUP: Validates passwords, saves the complete account, and auto-logs them in
 * Endpoint: POST /auth/finalize-signup
 */
router.post('/finalize-signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, gender, termsAccepted, password, otpToken, username, profilePic } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const cleanToken = otpToken ? otpToken.trim() : '';
    const cleanUsername = username ? username.trim() : '';

    if (!cleanUsername) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

    const usernameOwner = await User.findOne({ username: cleanUsername });
    if (usernameOwner) {
      return res.status(400).json({ success: false, message: "Username is already taken." });
    }

    const validToken = await OTP.findOne({ email: cleanEmail, code: cleanToken });
    if (!validToken) {
      return res.status(400).json({ success: false, message: "Session expired or invalid token validation signature." });
    }

    // Enforce one-email-one-account (race-safe with duplicate key handling below)
    const emailOwner = await User.findOne({ email: cleanEmail }).lean();
    if (emailOwner) {
      const isGoogle = Boolean(emailOwner.googleId);
      return res.status(409).json({
        success: false,
        type: isGoogle ? 'google' : 'standard',
        message: isGoogle
          ? 'This email is already registered with Google Sign-In. Please continue with Cloud Identity.'
          : 'Email already in use. Please log in instead.'
      });
    }

    await OTP.deleteOne({ _id: validToken._id });

    const newUser = new User({ 
      firstName, 
      lastName, 
      username: cleanUsername,
      email: cleanEmail, 
      password, 
      phone, 
      address, 
      gender, 
      termsAccepted,
      profilePic: profilePic || ''
    });
    
    await newUser.save();

    // Establish active session immediately on creation
    req.login(newUser, (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Auto-login establishment failure." });
      }

      // Send Welcome & Signup Confirmation Email (Async)
      sendEmail(
        newUser.email,
        'Welcome to Care Zone: Account Established',
        getWelcomeTemplate(newUser)
      );

      return res.status(201).json({ 
        success: true, 
        message: "Account created and logged in successfully!", 
        user: newUser 
      });
    });
  } catch (error) {
    console.error("❌ REGISTRATION FINALIZATION CRASH:", error);
    // Mongo unique index duplicate key safeguard
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ success: false, message: 'Email already in use. Please log in instead.' });
    }
    if (error?.code === 11000 && error?.keyPattern?.username) {
      return res.status(409).json({ success: false, message: 'Username is already taken.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 5. STANDARD LOGIN: Validates credentials and establishes user session
 * Endpoint: POST /auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please fill in all fields." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.json({ success: false, message: "Email or password is incorrect." });
    }
    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account is disabled. Contact a System Administrator." });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.json({ success: false, message: "Email or password is incorrect." });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Login session establishment failure." });
      }

      // Send Login Confirmation Email (Async)
      sendEmail(
        user.email,
        'Care Zone: Secure Login Notification',
        getWelcomeTemplate(user)
      );

      return res.json({ success: true, message: "Logged in successfully!", user });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6. STANDARD SESSIONS INTERACTION MANAGERS
 */
router.get('/current-user', (req, res) => { 
  if (req.isAuthenticated()) { 
    if (req.user?.isActive === false) {
      return req.logout(() => res.json({ loggedIn: false }));
    }
    res.json({ loggedIn: true, user: req.user }); 
  } else { 
    res.json({ loggedIn: false }); 
  } 
});

/**
 * ROLE REQUESTS: Submit a role application (optional)
 * Endpoint: POST /auth/role-requests
 */
router.post('/role-requests', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const { requestedRole, details } = req.body;

    const allowed = ['policyholder', 'hospital', 'officer'];
    if (!allowed.includes(requestedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid requested role.' });
    }

    // If already in that role, no-op
    if (req.user.role === requestedRole) {
      return res.json({ success: true, message: 'Already authorized for this role.' });
    }

    // One pending request per user
    const existingPending = await RoleRequest.findOne({ userId: req.user._id, status: 'Pending' });
    if (existingPending) {
      existingPending.requestedRole = requestedRole;
      existingPending.details = details || existingPending.details;
      await existingPending.save();
      return res.json({ success: true, request: existingPending });
    }

    const created = await RoleRequest.create({
      userId: req.user._id,
      requestedRole,
      details: details || ''
    });
    return res.json({ success: true, request: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ROLE REQUESTS: Get current user's latest role request
 * Endpoint: GET /auth/role-requests/me
 */
router.get('/role-requests/me', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const request = await RoleRequest.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, request: request || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/upload-profile-pic', upload.single('profilePic'), (req, res) => {
  try {
    // Allow authenticated uploads OR short-lived onboarding uploads
    const token = req.headers['x-onboarding-upload-token'];
    if (!req.isAuthenticated()) {
      if (!token) return res.status(401).json({ success: false, message: "Unauthorized." });
      try {
        const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'carezone-secret-key');
        if (!decoded?.email || decoded.purpose !== 'onboarding-upload') {
          return res.status(401).json({ success: false, message: "Unauthorized." });
        }
      } catch {
        return res.status(401).json({ success: false, message: "Session expired. Please try again." });
      }
    }
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });

    const fileUrl = `http://localhost:5000/uploads/profiles/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/complete-profile', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, message: "Unauthorized entry." });
    const { firstName, lastName, username, phone, address, gender, profilePic } = req.body;
    
    // Handle username changes
    const cleanUsername = username ? username.toLowerCase().trim() : '';
    if (cleanUsername) {
      // Constraints validation
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ success: false, message: "Username must be between 3 and 30 characters." });
      }
      if (/\s/.test(cleanUsername)) {
        return res.status(400).json({ success: false, message: "Username cannot contain spaces." });
      }
      if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
        return res.status(400).json({ success: false, message: "Username can only contain letters, numbers, underscores, and periods." });
      }

      const usernameOwner = await User.findOne({ username: cleanUsername, _id: { $ne: req.user._id } });
      if (usernameOwner) {
        return res.status(400).json({ success: false, message: "Username is already taken." });
      }
    }

    // Server-side validation of phone if provided
    if (phone) {
      const cleanPhone = phone.replace(/\s+/g, '');
      // Phone must have dialing code like +92, +1, +44, followed by numbers
      if (!/^\+(92|1|44)\d{10}$/.test(cleanPhone)) {
        return res.status(400).json({ success: false, message: "Invalid phone number format or length for the selected country." });
      }
    }

    const updatePayload = {
      phone,
      address,
      gender,
      profilePic: profilePic || ''
    };

    if (firstName !== undefined) updatePayload.firstName = firstName.trim();
    if (lastName !== undefined) updatePayload.lastName = lastName.trim();
    if (cleanUsername) updatePayload.username = cleanUsername;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updatePayload,
      { new: true, runValidators: true }
    );
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin/summary', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }

    const now = new Date();
    const [
      totalUsers,
      policyholders,
      admins,
      activeSessions,
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      highRiskClaims,
      totalPolicies,
      activePolicies,
      auditLogs,
      recentClaims
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'policyholder' }),
      User.countDocuments({ role: 'admin' }),
      Session.countDocuments({ expires: { $gt: now }, 'session.passport.user': { $exists: true } }),
      Claim.countDocuments(),
      Claim.countDocuments({ status: { $in: ['Pending Validation', 'Under Review', 'Information Requested'] } }),
      Claim.countDocuments({ status: 'Approved' }),
      Claim.countDocuments({ status: 'Rejected' }),
      Claim.countDocuments({ fraudRiskLevel: 'High' }),
      Policy.countDocuments(),
      Policy.countDocuments({ status: 'active' }),
      AuditLog.countDocuments(),
      Claim.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('claimNumber patientName treatmentCost status fraudRiskLevel createdAt')
        .lean()
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        policyholders,
        admins,
        activeSessions,
        totalClaims,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        highRiskClaims,
        totalPolicies,
        activePolicies,
        auditLogs
      },
      recentClaims
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ADMIN: List all users + role request snapshot
 * Endpoint: GET /auth/admin/users
 */
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('firstName lastName username email googleId profilePic role isActive updatedAt createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map(u => u._id);
    const pendingRequests = await RoleRequest.find({ userId: { $in: userIds }, status: 'Pending' })
      .sort({ createdAt: -1 })
      .lean();

    const pendingByUser = new Map();
    for (const r of pendingRequests) {
      if (!pendingByUser.has(String(r.userId))) pendingByUser.set(String(r.userId), r);
    }

    res.json({
      success: true,
      users: users.map(u => ({
        ...u,
        provider: u.googleId ? 'google' : 'email',
        roleRequest: pendingByUser.get(String(u._id)) || null
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ADMIN: Update a user's role directly
 * Endpoint: PUT /auth/admin/users/:userId/role
 */
router.put('/admin/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['policyholder', 'hospital', 'officer', 'admin'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (isProtectedSystemAccount(target)) {
      return res.status(403).json({ success: false, message: 'Protected system account cannot be modified.' });
    }

    const previousRole = target.role;
    target.role = role;
    await target.save();

    // Notify user (async; do not block success)
    sendEmail(
      target.email,
      'Care Zone: Role Authority Updated',
      getRoleChangedTemplate({
        user: target,
        previousRole,
        nextRole: role,
        reason: 'A System Administrator has updated your Care Zone role.'
      })
    );

    res.json({ success: true, user: target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ADMIN: Enable/disable user account
 * Endpoint: PUT /auth/admin/users/:userId/status
 */
router.put('/admin/users/:userId/status', requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (isProtectedSystemAccount(target)) {
      return res.status(403).json({ success: false, message: 'Protected system account cannot be modified.' });
    }
    target.isActive = Boolean(isActive);
    await target.save();

    sendEmail(
      target.email,
      'Care Zone: Account Status Updated',
      getRoleChangedTemplate({
        user: target,
        previousRole: target.role,
        nextRole: target.role,
        reason: target.isActive
          ? 'Your Care Zone account has been re-enabled. You may sign in and continue using authorized modules.'
          : 'Your Care Zone account has been disabled by a System Administrator. You will not be able to access the portal until re-enabled.'
      })
    );

    res.json({ success: true, user: target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ADMIN: Approve/reject a role request
 * Endpoint: POST /auth/admin/role-requests/:requestId/approve|reject
 */
router.post('/admin/role-requests/:requestId/approve', requireAdmin, async (req, res) => {
  try {
    const request = await RoleRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Role request not found.' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Role request is not pending.' });
    }

    const target = await User.findById(request.userId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (isProtectedSystemAccount(target)) {
      return res.status(403).json({ success: false, message: 'Protected system account cannot be modified.' });
    }

    const previousRole = target.role;
    request.status = 'Approved';
    await request.save();

    target.role = request.requestedRole;
    await target.save();

    sendEmail(
      target.email,
      'Care Zone: Role Request Approved',
      getRoleRequestDecisionTemplate({
        user: target,
        requestedRole: request.requestedRole,
        decision: 'Approved',
        adminNotes: request.adminNotes
      })
    );

    // Also send role-changed notification for clarity
    sendEmail(
      target.email,
      'Care Zone: Role Authority Updated',
      getRoleChangedTemplate({
        user: target,
        previousRole,
        nextRole: target.role,
        reason: 'Your role request was approved and your permissions have been updated.'
      })
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/role-requests/:requestId/reject', requireAdmin, async (req, res) => {
  try {
    const request = await RoleRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Role request not found.' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Role request is not pending.' });
    }

    const target = await User.findById(request.userId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (isProtectedSystemAccount(target)) {
      return res.status(403).json({ success: false, message: 'Protected system account cannot be modified.' });
    }

    request.status = 'Rejected';
    await request.save();

    sendEmail(
      target.email,
      'Care Zone: Role Request Rejected',
      getRoleRequestDecisionTemplate({
        user: target,
        requestedRole: request.requestedRole,
        decision: 'Rejected',
        adminNotes: request.adminNotes
      })
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 7. GOOGLE OAUTH ROUTES LAYER
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }), 
  (req, res) => { 
    // Send Google Auth Confirmation Email (Async)
    sendEmail(
      req.user.email,
      'Care Zone: Cloud Identity Connection Successful',
      getGoogleAuthTemplate(req.user)
    );

    if (!req.user.username) { 
      return res.redirect('http://localhost:5173/?view=onboarding'); 
    } 
    res.redirect('http://localhost:5173'); 
  }
);

router.get('/logout', (req, res, next) => { 
  req.logout((err) => { 
    if (err) return next(err); 
    res.redirect('http://localhost:5173'); 
  }); 
});

module.exports = router;
