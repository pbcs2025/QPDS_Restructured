const mongoose = require('mongoose');

const MBAAssignmentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    subject_code: { type: String, required: true, index: true, ref: 'MBASubject' },
    submit_date: { type: Date, required: true },
    assigned_at: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['pending', 'submitted', 'overdue'], 
      default: 'pending' 
    },
    submitted_at: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MBAAssignment || mongoose.model('MBAAssignment', MBAAssignmentSchema);

