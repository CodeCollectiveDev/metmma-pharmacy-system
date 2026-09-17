const Joi = require('joi');

/**
 * Shared validation rules to keep code DRY
 *
 * Contract (single source): the employees table stores the job title in the
 * `role` column, so the API contract uses `role` everywhere — never
 * `job_title`. Departments mirror the pharmacy org chart.
 */
const employeeFields = {
  first_name: Joi.string().min(2).max(50).trim(),
  last_name: Joi.string().min(2).max(50).trim(),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().pattern(/^[0-9+-\s]{10,15}$/),
  department: Joi.string().valid(
    'Pharmacy',
    'Administration',
    'Finance',
    'Human Resources',
    'Operations',
    'Sales',
    'IT'
  ),
  role: Joi.string().max(100),
  hire_date: Joi.date().iso().less('now'),
  salary: Joi.number().positive().precision(2),
  status: Joi.string().valid('active', 'inactive')
};

/**
 * Validate ID parameter (URL params)
 */
const idParam = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Employee ID must be a valid number',
      'any.required': 'Employee ID is required in the URL'
    })
});

/**
 * Schema for POST /api/employees (Creation)
 */
const employeeCreateSchema = Joi.object({
  first_name: employeeFields.first_name.required(),
  last_name: employeeFields.last_name.required(),
  email: employeeFields.email.required(),
  phone: employeeFields.phone.optional().allow('', null),
  department: employeeFields.department.required(),
  role: employeeFields.role.required(),
  hire_date: Joi.date().iso().less('now').default(() => new Date().toISOString().split('T')[0]),
  salary: employeeFields.salary.required(),
  status: employeeFields.status.optional()
});

/**
 * Schema for PUT /api/employees/:id (Update)
 * Uses .fork() to make all fields optional for partial updates
 */
const employeeUpdateSchema = employeeCreateSchema.fork(
  Object.keys(employeeCreateSchema.describe().keys),
  (field) => field.optional()
);

module.exports = {
  idParam,
  employeeCreateSchema,
  employeeUpdateSchema
};