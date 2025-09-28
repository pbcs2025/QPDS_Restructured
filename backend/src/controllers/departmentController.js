const Department = require('../models/Department');

//GET all departments
exports.list = async (_req, res) => {
  try {
    const rows = await Department.find({}).sort({ name: 1 }).lean();
    const result = rows.map(r => ({
      id: r._id,
      name: r.name,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments', details: err.message });
  }
};

// //export.list----temp
// // controllers/departmentController.js
// exports.list = async (_req, res) => {
//   try {
//     console.log('LIST: Fetching departments...');
//     const rows = await Department.find({}).sort({ name: 1 }).lean();
//     console.log('LIST: Found', rows.length, 'departments');
//     const result = rows.map(r => ({
//       id: r._id,
//       name: r.name,
//       isActive: r.isActive,
//       createdAt: r.createdAt
//     }));
//     console.log('LIST: Mapped result:', result);
//     res.json(result);
//   } catch (err) {
//     console.error('LIST: Error fetching departments:', err);
//     res.status(500).json({ error: 'Failed to fetch departments' });
//   }
// };


// GET active departments
exports.active = async (_req, res) => {
  try {
    const rows = await Department.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json(rows.map(r => ({ id: r._id, name: r.name })));
  } catch (err) {
    console.error('Error fetching active departments:', err);
    res.status(500).json({ error: 'Failed to fetch active departments' });
  }
};

// POST add new department
exports.create = async (req, res) => {
  const { name, isActive } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  try {
    await Department.create({ name, isActive: isActive !== undefined ? isActive : true });
    res.status(201).json({ message: 'Department added successfully' });
  } catch (err) {
    console.error('Error adding department:', err);
    res.status(500).json({ error: 'Failed to add department' });
  }
};

// PUT update department
exports.update = async (req, res) => {
  const { id } = req.params;
  const { newDepartment, isActive } = req.body;
  if (!newDepartment && isActive === undefined) return res.status(400).json({ error: 'Nothing to update' });
  try {
    const update = {};
    if (newDepartment) update.name = newDepartment;
    if (isActive !== undefined) update.isActive = isActive;
    await Department.findByIdAndUpdate(id, update);
    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    console.error('Error updating department:', err);
    res.status(500).json({ error: 'Failed to update department' });
  }
};

// DELETE department
exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await Department.findByIdAndDelete(id);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
};
