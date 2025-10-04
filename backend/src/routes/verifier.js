const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/:id', ctrl.getById);
router.get('/all/list', ctrl.listAll);

// Question paper routes
router.get('/papers', ctrl.getPapers);
router.put('/papers/:id', ctrl.updatePaper);

module.exports = router;


