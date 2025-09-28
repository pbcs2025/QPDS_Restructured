const College = require('../models/College');

// GET all colleges
exports.list = async (_req, res) => {
  try {
    const rows = await College.find({}).sort({ name: 1 }).lean();
    const result = rows.map(r => ({
      id: r._id,
      name: r.name,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching colleges:', err);
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
};

// GET active colleges
exports.active = async (_req, res) => {
  try {
    const rows = await College.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json(rows.map(r => ({ id: r._id, name: r.name })));
  } catch (err) {
    console.error('Error fetching active colleges:', err);
    res.status(500).json({ error: 'Failed to fetch active colleges' });
  }
};

// POST add new college
exports.create = async (req, res) => {
  const { name, isActive } = req.body;
  if (!name) return res.status(400).json({ error: 'College name is required' });
  try {
    const college = await College.create({ 
      name: name.trim(), 
      isActive: isActive !== undefined ? isActive : true 
    });
    res.status(201).json({ 
      message: 'College added successfully',
      college: {
        id: college._id,
        name: college.name,
        isActive: college.isActive,
        createdAt: college.createdAt
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'College name already exists' });
    } else {
      console.error('Error adding college:', err);
      res.status(500).json({ error: 'Failed to add college' });
    }
  }
};

// PUT update college
exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;
  
  if (!name && isActive === undefined) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  
  try {
    const update = {};
    if (name) update.name = name.trim();
    if (isActive !== undefined) update.isActive = isActive;
    
    const college = await College.findByIdAndUpdate(id, update, { new: true });
    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }
    
    res.json({ 
      message: 'College updated successfully',
      college: {
        id: college._id,
        name: college.name,
        isActive: college.isActive,
        createdAt: college.createdAt
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'College name already exists' });
    } else {
      console.error('Error updating college:', err);
      res.status(500).json({ error: 'Failed to update college' });
    }
  }
};

// DELETE college
exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const college = await College.findByIdAndDelete(id);
    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }
    res.json({ message: 'College deleted successfully' });
  } catch (err) {
    console.error('Error deleting college:', err);
    res.status(500).json({ error: 'Failed to delete college' });
  }
};

