const mongoose = require('mongoose');

const RoleRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedRole: { 
    type: String, 
    enum: ['policyholder', 'hospital', 'officer'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  details: { type: String, trim: true },
  adminNotes: { type: String, trim: true }
}, { timestamps: true });

RoleRequestSchema.index({ userId: 1, requestedRole: 1, status: 1 });

module.exports = mongoose.models.RoleRequest || mongoose.model('RoleRequest', RoleRequestSchema);
