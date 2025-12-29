const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const { employeeCreateSchema, employeeUpdateSchema, idParam } = require('../validators/employeeValidators');

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

router.get('/', employeesController.getEmployees);
router.get('/:id', validateSchema(idParam, 'params'), employeesController.getEmployeeById);
router.post('/', validateSchema(employeeCreateSchema, 'body'), employeesController.addEmployee);
router.put('/:id', validateSchema(idParam, 'params'), validateSchema(employeeUpdateSchema, 'body'), employeesController.updateEmployee);
router.delete('/:id', validateSchema(idParam, 'params'), employeesController.deleteEmployee);
module.exports = router; 