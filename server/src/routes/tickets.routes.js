import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import {
  creerTicket,
  getTicketsByRole,
  getTicketDetail,
  programmerConstat,
  effectuerConstat,
  choisirModeReparation,
  assignerTechnicien,
  confirmerReparationLocataire,
  verifierEtCloturer,
} from '../controllers/maintenance.controller.js'

const router = Router()

// Toutes les routes tickets nécessitent d'être authentifié
router.use(requireAuth)

// ─── Lecture ───────────────────────────────────────────────────────────────────
router.get('/',   getTicketsByRole)
router.get('/:id', getTicketDetail)

// ─── Création (LOCATAIRE uniquement) ──────────────────────────────────────────
router.post('/', requireRole('LOCATAIRE'), creerTicket)

// ─── Circuit constat ───────────────────────────────────────────────────────────
router.put('/:id/programmer-constat',
  requireRole('RESPONSABLE', 'ADMIN', 'SUPER_ADMIN'),
  programmerConstat,
)

router.put('/:id/effectuer-constat',
  requireRole('TECHNICIEN', 'RESPONSABLE', 'ADMIN', 'SUPER_ADMIN'),
  effectuerConstat,
)

// ─── Choix du locataire ────────────────────────────────────────────────────────
router.put('/:id/choix-reparation',
  requireRole('LOCATAIRE'),
  choisirModeReparation,
)

// ─── Branche SONAPIE : assignation technicien ─────────────────────────────────
router.put('/:id/assigner-technicien',
  requireRole('RESPONSABLE', 'ADMIN', 'SUPER_ADMIN'),
  assignerTechnicien,
)

// ─── Branche LOCATAIRE : confirmation réparation ─────────────────────────────
router.put('/:id/confirmer-reparation',
  requireRole('LOCATAIRE'),
  confirmerReparationLocataire,
)

// ─── Vérification finale ───────────────────────────────────────────────────────
router.put('/:id/verifier',
  requireRole('RESPONSABLE', 'ADMIN', 'SUPER_ADMIN'),
  verifierEtCloturer,
)

export default router
