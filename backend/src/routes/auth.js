const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/verify', ctrl.verify);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

router.get('/users', ctrl.getInternalUsers);
router.get('/externalusers', ctrl.getExternalUsers);
router.get('/colleges', ctrl.getColleges);
router.get('/departments', ctrl.getDepartments);
router.post('/registerFaculty', ctrl.registerFaculty);

module.exports = router;


