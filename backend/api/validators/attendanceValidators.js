const Joi = require('joi');

/**
 * Validates the body for adding/updating an attendance record
 * Fields: employee_id, date, status, check_in_time/check_in, and optional notes
 */
const attendanceSchema = Joi.object({
  employee_id: Joi.number().integer().required()
    .messages({
      'number.base': 'Employee ID must be a number',
      'any.required': 'Employee ID is required'
    }),
  
  date: Joi.alternatives().try(
    Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    Joi.date().iso()
  ).required()
    .messages({
      'any.required': 'Date is required'
    }),
  
  status: Joi.string()
    .valid(
      'present', 'absent', 'late', 'leave', 'holiday', 'excused',
      'Present', 'Absent', 'Late', 'Leave', 'Holiday', 'Excused'
    )
    .required()
    .messages({
      'any.only': 'Status must be one of: present, absent, late, leave, holiday, excused'
    }),
    
  check_in: Joi.string().regex(/^([0-9]{2}):([0-9]{2})(:[0-9]{2})?$/).optional()
    .description('Time in HH:mm or HH:mm:ss format'),

  check_in_time: Joi.string().regex(/^([0-9]{2}):([0-9]{2})(:[0-9]{2})?$/).optional()
    .description('Time in HH:mm or HH:mm:ss format'),

  notes: Joi.string().max(255).allow('', null).optional()
});

/**
 * Validates the URL parameters (e.g., /employee/123 or /123)
 */
const employeeIdParam = Joi.object({
  employee_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'The employee ID must be a number',
      'any.required': 'Employee ID parameter is missing'
    })
});

/**
 * Validates query parameters for fetching attendance list (e.g., /?date=2026-09-08)
 */
const attendanceQuerySchema = Joi.object({
  date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employee_id: Joi.number().integer().positive().optional(),
  start_date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

module.exports = {
  attendanceSchema,
  employeeIdParam,
  attendanceQuerySchema
};