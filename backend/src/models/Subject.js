const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema(
  {
    subject_code: { type: String, required: true, unique: true, index: true },
    subject_name: { type: String, required: true },
    department: { type: String, required: true },
    semester: { type: Number, required: true },
    credits: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', SubjectSchema);







