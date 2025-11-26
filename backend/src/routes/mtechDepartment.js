const express = require('express');
const router = express.Router();
const controller = require('../controllers/mtechDepartmentController');

router.get('/active', controller.getActiveMtechDepartments);
router.post('/', controller.createMtechDepartment);
router.put('/:id', controller.updateMtechDepartment);
router.delete('/:id', controller.deleteMtechDepartment);

module.exports = router;
