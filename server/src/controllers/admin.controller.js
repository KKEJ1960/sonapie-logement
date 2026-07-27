import { prisma } from '../utils/prisma.js'
import { creerNotification, notifierRoles } from '../services/notification.service.js'

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const SELECT_DEMANDEUR_LIST = { id: true, nom: true, prenom: true, email: true, telephone: true }
const SELECT_DEMANDE_LIST = {
  id: true, motif: true, statut: true, priorite: true, commentaire: true,
  dateDepot: true, dateValidationDirection: true, commentaireDirection: true,
  dateTraitement: true, logementId: true,
  demandeur: { select: SELECT_DEMANDEUR_LIST },
  logement: { select: { id: true, code: true, adresse: true, ville: true, type: true } },
}

const SELECT_LOGEMENT_MUTATION = { id: true, code: true, adresse: true, ville: true, type: true }
const SELECT_MUTATION_LIST = {
  id: true, motif: true, statut: true, commentaire: true,
  dateDepot: true, dateTraitement: true,
  demandeur: { select: SELECT_DEMANDEUR_LIST },
  logementActuel: { select: SELECT_LOGEMENT_MUTATION },
  logementSouhaite: { select: SELECT_LOGEMENT_MUTATION },
}

// Un seul aller-retour DB (au lieu de 7 count() séquentiels/parallèles) : on récupère
// juste la colonne de date sur la fenêtre des 7 derniers mois, puis on répartit en
// mémoire. Avec un connection_limit=3 côté TiDB, 7 requêtes concurrentes créaient plus
// de contention sur le pool qu'elles n'en économisaient en aller-retours réseau.
async function histoMensuel(model, champDate) {
  const now = new Date()
  const debut = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const rows = await model.findMany({
    where: { [champDate]: { gte: debut, lt: fin } },
    select: { [champDate]: true },
  })

  const counts = new Array(7).fill(0)
  for (const row of rows) {
    const d = row[champDate]
    const idx = (d.getFullYear() - debut.getFullYear()) * 12 + (d.getMonth() - debut.getMonth())
    if (idx >= 0 && idx < 7) counts[idx]++
  }
  return counts
}

