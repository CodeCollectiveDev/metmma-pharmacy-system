const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceControllers');

router.get('/employee/:employee_id', attendanceController.getAttendanceByEmployee);
router.post('/', attendanceController.addAttendance);

module.exports = router;