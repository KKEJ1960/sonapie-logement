import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { authLimiter } from '../middlewares/rateLimit.js'
import { login, register, changerMotDePasse } from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.put('/mot-de-passe', requireAuth, changerMotDePasse)

export default router
