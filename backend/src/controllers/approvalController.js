const QuestionPaper = require('../models/QuestionPaper');
const ApprovedPaper = require('../models/ApprovedPaper');
const RejectedPaper = require('../models/RejectedPaper');
const mongoose = require('mongoose');

/**
 * Approve a question paper
 * PUT /api/papers/:id/approve
 * Copies paper to ApprovedPaper collection and updates status
 */
exports.approvePaper = async (req, res) => {
  try {
    const paperId = req.params.id;
    const { approvedBy } = req.body;
    
    console.log(`Approving paper ID: ${paperId} by ${approvedBy}`);

    if (!approvedBy) {
      console.error('Missing approvedBy field in request');
      return res.status(400).json({
        success: false,
        message: 'approvedBy field is required'
      });
    }

    // Find the paper to approve
    const paper = await QuestionPaper.findById(paperId);
    if (!paper) {
      console.error(`Paper with ID ${paperId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Question paper not found'
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create approved paper record
      const approvedPaper = new ApprovedPaper({
        question_ref: paper._id,
        subject_code: paper.subject_code,
        subject_name: paper.subject_name,
        department: paper.department,
        // Copy the content exactly as submitted
        content: paper.content,
        title: paper.title,
        verified_by: approvedBy,
        verified_at: new Date(),
        approved_at: new Date()
      });

      // Save approved paper
      await approvedPaper.save({ session });

      // Update original paper status
      paper.status = 'approved';
      paper.verified_by = approvedBy;
      paper.verified_at = new Date();
      await paper.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`Paper ${paperId} approved by ${approvedBy}`);

      return res.status(200).json({
        success: true,
        message: 'Paper approved successfully',
        paper: paper
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error approving paper:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while approving paper',
      error: error.message
    });
  }
};

/**
 * Reject a question paper
 * PUT /api/papers/:id/reject
 * Copies paper to RejectedPaper collection and updates status
 */
exports.rejectPaper = async (req, res) => {
  try {
    const paperId = req.params.id;
    const { rejectedBy, rejectReason } = req.body;

    if (!rejectedBy) {
      return res.status(400).json({
        success: false,
        message: 'rejectedBy field is required'
      });
    }

    // Find the paper to reject
    const paper = await QuestionPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found'
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create rejected paper record
      const rejectedPaper = new RejectedPaper({
        question_ref: paper._id,
        subject_code: paper.subject_code,
        subject_name: paper.subject_name,
        department: paper.department,
        // Copy the content exactly as submitted
        content: paper.content,
        title: paper.title,
        remarks: rejectReason || '',
        verified_by: rejectedBy,
        verified_at: new Date(),
        rejected_at: new Date()
      });

      // Save rejected paper
      await rejectedPaper.save({ session });

      // Update original paper status
      paper.status = 'rejected';
      paper.remarks = rejectReason || '';
      paper.verified_by = rejectedBy;
      paper.verified_at = new Date();
      await paper.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`Paper ${paperId} rejected by ${rejectedBy}`);

      return res.status(200).json({
        success: true,
        message: 'Paper rejected successfully',
        paper: paper
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error rejecting paper:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while rejecting paper',
      error: error.message
    });
  }
};

/**
 * Get all approved papers
 * GET /api/approvedpapers
 */
exports.getApprovedPapers = async (req, res) => {
  try {
    const approvedPapers = await ApprovedPaper.find()
      .sort({ approved_at: -1 })
      .lean();

    console.log(`Retrieved ${approvedPapers.length} approved papers`);

    return res.status(200).json({
      success: true,
      count: approvedPapers.length,
      papers: approvedPapers
    });
  } catch (error) {
    console.error('Error fetching approved papers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching approved papers',
      error: error.message
    });
  }
};

/**
 * Get all rejected papers
 * GET /api/rejectedpapers
 */
exports.getRejectedPapers = async (req, res) => {
  try {
    const rejectedPapers = await RejectedPaper.find()
      .sort({ rejected_at: -1 })
      .lean();

    console.log(`Retrieved ${rejectedPapers.length} rejected papers`);

    return res.status(200).json({
      success: true,
      count: rejectedPapers.length,
      papers: rejectedPapers
    });
  } catch (error) {
    console.error('Error fetching rejected papers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching rejected papers',
      error: error.message
    });
  }
};