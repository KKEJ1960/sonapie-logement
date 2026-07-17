import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma.js'
import { notifierRoles } from '../services/notification.service.js'
import cloudinary from '../config/cloudinary.js'

// ─── Sélecteurs ───────────────────────────────────────────────────────────────

const SEL_LOGEMENT = {
  id: true, code: true, adresse: true, ville: true, quartier: true,
  type: true, superficie: true, nombrePieces: true, etage: true,
  statut: true, description: true, montantLoyer: true,
}

const SEL_DEMANDE = {
  id: true,
  motif: true,
  statut: true,
  priorite: true,
  commentaire: true,
  dateDepot: true,
  dateTraitement: true,
  dateValidationDirection: true,
  commentaireDirection: true,
  alerteDisponibilite: true,
  logement: { select: SEL_LOGEMENT },
}

const SEL_MUTATION = {
  id: true,
  motif: true,
  statut: true,
  commentaire: true,
  dateDepot: true,
  dateTraitement: true,
  dateValidationDirection: true,
  commentaireDirection: true,
  logementActuel:   { select: SEL_LOGEMENT },
  logementSouhaite: { select: SEL_LOGEMENT },
}

// ─── a) Créer une demande de logement ────────────────────────────────────────
// POST /api/locataire/demandes

export async function creerDemandeLogement(req, res, next) {
  try {
    const { motif, priorite, logementId, alerteDisponibilite } = req.body

    if (priorite && !['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'].includes(priorite)) {
      return res.status(400).json({ message: 'Priorité invalide.' })
    }

    // ── Alerte de disponibilité : simple inscription passive sur un logement
    // occupé, sans motif obligatoire et sans passer par le circuit de
    // validation Direction (ce n'est pas une vraie demande à instruire).
    if (alerteDisponibilite) {
      if (!logementId) {
        return res.status(400).json({ message: 'logementId est requis pour une alerte de disponibilité.' })
      }
      const logement = await prisma.logement.findUnique({ where: { id: parseInt(logementId) } })
      if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })

      const demande = await prisma.demandeLogement.create({
        data: {
          demandeurId: req.user.id,
          logementId:  logement.id,
          motif:       motif?.trim() || `Alerte de disponibilité pour le logement ${logement.code}.`,
          priorite:    priorite || 'NORMALE',
          statut:      'SOUMISE',
          alerteDisponibilite: true,
        },
        select: SEL_DEMANDE,
      })

      return res.status(201).json(demande)
    }

    if (!motif?.trim()) {
      return res.status(400).json({ message: 'Le motif est requis.' })
    }

    let logementIdParsed = null
    if (logementId) {
      const logement = await prisma.logement.findUnique({ where: { id: parseInt(logementId) } })
      if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })
      if (logement.statut !== 'DISPONIBLE') {
        return res.status(400).json({ message: "Ce logement n'est plus disponible." })
      }
      logementIdParsed = logement.id
    }

    const demande = await prisma.demandeLogement.create({
      data: {
        demandeurId: req.user.id,
        logementId:  logementIdParsed,
        motif:       motif.trim(),
        priorite:    priorite || 'NORMALE',
        statut:      'SOUMISE',
      },
    })

    const updated = await prisma.demandeLogement.update({
      where: { id: demande.id },
      data:  { statut: 'EN_VALIDATION_DIRECTION' },
      select: SEL_DEMANDE,
    })

    // Pas de notification à la Direction ici : à ce stade, aucun dossier
    // n'existe encore (le locataire n'a rien constitué), donc rien ne serait
    // trouvable dans "Dossiers clients" — la Direction n'a plus de page dédiée
    // aux demandes brutes depuis la simplification du workflow. La notification
    // pertinente est envoyée dans soumetteDossier(), une fois qu'il y a
    // effectivement un dossier à examiner.

    res.status(201).json(updated)
  } catch (err) {
    console.error('[Locataire] creerDemandeLogement:', err)
    next(err)
  }
}

// ─── b) Mes demandes de logement ─────────────────────────────────────────────
// GET /api/locataire/demandes

export async function getMesDemandes(req, res, next) {
  try {
    const demandes = await prisma.demandeLogement.findMany({
      where:   { demandeurId: req.user.id },
      select:  SEL_DEMANDE,
      orderBy: { dateDepot: 'desc' },
    })
    res.json(demandes)
  } catch (err) {
    console.error('[Locataire] getMesDemandes:', err)
    next(err)
  }
}

// PATCH /api/locataire/demandes/:id/annuler
// Le locataire peut annuler sa demande tant que la Direction ne l'a pas encore
// traitée (SOUMISE / EN_VALIDATION_DIRECTION), ou si elle a été rejetée par la
// Direction (REJETEE_DIRECTION). Pas d'annulation possible une fois la demande
// validée par la Direction (VALIDEE_DIRECTION et au-delà) ni si elle est déjà
// REJETEE (rejet en aval par le Service Logement) ou ANNULEE.
const STATUTS_ANNULABLES = ['SOUMISE', 'EN_VALIDATION_DIRECTION', 'REJETEE_DIRECTION']

