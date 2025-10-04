const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/:id', ctrl.getById);
router.get('/all/list', ctrl.listAll);

module.exports = router;


