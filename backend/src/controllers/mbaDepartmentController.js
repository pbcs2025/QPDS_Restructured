//controllers/mbaDepartmentController.js
const MBADepartment = require('../models/mbaDepartment');

//GET all MBA departments
exports.list = async (_req, res) => {
  try {
    const rows = await MBADepartment.find({}).sort({ name: 1 }).lean();
    const result = rows.map(r => ({
      id: r._id.toString(),
      name: r.name,
      isActive: r.isActive,
      color: r.color,
      createdAt: r.createdAt,
    }));
    console.log('LIST: Mapped result:', result.length);
    res.json(result);
  } catch (err) {
    console.error('Error fetching MBA departments:', err);
    res.status(500).json({ error: 'Failed to fetch MBA departments', details: err.message });
  }
};

// GET active MBA departments
exports.active = async (_req, res) => {
  try {
    const rows = await MBADepartment.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json(rows.map(r => ({ id: r._id, name: r.name, color: r.color, createdAt: r.createdAt})));
  } catch (err) {
    console.error('Error fetching active MBA departments:', err);
    res.status(500).json({ error: 'Failed to fetch active MBA departments' });
  }
};

// POST add new MBA department
exports.create = async (req, res) => {
  const { name, isActive, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  try {
    await MBADepartment.create({ 
      name, 
      isActive: isActive !== undefined ? isActive : true,
      color: color || '#6c757d' // Default gray color if not provided
    });
    res.status(201).json({ message: 'MBA Department added successfully' });
  } catch (err) {
    console.error('Error adding MBA department:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A department with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to add MBA department' });
  }
};

// PUT update MBA department
exports.update = async (req, res) => {
  const { id } = req.params;
  const { newDepartment, isActive, color } = req.body;
  if (!newDepartment && isActive === undefined && !color) return res.status(400).json({ error: 'Nothing to update' });
  try {
    const update = {};
    if (newDepartment) update.name = newDepartment;
    if (isActive !== undefined) update.isActive = isActive;
    if (color) update.color = color;
    await MBADepartment.findByIdAndUpdate(id, update);
    res.json({ message: 'MBA Department updated successfully' });
  } catch (err) {
    console.error('Error updating MBA department:', err);
    res.status(500).json({ error: 'Failed to update MBA department' });
  }
};

// DELETE MBA department
exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await MBADepartment.findByIdAndDelete(id);
    res.json({ message: 'MBA Department deleted successfully' });
  } catch (err) {
    console.error('Error deleting MBA department:', err);
    res.status(500).json({ error: 'Failed to delete MBA department' });
  }
};


