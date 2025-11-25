const MtechSemester = require('../models/MtechSemester');

exports.getActiveMtechSemesters = async (req, res) => {
  try {
    const semesters = await MtechSemester.find({ isActive: true })
      .sort({ semesterNumber: 1 })
      .lean();
    res.json(semesters);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
};

exports.createMtechSemester = async (req, res) => {
  try {
    const { semesterNumber, name, isActive } = req.body;

    const semester = await MtechSemester.create({
      semesterNumber,
      name,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ message: 'Semester created', semester });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ error: 'Semester already exists' });

    res.status(500).json({ error: 'Failed to create semester' });
  }
};
