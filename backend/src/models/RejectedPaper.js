const mongoose = require('mongoose');

const RejectedPaperSchema = new mongoose.Schema(
  {
    // Reference to the original question paper record
    question_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionPaper', index: true },

    // Snapshot fields for quick querying without extra joins
    subject_code: { type: String, required: true, index: true },
    subject_name: { type: String },
    semester: { type: Number, required: true, index: true },
    set_name: { type: String },
    question_number: { type: String, required: true },
    question_text: { type: String },
    marks: { type: Number },
    file_name: { type: String },
    file_type: { type: String },

    // Verification context
    remarks: { type: String, default: '' },
    verified_by: { type: String, default: '' },
    verified_at: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RejectedPaper', RejectedPaperSchema);


