import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import { logAction } from '../middlewares/logActivite.js'
import uploadDocument from '../middlewares/uploadDocument.js'
import * as dossier from '../controllers/dossier.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', requireRole('DIRECTION', 'ADMIN', 'SUPER_ADMIN'), dossier.getDossiersDirection)
router.get('/historique', requireRole('DIRECTION', 'ADMIN', 'SUPER_ADMIN'), dossier.getHistoriqueDossiers)
router.get('/:demandeId/export-pdf', requireRole('DIRECTION', 'ADMIN', 'SUPER_ADMIN'), dossier.exporterDossierPDF)
router.get('/:demandeId', dossier.getDossier)
router.put('/:demandeId', requireRole('LOCATAIRE'), dossier.creerOuMettreAJourDossier)

router.post('/:demandeId/soumettre',
  requireRole('LOCATAIRE'),
  logAction('CREATION', 'dossiers', (req, data) => `A soumis un dossier pour la demande #${data.demandeId}.`),
  dossier.soumetteDossier,
)

router.post('/:demandeId/documents',
  requireRole('LOCATAIRE'),
  (req, res, next) => uploadDocument.single('document')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message || "Erreur lors de l'upload." })
    next()
  }),
  dossier.uploaderDocument,
)

router.delete('/documents/:documentId', requireRole('LOCATAIRE'), dossier.supprimerDocument)
router.patch('/documents/:documentId/valider', requireRole('DIRECTION'), dossier.validerDocument)

router.patch('/:demandeId/en-etude',
  requireRole('DIRECTION', 'ADMIN', 'SUPER_ADMIN'),
  dossier.marquerEnEtude,
)

router.patch('/:demandeId/valider',
  requireRole('DIRECTION', 'ADMIN', 'SUPER_ADMIN'),
  logAction('VALIDATION', 'dossiers', (req, data) => `A validé le dossier de la demande #${data.demandeId}.`),
  dossier.validerDossier,
)

router.patch('/:demandeId/rejeter',
  requireRole('DIRECTION', 'ADMIN', 'SUPER_ADMIN'),
  logAction('REJET', 'dossiers', (req, data) => `A rejeté le dossier de la demande #${data.demandeId}.`),
  dossier.rejeterDossier,
)

export default router
