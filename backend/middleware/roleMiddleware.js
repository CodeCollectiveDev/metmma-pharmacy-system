const jwt = require('jsonwebtoken');
const db = require('../api/db');
const { AppError } = require('../lib/errors');
const authenticate = async (req,res,next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('SESSION_EXPIRED',401));
  let decoded;
  try { decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return next(new AppError('SESSION_EXPIRED',401)); }
  try {
    const result = await db.query('SELECT id, username, role, is_active FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user || !user.is_active || user.role !== decoded.role) return next(new AppError('SESSION_EXPIRED',401));
    req.user = user; next();
  } catch (err) { next(err); }
};
const authorize = (...roles) => (req,res,next) => { if (!req.user) return next(new AppError('SESSION_EXPIRED',401)); if (!roles.includes(req.user.role)) return next(new AppError('PERMISSION_DENIED',403)); next(); };
const ROLES = { ADMIN:'admin', PHARMACIST:'pharmacist', CASHIER:'cashier', STORE_MANAGER:'store_manager', HR_OFFICER:'hr_officer' };
module.exports = { authenticate, authorize, ROLES, requireRole: (...roles) => [authenticate, authorize(...roles)] };
