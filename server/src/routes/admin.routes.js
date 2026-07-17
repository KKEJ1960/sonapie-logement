import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import { logAction } from '../middlewares/logActivite.js'
import {
  getDashboardStats,
  getDemandesMensuelles,
  getDemandesAdmin,
  approuverDemande,
  rejeterDemande,
  getMutationsAdmin,
  approuverMutation,
  rejeterMutation,
  getNotifications,
  marquerNotificationLue,
  marquerToutLu,
  supprimerNotification,
  supprimerNotifications,
} from '../controllers/admin.controller.js'
import {
  getUtilisateurs,
  createUtilisateur,
  updateUtilisateur,
  toggleUtilisateur,
  deleteUtilisateur,
} from '../controllers/utilisateurs.controller.js'

const router = Router()

// ── Dashboard ──────────────────────────────────────────────────────────────────
router.get('/stats',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  getDashboardStats,
)

router.get('/stats/demandes-mensuelles',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  getDemandesMensuelles,
)

// ── Demandes (lecture, pour le dashboard admin) ─────────────────────────────────
router.get('/demandes',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  getDemandesAdmin,
)

// Attribution d'un logement à une demande validée par la Direction (EN_ETUDE_LOGEMENT → APPROUVEE).
// Réservé au Service Logement (via son propre workflow) ou au Super Administrateur en dernier recours —
// un ADMIN standard ne doit plus pouvoir attribuer de logement.
router.put('/demandes/:id/approuver',
  requireAuth, requireRole('SUPER_ADMIN'),
  logAction('VALIDATION', 'demandes', (req, data) =>
    `A approuvé la demande #${data.id} et attribué le logement ${data.logement?.code || `#${req.body.logementId}`}.`,
  ),
  approuverDemande,
)

// Rejet d'une demande à l'étape logement : réservé à SUPER_ADMIN, comme l'attribution
// (DemandesAdmin.jsx est désormais une consultation en lecture seule pour ADMIN).
router.put('/demandes/:id/rejeter',
  requireAuth, requireRole('SUPER_ADMIN'),
  logAction('REJET', 'demandes', (req, data) => `A rejeté la demande #${data.id}.`),
  rejeterDemande,
)

// ── Mutations ────────────────────────────────────────────────────────────────
router.get('/mutations',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  getMutationsAdmin,
)

router.put('/mutations/:id/approuver',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  logAction('VALIDATION', 'mutations', (req, data) => `A approuvé la mutation #${data.id}.`),
  approuverMutation,
)

router.put('/mutations/:id/rejeter',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  logAction('REJET', 'mutations', (req, data) => `A rejeté la mutation #${data.id}.`),
  rejeterMutation,
)

// ── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  getNotifications,
)
router.patch('/notifications/tout-lu',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  marquerToutLu,
)
router.patch('/notifications/:id/lue',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  marquerNotificationLue,
)
router.delete('/notifications/:id',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  supprimerNotification,
)
router.delete('/notifications',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  supprimerNotifications,
)

// ── Utilisateurs ───────────────────────────────────────────────────────────────
router.get('/utilisateurs',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  getUtilisateurs,
)

// SUPER_ADMIN et ADMIN peuvent tous deux créer des comptes ; le contrôleur
// restreint les rôles qu'un ADMIN (non SUPER_ADMIN) a le droit d'attribuer.
router.post('/utilisateurs',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  logAction('CREATION', 'utilisateurs', (req, data) =>
    `A créé le compte ${data.role} : ${data.prenom} ${data.nom} (${data.email})`,
  ),
  createUtilisateur,
)

router.put('/utilisateurs/:id',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  updateUtilisateur,
)

router.patch('/utilisateurs/:id/toggle',
  requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'),
  logAction('MODIFICATION', 'utilisateurs', (req, data) =>
    `A ${data.actif ? 'réactivé' : 'désactivé'} le compte #${req.params.id}`,
  ),
  toggleUtilisateur,
)

// Suppression de compte : action sensible réservée à SUPER_ADMIN.
router.delete('/utilisateurs/:id',
  requireAuth, requireRole('SUPER_ADMIN'),
  logAction('SUPPRESSION', 'utilisateurs', (req) =>
    `A supprimé le compte utilisateur #${req.params.id}`,
  ),
  deleteUtilisateur,
)

export default router
