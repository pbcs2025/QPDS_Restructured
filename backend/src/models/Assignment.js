const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    subject_code: { type: String, required: true, index: true, ref: 'Subject' },
    submit_date: { type: Date, required: true },
    assigned_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', AssignmentSchema);







