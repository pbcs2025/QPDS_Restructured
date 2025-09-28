const QuestionPaper = require('../models/QuestionPaper');

exports.create = async (req, res) => {
  const { subject_code, subject_name, semester, question_number, question_text } = req.body;
  const file = req.file;
  if (!subject_code || !subject_name || !semester || !question_number || !question_text) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const exists = await QuestionPaper.findOne({ subject_code, semester, question_number }).lean();
    if (exists) return res.status(409).json({ error: 'Question already exists' });

    const doc = await QuestionPaper.create({
      subject_code,
      subject_name,
      semester,
      question_number,
      question_text,
      file_name: file ? file.originalname : null,
      file_type: file ? file.mimetype : null,
      question_file: file ? file.buffer : null,
    });
    res.json({ message: '✅ Question saved successfully', id: doc._id });
  } catch (err) {
    console.error('❌ Error inserting data:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

exports.list = async (_req, res) => {
  try {
    const results = await QuestionPaper.find({}, {
      subject_code: 1,
      subject_name: 1,
      semester: 1,
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







