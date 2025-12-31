const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');

// GET /api/employees - Admin and HR can view all employees
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.HR_OFFICER), employeesController.getEmployees);

// GET /api/employees/:id - Admin and HR can view single employee
router.get('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.HR_OFFICER), employeesController.getEmployeeById);

// POST /api/employees - Only Admin can add employees
router.post('/', authenticate, authorize(ROLES.ADMIN), employeesController.addEmployee);

// PUT /api/employees/:id - Only Admin can update employees
router.put('/:id', authenticate, authorize(ROLES.ADMIN), employeesController.updateEmployee);

// DELETE /api/employees/:id - Only Admin can delete employees
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), employeesController.deleteEmployee);

module.exports = router;