import { prisma } from '../utils/prisma.js'
import { creerNotification, notifierRole } from '../services/notification.service.js'

// ─── Sélecteurs ───────────────────────────────────────────────────────────────

const SEL_DEMANDEUR = {
  id: true, nom: true, prenom: true, email: true,
  telephone: true, typeLocataire: true,
}

const SEL_AGENT = {
  id: true, nom: true, prenom: true, role: true, telephone: true,
}

const SEL_TICKET = {
  id: true,
  titre: true,
  description: true,
  priorite: true,
  statut: true,
  modeReparation: true,
  dateDepot: true,
  dateCloture: true,
  agentConstatId: true,
  dateConstatPrevue: true,
  dateConstat: true,
  commentaireConstat: true,
  dateConfirmationLocataire: true,
  agentVerificationId: true,
  dateVerification: true,
  conformeApresVerif: true,
  demandeur:        { select: SEL_DEMANDEUR },
  logement:         { select: { id: true, code: true, adresse: true, ville: true, type: true, statut: true } },
  agentConstat:     { select: SEL_AGENT },
  agentVerification:{ select: SEL_AGENT },
  photos:           true,
  intervention: {
    select: {
      id: true, statut: true, rapport: true,
      dateAssignation: true, dateDebut: true, dateFin: true,
      technicien: { select: SEL_AGENT },
      assigneur:  { select: SEL_AGENT },
    },
  },
}

// ─── Guard : transition de statut ─────────────────────────────────────────────

function assertStatut(entity, attendu, label = 'ticket') {
  if (entity.statut !== attendu) {
    const err = new Error(
      `Ce ${label} doit être au statut "${attendu}" pour effectuer cette action. Statut actuel : "${entity.statut}".`,
    )
    err.statusCode = 400
    throw err
  }
}

function assertStatutIntervention(intervention, attendu) {
  return assertStatut(intervention, attendu, 'intervention')
}

// ─── A) Créer un ticket ───────────────────────────────────────────────────────

export async function creerTicket(req, res, next) {
  try {
    const { logementId, titre, description, priorite } = req.body

    if (!logementId || !titre?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'logementId, titre et description sont requis.' })
    }

    const logement = await prisma.logement.findUnique({ where: { id: parseInt(logementId) } })
    if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })

    const ticket = await prisma.ticketMaintenance.create({
      data: {
        demandeurId: req.user.id,
        logementId:  parseInt(logementId),
        titre:       titre.trim(),
        description: description.trim(),
        priorite:    priorite || 'NORMALE',
        statut:      'SOUMIS',
      },
      select: SEL_TICKET,
    })

    await Promise.allSettled([
      notifierRole({
        role:    'RESPONSABLE',
        message: `Nouveau ticket de maintenance #${ticket.id} soumis : "${ticket.titre}".`,
        type:    'INFO',
      }),
    ])

    res.status(201).json(ticket)
  } catch (err) {
    console.error('[Maintenance] creerTicket:', err)
    next(err)
  }
}

// ─── B) Programmer le constat ─────────────────────────────────────────────────

