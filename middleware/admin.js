/* ================================================================
   ROLE-BASED ACCESS MIDDLEWARE
   Hierarchy: ADMIN > REGION_MANAGER > BRANCH_USER
================================================================ */
 
/* ADMIN only */
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};
 
/* REGION_MANAGER only */
export const isRegionManager = (req, res, next) => {
  if (req.user.role !== "REGION_MANAGER") {
    return res.status(403).json({ message: "Region Manager access only" });
  }
  next();
};
 
/* ADMIN or REGION_MANAGER */
export const isAdminOrManager = (req, res, next) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "REGION_MANAGER") {
    return res.status(403).json({ message: "Admin or Region Manager access only" });
  }
  next();
};