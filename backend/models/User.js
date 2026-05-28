const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true, trim: true }, // sparse allows null values for standard signups initially
  firstName: { type: String, required: function() { return !this.googleId; }, trim: true },
  lastName: { type: String, required: function() { return !this.googleId; }, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: function() { return !this.googleId; } },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other', ''] },
  termsAccepted: { type: Boolean, default: false },
  googleId: { type: String, default: null },
  profilePic: { type: String, default: '' }, // Stores Google profile picture URL
  
  role: { type: String, enum: ['policyholder', 'hospital', 'officer', 'admin'], default: 'policyholder' },
  associatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'roleRef' },
  roleRef: { type: String, enum: ['Policy', 'Hospital'] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

UserSchema.pre('save', async function() {
  if (!this.password || !this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);