import rateLimit from 'express-rate-limit'

// Limite les tentatives de connexion/inscription par IP pour freiner le
// brute-force — ces routes n'exigent pas d'authentification, elles sont donc
// la cible la plus exposée.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
})
