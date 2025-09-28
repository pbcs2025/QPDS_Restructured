const mongoose = require('mongoose');

const QuestionPaperSchema = new mongoose.Schema(
  {
    subject_code: { type: String, required: true, index: true, ref: 'Subject' },
    subject_name: { type: String, required: true },
    semester: { type: Number, required: true },
    question_number: { type: Number, required: true },
    question_text: { type: String, required: true },
    file_name: { type: String },
    file_type: { type: String },
    question_file: { type: Buffer },
  },
  { timestamps: true }
);

QuestionPaperSchema.index({ subject_code: 1, semester: 1, question_number: 1 }, { unique: true });

module.exports = mongoose.model('QuestionPaper', QuestionPaperSchema);







