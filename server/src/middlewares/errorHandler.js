export function errorHandler(error, req, res, next) {
  console.error(error)

  const status = error.status || 500
  // En prod, ne jamais renvoyer le message brut d'une erreur interne inattendue
  // (500) au client — il peut contenir des détails internes (Prisma, chemins de
  // fichiers, etc.). Les erreurs volontaires (4xx, avec un message métier) restent
  // affichées normalement, dans tous les environnements.
  const exposerMessage = status < 500 || process.env.NODE_ENV !== 'production'

  return res.status(status).json({
    message: exposerMessage ? (error.message || 'Erreur serveur.') : 'Erreur serveur.',
  })
}
