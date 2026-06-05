const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const AuditLog = require('../models/AuditLog');
const { evaluateClaimRisk } = require('../services/fraudEngine');

exports.submitClaim = async (req, res) => {
  try {
    const { 
      patientName, policyNumber, treatmentType, 
      diagnosis, treatmentCost, dateOfTreatment 
    } = req.body;

    const supportingDocuments = req.files ? req.files.map(f => f.path) : [];

    console.log(`[ClaimController] Ingestion Request Received. Node: ${req.user.username}, Policy Number: ${policyNumber}, Files: ${supportingDocuments.length}`);

    let policy = await Policy.findOne({ policyNumber });
    
    if (!policy) {
      console.warn(`[ClaimController] Policy Lookup Failed: No active record found for identifier '${policyNumber}'`);
      
      if (req.user.role === 'policyholder') {
        console.log(`[ClaimController] Auto-provisioning emergency policy for policyholder: ${req.user.email}`);
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
    }

    if (!policy) {
      return res.status(404).json({ 
        success: false,
        message: 'Referenced policy configuration entity not found.',
        detail: `The system could not locate a policy matching node identifier '${policyNumber}'. Please verify your credentials or select a valid policy node.`
      });
    }

    console.log(`[ClaimController] Policy validated: ${policy._id}. Checking constraints...`);

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
      .populate('interactions.senderId', 'firstName lastName username')
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

exports.requestMoreInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, requestedDocumentTypes } = req.body;
    console.log(`[ClaimController] requestMoreInfo START. ID: ${id}, Sender: ${req.user?._id}`);

    const claim = await Claim.findById(id);
    if (!claim) {
      console.error(`[ClaimController] Claim NOT FOUND in DB for ID: ${id}`);
      return res.status(404).json({ message: 'Claim instance target entity missing.' });
    }

    console.log(`[ClaimController] Claim found: ${claim.claimNumber}. Updating status and history...`);
    claim.status = 'Information Requested';
    claim.interactions.push({
      type: 'request',
      senderId: req.user._id,
      message,
      requestedDocumentTypes: requestedDocumentTypes || []
    });

    await claim.save();
    console.log(`[ClaimController] Claim saved successfully.`);

    await AuditLog.create({
      userId: req.user._id,
      action: 'CLAIM_INFO_REQUESTED',
      resource: 'Claim',
      resourceId: claim._id,
      description: `Requested more info for ${claim.claimNumber}. Message: ${message}`,
      ipAddress: req.ip
    });

    return res.status(200).json({ message: 'Information request broadcasted.', claim });
  } catch (error) {
    console.error(`[ClaimController] requestMoreInfo FATAL ERROR:`, error);
    return res.status(500).json({ message: 'Failed to request more information.', error: error.message });
  }
};

exports.submitClaimResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const attachments = req.files ? req.files.map(f => f.path) : [];
    console.log(`[ClaimController] Info Submission Received for ${id}. Sender: ${req.user?._id}`);

    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ message: 'Claim instance target entity missing.' });

    claim.status = 'Information Submitted';
    claim.interactions.push({
      type: 'response',
      senderId: req.user._id,
      message,
      attachments
    });

    // Mark the last 'request' as replied
    const lastRequest = [...claim.interactions].reverse().find(i => i.type === 'request');
    if (lastRequest) {
      lastRequest.repliedAt = new Date();
    }

    // Also add attachments to supportingDocuments if they should be part of the main record
    if (attachments.length > 0) {
      claim.supportingDocuments = [...claim.supportingDocuments, ...attachments];
    }

    await claim.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CLAIM_INFO_SUBMITTED',
      resource: 'Claim',
      resourceId: claim._id,
      description: `Information submitted for ${claim.claimNumber}. Response: ${message}`,
      ipAddress: req.ip
    });

    console.log(`[ClaimController] Info Submission finalized for ${claim.claimNumber}`);
    return res.status(200).json({ message: 'Information submitted successfully.', claim });
  } catch (error) {
    console.error(`[ClaimController] SubmitClaimResponse Error:`, error);
    return res.status(500).json({ message: 'Failed to submit information.', error: error.message });
  }
};

exports.markInteractionReceived = async (req, res) => {
  try {
    const { claimId, interactionId } = req.params;
    const claim = await Claim.findById(claimId);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const interaction = claim.interactions.id(interactionId);
    if (!interaction) return res.status(404).json({ message: 'Interaction not found' });

    if (!interaction.receivedAt) {
      interaction.receivedAt = new Date();
      interaction.receivedBy = req.user._id;
      await claim.save();
    }

    return res.status(200).json({ message: 'Marked as received' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.markInteractionOpened = async (req, res) => {
  try {
    const { claimId, interactionId } = req.params;
    const claim = await Claim.findById(claimId);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const interaction = claim.interactions.id(interactionId);
    if (!interaction) return res.status(404).json({ message: 'Interaction not found' });

    if (!interaction.openedAt) {
      interaction.openedAt = new Date();
      await claim.save();
    }

    return res.status(200).json({ message: 'Marked as opened' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getCommunicationStats = async (req, res) => {
  try {
    const officerId = req.user._id;
    
    // Find claims where this officer has sent requests
    const claims = await Claim.find({
      'interactions': {
        $elemMatch: { type: 'request', senderId: officerId }
      }
    });

    let pendingReplies = 0;
    let newlyOpened = 0;
    let unresolved = 0;

    claims.forEach(claim => {
      const requests = claim.interactions.filter(i => i.type === 'request' && i.senderId.toString() === officerId.toString());
      const lastRequest = requests[requests.length - 1];

      if (lastRequest) {
        if (claim.status === 'Information Requested') {
          unresolved++;
          if (!lastRequest.repliedAt) {
            pendingReplies++;
          }
          if (lastRequest.openedAt && !lastRequest.repliedAt) {
            // This is subjective, let's say "newly opened" means opened but not replied
            newlyOpened++;
          }
        } else if (claim.status === 'Information Submitted') {
          // Awaiting Review
          unresolved++;
        }
      }
    });

    return res.status(200).json({ pendingReplies, newlyOpened, unresolved });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ status: 'active' }).select('policyNumber holderName coverageDetails');
    return res.status(200).json(policies);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve active policy configurations.', error: error.message });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const { policyNumber, holderName, maxLimit, eligibleTreatments, expiryDate } = req.body;

        const existing = await Policy.findOne({ policyNumber });
        if (existing) return res.status(400).json({ message: 'Policy identifier already exists in the cluster.' });

        const policy = new Policy({
          policyNumber,
          holderName,
          coverageDetails: {
            maxLimit,
            utilizedAmount: 0,
            eligibleTreatments: eligibleTreatments || []
          },
          expiryDate,
          status: 'active'
        });

        await policy.save();

        await AuditLog.create({
          userId: req.user._id,
          action: 'POLICY_PROVISIONING',
          resource: 'Policy',
          resourceId: policy._id,
          description: `New policy ${policyNumber} provisioned for ${holderName}. Limit: $${maxLimit}`,
          ipAddress: req.ip
        });

        return res.status(201).json({ message: 'Policy provisioned successfully.', policy });
      } catch (error) {
        return res.status(500).json({ message: 'Policy creation failure.', error: error.message });
      }
    };