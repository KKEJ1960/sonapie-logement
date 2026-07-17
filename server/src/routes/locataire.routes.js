import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import { logAction } from '../middlewares/logActivite.js'
import {
  creerDemandeLogement,
  getMesDemandes,
  annulerDemande,
  supprimerDemande,
  creerDemandeMutation,
  getMesMutations,
  getMonLogement,
  getMesPaiements,
  getMesNotifications,
  marquerNotificationLue,
  marquerToutesNotificationsLues,
  supprimerNotification,
  supprimerNotifications,
  getMesStats,
  changerMotDePasse,
} from '../controllers/locataire.controller.js'

const router = Router()

// Toutes les routes locataire nécessitent d'être authentifié ET d'avoir le rôle LOCATAIRE
router.use(requireAuth, requireRole('LOCATAIRE'))

// ── Demandes de logement ────────────────────────────────────────────────────
router.post('/demandes',
  logAction('CREATION', 'demandes', (req, data) =>
    `A soumis une demande de logement (#${data.id}).`,
  ),
  creerDemandeLogement,
)
router.get('/demandes', getMesDemandes)
router.patch('/demandes/:id/annuler', annulerDemande)
router.delete('/demandes/:id', supprimerDemande)

// ── Mutations ────────────────────────────────────────────────────────────────
router.post('/mutations',
  logAction('CREATION', 'mutations', (req, data) =>
    `A soumis une demande de mutation (#${data.id}).`,
  ),
  creerDemandeMutation,
)
router.get('/mutations', getMesMutations)

// ── Mon logement ─────────────────────────────────────────────────────────────
router.get('/mon-logement', getMonLogement)

// ── Paiements ─────────────────────────────────────────────────────────────────
router.get('/paiements', getMesPaiements)

// ── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', getMesNotifications)
router.patch('/notifications/tout-lu', marquerToutesNotificationsLues)
router.patch('/notifications/:id/lue', marquerNotificationLue)
router.delete('/notifications/:id', supprimerNotification)
router.delete('/notifications', supprimerNotifications)

// ── Statistiques ──────────────────────────────────────────────────────────────
router.get('/stats', getMesStats)

// ── Sécurité du compte ───────────────────────────────────────────────────────
router.put('/mot-de-passe', changerMotDePasse)

export default router
