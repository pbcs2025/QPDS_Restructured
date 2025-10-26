const QuestionPaper = require('../models/QuestionPaper');
const ArchivedPaper = require('../models/ArchivedPaper');
const mongoose = require('mongoose');

/**
 * Save a new question paper
 * POST /api/papers
 * Saves paper with facultyId, title, content, status='submitted'
 */
exports.createPaper = async (req, res) => {
  try {
    const { facultyId, title, content } = req.body;

    // Validate required fields
    if (!facultyId || !title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: facultyId, title, and content are required' 
      });
    }

    // Determine department from authenticated user or request body
    const resolvedDepartment = (req.user && (req.user.department || req.user.dept || req.user.departmentName)) 
      || req.body.department 
      || '';

    // Create new paper with submitted status
    const newPaper = new QuestionPaper({
      facultyId,
      title,
      content,
      status: 'submitted',
      // Optional fields if provided
      subject_code: req.body.subject_code,
      subject_name: req.body.subject_name,
      department: resolvedDepartment
    });

    // Save to database
    const savedPaper = await newPaper.save();
    console.log(`New question paper created: ${savedPaper._id} by faculty ${facultyId}`);

    // Return saved paper with 201 Created status
    return res.status(201).json({
      success: true,
      message: 'Question paper created successfully',
      paper: savedPaper
    });
  } catch (error) {
    console.error('Error creating question paper:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating question paper',
      error: error.message
    });
  }
};

/**
 * Get all submitted papers
 * GET /api/papers
 * Returns all papers with status='submitted'
 */
exports.getSubmittedPapers = async (req, res) => {
  try {
    console.log('Fetching submitted papers...');
    
    // Apply filters if provided in query params
    const filter = { 
      $or: [
        { status: 'submitted' },
        { status: 'pending' }
      ]
    };
    if (req.query.department) {
      filter.department = req.query.department;
      console.log(`Filtering by department: ${req.query.department}`);
    }
    if (req.query.semester) {
      filter.semester = req.query.semester;
      console.log(`Filtering by semester: ${req.query.semester}`);
    }
    
    // Query for papers with submitted or pending status
    const papers = await QuestionPaper.find(filter)
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate('facultyId', 'name email department') // Get faculty details
      .lean();

    console.log(`Retrieved ${papers.length} submitted papers`);

    return res.status(200).json({
      success: true,
      count: papers.length,
      papers
    });
  } catch (error) {
    console.error('Error fetching submitted papers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching submitted papers',
      error: error.message
    });
  }
};

/**
 * Get a specific paper by ID
 * GET /api/papers/:id
 */
exports.getPaperById = async (req, res) => {
  try {
    const paperId = req.params.id;
    
    const paper = await QuestionPaper.findById(paperId)
      .populate('facultyId', 'name email department')
      .lean();
    
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      paper
    });
  } catch (error) {
    console.error(`Error fetching paper ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching paper',
      error: error.message
    });
  }
};

/**
 * Archive a question paper
 * POST /api/papers/archive
 * Moves paper to ArchivedPaper collection
 */
exports.archivePaper = async (req, res) => {
  try {
    const { subject_code, semester, archived_by } = req.body;
    
    if (!subject_code || !semester) {
      return res.status(400).json({
        success: false,
        message: 'subject_code and semester are required'
      });
    }

    // Find all questions for this paper
    const questions = await QuestionPaper.find({ 
      subject_code, 
      semester: parseInt(semester) 
    }).lean();

    if (!questions || questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create archived paper records for each question
      const archivedPapers = questions.map(question => {
        return new ArchivedPaper({
          question_ref: question._id,
          subject_code: question.subject_code,
          subject_name: question.subject_name,
          semester: question.semester,
          department: question.department,
          question_number: question.question_number,
          question_text: question.question_text,
          marks: question.marks,
          co: question.co,
          level: question.level,
          file_name: question.file_name,
          file_type: question.file_type,
          remarks: question.remarks,
          verified_by: question.verified_by,
          verified_at: question.verified_at,
          archived_by: archived_by || 'Super Admin',
          archived_at: new Date()
        });
      });

      // Insert all archived papers
      await ArchivedPaper.insertMany(archivedPapers, { session });

      // Update original questions status to archived
      await QuestionPaper.updateMany(
        { subject_code, semester: parseInt(semester) },
        { 
          $set: { 
            status: 'archived',
            archived_by: archived_by || 'Super Admin',
            archived_at: new Date()
          } 
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: 'Paper archived successfully',
        archivedCount: archivedPapers.length
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error archiving paper:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while archiving paper',
      error: error.message
    });
  }
};

/**
 * Restore an archived paper
 * POST /api/papers/restore
 * Moves paper back from ArchivedPaper collection
 */
exports.restorePaper = async (req, res) => {
  try {
    const { subject_code, semester } = req.body;
    
    if (!subject_code || !semester) {
      return res.status(400).json({
        success: false,
        message: 'subject_code and semester are required'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find archived papers
      const archivedPapers = await ArchivedPaper.find({ 
        subject_code, 
        semester: parseInt(semester) 
      }).lean();

      if (!archivedPapers || archivedPapers.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Archived paper not found'
        });
      }

      // Update original questions status back to approved
      await QuestionPaper.updateMany(
        { subject_code, semester: parseInt(semester) },
        { 
          $set: { 
            status: 'approved',
            $unset: { archived_by: 1, archived_at: 1 }
          } 
        },
        { session }
      );

      // Remove from archived papers
      await ArchivedPaper.deleteMany(
        { subject_code, semester: parseInt(semester) },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: 'Paper restored successfully',
        restoredCount: archivedPapers.length
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error restoring paper:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while restoring paper',
      error: error.message
    });
  }
};

/**
 * Get all archived papers
 * GET /api/papers/archived
 */
exports.getArchivedPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;
    
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester, 10);
    
    const archivedPapers = await ArchivedPaper.find(filter)
      .sort({ archived_at: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: archivedPapers.length,
      papers: archivedPapers
    });
  } catch (error) {
    console.error('Error fetching archived papers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching archived papers',
      error: error.message
    });
  }
};