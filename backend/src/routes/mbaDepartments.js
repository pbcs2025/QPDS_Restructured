const express = require('express');
const router = express.Router();
const mbaDepartmentController = require('../controllers/mbaDepartmentController');

// Get active MBA departments
router.get('/active', mbaDepartmentController.getActiveMbaDepartments);

// Get all MBA departments
router.get('/', mbaDepartmentController.getAllMbaDepartments);

// Create MBA department
router.post('/', mbaDepartmentController.createMbaDepartment);

// Update MBA department
router.put('/:id', mbaDepartmentController.updateMbaDepartment);

// Delete MBA department
router.delete('/:id', mbaDepartmentController.deleteMbaDepartment);

module.exports = router;
