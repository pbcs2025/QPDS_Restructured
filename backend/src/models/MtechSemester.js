const mongoose = require('mongoose');

const MtechSemesterSchema = new mongoose.Schema(
  {
    semesterNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MtechSemester', MtechSemesterSchema, 'mtechsemesters');
