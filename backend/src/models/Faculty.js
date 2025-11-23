const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema(
  {
    facultyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    department: { type: String, required: true },
    clgName: { type: String, required: true },
    contactNumber: { type: String },
    type: { type: String, enum: ['internal', 'external'], required: true },
    role: { type: String, default: "faculty" },
    verificationCode: { type: String },
    verificationCodeExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Index for faster lookups
FacultySchema.index({ email: 1 }, { unique: true });
FacultySchema.index({ facultyId: 1 }, { unique: true });

module.exports = mongoose.model('Faculty', FacultySchema);
