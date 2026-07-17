import { prisma } from '../utils/prisma.js'

/**
 * Crée une notification pour un utilisateur.
 * @param {{ utilisateurId: number, message: string, type?: string, lien?: string }} opts
 */
export async function creerNotification({ utilisateurId, message, type = 'INFO', lien = null }) {
  return prisma.notification.create({
    data: { utilisateurId, message, type, lien },
  })
}

/**
 * Crée une notification pour tous les utilisateurs ayant le rôle indiqué.
 * @param {{ role: string, message: string, type?: string, lien?: string }} opts
 */
export async function notifierRole({ role, message, type = 'INFO', lien = null }) {
  const cibles = await prisma.utilisateur.findMany({
    where: { role, actif: true },
    select: { id: true },
  })

  if (!cibles.length) return []

  return prisma.notification.createMany({
    data: cibles.map(u => ({ utilisateurId: u.id, message, type, lien })),
  })
}

/**
 * Crée une notification pour tous les utilisateurs actifs ayant l'un des rôles indiqués.
 * @param {string[]} roles
 * @param {string} message
 * @param {string} [type]
 * @param {string|null} [lien]
 */
export async function notifierRoles(roles, message, type = 'INFO', lien = null) {
  const cibles = await prisma.utilisateur.findMany({
    where: { role: { in: roles }, actif: true },
    select: { id: true },
  })

  if (!cibles.length) return []

  return prisma.notification.createMany({
    data: cibles.map(u => ({ utilisateurId: u.id, message, type, lien })),
  })
}
