import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import * as superAdminController from '../controllers/superAdmin.controller.js'

const router = Router()

// Toutes les routes super-admin nécessitent d'être authentifié ET SUPER_ADMIN.
router.use(requireAuth, requireRole('SUPER_ADMIN'))

router.get('/health', superAdminController.getHealthCheck)
router.get('/logs', superAdminController.getLogs)
router.get('/utilisateurs', superAdminController.getAllUtilisateurs)
router.get('/utilisateurs/:id', superAdminController.getUtilisateurDetail)
router.post('/utilisateurs/:id/reset-password', superAdminController.resetMotDePasse)
router.put('/tickets/:id/forcer-statut', superAdminController.forcerStatutTicket)
router.put('/demandes/:id/forcer-statut', superAdminController.forcerStatutDemande)

export default router