export async function annulerDemande(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const demande = await prisma.demandeLogement.findUnique({ where: { id } })
    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' })
    if (demande.demandeurId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé à cette demande.' })
    }
    if (!STATUTS_ANNULABLES.includes(demande.statut)) {
      const message = demande.statut === 'ANNULEE'
        ? 'Cette demande est déjà annulée.'
        : 'Cette demande ne peut plus être annulée : elle a déjà été validée par la Direction.'
      return res.status(400).json({ message })
    }

    const updated = await prisma.demandeLogement.update({
      where: { id },
      data: { statut: 'ANNULEE' },
      select: SEL_DEMANDE,
    })

    if (['SOUMISE', 'EN_VALIDATION_DIRECTION'].includes(demande.statut)) {
      await notifierRoles(
        ['DIRECTION'],
        `La demande de logement #${id} a été annulée par le demandeur.`,
        'INFO',
      ).catch(() => {})
    }

    res.json(updated)
  } catch (err) {
    console.error('[Locataire] annulerDemande:', err)
    next(err)
  }
}

// DELETE /api/locataire/demandes/:id
// Réservé aux demandes rejetées, pour permettre au locataire de nettoyer son
// fil de demandes sans encombrement.
export async function supprimerDemande(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const demande = await prisma.demandeLogement.findUnique({
      where: { id },
      include: { dossier: { include: { documents: true } } },
    })
    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' })
    if (demande.demandeurId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé à cette demande.' })
    }
    if (!['REJETEE', 'REJETEE_DIRECTION'].includes(demande.statut)) {
      return res.status(400).json({ message: 'Seules les demandes rejetées peuvent être supprimées.' })
    }

    if (demande.dossier?.documents?.length) {
      await Promise.allSettled(
        demande.dossier.documents
          .filter(d => d.publicIdCloudinary)
          .map(d => cloudinary.uploader.destroy(d.publicIdCloudinary, { resource_type: 'auto' })),
      )
    }

    await prisma.demandeLogement.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    console.error('[Locataire] supprimerDemande:', err)
    next(err)
  }
}

// ─── c) Créer une demande de mutation ────────────────────────────────────────
// POST /api/locataire/mutations

export async function creerDemandeMutation(req, res, next) {
  try {
    const { motif, logementSouhaiteId } = req.body

    if (!motif?.trim()) {
      return res.status(400).json({ message: 'Le motif est requis.' })
    }

    const occupation = await prisma.occupation.findFirst({
      where: { utilisateurId: req.user.id, statut: 'ACTIVE' },
    })
    if (!occupation) {
      return res.status(400).json({
        message: 'Vous devez occuper un logement pour demander une mutation.',
      })
    }

    const mutation = await prisma.mutation.create({
      data: {
        demandeurId:        req.user.id,
        logementActuelId:   occupation.logementId,
        logementSouhaiteId: logementSouhaiteId ? parseInt(logementSouhaiteId) : null,
        motif:              motif.trim(),
        statut:             'SOUMISE',
      },
    })

    const updated = await prisma.mutation.update({
      where: { id: mutation.id },
      data:  { statut: 'EN_VALIDATION_DIRECTION' },
      select: SEL_MUTATION,
    })

    await Promise.allSettled([
      notifierRoles(
        ['DIRECTION'],
        `Nouvelle demande de mutation #${updated.id} soumise par ${req.user.email}.`,
        'INFO',
      ),
    ])

    res.status(201).json(updated)
  } catch (err) {
    console.error('[Locataire] creerDemandeMutation:', err)
    next(err)
  }
}

// ─── d) Mes demandes de mutation ─────────────────────────────────────────────
// GET /api/locataire/mutations

export async function getMesMutations(req, res, next) {
  try {
    const mutations = await prisma.mutation.findMany({
      where:   { demandeurId: req.user.id },
      select:  SEL_MUTATION,
      orderBy: { dateDepot: 'desc' },
    })
    res.json(mutations)
  } catch (err) {
    console.error('[Locataire] getMesMutations:', err)
    next(err)
  }
}

// ─── e) Mon logement actuel ──────────────────────────────────────────────────
// GET /api/locataire/mon-logement

export async function getMonLogement(req, res, next) {
  try {
    const occupation = await prisma.occupation.findFirst({
      where:   { utilisateurId: req.user.id, statut: 'ACTIVE' },
      include: { logement: true },
      orderBy: { dateEntree: 'desc' },
    })

    if (!occupation) {
      return res.json({ logement: null, dateEntree: null })
    }

    res.json({ logement: occupation.logement, dateEntree: occupation.dateEntree })
  } catch (err) {
    console.error('[Locataire] getMonLogement:', err)
    next(err)
  }
}

// ─── f) Mes paiements ─────────────────────────────────────────────────────────
// GET /api/locataire/paiements

export async function getMesPaiements(req, res, next) {
  try {
    const paiements = await prisma.paiement.findMany({
      where:   { locataireId: req.user.id },
      include: { logement: { select: { id: true, code: true, adresse: true } } },
      orderBy: [{ periodeAnnee: 'desc' }, { periodeMois: 'desc' }],
    })
    res.json(paiements)
  } catch (err) {
    console.error('[Locataire] getMesPaiements:', err)
    next(err)
  }
}

