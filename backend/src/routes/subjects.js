const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subjectController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, isSuperAdmin } = require('../middleware/authorize');

router.get('/', verifyToken, authorize('SuperAdmin', 'Faculty', 'Verifier'), ctrl.list);
router.post('/', verifyToken, isSuperAdmin, ctrl.create);
router.put('/:id', verifyToken, isSuperAdmin, ctrl.update);
router.delete('/:id', verifyToken, isSuperAdmin, ctrl.remove);
router.get('/codes/list', verifyToken, authorize('SuperAdmin', 'Faculty', 'Verifier'), ctrl.subjectCodes);

module.exports = router;


