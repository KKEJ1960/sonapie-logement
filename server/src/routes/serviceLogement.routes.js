import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import { logAction } from '../middlewares/logActivite.js'
import { uploadLogement } from '../middlewares/upload.js'
import * as slController from '../controllers/serviceLogement.controller.js'

const router = Router()

// Toutes les routes de ce fichier nécessitent d'être authentifié
// ET d'avoir le rôle SERVICE_LOGEMENT (SUPER_ADMIN peut superviser sans
// avoir besoin d'un compte Service Logement séparé).
router.use(requireAuth, requireRole('SERVICE_LOGEMENT', 'SUPER_ADMIN'))

router.get('/stats', slController.getStats)

router.get('/logements', slController.getLogements)
router.post('/logements',
  logAction('CREATION', 'logements', (req, data) => `A créé le logement ${data.code}.`),
  slController.creerLogement,
)
router.get('/logements/:id', slController.getLogementDetail)
router.put('/logements/:id',
  logAction('MODIFICATION', 'logements', (req, data) => `A modifié le logement ${data.code} (#${data.id}).`),
  slController.modifierLogement,
)
router.delete('/logements/:id',
  logAction('SUPPRESSION', 'logements', (req) => `A supprimé le logement #${req.params.id}.`),
  slController.supprimerLogement,
)

router.post('/logements/:id/photos',
  (req, res, next) => uploadLogement.single('photo')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message || 'Erreur lors de l\'upload.' })
    next()
  }),
  slController.uploaderPhotoLogement,
)
router.delete('/logements/:id/photos/:photoId', slController.supprimerPhotoLogement)
router.put('/logements/:id/photos/ordre', slController.reordonnerPhotos)

router.get('/demandes', slController.getDemandesATraiter)

router.post('/logements/:id/notifier-alertes', slController.notifierAlertesDisponibilite)

export default router
