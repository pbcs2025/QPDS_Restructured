const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, index: true },
    clgName: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    email: { type: String, required: true, unique: true, lowercase: true },
    phoneNo: { type: String },
    password: { type: String, required: true },
    usertype: { type: String, enum: ['internal', 'external', 'admin', 'superadmin'], required: true },
    role: { type: String, enum: ['Faculty', 'Admin', 'SuperAdmin'], default: 'Faculty' },
    verificationCode: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);


