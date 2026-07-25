import { prisma } from '../utils/prisma.js'
import { creerNotification, notifierRoles } from '../services/notification.service.js'

// ─── Sélecteurs réutilisables ──────────────────────────────────────────────────

const SELECT_DEMANDEUR = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  typeLocataire: true,
  numeroMatricule: true,
}

const SELECT_DEMANDE = {
  id: true,
  motif: true,
  statut: true,
  priorite: true,
  commentaire: true,
  dateDepot: true,
  dateTraitement: true,
  valideParDirectionId: true,
  dateValidationDirection: true,
  commentaireDirection: true,
  demandeur: { select: SELECT_DEMANDEUR },
  logement: {
    select: {
      id: true, code: true, adresse: true, ville: true, type: true, statut: true,
      photos: { select: { urlPhoto: true }, orderBy: { ordre: 'asc' }, take: 1 },
    },
  },
}

const SELECT_MUTATION = {
  id: true,
  motif: true,
  statut: true,
  commentaire: true,
  dateDepot: true,
  dateTraitement: true,
  valideParDirectionId: true,
  dateValidationDirection: true,
  commentaireDirection: true,
  demandeur: { select: SELECT_DEMANDEUR },
  logementActuel: {
    select: { id: true, code: true, adresse: true, ville: true, type: true },
  },
  logementSouhaite: {
    select: { id: true, code: true, adresse: true, ville: true, type: true },
  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function debutJour() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function finJour() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
}

function debutMois() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

async function histoJournalier(model, champDate, whereExtra = {}) {
  const now = new Date()

  return Promise.all(
    Array.from({ length: 7 }, (_, idx) => {
      const i = 6 - idx
      const debut = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const fin   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
      return model.count({ where: { ...whereExtra, [champDate]: { gte: debut, lt: fin } } })
    }),
  )
}

// ─── A) Demandes (toutes, filtrables) ──────────────────────────────────────────
// GET /api/direction/demandes?statut=X,Y&limit=N
// Sans filtre : retourne toutes les demandes (utilisé pour le pipeline, les
// demandes urgentes et le flux d'activité du dashboard Direction).

export async function getDemandesDirection(req, res, next) {
  try {
    const { statut, limit } = req.query
    const where = {}
    if (statut) {
      const statuts = statut.split(',').map(s => s.trim()).filter(Boolean)
      where.statut = statuts.length > 1 ? { in: statuts } : statuts[0]
    }

    const demandes = await prisma.demandeLogement.findMany({
      where,
      select: SELECT_DEMANDE,
      orderBy: { dateDepot: 'desc' },
      ...(limit ? { take: Math.min(parseInt(limit) || 50, 200) } : {}),
    })
    res.json(demandes)
  } catch (err) {
    console.error('[Direction] getDemandesDirection:', err)
    next(err)
  }
}

// ─── B) Mutations (toutes, filtrables) ────────────────────────────────────────
// GET /api/direction/mutations?statut=X,Y
// Sans filtre : retourne toutes les mutations (utilisé par le journal d'activité).

export async function getMutationsEnAttente(req, res, next) {
  try {
    const { statut } = req.query
    const where = {}
    if (statut) {
      const statuts = statut.split(',').map(s => s.trim()).filter(Boolean)
      where.statut = statuts.length > 1 ? { in: statuts } : statuts[0]
    }

    const mutations = await prisma.mutation.findMany({
      where,
      select: SELECT_MUTATION,
      orderBy: { dateDepot: 'desc' },
    })
    res.json(mutations)
  } catch (err) {
    console.error('[Direction] getMutationsEnAttente:', err)
    next(err)
  }
}

// ─── C) Valider une demande ───────────────────────────────────────────────────

export async function validerDemande(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const demande = await prisma.demandeLogement.findUnique({ where: { id } })

    if (!demande) {
      return res.status(404).json({ message: 'Demande introuvable.' })
    }
    if (demande.statut !== 'EN_VALIDATION_DIRECTION') {
      return res.status(400).json({
        message: `Action impossible : la demande est au statut "${demande.statut}". Seules les demandes EN_VALIDATION_DIRECTION peuvent être validées.`,
      })
    }

    const updated = await prisma.demandeLogement.update({
      where: { id },
      data: {
        statut: 'EN_ETUDE_LOGEMENT',
        valideParDirectionId: req.user.id,
        dateValidationDirection: new Date(),
        commentaireDirection: req.body.commentaire?.trim() || null,
      },
      select: SELECT_DEMANDE,
    })

    // Notifications en parallèle (non bloquantes)
    await Promise.allSettled([
      notifierRoles(
        ['ADMIN', 'SUPER_ADMIN'],
        `Demande #${id} validée par la Direction — en attente d'attribution de logement.`,
        'INFO',
      ),
      creerNotification({
        utilisateurId: demande.demandeurId,
        message: 'Votre demande de logement a été validée par la Direction et est en cours de traitement par le service logement.',
        type: 'SUCCESS',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Direction] validerDemande:', err)
    next(err)
  }
}

// ─── D) Rejeter une demande ───────────────────────────────────────────────────

export async function rejeterDemande(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { motifRejet } = req.body
    if (!motifRejet?.trim()) {
      return res.status(400).json({ message: 'Le motif de rejet est requis.' })
    }

    const demande = await prisma.demandeLogement.findUnique({ where: { id } })

    if (!demande) {
      return res.status(404).json({ message: 'Demande introuvable.' })
    }
    if (demande.statut !== 'EN_VALIDATION_DIRECTION') {
      return res.status(400).json({
        message: `Action impossible : la demande est au statut "${demande.statut}". Seules les demandes EN_VALIDATION_DIRECTION peuvent être rejetées.`,
      })
    }

    const updated = await prisma.demandeLogement.update({
      where: { id },
      data: {
        statut: 'REJETEE_DIRECTION',
        valideParDirectionId: req.user.id,
        dateValidationDirection: new Date(),
        commentaireDirection: motifRejet.trim(),
      },
      select: SELECT_DEMANDE,
    })

    await Promise.allSettled([
      creerNotification({
        utilisateurId: demande.demandeurId,
        message: `Votre demande de logement (#${id}) a été rejetée par la Direction. Motif : ${motifRejet.trim()}`,
        type: 'ERROR',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Direction] rejeterDemande:', err)
    next(err)
  }
}

// ─── E) Valider une mutation ──────────────────────────────────────────────────

export async function validerMutation(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const mutation = await prisma.mutation.findUnique({ where: { id } })

    if (!mutation) {
      return res.status(404).json({ message: 'Mutation introuvable.' })
    }
    if (mutation.statut !== 'EN_VALIDATION_DIRECTION') {
      return res.status(400).json({
        message: `Action impossible : la mutation est au statut "${mutation.statut}". Seules les mutations EN_VALIDATION_DIRECTION peuvent être validées.`,
      })
    }

    const updated = await prisma.mutation.update({
      where: { id },
      data: {
        statut: 'EN_ETUDE_LOGEMENT',
        valideParDirectionId: req.user.id,
        dateValidationDirection: new Date(),
        commentaireDirection: req.body.commentaire?.trim() || null,
      },
      select: SELECT_MUTATION,
    })

    await Promise.allSettled([
      notifierRoles(
        ['ADMIN', 'SUPER_ADMIN'],
        `Demande de mutation #${id} validée par la Direction — en attente de traitement par le service logement.`,
        'INFO',
      ),
      creerNotification({
        utilisateurId: mutation.demandeurId,
        message: 'Votre demande de mutation a été validée par la Direction et est en cours de traitement par le service logement.',
        type: 'SUCCESS',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Direction] validerMutation:', err)
    next(err)
  }
}

// ─── F) Rejeter une mutation ──────────────────────────────────────────────────

export async function rejeterMutation(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { motifRejet } = req.body
    if (!motifRejet?.trim()) {
      return res.status(400).json({ message: 'Le motif de rejet est requis.' })
    }

    const mutation = await prisma.mutation.findUnique({ where: { id } })

    if (!mutation) {
      return res.status(404).json({ message: 'Mutation introuvable.' })
    }
    if (mutation.statut !== 'EN_VALIDATION_DIRECTION') {
      return res.status(400).json({
        message: `Action impossible : la mutation est au statut "${mutation.statut}". Seules les mutations EN_VALIDATION_DIRECTION peuvent être rejetées.`,
      })
    }

    const updated = await prisma.mutation.update({
      where: { id },
      data: {
        statut: 'REJETEE_DIRECTION',
        valideParDirectionId: req.user.id,
        dateValidationDirection: new Date(),
        commentaireDirection: motifRejet.trim(),
      },
      select: SELECT_MUTATION,
    })

    await Promise.allSettled([
      creerNotification({
        utilisateurId: mutation.demandeurId,
        message: `Votre demande de mutation (#${id}) a été rejetée par la Direction. Motif : ${motifRejet.trim()}`,
        type: 'ERROR',
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Direction] rejeterMutation:', err)
    next(err)
  }
}

// ─── G) Notifications ──────────────────────────────────────────────────────────
// GET /api/direction/notifications

export async function getNotifications(req, res, next) {
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
    console.error('[Direction] getNotifications:', err)
    next(err)
  }
}

// PATCH /api/direction/notifications/:id/lue
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
    console.error('[Direction] marquerNotificationLue:', err)
    next(err)
  }
}

// PATCH /api/direction/notifications/tout-lu
export async function marquerToutLu(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { utilisateurId: req.user.id, lu: false },
      data:  { lu: true },
    })
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' })
  } catch (err) {
    console.error('[Direction] marquerToutLu:', err)
    next(err)
  }
}

// DELETE /api/direction/notifications/:id
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
    console.error('[Direction] supprimerNotification:', err)
    next(err)
  }
}

// DELETE /api/direction/notifications
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
    console.error('[Direction] supprimerNotifications:', err)
    next(err)
  }
}

