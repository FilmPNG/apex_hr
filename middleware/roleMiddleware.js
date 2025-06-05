function isSuperAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') return next();
  return res.status(403).json({ message: 'Access denied: Superadmin only' });
}

function isAdmin(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) return next();
  // ให้ superadmin ผ่านได้ด้วย
  return res.status(403).json({ message: 'Access denied: Admin only' });
}

function isEmployee(req, res, next) {
  if (req.user && ['employee', 'admin', 'superadmin'].includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Access denied: Employee only' });
}

module.exports = { isSuperAdmin, isAdmin, isEmployee };
