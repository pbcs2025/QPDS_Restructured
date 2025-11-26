const mongoose = require('mongoose');

const MBAVerifierSchema = new mongoose.Schema(
  {
    verifierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Human-friendly display name for the verifier admin
    verifierName: { type: String },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    department: { type: String, required: true },
    email: { type: String },
    role: { type: String, default: 'mba-verifier' },
  },
  { timestamps: true }
);

// Allow multiple verifiers per department; keep username unique

module.exports = mongoose.models.MBAVerifier || mongoose.model('mbaverifiers', MBAVerifierSchema);