export async function getDashboardStats(_req, res, next) {
  try {
    const now                = new Date()
    const debutMois          = new Date(now.getFullYear(), now.getMonth(), 1)
    const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const debutJour          = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const finJour             = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const [
      totalU, cesMoisU, dernierMoisU,
      totalL, cesMoisL, dernierMoisL, disponibles, occupes, enMaintenance,
      totalD, cesMoisD, dernierMoisD, enAttenteD, nouvellesAujourdhuiD,
      totalI, cesMoisI, dernierMoisI,
      totalT, enCoursT, clotureesCeMoisT,
      enAttenteM,
    ] = await Promise.all([
      prisma.utilisateur.count(),
      prisma.utilisateur.count({ where: { createdAt: { gte: debutMois } } }),
      prisma.utilisateur.count({ where: { createdAt: { gte: debutMoisPrecedent, lt: debutMois } } }),

      prisma.logement.count(),
      prisma.logement.count({ where: { createdAt: { gte: debutMois } } }),
      prisma.logement.count({ where: { createdAt: { gte: debutMoisPrecedent, lt: debutMois } } }),
      prisma.logement.count({ where: { statut: 'DISPONIBLE' } }),
      prisma.logement.count({ where: { statut: 'OCCUPE' } }),
      prisma.logement.count({ where: { statut: 'MAINTENANCE' } }),

      prisma.demandeLogement.count(),
      prisma.demandeLogement.count({ where: { dateDepot: { gte: debutMois } } }),
      prisma.demandeLogement.count({ where: { dateDepot: { gte: debutMoisPrecedent, lt: debutMois } } }),
      prisma.demandeLogement.count({ where: { statut: { in: ['SOUMISE', 'EN_VALIDATION_DIRECTION', 'EN_ETUDE_LOGEMENT'] } } }),
      prisma.demandeLogement.count({ where: { dateDepot: { gte: debutJour, lt: finJour } } }),

      prisma.intervention.count(),
      prisma.intervention.count({ where: { dateAssignation: { gte: debutMois } } }),
      prisma.intervention.count({ where: { dateAssignation: { gte: debutMoisPrecedent, lt: debutMois } } }),

      prisma.ticketMaintenance.count(),
      prisma.ticketMaintenance.count({ where: { statut: 'EN_COURS' } }),
      prisma.ticketMaintenance.count({ where: { statut: 'CLOTURE', dateCloture: { gte: debutMois } } }),

      prisma.mutation.count({ where: { statut: { in: ['SOUMISE', 'EN_VALIDATION_DIRECTION', 'EN_ETUDE_LOGEMENT'] } } }),
    ])

    const [histU, histL, histD, histI] = await Promise.all([
      histoMensuel(prisma.utilisateur,    'createdAt'),
      histoMensuel(prisma.logement,       'createdAt'),
      histoMensuel(prisma.demandeLogement,'dateDepot'),
      histoMensuel(prisma.intervention,   'dateAssignation'),
    ])

    res.json({
      utilisateurs:  { total: totalU, cesMois: cesMoisU  - dernierMoisU,  historique: histU },
      logements:     { total: totalL, cesMois: cesMoisL  - dernierMoisL,  historique: histL, disponibles, occupes, enMaintenance },
      demandes:      { total: totalD, cesMois: cesMoisD  - dernierMoisD,  historique: histD, enAttente: enAttenteD, nouvellesAujourdhui: nouvellesAujourdhuiD },
      interventions: { total: totalI, cesMois: cesMoisI  - dernierMoisI,  historique: histI },
      tickets:       { total: totalT, enCours: enCoursT, clotureesCeMois: clotureesCeMoisT },
      mutations:     { enAttente: enAttenteM },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/stats/demandes-mensuelles
export async function getDemandesMensuelles(_req, res, next) {
  try {
    const now = new Date()
    const debut = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // 2 requêtes (une par table) au lieu de 12 (6 mois × 2 count()) : on récupère les
    // dates brutes sur la fenêtre et on répartit par mois en mémoire.
    const [demandesRows, ticketsRows] = await Promise.all([
      prisma.demandeLogement.findMany({ where: { dateDepot: { gte: debut, lt: fin } }, select: { dateDepot: true } }),
      prisma.ticketMaintenance.findMany({ where: { dateDepot: { gte: debut, lt: fin } }, select: { dateDepot: true } }),
    ])

    const demandesCounts = new Array(6).fill(0)
    const ticketsCounts  = new Array(6).fill(0)
    const bucket = (d) => (d.getFullYear() - debut.getFullYear()) * 12 + (d.getMonth() - debut.getMonth())
    for (const row of demandesRows) {
      const idx = bucket(row.dateDepot)
      if (idx >= 0 && idx < 6) demandesCounts[idx]++
    }
    for (const row of ticketsRows) {
      const idx = bucket(row.dateDepot)
      if (idx >= 0 && idx < 6) ticketsCounts[idx]++
    }

    const data = Array.from({ length: 6 }, (_, idx) => ({
      mois: MOIS_LABELS[new Date(debut.getFullYear(), debut.getMonth() + idx, 1).getMonth()],
      demandes: demandesCounts[idx],
      tickets: ticketsCounts[idx],
    }))

    res.json(data)
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/demandes?limit=&statut=
export async function getDemandesAdmin(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const { statut } = req.query

    const where = {}
    if (statut) where.statut = statut

    const demandes = await prisma.demandeLogement.findMany({
      where,
      select: SELECT_DEMANDE_LIST,
      orderBy: { dateDepot: 'desc' },
      take: limit,
    })

    res.json(demandes)
  } catch (err) {
    next(err)
  }
}

// ─── Attribuer un logement à une demande ─────────────────────────────────────
// PUT /api/admin/demandes/:id/approuver

export async function approuverDemande(req, res, next) {
  try {
    // Défense en profondeur : cette route est déjà réservée à SUPER_ADMIN au niveau
    // du routeur, mais on bloque explicitement ici aussi si jamais elle est un jour
    // rouverte à ADMIN sans qu'on remarque cette dépendance.
    if (req.user.role === 'ADMIN') {
      return res.status(403).json({ message: "L'attribution de logement est réservée au Service Logement." })
    }

    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { logementId, commentaire } = req.body
    if (!logementId) return res.status(400).json({ message: 'logementId est requis.' })

    const demande = await prisma.demandeLogement.findUnique({ where: { id } })
    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' })
    if (demande.statut !== 'EN_ETUDE_LOGEMENT') {
      return res.status(400).json({
        message: `Action impossible : la demande est au statut "${demande.statut}". Seules les demandes EN_ETUDE_LOGEMENT peuvent être approuvées.`,
      })
    }

    const logement = await prisma.logement.findUnique({ where: { id: parseInt(logementId) } })
    if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })
    if (logement.statut !== 'DISPONIBLE') {
      return res.status(400).json({ message: "Ce logement n'est pas disponible." })
    }

    // Plusieurs demandeurs peuvent viser le même logement avant son attribution.
    // Une fois attribué ici, toutes les autres demandes encore actives sur ce même
    // logement doivent être closes automatiquement — sinon elles restent bloquées
    // indéfiniment dans le pipeline sans que personne ne sache que ce logement précis
    // n'est plus disponible pour elles.
    const demandesConcurrentes = await prisma.demandeLogement.findMany({
      where: {
        logementId: logement.id,
        id: { not: id },
        statut: { in: ['SOUMISE', 'EN_VALIDATION_DIRECTION', 'VALIDEE_DIRECTION', 'EN_ETUDE_LOGEMENT'] },
      },
      select: { id: true, demandeurId: true },
    })

    const [updated] = await prisma.$transaction([
      prisma.demandeLogement.update({
        where: { id },
        data: {
          statut: 'APPROUVEE',
          logementId: logement.id,
          traitePar: req.user.id,
          dateTraitement: new Date(),
          commentaire: commentaire?.trim() || null,
        },
        select: SELECT_DEMANDE_LIST,
      }),
      prisma.logement.update({ where: { id: logement.id }, data: { statut: 'OCCUPE' } }),
      prisma.occupation.create({
        data: {
          utilisateurId: demande.demandeurId,
          logementId: logement.id,
          dateEntree: new Date(),
          statut: 'ACTIVE',
          actif: true,
        },
      }),
      ...(demandesConcurrentes.length
        ? [prisma.demandeLogement.updateMany({
            where: { id: { in: demandesConcurrentes.map(d => d.id) } },
            data: {
              statut: 'REJETEE',
              traitePar: req.user.id,
              dateTraitement: new Date(),
              commentaire: `Logement attribué à un autre demandeur (demande #${id}).`,
            },
          })]
        : []),
    ])

    await Promise.allSettled([
      creerNotification({
        utilisateurId: demande.demandeurId,
        message: `Félicitations ! Votre demande de logement a été approuvée. Le logement ${logement.code} vous a été attribué.`,
        type: 'SUCCESS',
      }),
      notifierRoles(
        ['SERVICE_LOGEMENT'],
        `Nouvelle attribution : ${updated.demandeur?.prenom} ${updated.demandeur?.nom} → logement ${logement.code}. Prenez contact avec le locataire.`,
        'INFO',
      ),
      ...demandesConcurrentes.map(d => creerNotification({
        utilisateurId: d.demandeurId,
        message: `Le logement ${logement.code} que vous aviez demandé a été attribué à un autre demandeur. Vous pouvez soumettre une nouvelle demande pour un autre logement disponible.`,
        type: 'WARNING',
      })),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Admin] approuverDemande:', err)
    next(err)
  }
}

// ─── Rejeter une demande (côté admin, à l'étape logement) ────────────────────
// PUT /api/admin/demandes/:id/rejeter

export async function rejeterDemande(req, res, next) {
  try {
    // Défense en profondeur : réservé à SUPER_ADMIN au niveau du routeur, voir approuverDemande.
    if (req.user.role === 'ADMIN') {
      return res.status(403).json({ message: 'Cette action est réservée au Super Administrateur.' })
    }

    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { motifRejet } = req.body
    if (!motifRejet?.trim()) {
      return res.status(400).json({ message: 'Le motif de rejet est requis.' })
    }

    const demande = await prisma.demandeLogement.findUnique({ where: { id } })
    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' })
    if (demande.statut !== 'EN_ETUDE_LOGEMENT') {
      return res.status(400).json({
        message: `Action impossible : la demande est au statut "${demande.statut}". Seules les demandes EN_ETUDE_LOGEMENT peuvent être rejetées.`,
      })
    }

    const updated = await prisma.demandeLogement.update({
      where: { id },
      data: {
        statut: 'REJETEE',
        traitePar: req.user.id,
        dateTraitement: new Date(),
        commentaire: motifRejet.trim(),
      },
      select: SELECT_DEMANDE_LIST,
    })

    await creerNotification({
      utilisateurId: demande.demandeurId,
      message: `Votre demande de logement a été rejetée. Motif : ${motifRejet.trim()}`,
      type: 'ERROR',
    })

    res.json(updated)
  } catch (err) {
    console.error('[Admin] rejeterDemande:', err)
    next(err)
  }
}

// ─── Mutations (lecture, tous statuts) ───────────────────────────────────────
// GET /api/admin/mutations?statut=

export async function getMutationsAdmin(req, res, next) {
  try {
    const { statut } = req.query
    const where = {}
    if (statut) where.statut = statut

    const mutations = await prisma.mutation.findMany({
      where,
      select: SELECT_MUTATION_LIST,
      orderBy: { dateDepot: 'desc' },
    })

    res.json(mutations)
  } catch (err) {
    next(err)
  }
}

// ─── Approuver une mutation ───────────────────────────────────────────────────
// PUT /api/admin/mutations/:id/approuver

export async function approuverMutation(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { commentaire } = req.body

    const mutation = await prisma.mutation.findUnique({ where: { id } })
    if (!mutation) return res.status(404).json({ message: 'Mutation introuvable.' })
    if (mutation.statut !== 'EN_ETUDE_LOGEMENT') {
      return res.status(400).json({
        message: `Action impossible : la mutation est au statut "${mutation.statut}". Seules les mutations EN_ETUDE_LOGEMENT peuvent être approuvées.`,
      })
    }

    const occupationActuelle = await prisma.occupation.findFirst({
      where: { utilisateurId: mutation.demandeurId, logementId: mutation.logementActuelId, statut: 'ACTIVE' },
    })

    let logementSouhaite = null
    if (mutation.logementSouhaiteId) {
      logementSouhaite = await prisma.logement.findUnique({ where: { id: mutation.logementSouhaiteId } })
      if (!logementSouhaite) return res.status(404).json({ message: 'Logement souhaité introuvable.' })
      if (logementSouhaite.statut !== 'DISPONIBLE') {
        return res.status(400).json({ message: "Le logement souhaité n'est pas disponible." })
      }
    }

    const operations = [
      prisma.mutation.update({
        where: { id },
        data: {
          statut: 'APPROUVEE',
          traitePar: req.user.id,
          dateTraitement: new Date(),
          commentaire: commentaire?.trim() || null,
        },
        select: SELECT_MUTATION_LIST,
      }),
      prisma.logement.update({ where: { id: mutation.logementActuelId }, data: { statut: 'DISPONIBLE' } }),
    ]

    if (occupationActuelle) {
      operations.push(
        prisma.occupation.update({
          where: { id: occupationActuelle.id },
          data: { statut: 'TERMINEE', actif: false, dateSortie: new Date() },
        }),
      )
    }

    if (logementSouhaite) {
      operations.push(
        prisma.logement.update({ where: { id: logementSouhaite.id }, data: { statut: 'OCCUPE' } }),
        prisma.occupation.create({
          data: {
            utilisateurId: mutation.demandeurId,
            logementId: logementSouhaite.id,
            dateEntree: new Date(),
            statut: 'ACTIVE',
            actif: true,
          },
        }),
      )
    }

    const [updated] = await prisma.$transaction(operations)

    await Promise.allSettled([
      creerNotification({
        utilisateurId: mutation.demandeurId,
        message: logementSouhaite
          ? `Votre demande de mutation a été approuvée. Vous êtes maintenant attribué au logement ${logementSouhaite.code}.`
          : 'Votre demande de mutation a été approuvée.',
        type: 'SUCCESS',
      }),
      notifierRoles(
        ['SERVICE_LOGEMENT'],
        `Mutation approuvée : ${updated.demandeur?.prenom} ${updated.demandeur?.nom}. Prenez contact avec le locataire.`,
        'INFO',
      ),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Admin] approuverMutation:', err)
    next(err)
  }
}

// ─── Rejeter une mutation ─────────────────────────────────────────────────────
// PUT /api/admin/mutations/:id/rejeter

export async function rejeterMutation(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { motifRejet } = req.body
    if (!motifRejet?.trim()) {
      return res.status(400).json({ message: 'Le motif de rejet est requis.' })
    }

    const mutation = await prisma.mutation.findUnique({ where: { id } })
    if (!mutation) return res.status(404).json({ message: 'Mutation introuvable.' })
    if (mutation.statut !== 'EN_ETUDE_LOGEMENT') {
      return res.status(400).json({
        message: `Action impossible : la mutation est au statut "${mutation.statut}". Seules les mutations EN_ETUDE_LOGEMENT peuvent être rejetées.`,
      })
    }

    const updated = await prisma.mutation.update({
      where: { id },
      data: {
        statut: 'REJETEE',
        traitePar: req.user.id,
        dateTraitement: new Date(),
        commentaire: motifRejet.trim(),
      },
      select: SELECT_MUTATION_LIST,
    })

    await creerNotification({
      utilisateurId: mutation.demandeurId,
      message: `Votre demande de mutation a été rejetée. Motif : ${motifRejet.trim()}`,
      type: 'ERROR',
    })

    res.json(updated)
  } catch (err) {
    console.error('[Admin] rejeterMutation:', err)
    next(err)
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
// GET /api/admin/notifications
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
    console.error('[Admin] getNotifications:', err)
    next(err)
  }
}

// PATCH /api/admin/notifications/:id/lue
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
    console.error('[Admin] marquerNotificationLue:', err)
    next(err)
  }
}

// PATCH /api/admin/notifications/tout-lu
export async function marquerToutLu(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { utilisateurId: req.user.id, lu: false },
      data:  { lu: true },
    })
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' })
  } catch (err) {
    console.error('[Admin] marquerToutLu:', err)
    next(err)
  }
}

// DELETE /api/admin/notifications/:id
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
    console.error('[Admin] supprimerNotification:', err)
    next(err)
  }
}

// DELETE /api/admin/notifications
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
    console.error('[Admin] supprimerNotifications:', err)
    next(err)
  }
}
