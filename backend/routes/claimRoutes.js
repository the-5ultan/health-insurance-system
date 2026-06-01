const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const upload = require('../middleware/upload');
const { submitClaim, getClaimsQueue, updateClaimStatus, getMyPolicy, getPolicies, createPolicy } = require('../controllers/claimController');

router.post('/submit', auth, checkRole('hospital', 'policyholder'), upload.array('documents', 5), submitClaim);
router.post('/policies', auth, checkRole('admin'), createPolicy);
router.get('/policies', auth, checkRole('hospital', 'admin'), getPolicies);
router.get('/my-policy', auth, checkRole('policyholder'), getMyPolicy);
router.get('/queue', auth, checkRole('hospital', 'officer', 'admin', 'policyholder'), getClaimsQueue);
router.patch('/:id/status', auth, checkRole('officer', 'admin'), updateClaimStatus);

module.exports = router;