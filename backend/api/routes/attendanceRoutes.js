const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceControllers');
const validate = require('../middleware/validate');
const { attendanceSchema, employeeIdParam } = require('../validators/attendanceValidators');

router.get('/employee/:employee_id', validate(employeeIdParam, 'params'), attendanceController.getAttendanceByEmployee);
router.post('/', validate(attendanceSchema, 'body'), attendanceController.addAttendance);

module.exports = router;