const Joi = require('joi');

/**
 * Financial Report Validation
 * Focuses on monetary accuracy and reporting periods
 */
const financialReportSchema = Joi.object({
  report_name: Joi.string().min(3).max(100).required().trim(),
  
  type: Joi.string().valid('Monthly', 'Quarterly', 'Annual', 'Tax').required(),
  
  total_revenue: Joi.number().precision(2).min(0).required(),
  
  total_expenses: Joi.number().precision(2).min(0).required(),
  
  net_profit: Joi.number().precision(2).required(),
  
  currency: Joi.string().length(3).uppercase().default('USD'),
  
  period_start: Joi.date().iso().required(),
  
  period_end: Joi.date().iso().min(Joi.ref('period_start')).required()
    .messages({
      'date.min': 'Period end date cannot be before the start date'
    }),
    
  notes: Joi.string().max(500).allow('', null)
});

/**
 * Compliance Report Validation
 * Focuses on regulatory status and audit trails
 */
const complianceReportSchema = Joi.object({
  policy_name: Joi.string().required().trim(),
  
  status: Joi.string().valid('Compliant', 'Non-Compliant', 'Under Review', 'Pending').required(),
  
  auditor_name: Joi.string().min(2).required(),
  
  last_audit_date: Joi.date().iso().max('now').required()
    .messages({
      'date.max': 'Audit date cannot be in the future'
    }),
    
  next_audit_date: Joi.date().iso().greater(Joi.ref('last_audit_date')).optional(),
  
  findings: Joi.array().items(Joi.string()).optional(),
  
  risk_level: Joi.string().valid('Low', 'Medium', 'High', 'Critical').default('Low')
});

module.exports = {
  financialReportSchema,
  complianceReportSchema
};