const mongoose = require('mongoose');

const QuestionPaperSchema = new mongoose.Schema(
  {
    // Faculty identification (optional for backward compatibility)
    facultyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      index: true
    },
    
    // Paper details (optional for backward compatibility)
    title: { 
      type: String, 
      trim: true 
    },
    
    // Content stores exactly as submitted by Faculty (HTML or JSON) - optional
    content: { 
      type: mongoose.Schema.Types.Mixed
    },
    
    // Question paper fields (used by faculty submission)
    subject_code: { type: String, required: true },
    subject_name: { type: String, required: true },
    semester: { type: Number, required: true },
    question_number: { type: String, required: true },
    question_text: { type: String, required: true },
    co: { type: String, default: '' },
    level: { type: String, default: '' },
    marks: { type: Number, default: 0 },
    set_name: { type: String, default: 'Set1' },
    department: { type: String },
    
    // File attachments
    file_name: { type: String },
    file_type: { type: String },
    question_file: { type: Buffer },
    
    // Approval status
    status: { 
      type: String, 
      enum: ['submitted', 'pending', 'approved', 'rejected'], 
      default: 'pending'
    },
    
    // Verification fields
    remarks: { type: String, default: '' },
    verified_by: { type: String },
    verified_at: { type: Date },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Index for faster lookups
QuestionPaperSchema.index({ subject_code: 1, semester: 1, question_number: 1 });
QuestionPaperSchema.index({ department: 1 });
QuestionPaperSchema.index({ status: 1 });

module.exports = mongoose.model('QuestionPaper', QuestionPaperSchema);







