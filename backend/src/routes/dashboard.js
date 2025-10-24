const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Get department-wise analytics
router.get('/department/:deptName', dashboardController.getDepartmentAnalytics);

module.exports = router;
