/**
 * Middleware to check if user has required role(s)
 * @param  {...string} roles - Required roles (user must have at least one)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Check if user has at least one of the required roles
    const hasRole = roles.some((role) => req.user.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has ALL specified roles
 * @param  {...string} roles - All required roles
 */
export const requireAllRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Check if user has all of the required roles
    const hasAllRoles = roles.every((role) => req.user.roles.includes(role));

    if (!hasAllRoles) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${roles.join(" and ")}`,
      });
    }

    next();
  };
};
