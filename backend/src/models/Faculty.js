const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema(
  {
    facultyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    department: { type: String, required: true },
    clgName: { type: String, required: true },
    contactNumber: { type: String },
    type: { 
      type: String, 
      enum: ['internal', 'external'], 
      required: true,
      default: 'internal',
      validate: {
        validator: function(v) {
          return ['internal', 'external'].includes(v);
        },
        message: props => `${props.value} is not a valid faculty type. Must be 'internal' or 'external'`
      }
    },
    role: { type: String, default: "faculty" },
    verifierExpiresAt: { type: Date }, // For temporary verifier role assignment
    assignedSubjects: [{ type: String }], // Array of subject codes assigned to this faculty
    verificationCode: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { 
    timestamps: true,
    // Enable strict mode to prevent undefined fields from being saved
    strict: 'throw'
  }
);

// Pre-save hook to ensure type is always valid
FacultySchema.pre('save', function(next) {
  if (!this.type || !['internal', 'external'].includes(this.type)) {
    this.type = 'internal';
    console.warn(`Faculty ${this._id} (${this.email}) had invalid/missing type, set to 'internal'`);
  }
  next();
});

// Index for faster lookups
FacultySchema.index({ email: 1 }, { unique: true });
FacultySchema.index({ facultyId: 1 }, { unique: true });

module.exports = mongoose.model('Faculty', FacultySchema);