// ─── g) Notifications ─────────────────────────────────────────────────────────
// GET /api/locataire/notifications

export async function getMesNotifications(req, res, next) {
  try {
    const [notifications, nonLues] = await Promise.all([
      prisma.notification.findMany({
        where:   { utilisateurId: req.user.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { utilisateurId: req.user.id, lu: false },
      }),
    ])
    res.json({ notifications, nonLues })
  } catch (err) {
    console.error('[Locataire] getMesNotifications:', err)
    next(err)
  }
}

// PATCH /api/locataire/notifications/:id/lue
export async function marquerNotificationLue(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif) return res.status(404).json({ message: 'Notification introuvable.' })
    if (notif.utilisateurId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé à cette notification.' })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data:  { lu: true },
    })
    res.json(updated)
  } catch (err) {
    console.error('[Locataire] marquerNotificationLue:', err)
    next(err)
  }
}

// PATCH /api/locataire/notifications/tout-lu
export async function marquerToutesNotificationsLues(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { utilisateurId: req.user.id, lu: false },
      data:  { lu: true },
    })
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' })
  } catch (err) {
    console.error('[Locataire] marquerToutesNotificationsLues:', err)
    next(err)
  }
}

// DELETE /api/locataire/notifications/:id
export async function supprimerNotification(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif) return res.status(404).json({ message: 'Notification introuvable.' })
    if (notif.utilisateurId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé à cette notification.' })
    }

    await prisma.notification.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    console.error('[Locataire] supprimerNotification:', err)
    next(err)
  }
}

// DELETE /api/locataire/notifications
export async function supprimerNotifications(req, res, next) {
  try {
    const { ids, supprimerTout, supprimerLus } = req.body

    let where
    if (supprimerTout) {
      where = { utilisateurId: req.user.id }
    } else if (supprimerLus) {
      where = { utilisateurId: req.user.id, lu: true }
    } else if (Array.isArray(ids) && ids.length > 0) {
      const idsValides = ids.map(id => parseInt(id)).filter(id => !isNaN(id))
      where = { utilisateurId: req.user.id, id: { in: idsValides } }
    } else {
      return res.status(400).json({ message: 'Précisez ids, supprimerTout ou supprimerLus.' })
    }

    const { count } = await prisma.notification.deleteMany({ where })
    res.json({ deleted: count })
  } catch (err) {
    console.error('[Locataire] supprimerNotifications:', err)
    next(err)
  }
}

// ─── h) Statistiques du tableau de bord ──────────────────────────────────────
// GET /api/locataire/stats

export async function getMesStats(req, res, next) {
  try {
    const userId = req.user.id

    const [
      ticketsEnCours,
      ticketsTermines,
      ticketsEnAttentePlanification,
      demandesEnCours,
      prochainTicketConstat,
    ] = await Promise.all([
      prisma.ticketMaintenance.count({
        where: { demandeurId: userId, statut: { not: 'CLOTURE' } },
      }),
      prisma.ticketMaintenance.count({
        where: { demandeurId: userId, statut: 'CLOTURE' },
      }),
      prisma.ticketMaintenance.count({
        where: { demandeurId: userId, statut: { in: ['SOUMIS', 'CONSTAT_PROGRAMME'] } },
      }),
      prisma.demandeLogement.count({
        where: {
          demandeurId: userId,
          statut: { notIn: ['APPROUVEE', 'REJETEE', 'REJETEE_DIRECTION'] },
        },
      }),
      prisma.ticketMaintenance.findFirst({
        where: {
          demandeurId: userId,
          statut: 'CONSTAT_PROGRAMME',
          dateConstatPrevue: { not: null },
        },
        orderBy: { dateConstatPrevue: 'asc' },
        select: { dateConstatPrevue: true },
      }),
    ])

    res.json({
      ticketsEnCours,
      ticketsTermines,
      ticketsEnAttentePlanification,
      demandesEnCours,
      prochainConstat: prochainTicketConstat?.dateConstatPrevue || null,
    })
  } catch (err) {
    console.error('[Locataire] getMesStats:', err)
    next(err)
  }
}

// ─── i) Changer mon mot de passe ──────────────────────────────────────────────
// PUT /api/locataire/mot-de-passe

export async function changerMotDePasse(req, res, next) {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body

    if (!motDePasseActuel || !nouveauMotDePasse) {
      return res.status(400).json({ message: 'Le mot de passe actuel et le nouveau mot de passe sont requis.' })
    }
    if (nouveauMotDePasse.length < 8) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
    }

    const user = await prisma.utilisateur.findUnique({ where: { id: req.user.id } })
    const motDePasseValide = await bcrypt.compare(motDePasseActuel, user.motDePasse)
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Le mot de passe actuel est incorrect.' })
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 10)
    await prisma.utilisateur.update({ where: { id: req.user.id }, data: { motDePasse: hash } })

    res.json({ message: 'Mot de passe modifié avec succès.' })
  } catch (err) {
    console.error('[Locataire] changerMotDePasse:', err)
    next(err)
  }
}
