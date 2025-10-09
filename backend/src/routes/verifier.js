
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/all/list', ctrl.listAll);

// Question paper routes - these must come before /:id route
router.get('/papers', ctrl.getPapers);
router.put('/papers/:id', ctrl.updatePaper);

// Admin-only: normalize Verifier.department to active Departments canonical names
router.post('/normalize-departments', ctrl.normalizeDepartments);

// This route must come last as it matches any single parameter
router.get('/:id', ctrl.getById);

module.exports = router;


