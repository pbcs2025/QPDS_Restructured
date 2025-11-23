const Subject = require('../models/Subject');

exports.list = async (req, res) => {
  try {
    const { department } = req.query;
    let query = {};

    // Filter by department if provided
    if (department) {
      query.department = department;
    }

    const rows = await Subject.find(query).sort({ department: 1, semester: 1, subject_code: 1 }).lean();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

exports.create = async (req, res) => {
  const { subject_code, subject_name, department, semester, credits } = req.body;
  if (!subject_code || !subject_name || !department || !semester || !credits) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    await Subject.create({ subject_code, subject_name, department, semester, credits });
    res.status(201).json({ message: 'Subject added successfully' });
  } catch (err) {
    console.error('Error adding subject:', err);
    res.status(500).json({ error: 'Failed to add subject' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { subject_code, subject_name, department, semester, credits } = req.body;
  try {
    await Subject.findByIdAndUpdate(id, { subject_code, subject_name, department, semester, credits });
    res.json({ message: 'Subject updated successfully' });
  } catch (err) {
    console.error('Error updating subject:', err);
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await Subject.findByIdAndDelete(id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error('Error deleting subject:', err);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

exports.subjectCodes = async (_req, res) => {
  try {
    const codes = await Subject.find({}, { subject_code: 1, _id: 0 }).lean();
    res.json(codes.map(r => r.subject_code));
  } catch (err) {
    console.error('Error fetching subject codes:', err);
    res.status(500).json({ error: 'Database error' });
  }
};







