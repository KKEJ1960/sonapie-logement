import { Router } from 'express'
import { prisma } from '../utils/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  // TiDB Serverless réduit son calcul à zéro en l'absence de requêtes : la
  // première requête sur une connexion froide peut prendre plus d'une seconde
  // (mesuré : ~1.7s à froid contre ~200ms une fois la connexion établie). Ce
  // ping DB, pas seulement applicatif, permet au keep-alive planifié de
  // maintenir aussi TiDB éveillé, pas uniquement le process Node sur Render.
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ok',
      message: 'API SONAPIE operationnelle',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      message: 'Base de données injoignable.',
      timestamp: new Date().toISOString(),
    })
  }
})

export default router
