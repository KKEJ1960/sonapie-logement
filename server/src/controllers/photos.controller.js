import { prisma } from '../utils/prisma.js'
import cloudinary from '../config/cloudinary.js'

const TYPES_VALIDES = ['SIGNALEMENT', 'CONSTAT', 'AVANT_REPARATION', 'APRES_REPARATION']

// ─── POST /api/tickets/:ticketId/photos ───────────────────────────────────────

export async function uploaderPhoto(req, res) {
  try {
    const ticketId = parseInt(req.params.ticketId)
    if (isNaN(ticketId)) return res.status(400).json({ message: 'ticketId invalide.' })

    if (!req.file) {
      return res.status(400).json({ message: 'Aucune photo fournie.' })
    }

    const { typePhoto, commentaire } = req.body

    if (!typePhoto || !TYPES_VALIDES.includes(typePhoto)) {
      // La photo a déjà été envoyée sur Cloudinary — on la supprime pour éviter les orphelins
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {})
      }
      return res.status(400).json({
        message: `typePhoto invalide. Valeurs acceptées : ${TYPES_VALIDES.join(', ')}.`,
      })
    }

    const ticket = await prisma.ticketMaintenance.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {})
      }
      return res.status(404).json({ message: 'Ticket introuvable.' })
    }

    const photo = await prisma.photoIntervention.create({
      data: {
        ticketId,
        uploadedById:       req.user.id,
        typePhoto,
        urlPhoto:           req.file.path,
        publicIdCloudinary: req.file.filename,
        commentaire:        commentaire?.trim() || null,
      },
      include: {
        uploadedBy: { select: { id: true, nom: true, prenom: true, role: true } },
      },
    })

    res.status(201).json(photo)
  } catch (err) {
    console.error('[Photos] uploaderPhoto:', err)
    res.status(500).json({ message: 'Erreur lors de l\'upload de la photo.' })
  }
}

// ─── GET /api/tickets/:ticketId/photos ────────────────────────────────────────

export async function getPhotosByTicket(req, res) {
  try {
    const ticketId = parseInt(req.params.ticketId)
    if (isNaN(ticketId)) return res.status(400).json({ message: 'ticketId invalide.' })

    const ticket = await prisma.ticketMaintenance.findUnique({ where: { id: ticketId } })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    // LOCATAIRE : seulement ses propres tickets
    if (req.user.role === 'LOCATAIRE' && ticket.demandeurId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }

    const photos = await prisma.photoIntervention.findMany({
      where: { ticketId },
      include: {
        uploadedBy: { select: { id: true, nom: true, prenom: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json(photos)
  } catch (err) {
    console.error('[Photos] getPhotosByTicket:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}

// ─── DELETE /api/photos/:id ───────────────────────────────────────────────────

export async function supprimerPhoto(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const photo = await prisma.photoIntervention.findUnique({ where: { id } })

    if (!photo) return res.status(404).json({ message: 'Photo introuvable.' })

    const peutSupprimer =
      photo.uploadedById === req.user.id ||
      ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE'].includes(req.user.role)

    if (!peutSupprimer) {
      return res.status(403).json({ message: 'Action non autorisée.' })
    }

    // Suppression sur Cloudinary avant la suppression en base
    if (photo.publicIdCloudinary) {
      await cloudinary.uploader.destroy(photo.publicIdCloudinary).catch(e => {
        console.warn('[Photos] Échec suppression Cloudinary:', e.message)
      })
    }

    await prisma.photoIntervention.delete({ where: { id } })

    res.json({ message: 'Photo supprimée avec succès.' })
  } catch (err) {
    console.error('[Photos] supprimerPhoto:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}
