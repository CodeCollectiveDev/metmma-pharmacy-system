const express = require('express');
const router = express.Router();

// Use the existing controllers
const complianceController = require('../controllers/complianceReportControllers');
const financialController = require('../controllers/finincialReportController');
const { getRecentActivity } = require('../controllers/recentActivityController');
const { financialReportSchema, complianceReportSchema } = require('../validators/reportValidators');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');
const { checkAndRefreshSession } = require('../../middleware/sessionMiddleware');

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
router.get('/financial', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST), checkAndRefreshSession, financialController.getFinancialReports);
router.post('/financial', authenticate, authorize(ROLES.ADMIN), checkAndRefreshSession, validateSchema(financialReportSchema, 'body'), financialController.createFinancialReport); 

// Compliance reports
router.get('/compliance', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER), checkAndRefreshSession, complianceController.getComplianceReports);
router.post('/compliance', authenticate, authorize(ROLES.ADMIN), checkAndRefreshSession, validateSchema(complianceReportSchema, 'body'), complianceController.createComplianceReport);

// Recent activity feed - accessible to all authenticated users
router.get('/recent-activity', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.CASHIER, ROLES.STORE_MANAGER, ROLES.HR_OFFICER), checkAndRefreshSession, getRecentActivity);

module.exports = router;