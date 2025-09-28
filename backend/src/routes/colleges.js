const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collegeController');

router.get('/', ctrl.list);
router.get('/active', ctrl.active);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;





