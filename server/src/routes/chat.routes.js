import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/requireRole.js'
import * as chat from '../controllers/chat.controller.js'

const router = Router()

router.use(requireAuth)

router.post('/', chat.creerOuGetConversation)
router.get('/', chat.getConversations)
router.get('/non-lus', chat.getNombreNonLus)
router.get('/rendez-vous', chat.getRendezVous)
router.get('/:id/messages', chat.getMessages)
router.patch('/:id/prendre-en-charge', requireRole('SERVICE_LOGEMENT'), chat.prendreEnCharge)
router.patch('/:id/terminer', requireRole('SERVICE_LOGEMENT', 'ADMIN', 'SUPER_ADMIN'), chat.terminerConversation)

export default router
