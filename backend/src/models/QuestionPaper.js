const mongoose = require('mongoose');

const QuestionPaperSchema = new mongoose.Schema(
  {
    subject_code: { type: String, required: true, index: true, ref: 'Subject' },
    subject_name: { type: String, required: true },
    semester: { type: Number, required: true },
    set_name: { type: String, required: true },
    question_number: { type: String, required: true },
    question_text: { type: String, required: true },
    // Faculty-provided metadata
    marks: { type: Number, default: 0 },
    co: { type: String, default: '' },
    level: { type: String, default: '' },
    department: { type: String, index: true },
    file_name: { type: String },
    file_type: { type: String },
    question_file: { type: Buffer },
    // Verification fields
    approved: { type: Boolean, default: false },
    remarks: { type: String, default: '' },
    verified_by: { type: String, default: '' },
    verified_at: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// Ensure no duplicate questions
QuestionPaperSchema.index({ subject_code: 1, semester: 1, question_number: 1 }, { unique: true });

module.exports = mongoose.model('QuestionPaper', QuestionPaperSchema);







