const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  session: { type: mongoose.Schema.Types.Mixed, required: true },
  expires: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

module.exports = mongoose.models.Session || mongoose.model('Session', SessionSchema);
