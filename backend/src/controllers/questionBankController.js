const QuestionPaper = require('../models/QuestionPaper');

// Helper to get the next set name or latest set name
const getSetName = async (subject_code, semester, useLatest = false) => {
  const sets = await QuestionPaper.find({ subject_code, semester })
    .sort({ createdAt: -1 })
    .lean();

  if (sets.length === 0) return 'Set1';

  if (useLatest) {
    // Return the latest set name
    return sets[0].set_name;
  } else {
    // Generate next set
    const setNumbers = sets
      .map(s => parseInt(s.set_name.replace('Set', '')))
      .filter(n => !isNaN(n));
    const maxSet = setNumbers.length ? Math.max(...setNumbers) : 0;
    return `Set${maxSet + 1}`;
  }
};

// ---------------- Single Question ----------------
exports.create = async (req, res) => {
  const { subject_code, subject_name, semester, question_number, question_text, set_name } = req.body;
  const file = req.file;

  if (!subject_code || !subject_name || !semester || !question_number || !question_text) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check for duplicate question
    const exists = await QuestionPaper.findOne({ subject_code, semester, question_number }).lean();
    if (exists) return res.status(409).json({ error: 'Question already exists' });

    // Determine set_name
    let finalSetName = set_name;
    if (!finalSetName) {
      // If no set_name provided, assign latest set for this paper, or Set1 if none exists
      finalSetName = await getSetName(subject_code, semester, true);
    }

    const doc = await QuestionPaper.create({
      subject_code,
      subject_name,
      semester,
      set_name: finalSetName,
      question_number,
      question_text,
      file_name: file ? file.originalname : null,
      file_type: file ? file.mimetype : null,
      question_file: file ? file.buffer : null,
    });

    res.json({ message: '✅ Question saved successfully', id: doc._id, set_name: finalSetName });
  } catch (err) {
    console.error('❌ Error inserting data:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// ---------------- Batch Upload ----------------
exports.createBatch = async (req, res) => {
  const { subject_code, subject_name, semester, questions } = req.body;

  if (!subject_code || !subject_name || !semester || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'subject_code, subject_name, semester, and questions array are required' });
  }

  try {
    // Check for duplicate questions
    const existingQuestions = await QuestionPaper.find({
      subject_code,
      semester,
      question_number: { $in: questions.map(q => q.question_number) }
    }).lean();

    if (existingQuestions.length > 0) {
      const existingNumbers = existingQuestions.map(q => q.question_number);
      return res.status(409).json({
        error: 'Some questions already exist',
        existing_questions: existingNumbers
      });
    }

    // Assign new set name for this paper
    const set_name = await getSetName(subject_code, semester, false);

    const questionDocs = questions.map(q => ({
      subject_code,
      subject_name,
      semester,
      set_name,
      question_number: q.question_number,
      question_text: q.question_text,
      file_name: q.file_name || null,
      file_type: q.file_type || null,
      question_file: q.question_file || null,
    }));

    const createdDocs = await QuestionPaper.insertMany(questionDocs);

    res.json({
      message: `✅ ${set_name} saved successfully with ${createdDocs.length} questions`,
      set_name,
      questions_count: createdDocs.length,
      question_ids: createdDocs.map(doc => doc._id)
    });

  } catch (err) {
    console.error('❌ Error inserting batch data:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// ---------------- List Questions ----------------
exports.list = async (_req, res) => {
  try {
    const results = await QuestionPaper.find({}, {
      subject_code: 1,
      subject_name: 1,
      semester: 1,
      set_name: 1,
      question_number: 1,
      question_text: 1,
      file_name: 1,
      file_type: 1,
    }).sort({ _id: -1 }).lean();

    const withUrls = results.map(q => ({
      ...q,
      file_url: q.file_name ? `/api/question-bank/file/${q._id}` : null,
    }));

    res.json(withUrls);
  } catch (err) {
    console.error('❌ Error fetching questions:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// ---------------- Get File ----------------
exports.fileById = async (req, res) => {
  try {
    const file = await QuestionPaper.findById(req.params.id, { file_name: 1, file_type: 1, question_file: 1 }).lean();
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', file.file_type);
    res.setHeader('Content-Disposition', `inline; filename=${file.file_name}`);
    res.send(file.question_file);

  } catch (err) {
    console.error('❌ Error fetching file:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};
