const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Verification', VerificationSchema);