// ─── H) Statistiques Direction ────────────────────────────────────────────────

export async function getStatistiquesDirection(_req, res, next) {
  try {
    const dj = debutJour()
    const fj = finJour()
    const dm = debutMois()

    const [
      demandesEnAttente,
      mutationsEnAttente,
      demandesValideesAujourdhui,
      mutationsValideesAujourdhui,
      demandesRejeteesAujourdhui,
      mutationsRejeteesAujourdhui,
      demandesValideesMois,
      mutationsValideesMois,
      demandesRejeteesDirectionMois,
      demandesRejeteesServiceLogementMois,
      demandesApprouveesMois,
      totalDemandes,
      soumises,
      valideesDirection,
      enEtudeLogement,
      approuvees,
      rejeteesDirection,
      rejetees,
    ] = await Promise.all([
      prisma.demandeLogement.count({ where: { statut: 'EN_VALIDATION_DIRECTION' } }),
      prisma.mutation.count({ where: { statut: 'EN_VALIDATION_DIRECTION' } }),

      prisma.demandeLogement.count({
        where: {
          statut: { in: ['EN_ETUDE_LOGEMENT', 'APPROUVEE'] },
          dateValidationDirection: { gte: dj, lt: fj },
        },
      }),
      prisma.mutation.count({
        where: {
          statut: { in: ['EN_ETUDE_LOGEMENT', 'APPROUVEE'] },
          dateValidationDirection: { gte: dj, lt: fj },
        },
      }),

      prisma.demandeLogement.count({
        where: { statut: 'REJETEE_DIRECTION', dateValidationDirection: { gte: dj, lt: fj } },
      }),
      prisma.mutation.count({
        where: { statut: 'REJETEE_DIRECTION', dateValidationDirection: { gte: dj, lt: fj } },
      }),

      prisma.demandeLogement.count({
        where: {
          statut: { in: ['EN_ETUDE_LOGEMENT', 'APPROUVEE'] },
          dateValidationDirection: { gte: dm },
        },
      }),
      prisma.mutation.count({
        where: {
          statut: { in: ['EN_ETUDE_LOGEMENT', 'APPROUVEE'] },
          dateValidationDirection: { gte: dm },
        },
      }),
      prisma.demandeLogement.count({
        where: { statut: 'REJETEE_DIRECTION', dateValidationDirection: { gte: dm } },
      }),
      // Rejet en aval par le Service Logement (statut REJETEE, distinct de REJETEE_DIRECTION) —
      // daté par dateTraitement, pas dateValidationDirection.
      prisma.demandeLogement.count({
        where: { statut: 'REJETEE', dateTraitement: { gte: dm } },
      }),
      // "Traitées ce mois" = uniquement les demandes APPROUVEE (attribution effective par
      // le Service Logement), pas EN_ETUDE_LOGEMENT qui n'est qu'une étape intermédiaire.
      prisma.demandeLogement.count({
        where: { statut: 'APPROUVEE', dateTraitement: { gte: dm } },
      }),

      prisma.demandeLogement.count(),
      prisma.demandeLogement.count({ where: { statut: 'SOUMISE' } }),
      prisma.demandeLogement.count({ where: { statut: 'VALIDEE_DIRECTION' } }),
      prisma.demandeLogement.count({ where: { statut: 'EN_ETUDE_LOGEMENT' } }),
      prisma.demandeLogement.count({ where: { statut: 'APPROUVEE' } }),
      prisma.demandeLogement.count({ where: { statut: 'REJETEE_DIRECTION' } }),
      prisma.demandeLogement.count({ where: { statut: 'REJETEE' } }),
    ])

    const [histoDemandes, histoValidees, histoRejetees] = await Promise.all([
      histoJournalier(prisma.demandeLogement, 'dateDepot'),
      histoJournalier(prisma.demandeLogement, 'dateValidationDirection', { statut: { in: ['EN_ETUDE_LOGEMENT', 'APPROUVEE'] } }),
      histoJournalier(prisma.demandeLogement, 'dateValidationDirection', { statut: 'REJETEE_DIRECTION' }),
    ])

    // Délai moyen de traitement (en jours) entre le dépôt et la décision de la Direction.
    const traitees = await prisma.demandeLogement.findMany({
      where: { dateValidationDirection: { not: null } },
      select: { dateDepot: true, dateValidationDirection: true },
    })
    const delaiMoyenTraitementJours = traitees.length
      ? Math.round(
          (traitees.reduce((sum, d) => sum + (d.dateValidationDirection.getTime() - d.dateDepot.getTime()), 0) / traitees.length)
          / (1000 * 60 * 60 * 24) * 10,
        ) / 10
      : null

    res.json({
      totalEnAttente:          demandesEnAttente + mutationsEnAttente,
      totalValideesAujourdhui: demandesValideesAujourdhui + mutationsValideesAujourdhui,
      totalRejeteesAujourdhui: demandesRejeteesAujourdhui + mutationsRejeteesAujourdhui,
      totalValideesCeMois:     demandesValideesMois + mutationsValideesMois,
      totalDemandes,
      // Rejets "ce mois" toutes étapes confondues (Direction ET Service Logement),
      // pour le KPI "Rejetées ce mois" de DirectionDashboard.
      demandesRejeteesMois: demandesRejeteesDirectionMois + demandesRejeteesServiceLogementMois,
      demandesApprouveesMois,
      demandesParStatut: {
        SOUMISE:                 soumises,
        EN_VALIDATION_DIRECTION: demandesEnAttente,
        VALIDEE_DIRECTION:       valideesDirection,
        EN_ETUDE_LOGEMENT:       enEtudeLogement,
        APPROUVEE:               approuvees,
        REJETEE_DIRECTION:       rejeteesDirection,
        REJETEE:                 rejetees,
      },
      delaiMoyenTraitementJours,
      historique: {
        demandes: histoDemandes,
        validees: histoValidees,
        rejetees: histoRejetees,
      },
      detail: {
        demandes: {
          enAttente:        demandesEnAttente,
          valideesAujourd:  demandesValideesAujourdhui,
          rejeteesAujourd:  demandesRejeteesAujourdhui,
          valideesMois:     demandesValideesMois,
        },
        mutations: {
          enAttente:        mutationsEnAttente,
          valideesAujourd:  mutationsValideesAujourdhui,
          rejeteesAujourd:  mutationsRejeteesAujourdhui,
          valideesMois:     mutationsValideesMois,
        },
      },
    })
  } catch (err) {
    console.error('[Direction] getStatistiquesDirection:', err)
    next(err)
  }
}
