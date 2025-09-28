const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/departmentController');
const Department = require('../models/Department');

router.get('/', ctrl.list);
router.get('/active', ctrl.active);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.get('/debug', async (_req, res) => {
  const departments = await Department.find({}).lean();
  res.json({ count: departments.length, data: departments });
});


module.exports = router;


