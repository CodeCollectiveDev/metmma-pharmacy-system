const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');

// Use the existing controllers
const complianceController = require('../controllers/complianceReportControllers');
const financialController = require('../controllers/finincialReportController');
const { financialReportSchema, complianceReportSchema } = require('../validators/reportValidators');

// Financial reports
router.get('/financial', financialController.getFinancialReports);
router.post('/financial', validate(financialReportSchema, 'body'), financialController.createFinancialReport); 

// Compliance reports
router.get('/compliance', complianceController.getComplianceReports);
router.post('/compliance', validate(complianceReportSchema, 'body'), complianceController.createComplianceReport);

module.exports = router;