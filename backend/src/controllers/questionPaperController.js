const QuestionPaper = require('../models/QuestionPaper');

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

    // Create new paper with submitted status
    const newPaper = new QuestionPaper({
      facultyId,
      title,
      content,
      status: 'submitted',
      // Optional fields if provided
      subject_code: req.body.subject_code,
      subject_name: req.body.subject_name,
      department: req.body.department
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
    const filter = { status: 'submitted' };
    if (req.query.department) {
      filter.department = req.query.department;
      console.log(`Filtering by department: ${req.query.department}`);
    }
    if (req.query.semester) {
      filter.semester = req.query.semester;
      console.log(`Filtering by semester: ${req.query.semester}`);
    }
    
    // Query for papers with submitted status
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