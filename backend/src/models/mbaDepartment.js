const mongoose = require('mongoose');

const MBADepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#6c757d' }, // Default gray color
  },
  { timestamps: true }
);

module.exports = mongoose.models.MBADepartment || mongoose.model('MBADepartment', MBADepartmentSchema);

