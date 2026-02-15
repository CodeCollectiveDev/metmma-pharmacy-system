const Joi = require('joi');

/**
 * Validates the body for adding a new attendance record
 * Fields: employee_id, date, status (e.g., Present, Absent), and optional notes
 */
const attendanceSchema = Joi.object({
  employee_id: Joi.number().integer().required()
    .messages({
      'number.base': 'Employee ID must be a number',
      'any.required': 'Employee ID is required'
    }),
  
  date: Joi.date().iso().required()
    .messages({
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'Date is required'
    }),
  
  status: Joi.string().valid('Present', 'Absent', 'Late', 'Excused').required()
    .messages({
      'any.only': 'Status must be one of: Present, Absent, Late, or Excused'
    }),
    
  check_in: Joi.string().regex(/^([0-9]{2}):([0-9]{2})$/).optional()
    .description('Time in HH:mm format'),

  notes: Joi.string().max(255).allow('', null).optional()
});

/**
 * Validates the URL parameters (e.g., /employee/123)
 */
const employeeIdParam = Joi.object({
  employee_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'The employee ID in the URL must be a number',
      'any.required': 'Employee ID parameter is missing'
    })
});

module.exports = {
  attendanceSchema,
  employeeIdParam
};