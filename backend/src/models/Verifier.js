const mongoose = require('mongoose');

const VerifierSchema = new mongoose.Schema(
  {
    verifierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    department: { type: String, required: true },
    email: { type: String },
    role: { type: String, default: 'verifier' },
  },
  { timestamps: true }
);

// Only one verifier per department
VerifierSchema.index({ department: 1 }, { unique: true });

module.exports = mongoose.model('Verifier', VerifierSchema);


