const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { submitClaim, getClaimsQueue, updateClaimStatus, getMyPolicy } = require('../controllers/claimController');

router.post('/submit', auth, checkRole('hospital', 'policyholder'), submitClaim);
router.get('/my-policy', auth, checkRole('policyholder'), getMyPolicy);
router.get('/queue', auth, checkRole('hospital', 'officer', 'admin', 'policyholder'), getClaimsQueue);
router.patch('/:id/status', auth, checkRole('officer', 'admin'), updateClaimStatus);

module.exports = router;