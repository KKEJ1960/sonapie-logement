import { prisma } from '../utils/prisma.js'
import { creerNotification } from '../services/notification.service.js'

// Vérifie toutes les minutes si l'heure d'un rendez-vous proposé (message de
// type RENDEZ_VOUS) est arrivée, et envoie un rappel au locataire et au
// Service Logement — une seule fois par rendez-vous (rappelEnvoye).
const INTERVALLE_MS = 60 * 1000

async function verifierRappels(io) {
  try {
    const maintenant = new Date()

    const messagesRdv = await prisma.message.findMany({
      where: { type: 'RENDEZ_VOUS', rappelEnvoye: false },
      include: {
        conversation: {
          select: {
            id: true,
            locataireId: true,
            serviceLogementId: true,
            demande: { select: { logement: { select: { code: true } } } },
          },
        },
      },
    })

    for (const m of messagesRdv) {
      let data
      try { data = JSON.parse(m.contenu) } catch { continue }
      if (!data?.dateRendezVous) continue
      if (new Date(data.dateRendezVous) > maintenant) continue

      const conv = m.conversation
      const logementCode = conv.demande?.logement?.code
      const message = `Rappel : votre rendez-vous${logementCode ? ` pour le logement ${logementCode}` : ''} au ${data.lieuRendezVous} est prévu maintenant.`

      await Promise.allSettled([
        creerNotification({ utilisateurId: conv.locataireId, message, type: 'WARNING' }),
        conv.serviceLogementId
          ? creerNotification({ utilisateurId: conv.serviceLogementId, message, type: 'WARNING' })
          : Promise.resolve(),
        prisma.message.update({ where: { id: m.id }, data: { rappelEnvoye: true } }),
      ])

      // Le Service Logement n'a pas d'onglet Notifications dans son interface —
      // le toast temps réel (room de la conversation) est donc son seul moyen
      // de recevoir ce rappel ; le locataire, lui, le reverra aussi plus tard
      // dans son onglet Notifications grâce à creerNotification ci-dessus.
      io?.to(`conv_${conv.id}`).emit('rappel_rdv', { conversationId: conv.id, message })
    }
  } catch (err) {
    console.error('[RappelRDV] Erreur lors de la vérification des rappels:', err)
  }
}

export function initRappelRendezVousJob(io) {
  verifierRappels(io)
  setInterval(() => verifierRappels(io), INTERVALLE_MS)
}
