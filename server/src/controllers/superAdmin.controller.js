import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma.js'
import { creerNotification } from '../services/notification.service.js'

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'DIRECTION', 'LOCATAIRE', 'RESPONSABLE', 'TECHNICIEN', 'SERVICE_LOGEMENT']

const STATUTS_TICKET = [
  'SOUMIS', 'CONSTAT_PROGRAMME', 'CONSTAT_EFFECTUE', 'PRISE_EN_CHARGE_LOCATAIRE',
  'PRISE_EN_CHARGE_SONAPIE', 'EN_ATTENTE_CONFIRMATION_LOCATAIRE', 'ASSIGNE_TECHNICIEN',
  'EN_COURS', 'VERIFICATION_SONAPIE', 'CLOTURE', 'REOUVERT',
]

const STATUTS_DEMANDE = [
  'SOUMISE', 'EN_VALIDATION_DIRECTION', 'VALIDEE_DIRECTION', 'REJETEE_DIRECTION',
  'EN_ETUDE_LOGEMENT', 'APPROUVEE', 'REJETEE',
]

// Statuts considérés comme définitivement clos pour une demande.
const DEMANDE_STATUTS_TERMINES = ['APPROUVEE', 'REJETEE', 'REJETEE_DIRECTION']
const DEMANDE_STATUTS_EN_ATTENTE = ['SOUMISE', 'EN_VALIDATION_DIRECTION', 'EN_ETUDE_LOGEMENT']

function adresseIp(req) {
  return req.ip || req.socket?.remoteAddress || null
}

function derniereActiviteDemande(d) {
  return [d.dateDepot, d.dateTraitement, d.dateValidationDirection, d.derniereActionAdmin]
    .filter(Boolean)
    .reduce((max, date) => (date > max ? date : max), d.dateDepot)
}

function derniereActiviteTicket(t) {
  return [t.dateDepot, t.dateConstat, t.dateConfirmationLocataire, t.dateVerification, t.derniereActionAdmin]
    .filter(Boolean)
    .reduce((max, date) => (date > max ? date : max), t.dateDepot)
}

function genererMotDePasseTemporaire(longueur = 10) {
  const majuscules = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const chiffres = '0123456789'
  const speciaux = '!@#$%&*'
  const tous = majuscules + chiffres + speciaux

  const caracteres = [
    majuscules[crypto.randomInt(majuscules.length)],
    chiffres[crypto.randomInt(chiffres.length)],
    speciaux[crypto.randomInt(speciaux.length)],
  ]
  for (let i = caracteres.length; i < longueur; i++) {
    caracteres.push(tous[crypto.randomInt(tous.length)])
  }

  // Mélange Fisher-Yates pour ne pas garder les 3 premiers caractères prévisibles.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }

  return caracteres.join('')
}

// ─── a) GET /api/super-admin/health ───────────────────────────────────────────

