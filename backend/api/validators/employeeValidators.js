const Joi = require('joi');

/**
 * Shared validation rules to keep code DRY
 */
const employeeFields = {
  first_name: Joi.string().min(2).max(50).trim(),
  last_name: Joi.string().min(2).max(50).trim(),
  email: Joi.string().trim().email().max(255).lowercase(),
  phone: Joi.string().pattern(/^[0-9+-\s]{10,15}$/),
  department: Joi.string().trim().max(50),
  job_title: Joi.string().trim().max(100),
  role: Joi.string().trim().max(50),
  hire_date: Joi.date().iso().less('now'),
  salary: Joi.number().positive().precision(2)
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
  phone: employeeFields.phone.optional(),
  department: employeeFields.department.required(),
  job_title: employeeFields.job_title.required(),
  role: employeeFields.role.optional(),
  hire_date: Joi.date().iso().default(() => new Date()),
  salary: employeeFields.salary.required()
}).required();

/**
 * Schema for PUT /api/employees/:id (Update)
 * Uses .fork() to make all fields optional for partial updates
 */
const employeeUpdateSchema = employeeCreateSchema.fork(
  Object.keys(employeeFields), 
  (field) => field.optional()
);

module.exports = {
  idParam,
  employeeCreateSchema,
  employeeUpdateSchema
};