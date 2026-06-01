const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const AuditLog = require('../models/AuditLog');
const { evaluateClaimRisk } = require('../services/fraudEngine');

exports.submitClaim = async (req, res) => {
  try {
    const { 
      patientName, policyNumber, treatmentType, 
      diagnosis, treatmentCost, dateOfTreatment, supportingDocuments 
    } = req.body;

    let policy = await Policy.findOne({ policyNumber });
    if (!policy && req.user.role === 'policyholder') {
      // Auto-create a high-limit policy for the policyholder
      const fullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      policy = new Policy({
        policyNumber: policyNumber || ('POL-' + Math.floor(100000 + Math.random() * 900000)),
        holderName: fullName || req.user.username || req.user.email,
        coverageDetails: {
          maxLimit: 500000,
          utilizedAmount: 0,
          eligibleTreatments: ['Dental', 'Cardiology', 'Ophthalmology', 'Neurology', 'Surgery', 'General Consultation', 'PEDIATRICS', 'NEUROLOGY_OP']
        },
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        status: 'active'
      });
      await policy.save();
    }

    if (!policy) {
      return res.status(404).json({ message: 'Referenced policy configuration entity not found.' });
    }

    if (policy.status !== 'active' || new Date(policy.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Underlying policy constraint verification failed: State Expired/Inactive.' });
    }

    const isEligible = policy.coverageDetails.eligibleTreatments.some(
      t => t.toLowerCase() === treatmentType.toLowerCase()
    );
    if (!isEligible) {
      return res.status(400).json({ message: 'Target treatment type missing from policy coverage specifications.' });
    }

    const claimNumber = 'CLM-' + Math.floor(100000 + Math.random() * 900000);

    // Run the fraud engine calculation
    const riskAnalysis = await evaluateClaimRisk({
      policyId: policy._id,
      treatmentCost: Number(treatmentCost),
      supportingDocuments
    }, policy);

    // Ensure hospitalId is always populated with a valid User ObjectId (as it's a required field in Claim schema)
    let hospitalId = req.user.role === 'hospital' ? req.user._id : null;
    if (!hospitalId) {
      const User = require('../models/User');
      const hospitalNode = await User.findOne({ role: 'hospital' });
      if (hospitalNode) {
        hospitalId = hospitalNode._id;
      } else {
        const adminNode = await User.findOne({ role: 'admin' });
        hospitalId = adminNode ? adminNode._id : req.user._id;
      }
    }

    const newClaim = new Claim({
      claimNumber,
      patientName: patientName || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      policyId: policy._id,
      hospitalId,
      treatmentType,
      diagnosis,
      treatmentCost,
      dateOfTreatment,
      supportingDocuments,
      fraudScore: riskAnalysis.score,
      fraudRiskLevel: riskAnalysis.riskLevel,
      status: riskAnalysis.riskLevel === 'High' ? 'Under Review' : 'Pending Validation'
    });

    await newClaim.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CLAIM_CREATION',
      resource: 'Claim',
      resourceId: newClaim._id,
      description: `Claim ${claimNumber} generated. Risk Score Evaluation mapped: ${riskAnalysis.score}% (${riskAnalysis.riskLevel})`,
      ipAddress: req.ip
    });

    return res.status(201).json({ 
      message: 'Claim logged successfully.', 
      claim: newClaim,
      analysis: riskAnalysis 
    });

  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error processing claim.', error: error.message });
  }
};

exports.getClaimsQueue = async (req, res) => {
  try {
    let query = {};
    // Dynamic scoping based on user roles
    if (req.user.role === 'hospital') {
      query.hospitalId = req.user._id;
    } else if (req.user.role === 'policyholder') {
      const fullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      let policy = await Policy.findOne({ 
        $or: [
          { holderName: fullName },
          { holderName: req.user.username },
          { holderName: req.user.email }
        ]
      });
      if (!policy) {
        // Auto-provision policyholder policy if missing
        policy = new Policy({
          policyNumber: 'POL-' + Math.floor(100000 + Math.random() * 900000),
          holderName: fullName || req.user.username || req.user.email,
          coverageDetails: {
            maxLimit: 500000,
            utilizedAmount: 0,
            eligibleTreatments: ['Dental', 'Cardiology', 'Ophthalmology', 'Neurology', 'Surgery', 'General Consultation', 'PEDIATRICS', 'NEUROLOGY_OP']
          },
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
        await policy.save();
      }
      query.policyId = policy._id;
    }

    const claims = await Claim.find(query)
      .populate('policyId')
      .populate('hospitalId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.status(200).json(claims);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve claims queue context.', error: error.message });
  }
};

exports.getMyPolicy = async (req, res) => {
  try {
    const fullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
    let policy = await Policy.findOne({ 
      $or: [
        { holderName: fullName },
        { holderName: req.user.username },
        { holderName: req.user.email }
      ]
    });

    if (!policy) {
      // Auto-provision default policy for the policyholder
      policy = new Policy({
        policyNumber: 'POL-' + Math.floor(100000 + Math.random() * 900000),
        holderName: fullName || req.user.username || req.user.email,
        coverageDetails: {
          maxLimit: 500000,
          utilizedAmount: 0,
          eligibleTreatments: ['Dental', 'Cardiology', 'Ophthalmology', 'Neurology', 'Surgery', 'General Consultation', 'PEDIATRICS', 'NEUROLOGY_OP']
        },
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        status: 'active'
      });
      await policy.save();
    }

    return res.status(200).json(policy);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve policy details.', error: error.message });
  }
};

exports.updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, officerNotes } = req.body;

    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ message: 'Claim instance target entity missing.' });

    claim.status = status;
    if (officerNotes) claim.officerNotes = officerNotes;

    if (status === 'Approved') {
      const policy = await Policy.findById(claim.policyId);
      policy.coverageDetails.utilizedAmount += claim.treatmentCost;
      await policy.save();
    }

    await claim.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CLAIM_STATUS_MUTATION',
      resource: 'Claim',
      resourceId: claim._id,
      description: `Transitioned state to ${status}. Notes: ${officerNotes || 'None'}`,
      ipAddress: req.ip
    });

    return res.status(200).json({ message: 'Claim status updated successfully.', claim });
  } catch (error) {
    return res.status(500).json({ message: 'State machine mutation failure.', error: error.message });
  }
};