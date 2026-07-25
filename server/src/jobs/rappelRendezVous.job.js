import { prisma } from '../utils/prisma.js'
import { creerNotification } from '../services/notification.service.js'

// Vérifie toutes les minutes l'approche de l'heure d'un rendez-vous proposé
// (message de type RENDEZ_VOUS) et envoie des rappels à trois moments —
// 24h avant, 1h avant, puis au moment exact — chacun une seule fois par
// rendez-vous (rappel24hEnvoye / rappel1hEnvoye / rappelEnvoye).
const INTERVALLE_MS = 60 * 1000
const UNE_HEURE_MS = 60 * 60 * 1000
const VINGT_QUATRE_HEURES_MS = 24 * UNE_HEURE_MS

const formatDateHeure = (d) => new Date(d).toLocaleString('fr-FR', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
})

async function verifierRappels(io) {
  try {
    const maintenant = new Date()

    const messagesRdv = await prisma.message.findMany({
      where: { type: 'RENDEZ_VOUS', rappelEnvoye: false },
      orderBy: { createdAt: 'asc' },
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

    // Un nouveau RENDEZ_VOUS reprogramme le précédent dans la même conversation :
    // on ne rappelle jamais une date obsolète, seulement la dernière proposée —
    // même règle que chat.controller.js:getRendezVous.
    const dernierParConversation = new Map()
    for (const m of messagesRdv) dernierParConversation.set(m.conversationId, m)

    for (const m of dernierParConversation.values()) {
      let data
      try { data = JSON.parse(m.contenu) } catch { continue }
      if (!data?.dateRendezVous) continue

      const dateRdv = new Date(data.dateRendezVous)
      const msUntil = dateRdv.getTime() - maintenant.getTime()
      const conv = m.conversation
      const logementCode = conv.demande?.logement?.code
      const suffixeLogement = logementCode ? ` pour le logement ${logementCode}` : ''

      const envoyerRappel = async (message, data) => {
        await Promise.allSettled([
          creerNotification({ utilisateurId: conv.locataireId, message, type: 'WARNING' }),
          conv.serviceLogementId
            ? creerNotification({ utilisateurId: conv.serviceLogementId, message, type: 'WARNING' })
            : Promise.resolve(),
          prisma.message.update({ where: { id: m.id }, data }),
        ])
        // Le Service Logement n'a pas d'onglet Notifications dans son interface —
        // le toast temps réel (room de la conversation) est donc son seul moyen
        // de recevoir ce rappel ; le locataire, lui, le reverra aussi plus tard
        // dans son onglet Notifications grâce à creerNotification ci-dessus.
        io?.to(`conv_${conv.id}`).emit('rappel_rdv', { conversationId: conv.id, message })
      }

      if (msUntil <= 0) {
        // L'heure est arrivée (ou dépassée, ex: job resté arrêté un moment) —
        // les rappels d'avance n'ont plus de sens, on les marque faits aussi.
        const message = `Rappel : votre rendez-vous${suffixeLogement} au ${data.lieuRendezVous} est prévu maintenant.`
        await envoyerRappel(message, { rappelEnvoye: true, rappel24hEnvoye: true, rappel1hEnvoye: true })
        continue
      }

      if (msUntil <= UNE_HEURE_MS && !m.rappel1hEnvoye) {
        const message = `Rappel : votre rendez-vous${suffixeLogement} au ${data.lieuRendezVous} est dans 1 heure (${formatDateHeure(dateRdv)}).`
        await envoyerRappel(message, { rappel1hEnvoye: true })
      }

      if (msUntil <= VINGT_QUATRE_HEURES_MS && !m.rappel24hEnvoye) {
        const message = `Rappel : votre rendez-vous${suffixeLogement} au ${data.lieuRendezVous} est prévu demain (${formatDateHeure(dateRdv)}).`
        await envoyerRappel(message, { rappel24hEnvoye: true })
      }
    }
  } catch (err) {
    console.error('[RappelRDV] Erreur lors de la vérification des rappels:', err)
  }
}

export function initRappelRendezVousJob(io) {
  verifierRappels(io)
  setInterval(() => verifierRappels(io), INTERVALLE_MS)
}
