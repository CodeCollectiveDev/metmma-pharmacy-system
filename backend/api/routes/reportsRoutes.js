const express = require('express');
const router = express.Router();

const complianceController = require('../controllers/complianceReportControllers');
const financialController = require('../controllers/finincialReportController');
const { getRecentActivity } = require('../controllers/recentActivityController');
const { financialReportSchema, complianceReportSchema } = require('../validators/reportValidators');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');

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

router.get('/financial', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST, ROLES.HR_OFFICER), financialController.getFinancialReports);
router.post('/financial', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER), validateSchema(financialReportSchema, 'body'), financialController.createFinancialReport);

router.get('/compliance', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST, ROLES.HR_OFFICER), complianceController.getComplianceReports);
router.post('/compliance', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER), validateSchema(complianceReportSchema, 'body'), complianceController.createComplianceReport);

router.get('/recent-activity', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST, ROLES.HR_OFFICER, ROLES.CASHIER), getRecentActivity);

module.exports = router;
