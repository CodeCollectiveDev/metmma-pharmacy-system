const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/financial', reportsController.getFinancialReports);
router.post('/financial', reportsController.createFinancialReport); 
router.get('/compliance', reportsController.getComplianceReports);
router.post('/compliance', reportsController.createComplianceReport);
module.exports = router;