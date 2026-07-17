import jwt from 'jsonwebtoken'
import { prisma } from '../utils/prisma.js'

function aAccesConversation(conv, user) {
  return (
    conv.locataireId === user.id ||
    conv.serviceLogementId === user.id ||
    ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
  )
}

export function initChatSocket(io) {
  // Middleware d'authentification Socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Token manquant'))
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = decoded
      next()
    } catch (err) {
      next(new Error('Token invalide'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connecté : ${socket.user.email}`)

    // Rejoindre la room d'une conversation
    socket.on('rejoindre_conversation', async (conversationId) => {
      try {
        const conv = await prisma.conversation.findUnique({
          where: { id: parseInt(conversationId) },
        })

        if (!conv) return
        if (!aAccesConversation(conv, socket.user)) return

        socket.join(`conv_${conversationId}`)
        console.log(`${socket.user.email} a rejoint conv_${conversationId}`)
      } catch (err) {
        console.error('Erreur rejoindre_conversation:', err)
      }
    })

    // Envoyer un message
    socket.on('envoyer_message', async (data) => {
      const { conversationId, type = 'TEXTE' } = data
      let contenu = data.contenu

      // Un message RENDEZ_VOUS transporte des champs structurés (date, lieu,
      // note) plutôt qu'un texte libre — on les encode en JSON dans `contenu`.
      if (type === 'RENDEZ_VOUS') {
        const { dateRendezVous, lieuRendezVous, noteRendezVous } = data
        if (!dateRendezVous || !lieuRendezVous?.trim()) {
          socket.emit('erreur_message', { message: 'La date et le lieu du rendez-vous sont requis.' })
          return
        }
        contenu = JSON.stringify({ dateRendezVous, lieuRendezVous: lieuRendezVous.trim(), note: noteRendezVous?.trim() || null })
      }

      try {
        // Vérifie accès à la conversation
        const conv = await prisma.conversation.findUnique({
          where: { id: parseInt(conversationId) },
        })

        if (!conv) return

        const aAcces =
          conv.locataireId === socket.user.id ||
          conv.serviceLogementId === socket.user.id

        if (!aAcces) return

        // Crée le message en base
        const message = await prisma.message.create({
          data: {
            conversationId: parseInt(conversationId),
            expediteurId: socket.user.id,
            contenu,
            type,
          },
          include: {
            expediteur: {
              select: { id: true, nom: true, prenom: true, role: true },
            },
          },
        })

        // Met à jour updatedAt de la conversation
        await prisma.conversation.update({
          where: { id: parseInt(conversationId) },
          data: { updatedAt: new Date() },
        })

        // Émet le message à tous dans la room
        io.to(`conv_${conversationId}`).emit('nouveau_message', message)
      } catch (err) {
        console.error('Erreur message:', err)
        socket.emit('erreur_message', { message: "Erreur lors de l'envoi" })
      }
    })

    // Marquer messages comme lus
    socket.on('marquer_lu', async (conversationId) => {
      try {
        await prisma.message.updateMany({
          where: {
            conversationId: parseInt(conversationId),
            expediteurId: { not: socket.user.id },
            lu: false,
          },
          data: { lu: true },
        })

        // Notifie l'autre participant
        socket.to(`conv_${conversationId}`).emit('messages_lus', {
          conversationId,
          parUtilisateur: socket.user.id,
        })
      } catch (err) {
        console.error('Erreur marquer_lu:', err)
      }
    })

    // Le locataire signale vouloir modifier un rendez-vous déjà confirmé —
    // notifie le Service Logement même si sa conversation n'est pas ouverte.
    socket.on('rdv_modifie', (data) => {
      io.to(`conv_${data.conversationId}`).emit('notification_rdv_modifie', {
        message: 'Le locataire souhaite modifier le rendez-vous du '
          + new Date(data.ancienneDate).toLocaleDateString('fr-FR'),
        conversationId: data.conversationId,
      })
    })

    // Indicateur de frappe
    socket.on('en_train_decrire', (conversationId) => {
      socket.to(`conv_${conversationId}`).emit('utilisateur_ecrit', {
        userId: socket.user.id,
        nom: socket.user.email,
        conversationId,
      })
    })

    socket.on('disconnect', () => {
      console.log(`Socket déconnecté : ${socket.user.email}`)
    })
  })
}