export async function getHealthCheck(_req, res, next) {
  try {
    const maintenant = new Date()
    const il7Jours  = new Date(maintenant.getTime() - 7  * 24 * 60 * 60 * 1000)
    const il5Jours  = new Date(maintenant.getTime() - 5  * 24 * 60 * 60 * 1000)

    const [totalU, parRoleRaw, inactifsDepuis30Jours, nouveauxCe7Jours] = await Promise.all([
      prisma.utilisateur.count(),
      prisma.utilisateur.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.utilisateur.count({ where: { actif: false } }),
      prisma.utilisateur.count({ where: { createdAt: { gte: il7Jours } } }),
    ])
    const parRole = Object.fromEntries(ROLES.map(r => [r, 0]))
    for (const g of parRoleRaw) parRole[g.role] = g._count._all

    const [totalLogements, disponibles, occupes, enMaintenance] = await Promise.all([
      prisma.logement.count(),
      prisma.logement.count({ where: { statut: 'DISPONIBLE' } }),
      prisma.logement.count({ where: { statut: 'OCCUPE' } }),
      prisma.logement.count({ where: { statut: 'MAINTENANCE' } }),
    ])

    const [totalDemandes, enAttenteDemandes, demandesActives] = await Promise.all([
      prisma.demandeLogement.count(),
      prisma.demandeLogement.count({ where: { statut: { in: DEMANDE_STATUTS_EN_ATTENTE } } }),
      prisma.demandeLogement.findMany({
        where: { statut: { notIn: DEMANDE_STATUTS_TERMINES } },
        select: {
          id: true, statut: true, dateDepot: true, dateTraitement: true, dateValidationDirection: true, derniereActionAdmin: true,
          demandeur: { select: { nom: true, prenom: true } },
        },
      }),
    ])
    const demandesBloquees = demandesActives
      .filter(d => derniereActiviteDemande(d) < il7Jours)
      .map(d => ({
        id: d.id,
        statut: d.statut,
        demandeur: d.demandeur,
        joursBloque: Math.floor((maintenant - derniereActiviteDemande(d)) / (24 * 60 * 60 * 1000)),
      }))

    const [totalTickets, ticketsOuvertsCount, ticketsOuverts] = await Promise.all([
      prisma.ticketMaintenance.count(),
      prisma.ticketMaintenance.count({ where: { statut: { not: 'CLOTURE' } } }),
      prisma.ticketMaintenance.findMany({
        where: { statut: { not: 'CLOTURE' } },
        select: {
          id: true, statut: true, dateDepot: true, dateConstat: true, dateConfirmationLocataire: true, dateVerification: true, derniereActionAdmin: true,
          demandeur: { select: { nom: true, prenom: true } },
        },
      }),
    ])
    const ticketsBloques = ticketsOuverts
      .filter(t => derniereActiviteTicket(t) < il5Jours)
      .map(t => ({
        id: t.id,
        statut: t.statut,
        demandeur: t.demandeur,
        joursBloque: Math.floor((maintenant - derniereActiviteTicket(t)) / (24 * 60 * 60 * 1000)),
      }))

    const totalBloques = demandesBloquees.length + ticketsBloques.length
    const systemStatus = totalBloques > 10 ? 'CRITICAL' : totalBloques > 0 ? 'WARNING' : 'OK'

    res.json({
      utilisateurs: {
        total: totalU,
        parRole,
        inactifsDepuis30Jours,
        nouveauxCe7Jours,
      },
      logements: {
        total: totalLogements,
        disponibles,
        occupes,
        enMaintenance,
      },
      demandes: {
        total: totalDemandes,
        enAttente: enAttenteDemandes,
        bloqueesPlusDe7Jours: demandesBloquees.length,
        listeBloquees: demandesBloquees,
      },
      tickets: {
        total: totalTickets,
        ouverts: ticketsOuvertsCount,
        bloqueesPlusDe5Jours: ticketsBloques.length,
        listeBloquees: ticketsBloques,
      },
      systemStatus,
    })
  } catch (err) {
    next(err)
  }
}

// ─── b) GET /api/super-admin/logs ─────────────────────────────────────────────

