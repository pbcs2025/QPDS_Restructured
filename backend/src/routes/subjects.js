const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subjectController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/codes/list', ctrl.subjectCodes);

module.exports = router;


