export function requireRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise.' })
    }
    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé : rôle insuffisant.' })
    }
    next()
  }
}
