const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mbaDepartmentController');
const MBADepartment = require('../models/mbaDepartment');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, isSuperAdmin } = require('../middleware/authorize');

router.get('/', verifyToken, authorize('SuperAdmin', 'Faculty', 'Verifier'), ctrl.list);
router.get('/active', verifyToken, authorize('SuperAdmin', 'Faculty', 'Verifier'), ctrl.active);
router.post('/', verifyToken, isSuperAdmin, ctrl.create);
router.put('/:id', verifyToken, isSuperAdmin, ctrl.update);
router.delete('/:id', verifyToken, isSuperAdmin, ctrl.remove);

router.get('/debug', verifyToken, isSuperAdmin, async (_req, res) => {
  const departments = await MBADepartment.find({}).lean();
  res.json({ count: departments.length, data: departments });
});

module.exports = router;


