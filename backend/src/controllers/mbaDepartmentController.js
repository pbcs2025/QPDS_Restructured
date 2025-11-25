const MbaDepartment = require('../models/MbaDepartment');

// Get all active MBA departments
exports.getActiveMbaDepartments = async (req, res) => {
  try {
    const departments = await MbaDepartment.find({ isActive: true })
      .select('name code')
      .sort({ name: 1 })
      .lean();
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching MBA departments:', error);
    res.status(500).json({ error: 'Failed to fetch MBA departments' });
  }
};

// Get all MBA departments (including inactive)
exports.getAllMbaDepartments = async (req, res) => {
  try {
    const departments = await MbaDepartment.find({})
      .sort({ name: 1 })
      .lean();
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching all MBA departments:', error);
    res.status(500).json({ error: 'Failed to fetch MBA departments' });
  }
};

// Create a new MBA department
exports.createMbaDepartment = async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    const department = await MbaDepartment.create({
      name,
      code: code || '',
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({ 
      message: 'MBA department created successfully', 
      department 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Department with this name already exists' });
    }
    console.error('Error creating MBA department:', error);
    res.status(500).json({ error: 'Failed to create MBA department' });
  }
};

// Update an MBA department
exports.updateMbaDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;
    
    const department = await MbaDepartment.findByIdAndUpdate(
      id,
      { name, code, isActive },
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({ error: 'MBA department not found' });
    }
    
    res.json({ 
      message: 'MBA department updated successfully', 
      department 
    });
  } catch (error) {
    console.error('Error updating MBA department:', error);
    res.status(500).json({ error: 'Failed to update MBA department' });
  }
};

// Delete an MBA department
exports.deleteMbaDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await MbaDepartment.findByIdAndDelete(id);
    
    if (!department) {
      return res.status(404).json({ error: 'MBA department not found' });
    }
    
    res.json({ message: 'MBA department deleted successfully' });
  } catch (error) {
    console.error('Error deleting MBA department:', error);
    res.status(500).json({ error: 'Failed to delete MBA department' });
  }
};
