const MBASubject = require('../models/mbaSubject');

exports.list = async (_req, res) => {
  try {
    const rows = await MBASubject.find({}).sort({ department: 1, semester: 1, subject_code: 1 }).lean();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching MBA subjects:', err);
    res.status(500).json({ error: 'Failed to fetch MBA subjects' });
  }
};

exports.create = async (req, res) => {
  const { subject_code, subject_name, department, semester, credits } = req.body;
  if (!subject_code || !subject_name || !department || !semester || !credits) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    await MBASubject.create({ subject_code, subject_name, department, semester, credits });
    res.status(201).json({ message: 'MBA Subject added successfully' });
  } catch (err) {
    console.error('Error adding MBA subject:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A subject with this code already exists' });
    }
    res.status(500).json({ error: 'Failed to add MBA subject' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { subject_code, subject_name, department, semester, credits } = req.body;
  try {
    await MBASubject.findByIdAndUpdate(id, { subject_code, subject_name, department, semester, credits });
    res.json({ message: 'MBA Subject updated successfully' });
  } catch (err) {
    console.error('Error updating MBA subject:', err);
    res.status(500).json({ error: 'Failed to update MBA subject' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await MBASubject.findByIdAndDelete(id);
    res.json({ message: 'MBA Subject deleted successfully' });
  } catch (err) {
    console.error('Error deleting MBA subject:', err);
    res.status(500).json({ error: 'Failed to delete MBA subject' });
  }
};

exports.subjectCodes = async (_req, res) => {
  try {
    const codes = await MBASubject.find({}, { subject_code: 1, _id: 0 }).lean();
    res.json(codes.map(r => r.subject_code));
  } catch (err) {
    console.error('Error fetching MBA subject codes:', err);
    res.status(500).json({ error: 'Database error' });
  }
};


