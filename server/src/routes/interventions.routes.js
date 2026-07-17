import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import {
  demarrerIntervention,
  cloturerParTechnicien,
} from '../controllers/maintenance.controller.js'

const router = Router()

router.use(requireAuth)

// ─── Actions du technicien sur son intervention ───────────────────────────────
router.put('/:id/demarrer', requireRole('TECHNICIEN'), demarrerIntervention)
router.put('/:id/cloturer', requireRole('TECHNICIEN'), cloturerParTechnicien)

export default router
