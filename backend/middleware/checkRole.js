module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Scope requires one of the following permissions: [${allowedRoles.join(', ')}]` 
      });
    }
    next();
  };
};