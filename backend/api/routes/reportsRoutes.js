// In api/routes/reportsRoutes.js, change to:
const express = require('express');
const router = express.Router();

// Use the existing controllers
const complianceController = require('../controllers/complianceReportControllers');
const financialController = require('../controllers/finincialReportController');
const { getRecentActivity } = require('../controllers/recentActivityController');
const { financialReportSchema, complianceReportSchema } = require('../validators/reportValidators');

const validateSchema = (schema, prop = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[prop], { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map((d) => ({ message: d.message, path: d.path }))
    });
  }
  req[prop] = value;
  next();
};

// Financial reports
router.get('/financial', financialController.getFinancialReports);
router.post('/financial', validateSchema(financialReportSchema, 'body'), financialController.createFinancialReport); 

// Compliance reports
router.get('/compliance', complianceController.getComplianceReports);
router.post('/compliance', validateSchema(complianceReportSchema, 'body'), complianceController.createComplianceReport);

// Recent activity feed
router.get('/recent-activity', getRecentActivity);

module.exports = router;