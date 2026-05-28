const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }
});

// This prevent errors if you restart the server multiple times during dev
module.exports = mongoose.models.OTP || mongoose.model('OTP', OTPSchema);