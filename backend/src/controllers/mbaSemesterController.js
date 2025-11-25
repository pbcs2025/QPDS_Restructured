const MbaSemester = require('../models/MbaSemester');

// Get active semesters
exports.getActiveMbaSemesters = async (req, res) => {
  try {
    const semesters = await MbaSemester.find({ isActive: true })
      .sort({ semesterNumber: 1 })
      .lean();
    res.json(semesters);
  } catch (error) {
    console.error('Error fetching MBA semesters:', error);
    res.status(500).json({ error: 'Failed to fetch MBA semesters' });
  }
};

// Create semester
exports.createMbaSemester = async (req, res) => {
  try {
    const { semesterNumber, name, isActive } = req.body;

    const semester = await MbaSemester.create({
      semesterNumber,
      name,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ message: 'Semester created successfully', semester });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Semester already exists' });
    }
    console.error('Error creating semester:', error);
    res.status(500).json({ error: 'Failed to create semester' });
  }
};

// Update semester
exports.updateMbaSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const semester = await MbaSemester.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!semester) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    res.json({ message: 'Semester updated successfully', semester });
  } catch (error) {
    console.error('Error updating semester:', error);
    res.status(500).json({ error: 'Failed to update semester' });
  }
};

// Delete semester
exports.deleteMbaSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const semester = await MbaSemester.findByIdAndDelete(id);

    if (!semester) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    res.json({ message: 'Semester deleted successfully' });
  } catch (error) {
    console.error('Error deleting semester:', error);
    res.status(500).json({ error: 'Failed to delete semester' });
  }
};
