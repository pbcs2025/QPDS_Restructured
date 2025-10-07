const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/all/list', ctrl.listAll);

// Admin-only: normalize Verifier.department to active Departments canonical names
router.post('/normalize-departments', ctrl.normalizeDepartments);

module.exports = router;


