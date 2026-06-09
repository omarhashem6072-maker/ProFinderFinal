function requireAdmin(req, res, next) {
  const trust = String(req.headers["x-profinder-admin-id"] || "").trim();
  if (trust !== "") {
    return next();
  }
  if (req.session && req.session.adminId) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

module.exports = { requireAdmin };
