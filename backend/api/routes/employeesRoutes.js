const express = require('express');
const router = express.Router();

const employeesController = require('../controllers/employeesController');
const {
  employeeCreateSchema,
  employeeUpdateSchema,
  idParam
} = require('../validators/employeeValidators');

const {
  authenticate,
  authorize,
  ROLES
} = require('../../middleware/roleMiddleware');

/**
 * Generic validation middleware
 */
const validateSchema = (schema, prop = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[prop], {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(d => ({
        message: d.message,
        path: d.path
      }))
    });
  }

  req[prop] = value;
  next();
};

/**
 * Routes
 */

// GET /api/employees - Super Admin & HR
router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER),
  employeesController.getEmployees
);

// GET /api/employees/:id - Super Admin & HR
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER),
  validateSchema(idParam, 'params'),
  employeesController.getEmployeeById
);

// POST /api/employees - Super Admin & HR
router.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER),
  validateSchema(employeeCreateSchema, 'body'),
  employeesController.addEmployee
);

// PUT /api/employees/:id - Super Admin & HR
router.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER),
  validateSchema(idParam, 'params'),
  validateSchema(employeeUpdateSchema, 'body'),
  employeesController.updateEmployee
);

// DELETE /api/employees/:id - Super Admin & HR
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER),
  validateSchema(idParam, 'params'),
  employeesController.deleteEmployee
);

module.exports = router;
