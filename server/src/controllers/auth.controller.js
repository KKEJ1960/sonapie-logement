import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils/prisma.js'

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

export async function register(req, res, next) {
  try {
    const { nom, prenom, email, motDePasse, telephone, typeLocataire, numeroMatricule } = req.body

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Nom, prenom, email et mot de passe requis.' })
    }

    if (!typeLocataire || !['PRIVE', 'FONCTIONNAIRE'].includes(typeLocataire)) {
      return res.status(400).json({ message: 'Le type de locataire est requis (PRIVE ou FONCTIONNAIRE).' })
    }

    const existingUser = await prisma.utilisateur.findUnique({ where: { email } })

    if (existingUser) {
      return res.status(409).json({ message: 'Cet email est deja utilise.' })
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10)
    const user = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        telephone: telephone || null,
        role: 'LOCATAIRE',
        typeLocataire,
        numeroMatricule: typeLocataire === 'FONCTIONNAIRE' ? (numeroMatricule || null) : null,
        motDePasse: hashedPassword,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        typeLocataire: true,
        createdAt: true,
      },
    })

    return res.status(201).json({ user, token: signToken(user) })
  } catch (error) {
    return next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, motDePasse } = req.body

    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' })
    }

    const user = await prisma.utilisateur.findUnique({ where: { email } })

    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides.' })
    }

    const isValidPassword = await bcrypt.compare(motDePasse, user.motDePasse)

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Identifiants invalides.' })
    }

    const { motDePasse: _password, ...safeUser } = user

    return res.json({ user: safeUser, token: signToken(user) })
  } catch (error) {
    return next(error)
  }
}

// PUT /api/auth/mot-de-passe — accessible à tout utilisateur authentifié, quel que soit son rôle.
export async function changerMotDePasse(req, res, next) {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body

    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({ message: 'Ancien et nouveau mot de passe sont requis.' })
    }
    if (nouveauMotDePasse.length < 8) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
    }

    const user = await prisma.utilisateur.findUnique({ where: { id: req.user.id } })
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })

    const motDePasseValide = await bcrypt.compare(ancienMotDePasse, user.motDePasse)
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' })
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 12)
    await prisma.utilisateur.update({ where: { id: user.id }, data: { motDePasse: hash } })

    return res.json({ message: 'Mot de passe mis à jour.' })
  } catch (error) {
    return next(error)
  }
}
