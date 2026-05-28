const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema({
  policyNumber: { type: String, required: true, unique: true },
  holderName: { type: String, required: true },
  coverageDetails: {
    maxLimit: { type: Number, required: true },
    utilizedAmount: { type: Number, default: 0 },
    eligibleTreatments: [{ type: String }]
  },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Policy', PolicySchema);