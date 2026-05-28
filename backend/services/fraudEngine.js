const Claim = require('../models/Claim');
const Policy = require('../models/Policy');

/**
 * Executes a deterministic algorithmic evaluation against claims
 * @param {Object} claimData - Unsaved target claim object instantiation
 * @returns {Object} { score: Number, riskLevel: String, triggers: Array }
 */
async function evaluateClaimRisk(claimData, targetPolicy) {
  let score = 0;
  const triggers = [];

  // Rule 1: High Cost Validation threshold checks
  if (claimData.treatmentCost > 50000) {
    score += 40;
    triggers.push('Cost threshold exceeded limit standard (>50,000)');
  } else if (claimData.treatmentCost > 20000) {
    score += 20;
    triggers.push('Elevated cost tier matching alert criteria (>20,000)');
  }

  // Rule 2: Check for remaining coverage space
  const theoreticalTotal = targetPolicy.coverageDetails.utilizedAmount + claimData.treatmentCost;
  if (theoreticalTotal > targetPolicy.coverageDetails.maxLimit) {
    score += 30;
    triggers.push('Total claims request outstrips total coverage allocation capacity');
  }

  // Rule 3: Frequency / Velocity analysis check
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const rapidClaimsCount = await Claim.countDocuments({
    policyId: claimData.policyId,
    createdAt: { $gte: oneMonthAgo }
  });

  if (rapidClaimsCount >= 3) {
    score += 35;
    triggers.push(`High frequency event detected: ${rapidClaimsCount} operations inside 30 days`);
  }

  // Rule 4: Critical Document Validation checks
  if (!claimData.supportingDocuments || claimData.supportingDocuments.length === 0) {
    score += 25;
    triggers.push('Missing structural binary artifacts or supporting documents');
  }

  // Risk stratification assignments
  let riskLevel = 'Low';
  if (score >= 60) riskLevel = 'High';
  else if (score >= 30) riskLevel = 'Medium';

  return { score: Math.min(score, 100), riskLevel, triggers };
}

module.exports = { evaluateClaimRisk };