const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');

router.get('/', employeesController.getEmployees);
router.get('/:id', employeesController.getEmployeeById);
router.post('/', employeesController.addEmployee);
router.put('/:id', employeesController.updateEmployee);
router.delete('/:id', employeesController.deleteEmployee);
module.exports = router;