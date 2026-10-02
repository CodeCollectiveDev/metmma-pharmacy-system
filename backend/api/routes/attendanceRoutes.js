const router=require('express').Router();
const c=require('../controllers/attendanceControllers');
const {attendanceSchema,employeeIdParam}=require('../validators/attendanceValidators');
const {validate,pageQuery}=require('../../lib/validation');
const {authenticate,authorize,ROLES}=require('../../middleware/roleMiddleware');
router.use(authenticate);
router.get('/employee/:employee_id',authorize(ROLES.ADMIN,ROLES.HR_OFFICER,ROLES.STORE_MANAGER,ROLES.PHARMACIST),validate(employeeIdParam,'params'),validate(pageQuery,'query'),c.getAttendanceByEmployee);
router.post('/',authorize(ROLES.ADMIN,ROLES.HR_OFFICER,ROLES.STORE_MANAGER),validate(attendanceSchema),c.addAttendance);
module.exports=router;
