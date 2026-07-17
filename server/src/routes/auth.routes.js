import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { login, register, changerMotDePasse } from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.put('/mot-de-passe', requireAuth, changerMotDePasse)

export default router
