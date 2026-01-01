// In api/routes/reportsRoutes.js, change to:
const express = require('express');
const router = express.Router();

// Use the existing controllers
const complianceController = require('../controllers/complianceReportControllers');
const financialController = require('../controllers/finincialReportController');

// Financial reports
router.get('/financial', financialController.getFinancialReports);
router.post('/financial', financialController.createFinancialReport); 

// Compliance reports
router.get('/compliance', complianceController.getComplianceReports);
router.post('/compliance', complianceController.createComplianceReport);

module.exports = router;