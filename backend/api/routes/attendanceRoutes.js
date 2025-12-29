const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceControllers');
const { attendanceSchema, employeeIdParam } = require('../validators/attendanceValidators');

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

router.get('/employee/:employee_id', validateSchema(employeeIdParam, 'params'), attendanceController.getAttendanceByEmployee);
router.post('/', validateSchema(attendanceSchema, 'body'), attendanceController.addAttendance);

module.exports = router; 