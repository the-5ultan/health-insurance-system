const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
  claimNumber: { type: String, unique: true, required: true },
  patientName: { type: String, required: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  treatmentType: { type: String, required: true },
  diagnosis: { type: String, required: true },
  treatmentCost: { type: Number, required: true },
  dateOfTreatment: { type: Date, required: true },
  supportingDocuments: [{ type: String }], // URL paths to uploaded files
  status: { 
    type: String, 
    enum: ['Pending Validation', 'Under Review', 'Approved', 'Rejected', 'Information Requested', 'Information Submitted'], 
    default: 'Pending Validation' 
  },
  interactions: [{
    type: { type: String, enum: ['request', 'response'] },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    requestedDocumentTypes: [String],
    attachments: [String], // for hospital response files
    createdAt: { type: Date, default: Date.now }
  }],
  officerNotes: { type: String, default: '' },
  fraudScore: { type: Number, default: 0 },
  fraudRiskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' }
}, { timestamps: true });

ClaimSchema.index({ policyId: 1, status: 1 });
module.exports = mongoose.model('Claim', ClaimSchema);