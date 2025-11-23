const {
    QuestionPaper,
    ApprovedPaper,
    RejectedPaper,
    VerifierCorrectedQuestions
  } = require('./helpers');
  
  // Get rejected papers for verifier with optional filtering
  async function getRejectedPapers(req, res) {
    try {
      const { department, semester } = req.query;
  
      const filter = {};
      if (department) filter.department = department;
      if (semester) filter.semester = parseInt(semester, 10);
  
      const rejected = await RejectedPaper.find(filter).sort({ rejected_at: -1 }).lean();
  
      // Group by subject_code and semester to avoid duplicates
      const groupedPapers = {};
      rejected.forEach((r) => {
        const key = `${r.subject_code}_${r.semester}`;
        if (!groupedPapers[key]) {
          groupedPapers[key] = {
            _id: key,
            subject_code: r.subject_code,
            subject_name: r.subject_name || 'Unknown',
            semester: r.semester,
            department: r.department || 'Unknown',
            rejected_at: r.rejected_at,
            status: 'rejected',
            questions: []
          };
        }
        // Add question to the group
        groupedPapers[key].questions.push({
          question_number: r.question_number,
          question_text: r.question_text,
          marks: r.marks,
          co: r.co,
          level: r.level,
          remarks: r.remarks
        });
      });
  
      // Return unique papers (one entry per paper)
      const detailed = Object.values(groupedPapers);
  
      return res.json(detailed);
    } catch (err) {
      console.error('Get rejected papers error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Get approved papers for verifier with optional filtering
  async function getApprovedPapers(req, res) {
    try {
      const { department, semester } = req.query;
  
      const filter = {};
      if (department) filter.department = department;
      if (semester) filter.semester = parseInt(semester, 10);
  
      const approved = await ApprovedPaper.find(filter).sort({ approved_at: -1 }).lean();
  
      // Group by subject_code and semester to avoid duplicates
      const groupedPapers = {};
      approved.forEach((a) => {
        const key = `${a.subject_code}_${a.semester}`;
        if (!groupedPapers[key]) {
          groupedPapers[key] = {
            _id: key,
            subject_code: a.subject_code,
            subject_name: a.subject_name || 'Unknown',
            semester: a.semester,
            department: a.department || 'Unknown',
            approved_at: a.approved_at,
            status: 'approved',
            questions: []
          };
        }
        // Add question to the group
        groupedPapers[key].questions.push({
          question_number: a.question_number,
          question_text: a.question_text,
          marks: a.marks,
          co: a.co,
          level: a.level,
          remarks: a.remarks
        });
      });
  
      // Return unique papers (one entry per paper)
      const detailed = Object.values(groupedPapers);
  
      return res.json(detailed);
    } catch (err) {
      console.error('Get approved papers error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Get papers for verifier - DISPLAY ALL PAPERS WITHOUT FILTERING
  async function getPapers(req, res) {
    try {
      const { department, semester } = req.query;
      console.log('Verifier getPapers called with:', { department, semester });
      console.log('⚠️  FILTERING DISABLED - SHOWING ALL PAPERS');
  
      // REMOVE ALL FILTERING - SHOW ALL PAPERS
      const filter = {};
      // if (department) filter.department = String(department).trim();
      // if (semester) filter.semester = parseInt(semester, 10);
      
      console.log('No filter applied - showing all papers');
  
      // Exclude papers already stored in rejected
      const rejectedPaperKeys = await RejectedPaper.find({}, { subject_code: 1, semester: 1 }).lean();
      const rejectedKeys = new Set(rejectedPaperKeys.map(rp => `${rp.subject_code}_${rp.semester}`));
  
      // GET ALL PAPERS - NO FILTERING
      const allPapers = await QuestionPaper.find({
        $or: [
          { status: { $exists: false } },
          { status: null },
          { status: 'pending' },
          { status: 'submitted' }
        ]
      }).sort({ subject_code: 1, semester: 1, question_number: 1 }).lean();
      
      console.log('📋 TOTAL PAPERS FOUND:', allPapers.length);
  
      console.log('📄 Sample papers:', allPapers.slice(0, 3).map(p => ({
        subject_code: p.subject_code,
        semester: p.semester,
        department: p.department,
        status: p.status
      })));
      
      // Debug: Log all papers with their department values
      if (allPapers.length > 0) {
        console.log('All papers department values:', allPapers.map(p => ({
          subject_code: p.subject_code,
          department: p.department,
          departmentType: typeof p.department,
          departmentLength: p.department ? p.department.length : 0
        })));
      }
  
      const papers = allPapers.filter(p => !rejectedKeys.has(`${p.subject_code}_${p.semester}`));
      console.log('Papers after filtering rejected:', papers.length);
  
      const groupedPapers = {};
      papers.forEach((paper) => {
        const key = `${paper.subject_code}_${paper.semester}`;
        if (!groupedPapers[key]) {
          groupedPapers[key] = {
            _id: key,
            subject_code: paper.subject_code,
            subject_name: paper.subject_name,
            semester: paper.semester,
            department: paper.department,
            questions: [],
            status: 'pending'
          };
        }
        groupedPapers[key].questions.push({
          _id: paper._id,
          question_number: paper.question_number,
          question_text: paper.question_text,
          marks: typeof paper.marks === 'number' ? paper.marks : 0,
          co: paper.co || '',
          l: paper.level || '',
          approved: paper.approved,
          remarks: paper.remarks,
          verified_at: paper.verified_at,
          file_url: paper.file_name ? `/question-bank/file/${paper._id}` : null,
          file_name: paper.file_name
        });
  
        if (paper.status === 'approved') groupedPapers[key].status = 'approved';
        else if (paper.status === 'rejected') groupedPapers[key].status = 'rejected';
      });
  
      // NO ADDITIONAL FILTERING - SHOW ALL PAPERS
      let result = Object.values(groupedPapers);
      
      console.log('🎯 FINAL RESULT - ALL PAPERS:', result.length, 'grouped papers');
      
      result = result.sort((a, b) => a.subject_code.localeCompare(b.subject_code));
      console.log('Final result for verifier (pending papers only):', result.length, 'grouped papers');
      
      // Debug: Log final result structure
      if (result.length > 0) {
        console.log('Final result sample:', result.slice(0, 2).map(r => ({
          subject_code: r.subject_code,
          department: r.department,
          questionsCount: r.questions ? r.questions.length : 0
        })));
      }
      
      return res.json(result);
    } catch (err) {
      console.error('Get papers error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Get a single grouped paper by subject_code and semester
  async function getPaperByCodeSemester(req, res) {
    try {
      const { subject_code, semester } = req.params;
      if (!subject_code || !semester) {
        return res.status(400).json({ error: 'subject_code and semester are required' });
      }
  
      const sem = parseInt(semester);
      const normalizedCode = String(subject_code).trim();
  
      let papers = await QuestionPaper.find({ subject_code: normalizedCode, semester: sem })
        .sort({ question_number: 1 })
        .lean();
  
      if (!papers || papers.length === 0) {
        // Fallback: case-insensitive match
        papers = await QuestionPaper.find({ subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' }, semester: sem })
          .sort({ question_number: 1 })
          .lean();
      }
  
      if (!papers || papers.length === 0) {
        console.warn('getPaperByCodeSemester: no papers found for', { subject_code: normalizedCode, semester: sem });
        return res.status(404).json({ error: 'Paper not found for given subject code and semester' });
      }
  
      const grouped = {
        _id: `${subject_code}_${sem}`,
        subject_code,
        subject_name: papers[0].subject_name,
        semester: sem,
        questions: [],
        status: 'pending'
      };
  
      for (const paper of papers) {
        grouped.questions.push({
          _id: paper._id,
          question_number: paper.question_number,
          question_text: paper.question_text,
          marks: typeof paper.marks === 'number' ? paper.marks : 0,
          co: paper.co || '',
          l: paper.level || '',
          approved: paper.approved,
          remarks: paper.remarks,
          file_name: paper.file_name,
          file_type: paper.file_type,
          file_url: paper.file_name ? `/question-bank/file/${paper._id}` : null
        });
  
        if (paper.status === 'approved') grouped.status = 'approved';
        else if (paper.status === 'rejected') grouped.status = 'rejected';
      }
  
      return res.json(grouped);
    } catch (err) {
      console.error('Verifier getPaperByCodeSemester error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Diagnostics: list approved papers
  async function listApprovedPapers(_req, res) {
    try {
      const rows = await ApprovedPaper.find({}).sort({ createdAt: -1 }).limit(100).lean();
      return res.json(rows);
    } catch (err) {
      console.error('Verifier listApprovedPapers error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Diagnostics: list rejected papers
  async function listRejectedPapers(_req, res) {
    try {
      const rows = await RejectedPaper.find({}).sort({ createdAt: -1 }).limit(100).lean();
      return res.json(rows);
    } catch (err) {
      console.error('Verifier listRejectedPapers error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Simple: Filter submitted papers by logged-in user's department (session-based)
  async function getVerifierPapers(req, res) {
    try {
      const sessionUser = (req.session && req.session.user) ? req.session.user : req.user;
      if (!sessionUser) {
        return res.status(401).json({ message: 'Not logged in' });
      }
      const department = sessionUser.department;
      if (!department || String(department).trim() === '') {
        return res.status(400).json({ message: 'Department not found for user' });
      }

      const papers = await QuestionPaper.find({ department: String(department).trim() }).lean();
      return res.json(papers);
    } catch (err) {
      console.error('Error fetching papers:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // Get verifier corrected papers with remarks for superadmin
  async function getVerifierCorrectedPapers(req, res) {
    try {
      const { department, semester } = req.query;
      
      const filter = {};
      if (department) filter.department = department;
      if (semester) filter.semester = parseInt(semester, 10);
      
      // Get corrected papers from VerifierCorrectedQuestions
      const correctedPapers = await VerifierCorrectedQuestions.find(filter)
        .sort({ verified_at: -1 })
        .lean();
      
      // Get approved papers from ApprovedPaper collection
      const approvedPapers = await ApprovedPaper.find(filter)
        .sort({ approved_at: -1 })
        .lean();
      
      // Group corrected papers by subject_code and semester
      const groupedCorrected = {};
      correctedPapers.forEach(paper => {
        const key = `${paper.subject_code}_${paper.semester}`;
        if (!groupedCorrected[key]) {
          groupedCorrected[key] = {
            _id: key,
            subject_code: paper.subject_code,
            subject_name: paper.subject_name,
            semester: paper.semester,
            department: paper.department,
            verifier_remarks: paper.verifier_remarks,
            verified_by: paper.verified_by,
            verified_at: paper.verified_at,
            status: paper.status,
            questions: [],
            corrected_at: paper.createdAt
          };
        }
        
        // Add corrected questions
        paper.corrected_questions.forEach(corrected => {
          groupedCorrected[key].questions.push({
            question_number: corrected.question_number,
            original_question_text: corrected.original_question_text,
            corrected_question_text: corrected.corrected_question_text,
            original_co: corrected.original_co,
            corrected_co: corrected.corrected_co,
            original_l: corrected.original_l,
            corrected_l: corrected.corrected_l,
            original_marks: corrected.original_marks,
            corrected_marks: corrected.corrected_marks,
            remarks: corrected.remarks,
            corrected_at: corrected.corrected_at
          });
        });
      });
      
      // Group approved papers by subject_code and semester
      const groupedApproved = {};
      approvedPapers.forEach(paper => {
        const key = `${paper.subject_code}_${paper.semester}`;
        if (!groupedApproved[key]) {
          groupedApproved[key] = {
            _id: key,
            subject_code: paper.subject_code,
            subject_name: paper.subject_name,
            semester: paper.semester,
            department: paper.department,
            verified_by: paper.verified_by,
            verified_at: paper.verified_at,
            approved_at: paper.approved_at,
            status: 'approved',
            questions: []
          };
        }
        
        groupedApproved[key].questions.push({
          question_number: paper.question_number,
          question_text: paper.question_text,
          marks: paper.marks,
          co: paper.co,
          level: paper.level,
          remarks: paper.remarks
        });
      });
      
      // Combine corrected and approved papers
      const allPapers = {
        ...groupedCorrected,
        ...groupedApproved
      };
      
      const result = Object.values(allPapers).sort((a, b) => 
        new Date(b.verified_at || b.approved_at) - new Date(a.verified_at || a.approved_at)
      );
      
      return res.json({
        success: true,
        count: result.length,
        papers: result
      });
    } catch (err) {
      console.error('Get verifier corrected papers error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  module.exports = {
    getRejectedPapers,
    getApprovedPapers,
    getPapers,
    getPaperByCodeSemester,
    listApprovedPapers,
    listRejectedPapers,
    getVerifierCorrectedPapers,
    getVerifierPapers
  };