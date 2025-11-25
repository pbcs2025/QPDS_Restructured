const mongoose = require('mongoose');

const MbaDepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MbaDepartment', MbaDepartmentSchema, 'mbadepartments');
