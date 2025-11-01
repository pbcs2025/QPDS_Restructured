const {
    mongoose,
    QuestionPaper,
    ApprovedPaper,
    RejectedPaper,
    VerifierCorrectedQuestions
  } = require('./helpers');
  
  async function updatePaper(req, res) {
    try {
      const { subject_code: pCode, semester: pSem } = req.params;
      const { subject_code: bCode, semester: bSem, questions, finalStatus } = req.body || {};
      
      const subject_code = String(pCode || bCode || '').trim();
      const semester = parseInt(pSem || bSem, 10);
      
      if (!subject_code || Number.isNaN(semester)) {
        return res.status(400).json({ error: 'subject_code and semester are required' });
      }
      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Questions array is required' });
      }
  
      const normalizedCode = subject_code;
      
      // Update each question in the paper
      const updatePromises = questions.map(async (question) => {
        const updateData = {
          approved: !!question.approved,
          remarks: question.remarks || '',
          verified_at: new Date(),
          status: question.approved ? 'approved' : 'rejected',
        };
        if (typeof question.question_text === 'string' && question.question_text.trim() !== '') {
          updateData.question_text = question.question_text.trim();
        }
        if (typeof question.co === 'string') {
          updateData.co = question.co;
        }
        if (typeof question.l === 'string') {
          updateData.level = question.l;
        }
        if (typeof question.marks === 'number' && !Number.isNaN(question.marks)) {
          updateData.marks = question.marks;
        }
        
        return await QuestionPaper.findOneAndUpdate(
          {
            subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' },
            semester: semester,
            question_number: question.question_number,
          },
          { $set: updateData },
          { new: true }
        ).lean();
      });
      
      await Promise.all(updatePromises);
  
      // Enforce final status across all questions for this paper if provided
      if (finalStatus === 'approved') {
        await QuestionPaper.updateMany(
          { subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' }, semester },
          { $set: { status: 'approved', approved: true, verified_at: new Date() } }
        );
      } else if (finalStatus === 'rejected') {
        await QuestionPaper.updateMany(
          { subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' }, semester },
          { $set: { status: 'rejected', approved: false, verified_at: new Date() } }
        );
      }
  
      const anyApproved = finalStatus === 'approved' || questions.some((q) => !!q.approved);
      const anyRejected = finalStatus === 'rejected' || questions.some((q) => q.approved === false);
  
      if (anyApproved && !anyRejected) {
        await ApprovedPaper.updateOne(
          { subject_code: normalizedCode, semester },
          { $set: { subject_code: normalizedCode, semester } },
          { upsert: true }
        );
      }
  
      if (anyRejected && !anyApproved) {
        await RejectedPaper.updateOne(
          { subject_code: normalizedCode, semester },
          { $set: { subject_code: normalizedCode, semester } },
          { upsert: true }
        );
      }
      
      return res.json({ message: 'Paper updated successfully', finalStatus: finalStatus || null });
    } catch (err) {
      console.error('Verifier updatePaper error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Save corrected questions by verifier
  async function saveCorrectedQuestions(req, res) {
    try {
      const { subject_code, semester } = req.params;
      const { corrected_questions, verifier_remarks, verified_by } = req.body;
  
      if (!subject_code || !semester || !corrected_questions || !verified_by) {
        return res.status(400).json({ error: 'subject_code, semester, corrected_questions, and verified_by are required' });
      }
  
      // Find original questions
      const originalQuestions = await QuestionPaper.find({ 
        subject_code, 
        semester: parseInt(semester) 
      }).sort({ question_number: 1 }).lean();
  
      if (!originalQuestions || originalQuestions.length === 0) {
        return res.status(404).json({ error: 'Original questions not found' });
      }
  
      // Create corrected questions record
      const correctedRecord = new VerifierCorrectedQuestions({
        subject_code,
        subject_name: originalQuestions[0].subject_name,
        semester: parseInt(semester),
        department: originalQuestions[0].department,
        corrected_questions: corrected_questions.map((corrected, index) => {
          const original = originalQuestions[index];
          return {
            question_number: corrected.question_number || original.question_number,
            original_question_text: original.question_text,
            corrected_question_text: corrected.question_text,
            original_co: original.co,
            corrected_co: corrected.co,
            original_l: original.level,
            corrected_l: corrected.l,
            original_marks: original.marks,
            corrected_marks: corrected.marks,
            remarks: corrected.remarks || '',
            corrected_at: new Date()
          };
        }),
        verifier_remarks: verifier_remarks || '',
        verified_by,
        status: 'corrected'
      });
  
      await correctedRecord.save();
  
      return res.json({ 
        message: 'Corrected questions saved successfully',
        correctedRecord 
      });
    } catch (err) {
      console.error('Save corrected questions error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Approve corrected questions and move to approved collection
  async function approveCorrectedQuestions(req, res) {
    try {
      const { subject_code, semester } = req.params;
      const { corrected_questions, verifier_remarks, verified_by } = req.body;
  
      console.log('Approve corrected questions called with:', { subject_code, semester, verified_by });
      console.log('Corrected questions count:', corrected_questions?.length);
  
      if (!subject_code || !semester || !corrected_questions || !verified_by) {
        console.error('Missing required fields:', { subject_code, semester, corrected_questions: !!corrected_questions, verified_by });
        return res.status(400).json({ error: 'subject_code, semester, corrected_questions, and verified_by are required' });
      }
  
      // Validate corrected_questions structure
      if (!Array.isArray(corrected_questions) || corrected_questions.length === 0) {
        console.error('Invalid corrected_questions:', corrected_questions);
        return res.status(400).json({ error: 'corrected_questions must be a non-empty array' });
      }
  
      // Validate each question has required fields
      for (const question of corrected_questions) {
        if (!question.question_number || !question.question_text) {
          console.error('Invalid question structure:', question);
          return res.status(400).json({ error: 'Each question must have question_number and question_text' });
        }
      }
  
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        // Save corrected questions
        console.log('Creating VerifierCorrectedQuestions record...');
        const correctedRecord = new VerifierCorrectedQuestions({
          subject_code,
          semester: parseInt(semester),
          corrected_questions: corrected_questions.map(q => ({
            question_number: q.question_number,
            corrected_question_text: q.question_text,
            corrected_co: q.co,
            corrected_l: q.l,
            corrected_marks: q.marks,
            remarks: q.remarks || '',
            corrected_at: new Date()
          })),
          verifier_remarks: verifier_remarks || '',
          verified_by,
          status: 'approved'
        });
  
        console.log('Saving VerifierCorrectedQuestions record...');
        await correctedRecord.save({ session });
        console.log('Successfully saved VerifierCorrectedQuestions record');
  
        // Update original questions with corrections
        console.log('Updating original QuestionPaper records...');
        for (const corrected of corrected_questions) {
          console.log(`Updating question ${corrected.question_number}...`);
          const updateResult = await QuestionPaper.findOneAndUpdate(
            { 
              subject_code, 
              semester: parseInt(semester), 
              question_number: corrected.question_number 
            },
            {
              $set: {
                question_text: corrected.question_text,
                co: corrected.co,
                level: corrected.l,
                marks: corrected.marks,
                remarks: corrected.remarks || '',
                status: 'approved',
                verified_by,
                verified_at: new Date()
              }
            },
            { session }
          );
          console.log(`Updated question ${corrected.question_number}:`, !!updateResult);
        }
        console.log('Successfully updated all QuestionPaper records');
  
        // Get paper details from the first question to get subject_name and department
        const firstQuestion = await QuestionPaper.findOne({ 
          subject_code, 
          semester: parseInt(semester) 
        }).lean();
        
        const subject_name = firstQuestion?.subject_name || '';
        const department = firstQuestion?.department || '';
  
        console.log('Paper details found:', { subject_name, department });
        console.log('Corrected questions structure:', corrected_questions.map(q => ({
          question_number: q.question_number,
          has_question_text: !!q.question_text,
          has_marks: !!q.marks,
          has_co: !!q.co,
          has_l: !!q.l
        })));
  
        // Create approved paper records for each question
        const approvedPapers = corrected_questions.map(question => {
          console.log('Creating ApprovedPaper for question:', question.question_number);
          return new ApprovedPaper({
            subject_code,
            subject_name,
            semester: parseInt(semester),
            department,
            question_number: question.question_number,
            question_text: question.question_text,
            marks: question.marks,
            co: question.co,
            level: question.l,
            remarks: question.remarks || '',
            verified_by,
            verified_at: new Date(),
            approved_at: new Date()
          });
        });
  
        console.log('Attempting to insert approved papers:', approvedPapers.length);
        await ApprovedPaper.insertMany(approvedPapers, { session });
        console.log('Successfully inserted approved papers');
  
        await session.commitTransaction();
        session.endSession();
  
        console.log('Successfully approved and saved corrected questions');
        return res.json({ 
          message: 'Corrected questions approved and saved successfully',
          approvedPapers: approvedPapers.length
        });
      } catch (error) {
        console.error('Transaction error:', error);
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } catch (err) {
      console.error('Approve corrected questions error:', err);
      console.error('Error details:', err.message);
      console.error('Stack trace:', err.stack);
      return res.status(500).json({ 
        error: 'Server error',
        details: err.message 
      });
    }
  }
  
  // Get corrected questions for a paper
  async function getCorrectedQuestions(req, res) {
    try {
      const { subject_code, semester } = req.params;
  
      const corrected = await VerifierCorrectedQuestions.findOne({
        subject_code,
        semester: parseInt(semester)
      }).lean();
  
      if (!corrected) {
        return res.status(404).json({ error: 'Corrected questions not found' });
      }
  
      return res.json(corrected);
    } catch (err) {
      console.error('Get corrected questions error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Reject a paper and store in RejectedPaper collection
  async function rejectPaper(req, res) {
    try {
      const { subject_code, semester } = req.params;
      const { remarks, verified_by } = req.body;
  
      if (!subject_code || !semester) {
        return res.status(400).json({ error: 'subject_code and semester are required' });
      }
  
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        // Find all questions for this paper
        const questions = await QuestionPaper.find({ 
          subject_code, 
          semester: parseInt(semester) 
        }).lean();
  
        if (!questions || questions.length === 0) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: 'Paper not found' });
        }
  
        // Create rejected paper records for each question
        const rejectedPapers = questions.map(question => {
          return new RejectedPaper({
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
            remarks: remarks || '',
            verified_by: verified_by || '',
            verified_at: new Date(),
            rejected_at: new Date()
          });
        });
  
        // Insert all rejected papers
        await RejectedPaper.insertMany(rejectedPapers, { session });
  
        // Update original questions status to rejected
        await QuestionPaper.updateMany(
          { subject_code, semester: parseInt(semester) },
          { 
            $set: { 
              status: 'rejected',
              remarks: remarks || '',
              verified_by: verified_by || '',
              verified_at: new Date()
            } 
          },
          { session }
        );
  
        await session.commitTransaction();
        session.endSession();
  
        return res.json({ 
          message: 'Paper rejected and stored successfully',
          rejectedCount: rejectedPapers.length
        });
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } catch (err) {
      console.error('Reject paper error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  module.exports = {
    updatePaper,
    saveCorrectedQuestions,
    approveCorrectedQuestions,
    getCorrectedQuestions,
    rejectPaper
  };