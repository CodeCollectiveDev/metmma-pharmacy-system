const router = require('express').Router();
const db = require('../db');
const { Joi, validate } = require('../../lib/validation');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');

const optional = (schema) => schema.allow('', null).custom(value => value === '' ? null : value);
const logoPattern = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

const profileSchema = Joi.object({
 pharmacyName: Joi.string().trim().min(1).max(120).required(),
 phone: optional(Joi.string().trim().pattern(/^[0-9+\-()\s]{7,30}$/).max(30)),
 email: optional(Joi.string().trim().max(120).email({ tlds: { allow: false } })),
 address: optional(Joi.string().trim().max(300)),
 taxRegistrationNumber: optional(Joi.string().trim().max(100)),
 logoData: optional(Joi.string().trim().max(2000000).custom((value, helper) => {
  if (value === null) return value;
  return logoPattern.test(value) ? value : helper.error('any.invalid');
 }))
}).required();

const selectProfile = `SELECT pharmacy_name AS "pharmacyName",phone,email,address,tax_registration_number AS "taxRegistrationNumber",logo_data AS "logoData",updated_at AS "updatedAt",updated_by AS "updatedBy" FROM pharmacy_profile WHERE id=1`;

router.use(authenticate);

router.get('/', async (req, res) => {
 await db.query(`INSERT INTO pharmacy_profile(id,pharmacy_name) VALUES(1,'METMMA Pharmacy') ON CONFLICT(id) DO NOTHING`);
 const row = (await db.query(selectProfile)).rows[0];
 res.json({ success: true, data: row });
});

router.put('/', authorize(ROLES.ADMIN), validate(profileSchema), async (req, res) => {
 await db.query(`INSERT INTO pharmacy_profile(id,pharmacy_name) VALUES(1,'METMMA Pharmacy') ON CONFLICT(id) DO NOTHING`);
 const profile = (await db.query(`UPDATE pharmacy_profile SET pharmacy_name=$1,phone=$2,email=$3,address=$4,tax_registration_number=$5,logo_data=$6,updated_at=CURRENT_TIMESTAMP,updated_by=$7 WHERE id=1 RETURNING pharmacy_name AS "pharmacyName",phone,email,address,tax_registration_number AS "taxRegistrationNumber",logo_data AS "logoData",updated_at AS "updatedAt",updated_by AS "updatedBy"`, [req.body.pharmacyName, req.body.phone, req.body.email, req.body.address, req.body.taxRegistrationNumber, req.body.logoData, req.user.id])).rows[0];
 res.json({ success: true, data: profile });
});

module.exports = router;
