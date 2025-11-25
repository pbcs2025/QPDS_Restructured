const MtechDepartment = require('../models/MtechDepartment');

// Get active departments
exports.getActiveMtechDepartments = async (req, res) => {
  try {
    const departments = await MtechDepartment.find({ isActive: true })
      .select('name code')
      .sort({ name: 1 })
      .lean();
    res.json(departments);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Create
exports.createMtechDepartment = async (req, res) => {
  try {
    const { name, code, isActive } = req.body;

    const department = await MtechDepartment.create({
      name,
      code: code || '',
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ message: 'Department created', department });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ error: 'Department already exists' });

    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

// Update
exports.updateMtechDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await MtechDepartment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!department)
      return res.status(404).json({ error: 'Department not found' });

    res.json({ message: 'Updated', department });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
};

// Delete
exports.deleteMtechDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await MtechDepartment.findByIdAndDelete(id);

    if (!department)
      return res.status(404).json({ error: 'Department not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
};
