const mongoose = require('mongoose');

const VerifierCorrectedQuestionsSchema = new mongoose.Schema(
  {
    // Reference to the original question paper record
    question_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionPaper', index: true },

    // Paper identification
    subject_code: { type: String, required: true, index: true },
    subject_name: { type: String },
    semester: { type: Number, required: true, index: true },
    department: { type: String, index: true },
    
    // Verifier corrections and remarks
    corrected_questions: [{
      question_number: { type: String, required: true },
      original_question_text: { type: String },
      corrected_question_text: { type: String },
      original_co: { type: String },
      corrected_co: { type: String },
      original_l: { type: String },
      corrected_l: { type: String },
      original_marks: { type: Number },
      corrected_marks: { type: Number },
      remarks: { type: String, default: '' },
      corrected_at: { type: Date, default: Date.now }
    }],

    // Verification context
    verifier_remarks: { type: String, default: '' },
    verified_by: { type: String, required: true },
    verified_at: { type: Date, default: Date.now },
    
    // Status tracking
    status: { 
      type: String, 
      enum: ['corrected', 'approved', 'rejected'], 
      default: 'corrected',
      index: true
    }
  },
  { timestamps: true }
);

// Index for faster lookups
VerifierCorrectedQuestionsSchema.index({ subject_code: 1, semester: 1 });
VerifierCorrectedQuestionsSchema.index({ verified_by: 1 });
VerifierCorrectedQuestionsSchema.index({ status: 1 });

module.exports = mongoose.model('VerifierCorrectedQuestions', VerifierCorrectedQuestionsSchema);