export async function programmerConstat(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { agentConstatId, dateConstatPrevue } = req.body
    if (!agentConstatId) {
      return res.status(400).json({ message: 'agentConstatId est requis.' })
    }

    const ticket = await prisma.ticketMaintenance.findUnique({ where: { id } })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    try { assertStatut(ticket, 'SOUMIS') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    const technicien = await prisma.utilisateur.findUnique({
      where: { id: parseInt(agentConstatId) },
      select: { id: true, nom: true, prenom: true, role: true },
    })
    if (!technicien) return res.status(404).json({ message: 'Technicien introuvable.' })

    const updated = await prisma.ticketMaintenance.update({
      where: { id },
      data: {
        statut:            'CONSTAT_PROGRAMME',
        agentConstatId:    parseInt(agentConstatId),
        dateConstatPrevue: dateConstatPrevue ? new Date(dateConstatPrevue) : null,
      },
      select: SEL_TICKET,
    })

    const dateMention = dateConstatPrevue
      ? ` Passage prévu le ${new Date(dateConstatPrevue).toLocaleDateString('fr-FR')}.`
      : ''

    await Promise.allSettled([
      creerNotification({
        utilisateurId: parseInt(agentConstatId),
        message: `Constat à effectuer pour le ticket #${id} : "${ticket.titre}".${dateMention}`,
        type: 'INFO',
      }),
      creerNotification({
        utilisateurId: ticket.demandeurId,
        message: `Un agent va passer constater le problème signalé dans votre ticket #${id}.${dateMention}`,
        type: 'INFO',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Maintenance] programmerConstat:', err)
    next(err)
  }
}

// ─── C) Effectuer le constat ──────────────────────────────────────────────────

export async function effectuerConstat(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { commentaireConstat } = req.body
    if (!commentaireConstat?.trim()) {
      return res.status(400).json({ message: 'commentaireConstat est requis.' })
    }

    const ticket = await prisma.ticketMaintenance.findUnique({ where: { id } })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    try { assertStatut(ticket, 'CONSTAT_PROGRAMME') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    // Technicien : doit être celui assigné au constat
    if (req.user.role === 'TECHNICIEN' && req.user.id !== ticket.agentConstatId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas l\'agent assigné à ce constat.' })
    }

    const updated = await prisma.ticketMaintenance.update({
      where: { id },
      data: {
        statut:            'CONSTAT_EFFECTUE',
        dateConstat:       new Date(),
        commentaireConstat: commentaireConstat.trim(),
      },
      select: SEL_TICKET,
    })

    await Promise.allSettled([
      creerNotification({
        utilisateurId: ticket.demandeurId,
        message: `Le constat a été effectué pour votre ticket #${id}. Merci de choisir le mode de réparation.`,
        type: 'INFO',
      }),
      notifierRole({
        role:    'RESPONSABLE',
        message: `Constat terminé pour le ticket #${id} — en attente du choix du locataire.`,
        type:    'INFO',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Maintenance] effectuerConstat:', err)
    next(err)
  }
}

// ─── D) Choix du mode de réparation ──────────────────────────────────────────

export async function choisirModeReparation(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { modeReparation } = req.body
    if (!modeReparation || !['LOCATAIRE', 'SONAPIE'].includes(modeReparation)) {
      return res.status(400).json({ message: 'modeReparation doit être "LOCATAIRE" ou "SONAPIE".' })
    }

    const ticket = await prisma.ticketMaintenance.findUnique({ where: { id } })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    if (req.user.id !== ticket.demandeurId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le propriétaire de ce ticket.' })
    }

    try { assertStatut(ticket, 'CONSTAT_EFFECTUE') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    const nouveauStatut = modeReparation === 'LOCATAIRE'
      ? 'PRISE_EN_CHARGE_LOCATAIRE'
      : 'PRISE_EN_CHARGE_SONAPIE'

    const updated = await prisma.ticketMaintenance.update({
      where: { id },
      data: { statut: nouveauStatut, modeReparation },
      select: SEL_TICKET,
    })

    const msgResp = modeReparation === 'LOCATAIRE'
      ? `Le locataire a choisi de réparer lui-même pour le ticket #${id} — à surveiller.`
      : `Le locataire a confié la réparation à la SONAPIE pour le ticket #${id} — assignation d'un technicien requise.`

    await Promise.allSettled([
      notifierRole({ role: 'RESPONSABLE', message: msgResp, type: 'INFO' }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Maintenance] choisirModeReparation:', err)
    next(err)
  }
}

// ─── E) Assigner un technicien ────────────────────────────────────────────────

export async function assignerTechnicien(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { technicienId } = req.body
    if (!technicienId) return res.status(400).json({ message: 'technicienId est requis.' })

    const ticket = await prisma.ticketMaintenance.findUnique({
      where: { id },
      include: { intervention: true },
    })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    try { assertStatut(ticket, 'PRISE_EN_CHARGE_SONAPIE') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    if (ticket.intervention) {
      return res.status(400).json({ message: 'Une intervention existe déjà pour ce ticket.' })
    }

    const technicien = await prisma.utilisateur.findUnique({
      where: { id: parseInt(technicienId) },
      select: { id: true, nom: true, prenom: true, role: true },
    })
    if (!technicien || technicien.role !== 'TECHNICIEN') {
      return res.status(404).json({ message: 'Technicien introuvable ou rôle invalide.' })
    }

    const [updated] = await prisma.$transaction([
      prisma.ticketMaintenance.update({
        where: { id },
        data: { statut: 'ASSIGNE_TECHNICIEN' },
        select: SEL_TICKET,
      }),
      prisma.intervention.create({
        data: {
          ticketId:    id,
          technicienId: parseInt(technicienId),
          assignePar:  req.user.id,
        },
      }),
    ])

    await Promise.allSettled([
      creerNotification({
        utilisateurId: parseInt(technicienId),
        message: `Vous avez été assigné à l'intervention du ticket #${id} : "${ticket.titre}".`,
        type: 'INFO',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Maintenance] assignerTechnicien:', err)
    next(err)
  }
}

// ─── F) Démarrer l'intervention ───────────────────────────────────────────────

export async function demarrerIntervention(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: { ticket: true },
    })
    if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' })

    if (req.user.id !== intervention.technicienId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le technicien assigné à cette intervention.' })
    }

    try { assertStatutIntervention(intervention, 'ASSIGNEE') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    const [updatedIntervention] = await prisma.$transaction([
      prisma.intervention.update({
        where: { id },
        data: { statut: 'EN_COURS', dateDebut: new Date() },
        select: {
          id: true, statut: true, dateDebut: true, dateAssignation: true,
          technicien: { select: SEL_AGENT },
          ticket:     { select: { id: true, titre: true, statut: true } },
        },
      }),
      prisma.ticketMaintenance.update({
        where: { id: intervention.ticketId },
        data: { statut: 'EN_COURS' },
      }),
    ])

    res.json(updatedIntervention)
  } catch (err) {
    console.error('[Maintenance] demarrerIntervention:', err)
    next(err)
  }
}

// ─── G) Confirmer la réparation par le locataire ──────────────────────────────

export async function confirmerReparationLocataire(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const ticket = await prisma.ticketMaintenance.findUnique({ where: { id } })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    if (req.user.id !== ticket.demandeurId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le propriétaire de ce ticket.' })
    }

    try { assertStatut(ticket, 'PRISE_EN_CHARGE_LOCATAIRE') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    const updated = await prisma.ticketMaintenance.update({
      where: { id },
      data: {
        statut:                    'VERIFICATION_SONAPIE',
        dateConfirmationLocataire: new Date(),
      },
      select: SEL_TICKET,
    })

    await Promise.allSettled([
      notifierRole({
        role:    'RESPONSABLE',
        message: `Le locataire a terminé sa réparation pour le ticket #${id} — vérification requise.`,
        type:    'INFO',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Maintenance] confirmerReparationLocataire:', err)
    next(err)
  }
}

// ─── H) Clôturer par le technicien (fin d'intervention SONAPIE) ──────────────

export async function cloturerParTechnicien(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { rapport } = req.body
    if (!rapport?.trim()) {
      return res.status(400).json({ message: 'Le rapport de clôture est requis.' })
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: { ticket: true },
    })
    if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' })

    if (req.user.id !== intervention.technicienId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le technicien assigné à cette intervention.' })
    }

    try { assertStatutIntervention(intervention, 'EN_COURS') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    const [updatedIntervention] = await prisma.$transaction([
      prisma.intervention.update({
        where: { id },
        data: {
          statut:  'TERMINEE',
          dateFin: new Date(),
          rapport: rapport.trim(),
        },
        select: {
          id: true, statut: true, rapport: true, dateFin: true,
          technicien: { select: SEL_AGENT },
          ticket:     { select: { id: true, titre: true, statut: true } },
        },
      }),
      prisma.ticketMaintenance.update({
        where: { id: intervention.ticketId },
        data: { statut: 'VERIFICATION_SONAPIE' },
      }),
    ])

    await Promise.allSettled([
      notifierRole({
        role:    'RESPONSABLE',
        message: `Intervention terminée pour le ticket #${intervention.ticketId} — vérification requise.`,
        type:    'INFO',
      }),
    ])

    res.json(updatedIntervention)
  } catch (err) {
    console.error('[Maintenance] cloturerParTechnicien:', err)
    next(err)
  }
}

// ─── I) Vérifier et clôturer (RESPONSABLE / ADMIN) ───────────────────────────

export async function verifierEtCloturer(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { conforme, commentaireVerification } = req.body
    if (typeof conforme !== 'boolean') {
      return res.status(400).json({ message: 'Le champ "conforme" (boolean) est requis.' })
    }

    const ticket = await prisma.ticketMaintenance.findUnique({
      where: { id },
      include: { intervention: true },
    })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    try { assertStatut(ticket, 'VERIFICATION_SONAPIE') } catch (e) {
      return res.status(e.statusCode).json({ message: e.message })
    }

    const now = new Date()
    const updated = await prisma.ticketMaintenance.update({
      where: { id },
      data: conforme
        ? {
            statut:             'CLOTURE',
            agentVerificationId: req.user.id,
            dateVerification:   now,
            conformeApresVerif: true,
            dateCloture:        now,
          }
        : {
            statut:             'REOUVERT',
            agentVerificationId: req.user.id,
            dateVerification:   now,
            conformeApresVerif: false,
          },
      select: SEL_TICKET,
    })

    const notifs = []

    if (conforme) {
      notifs.push(
        creerNotification({
          utilisateurId: ticket.demandeurId,
          message: `Votre ticket #${id} a été clôturé avec succès après vérification.`,
          type: 'SUCCESS',
        }),
      )
    } else {
      notifs.push(
        creerNotification({
          utilisateurId: ticket.demandeurId,
          message: `La réparation de votre ticket #${id} n'est pas conforme. Le ticket est réouvert.`,
          type: 'WARNING',
        }),
      )
      if (ticket.intervention?.technicienId) {
        notifs.push(
          creerNotification({
            utilisateurId: ticket.intervention.technicienId,
            message: `La réparation du ticket #${id} n'est pas conforme — le ticket est réouvert.${commentaireVerification ? ` Motif : ${commentaireVerification}` : ''}`,
            type: 'WARNING',
          }),
        )
      }
    }

    await Promise.allSettled(notifs)

    res.json(updated)
  } catch (err) {
    console.error('[Maintenance] verifierEtCloturer:', err)
    next(err)
  }
}

// ─── J) Liste des tickets selon le rôle ──────────────────────────────────────

export async function getTicketsByRole(req, res, next) {
  try {
    const { role, id: userId } = req.user

    let where = {}

    if (role === 'LOCATAIRE') {
      where = { demandeurId: userId }
    } else if (role === 'TECHNICIEN') {
      where = {
        OR: [
          { agentConstatId: userId },
          { intervention: { technicienId: userId } },
        ],
      }
    }
    // RESPONSABLE / ADMIN / DIRECTION : pas de filtre → tous les tickets

    const tickets = await prisma.ticketMaintenance.findMany({
      where,
      select: SEL_TICKET,
      orderBy: { dateDepot: 'desc' },
    })

    res.json(tickets)
  } catch (err) {
    console.error('[Maintenance] getTicketsByRole:', err)
    next(err)
  }
}

// ─── K) Détail d'un ticket ────────────────────────────────────────────────────

export async function getTicketDetail(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const ticket = await prisma.ticketMaintenance.findUnique({
      where: { id },
      select: SEL_TICKET,
    })

    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    const { role, id: userId } = req.user

    if (role === 'LOCATAIRE' && ticket.demandeur.id !== userId) {
      return res.status(403).json({ message: 'Accès refusé à ce ticket.' })
    }

    if (role === 'TECHNICIEN') {
      const estAgentConstat    = ticket.agentConstatId === userId
      const estTechIntervention = ticket.intervention?.technicien?.id === userId
      if (!estAgentConstat && !estTechIntervention) {
        return res.status(403).json({ message: 'Accès refusé à ce ticket.' })
      }
    }

    res.json(ticket)
  } catch (err) {
    console.error('[Maintenance] getTicketDetail:', err)
    next(err)
  }
}
