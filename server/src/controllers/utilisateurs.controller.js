import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma.js'

const SELECT_SAFE = {
  id: true, nom: true, prenom: true, email: true,
  telephone: true, role: true, typeLocataire: true,
  numeroMatricule: true, actif: true, createdAt: true,
}

// GET /api/admin/utilisateurs
export async function getUtilisateurs(req, res, next) {
  try {
    // Un ADMIN standard ne doit jamais voir les comptes SUPER_ADMIN.
    const where = req.user.role === 'ADMIN' ? { role: { not: 'SUPER_ADMIN' } } : {}

    const users = await prisma.utilisateur.findMany({
      where,
      select: SELECT_SAFE,
      orderBy: { createdAt: 'asc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/utilisateurs
export async function createUtilisateur(req, res, next) {
  try {
    const { nom, prenom, email, telephone, role, password } = req.body

    if (!nom?.trim() || !prenom?.trim() || !email?.trim() || !role || !password) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' })
    }

    if (req.user.role === 'ADMIN' && ['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à créer un compte de ce niveau." })
    }

    const existe = await prisma.utilisateur.findUnique({ where: { email: email.trim() } })
    if (existe) return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' })

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.utilisateur.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        telephone: telephone?.trim() || null,
        role,
        motDePasse: hash,
      },
      select: SELECT_SAFE,
    })
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

// PUT /api/admin/utilisateurs/:id
export async function updateUtilisateur(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    if (id === req.user.id) {
      return res.status(403).json({ message: 'Vous ne pouvez pas modifier votre propre compte via cette interface.' })
    }

    const cible = await prisma.utilisateur.findUnique({ where: { id } })
    if (!cible) return res.status(404).json({ message: 'Utilisateur introuvable.' })

    // Un ADMIN standard ne peut ni modifier un compte SUPER_ADMIN...
    if (cible.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Action non autorisée.' })
    }

    const { nom, prenom, email, telephone, role } = req.body
    if (!nom?.trim() || !prenom?.trim() || !email?.trim() || !role) {
      return res.status(400).json({ message: 'Champs requis manquants.' })
    }

    // Seul un Super Administrateur peut modifier le rôle d'un compte.
    if (req.user.role === 'ADMIN' && role !== cible.role) {
      return res.status(403).json({ message: 'Seul un Super Administrateur peut modifier les rôles.' })
    }

    const user = await prisma.utilisateur.update({
      where: { id },
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        telephone: telephone?.trim() || null,
        role,
      },
      select: SELECT_SAFE,
    })
    res.json(user)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Utilisateur introuvable.' })
    next(err)
  }
}

// PATCH /api/admin/utilisateurs/:id/toggle
export async function toggleUtilisateur(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    if (id === req.user.id) {
      return res.status(403).json({ message: 'Impossible de modifier le statut de votre propre compte.' })
    }

    const existing = await prisma.utilisateur.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Utilisateur introuvable.' })

    // Un ADMIN standard ne peut pas désactiver/réactiver un compte SUPER_ADMIN.
    if (existing.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Action non autorisée.' })
    }

    const user = await prisma.utilisateur.update({
      where: { id },
      data: { actif: !existing.actif },
      select: SELECT_SAFE,
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/admin/utilisateurs/:id
export async function deleteUtilisateur(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    if (id === req.user.id) {
      return res.status(403).json({ message: 'Impossible de supprimer votre propre compte.' })
    }

    await prisma.utilisateur.delete({ where: { id } })
    res.json({ message: 'Compte supprimé avec succès.' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Utilisateur introuvable.' })
    if (err.code === 'P2003') {
      return res.status(409).json({
        message: 'Impossible de supprimer ce compte : il est lié à des paiements ou des photos enregistrées. Désactivez-le plutôt que de le supprimer.',
      })
    }
    next(err)
  }
}
