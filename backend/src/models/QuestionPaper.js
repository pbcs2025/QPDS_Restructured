const mongoose = require('mongoose');

const QuestionPaperSchema = new mongoose.Schema(
  {
    // Faculty identification
    facultyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    
    // Paper details
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },
    
    // Content stores exactly as submitted by Faculty (HTML or JSON)
    content: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true 
    },
    
    // Approval status
    status: { 
      type: String, 
      enum: ['submitted', 'approved', 'rejected'], 
      default: 'submitted',
      index: true
    },
    
    // Additional metadata
    subject_code: { type: String, index: true, ref: 'Subject' },
    subject_name: { type: String },
    department: { type: String, index: true },
    
    // Verification fields
    remarks: { type: String, default: '' },
    verified_by: { type: String },
    verified_at: { type: Date },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Index for faster lookups
QuestionPaperSchema.index({ facultyId: 1, title: 1 });

module.exports = mongoose.model('QuestionPaper', QuestionPaperSchema);







