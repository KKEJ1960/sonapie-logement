import { prisma } from '../utils/prisma.js'

// Middleware générique : journalise une action dans LogActivite si la requête
// aboutit (status 2xx) et qu'un utilisateur authentifié est identifié.
export function logAction(typeAction, module, getDescription) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        prisma.logActivite.create({
          data: {
            utilisateurId: req.user.id,
            typeAction,
            module,
            description: getDescription(req, data),
            adresseIp: req.ip || req.socket?.remoteAddress || null,
          },
        }).catch(err => {
          // Le log ne doit jamais bloquer ni faire échouer la réponse.
          console.warn('Log failed:', err.message)
        })
      }
      return originalJson(data)
    }

    next()
  }
}
