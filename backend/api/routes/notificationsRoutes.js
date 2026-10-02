const router=require('express').Router();
const c=require('../controllers/notificationsController');
const {Joi,validate,pageQuery}=require('../../lib/validation');
router.use(require('../../middleware/roleMiddleware').authenticate);
router.get('/',validate(pageQuery,'query'),c.getNotifications);
router.post('/read-all',c.readAllNotifications);
router.post('/:id/read',validate(Joi.object({id:Joi.string().pattern(/^[a-f0-9]{32}$/).required()}),'params'),c.readNotification);
module.exports=router;
