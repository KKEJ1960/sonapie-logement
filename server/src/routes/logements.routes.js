import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as slController from '../controllers/serviceLogement.controller.js'

const router = Router()

// Accessible à tout utilisateur connecté, quel que soit son rôle — utilisé
// pour la galerie/fiche logement côté locataire. Les infos d'occupant ne
// sont jamais exposées ici (voir serviceLogement.controller.js).
router.use(requireAuth)

router.get('/', slController.getLogements)
router.get('/:id', slController.getLogementDetail)

export default router
