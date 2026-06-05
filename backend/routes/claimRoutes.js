const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const upload = require('../middleware/upload');
const { 
  submitClaim, getClaimsQueue, updateClaimStatus, 
  getMyPolicy, getPolicies, createPolicy,
  requestMoreInfo, submitClaimResponse
} = require('../controllers/claimController');

// Debug Ping
router.get('/ping', (req, res) => res.json({ status: 'Claim Node Active', timestamp: new Date() }));

// Static Routes (Literal matches first)
router.post('/submit', auth, checkRole('hospital', 'policyholder'), upload.array('documents', 5), submitClaim);
router.post('/policies', auth, checkRole('admin'), createPolicy);
router.get('/policies', auth, checkRole('hospital', 'admin'), getPolicies);
router.get('/my-policy', auth, checkRole('policyholder'), getMyPolicy);
router.get('/queue', auth, checkRole('hospital', 'officer', 'admin', 'policyholder'), getClaimsQueue);

// Specific Parameterized Routes (Suffix matches)
router.post('/:id/request-info', auth, checkRole('officer', 'admin'), (req, res, next) => {
  console.log(`[ClaimRoutes] HIT: POST /api/claims/${req.params.id}/request-info`);
  next();
}, requestMoreInfo);

router.post('/:id/respond-info', auth, checkRole('hospital'), (req, res, next) => {
  console.log(`[ClaimRoutes] HIT: POST /api/claims/${req.params.id}/respond-info`);
  next();
}, upload.array('attachments', 5), submitClaimResponse);

// General Parameterized Routes
router.patch('/:id/status', auth, checkRole('officer', 'admin'), updateClaimStatus);

// Catch-all debugger for /api/claims/* - Using middleware to avoid path-to-regexp issues
router.use((req, res) => {
  console.warn(`[ClaimRoutes] 404 Catch-all reached: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: `Resource not found within claim node: ${req.originalUrl}`,
    hint: 'Verify the URL structure and request method.'
  });
});

module.exports = router;