export async function getLogs(req, res, next) {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200)
    const { module, typeAction, utilisateurId, dateDebut, dateFin } = req.query

    const where = {}
    if (module)     where.module = module
    if (typeAction) where.typeAction = typeAction
    if (utilisateurId && !isNaN(parseInt(utilisateurId))) {
      where.utilisateurId = parseInt(utilisateurId)
    }
    if (dateDebut || dateFin) {
      where.createdAt = {}
      if (dateDebut) where.createdAt.gte = new Date(dateDebut)
      if (dateFin)   where.createdAt.lte = new Date(dateFin)
    }

    const [total, logs] = await Promise.all([
      prisma.logActivite.count({ where }),
      prisma.logActivite.findMany({
        where,
        include: { utilisateur: { select: { nom: true, prenom: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    res.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}

// ─── c) POST /api/super-admin/utilisateurs/:id/reset-password ────────────────

export async function resetMotDePasse(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id } })
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur introuvable.' })

    const motDePasseTemporaire = genererMotDePasseTemporaire()
    const hash = await bcrypt.hash(motDePasseTemporaire, 12)

    await prisma.utilisateur.update({ where: { id }, data: { motDePasse: hash } })

    await prisma.logActivite.create({
      data: {
        utilisateurId: req.user.id,
        typeAction: 'RESET_MOT_DE_PASSE',
        module: 'utilisateurs',
        description: `Réinitialisation du mot de passe de ${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email})`,
        entiteId: utilisateur.id,
        entiteType: 'Utilisateur',
        adresseIp: adresseIp(req),
      },
    })

    res.json({ motDePasseTemporaire })
  } catch (err) {
    next(err)
  }
}

// ─── d) PUT /api/super-admin/tickets/:id/forcer-statut ────────────────────────

export async function forcerStatutTicket(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { statut, raison } = req.body
    if (!statut || !STATUTS_TICKET.includes(statut)) {
      return res.status(400).json({ message: 'Statut de ticket invalide.' })
    }
    if (!raison?.trim()) {
      return res.status(400).json({ message: 'La raison du forçage est obligatoire.' })
    }

    const ticket = await prisma.ticketMaintenance.findUnique({ where: { id } })
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' })

    const updated = await prisma.ticketMaintenance.update({
      where: { id },
      data: { statut, derniereActionAdmin: new Date() },
    })

    await Promise.allSettled([
      prisma.logActivite.create({
        data: {
          utilisateurId: req.user.id,
          typeAction: 'MODIFICATION',
          module: 'tickets',
          description: `Forçage du statut du ticket #${id} → ${statut} — Raison : ${raison.trim()}`,
          entiteId: id,
          entiteType: 'TicketMaintenance',
          adresseIp: adresseIp(req),
        },
      }),
      creerNotification({
        utilisateurId: ticket.demandeurId,
        message: `Votre ticket #${id} a été mis à jour par l'administration.`,
        type: 'INFO',
      }),
    ])

    res.json(updated)
  } catch (err) {
    next(err)
  }
}

// ─── e) PUT /api/super-admin/demandes/:id/forcer-statut ───────────────────────

export async function forcerStatutDemande(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { statut, raison } = req.body
    if (!statut || !STATUTS_DEMANDE.includes(statut)) {
      return res.status(400).json({ message: 'Statut de demande invalide.' })
    }
    if (!raison?.trim()) {
      return res.status(400).json({ message: 'La raison du forçage est obligatoire.' })
    }

    const demande = await prisma.demandeLogement.findUnique({ where: { id } })
    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' })

    const updated = await prisma.demandeLogement.update({
      where: { id },
      data: { statut, derniereActionAdmin: new Date() },
    })

    await Promise.allSettled([
      prisma.logActivite.create({
        data: {
          utilisateurId: req.user.id,
          typeAction: 'MODIFICATION',
          module: 'demandes',
          description: `Forçage du statut de la demande #${id} → ${statut} — Raison : ${raison.trim()}`,
          entiteId: id,
          entiteType: 'DemandeLogement',
          adresseIp: adresseIp(req),
        },
      }),
      creerNotification({
        utilisateurId: demande.demandeurId,
        message: `Votre demande #${id} a été mise à jour par l'administration.`,
        type: 'INFO',
      }),
    ])

    res.json(updated)
  } catch (err) {
    next(err)
  }
}

// ─── f) GET /api/super-admin/utilisateurs ─────────────────────────────────────

export async function getAllUtilisateurs(req, res, next) {
  try {
    const { role, actif, search } = req.query

    const where = {}
    if (role) where.role = role
    if (actif !== undefined) where.actif = actif === 'true'
    if (search?.trim()) {
      const s = search.trim()
      where.OR = [
        { nom:    { contains: s } },
        { prenom: { contains: s } },
        { email:  { contains: s } },
      ]
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where,
      select: {
        id: true, nom: true, prenom: true, email: true, telephone: true,
        role: true, typeLocataire: true, numeroMatricule: true,
        actif: true, createdAt: true,
        _count: { select: { demandes: true, tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(utilisateurs)
  } catch (err) {
    next(err)
  }
}

// ─── g) GET /api/super-admin/utilisateurs/:id ─────────────────────────────────

export async function getUtilisateurDetail(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      select: {
        id: true, nom: true, prenom: true, email: true, telephone: true,
        role: true, typeLocataire: true, numeroMatricule: true,
        actif: true, createdAt: true,
      },
    })
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur introuvable.' })

    const [dernieresActivites, demandesParStatut, ticketsParStatut, occupationActuelle] = await Promise.all([
      prisma.logActivite.findMany({
        where: { utilisateurId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.demandeLogement.groupBy({
        by: ['statut'],
        where: { demandeurId: id },
        _count: { _all: true },
      }),
      prisma.ticketMaintenance.groupBy({
        by: ['statut'],
        where: { demandeurId: id },
        _count: { _all: true },
      }),
      utilisateur.role === 'LOCATAIRE'
        ? prisma.occupation.findFirst({
            where: { utilisateurId: id, statut: 'ACTIVE' },
            include: { logement: true },
          })
        : null,
    ])

    res.json({
      ...utilisateur,
      dernieresActivites,
      demandes: Object.fromEntries(demandesParStatut.map(g => [g.statut, g._count._all])),
      tickets: Object.fromEntries(ticketsParStatut.map(g => [g.statut, g._count._all])),
      occupationActuelle: occupationActuelle || null,
    })
  } catch (err) {
    next(err)
  }
}
