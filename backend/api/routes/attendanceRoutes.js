const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceControllers');
const { 
  attendanceSchema, 
  employeeIdParam, 
  attendanceQuerySchema 
} = require('../validators/attendanceValidators');
const {
  authenticate,
  authorize,
  ROLES
} = require('../../middleware/roleMiddleware');

// Local inline Joi validator helper
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

// Protect all attendance endpoints with JWT authentication and Admin/HR Officer authorization
router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.HR_OFFICER));

// GET /api/attendance - Fetch all attendance records (supports ?date=YYYY-MM-DD, ?employee_id=1, etc.)
router.get('/', validateSchema(attendanceQuerySchema, 'query'), attendanceController.getAllAttendance);

// GET /api/attendance/employee/:employee_id - Fetch attendance by employee ID
router.get('/employee/:employee_id', validateSchema(employeeIdParam, 'params'), attendanceController.getAttendanceByEmployee);

// GET /api/attendance/:employee_id - Fetch attendance by employee ID (direct parameter)
router.get('/:employee_id', validateSchema(employeeIdParam, 'params'), attendanceController.getAttendanceByEmployee);

// POST /api/attendance - Add or update attendance record
router.post('/', validateSchema(attendanceSchema, 'body'), attendanceController.addAttendance);

module.exports = router; 