const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceControllers');
const { attendanceSchema, employeeIdParam } = require('../validators/attendanceValidators');
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

router.get('/employee/:employee_id', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER, ROLES.STORE_MANAGER, ROLES.PHARMACIST_MANAGER, ROLES.PHARMACIST), validateSchema(employeeIdParam, 'params'), attendanceController.getAttendanceByEmployee);
router.get('/by-date', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER), attendanceController.getAttendanceByDate);
router.get('/leave/current', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER), attendanceController.getCurrentLeave);
router.get('/leave/requests', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER), attendanceController.getLeaveRequests);
router.post('/leave', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER), attendanceController.createLeave);
router.patch('/leave/:id/status', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER), attendanceController.updateLeaveStatus);
router.post('/', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.HR_OFFICER, ROLES.STORE_MANAGER, ROLES.PHARMACIST_MANAGER), validateSchema(attendanceSchema, 'body'), attendanceController.addAttendance);

module.exports = router;
