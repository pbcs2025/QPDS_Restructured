const mongoose = require('mongoose');

const MbaSemesterSchema = new mongoose.Schema(
  {
    semesterNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MbaSemester', MbaSemesterSchema, 'mbasemesters');
