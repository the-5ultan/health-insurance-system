module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You are not authorized to perform this action. Sufficient permissions not detected.' 
      });
    }
    next();
  };
};