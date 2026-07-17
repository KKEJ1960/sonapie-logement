import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import {
  getDemandesDirection,
  getMutationsEnAttente,
  validerDemande,
  rejeterDemande,
  validerMutation,
  rejeterMutation,
  getStatistiquesDirection,
  getNotifications,
  marquerNotificationLue,
  marquerToutLu,
  supprimerNotification,
  supprimerNotifications,
} from '../controllers/direction.controller.js'

const router = Router()

// Toutes les routes direction nécessitent d'être authentifié ET d'avoir le rôle DIRECTION
// (SUPER_ADMIN peut superviser sans avoir besoin d'un compte Direction séparé)
router.use(requireAuth, requireRole('DIRECTION', 'SUPER_ADMIN'))

router.get('/stats',    getStatistiquesDirection)
router.get('/demandes', getDemandesDirection)
router.get('/mutations', getMutationsEnAttente)

router.put('/demandes/:id/valider',  validerDemande)
router.put('/demandes/:id/rejeter',  rejeterDemande)
router.put('/mutations/:id/valider', validerMutation)
router.put('/mutations/:id/rejeter', rejeterMutation)

router.get('/notifications', getNotifications)
router.patch('/notifications/tout-lu', marquerToutLu)
router.patch('/notifications/:id/lue', marquerNotificationLue)
router.delete('/notifications/:id', supprimerNotification)
router.delete('/notifications', supprimerNotifications)

export default router
