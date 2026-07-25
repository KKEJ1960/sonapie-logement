import { prisma } from '../utils/prisma.js'
import { creerNotification } from '../services/notification.service.js'

const ROLES_CHAT = ['LOCATAIRE', 'SERVICE_LOGEMENT', 'ADMIN', 'SUPER_ADMIN']

const INCLUDE_CONVERSATION = {
  demande: { select: { id: true, statut: true, logement: { select: { id: true, code: true, adresse: true } } } },
  locataire: { select: { id: true, nom: true, prenom: true, email: true, telephone: true, typeLocataire: true } },
  serviceLogement: { select: { id: true, nom: true, prenom: true } },
}

function aAccesConversation(conv, user) {
  return (
    conv.locataireId === user.id ||
    conv.serviceLogementId === user.id ||
    ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
  )
}

// ─── a) Créer ou récupérer la conversation d'une demande ──────────────────────
// POST /api/conversations

export async function creerOuGetConversation(req, res, next) {
  try {
    if (!ROLES_CHAT.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }

    const demandeId = parseInt(req.body.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const demande = await prisma.demandeLogement.findUnique({ where: { id: demandeId } })
    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' })
    if (demande.statut !== 'APPROUVEE') {
      return res.status(400).json({ message: 'La demande doit être approuvée pour ouvrir une conversation.' })
    }

    const existante = await prisma.conversation.findUnique({
      where: { demandeId },
      include: INCLUDE_CONVERSATION,
    })
    if (existante) return res.json(existante)

    const conversation = await prisma.conversation.create({
      data: {
        demandeId,
        locataireId: demande.demandeurId,
        statut: 'EN_ATTENTE',
      },
      include: INCLUDE_CONVERSATION,
    })

    res.status(201).json(conversation)
  } catch (err) {
    console.error('[Chat] creerOuGetConversation:', err)
    next(err)
  }
}

// ─── b) Mes conversations ──────────────────────────────────────────────────────
// GET /api/conversations

export async function getConversations(req, res, next) {
  try {
    let where
    switch (req.user.role) {
      case 'LOCATAIRE':
        where = { locataireId: req.user.id }
        break
      case 'SERVICE_LOGEMENT':
        where = { OR: [{ serviceLogementId: req.user.id }, { statut: 'EN_ATTENTE' }] }
        break
      case 'ADMIN':
      case 'SUPER_ADMIN':
        where = {}
        break
      default:
        return res.status(403).json({ message: 'Accès refusé.' })
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        ...INCLUDE_CONVERSATION,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    const nonLusParConversation = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map(c => c.id) },
        lu: false,
        expediteurId: { not: req.user.id },
      },
      _count: { _all: true },
    })
    const nonLusMap = Object.fromEntries(nonLusParConversation.map(g => [g.conversationId, g._count._all]))

    const result = conversations.map(({ messages, ...c }) => ({
      ...c,
      dernierMessage: messages[0] || null,
      messagesNonLus: nonLusMap[c.id] || 0,
    }))

    res.json(result)
  } catch (err) {
    console.error('[Chat] getConversations:', err)
    next(err)
  }
}

// ─── c) Messages d'une conversation ────────────────────────────────────────────
// GET /api/conversations/:id/messages

export async function getMessages(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const conv = await prisma.conversation.findUnique({ where: { id } })
    if (!conv) return res.status(404).json({ message: 'Conversation introuvable.' })
    if (!aAccesConversation(conv, req.user)) {
      return res.status(403).json({ message: 'Accès refusé à cette conversation.' })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      include: { expediteur: { select: { id: true, nom: true, prenom: true, role: true } } },
    })

    // Marque automatiquement comme lus les messages non lus de l'autre partie
    // (uniquement pour les vrais participants — un ADMIN qui consulte une conversation
    // en lecture seule ne doit pas effacer les badges "non lu" du locataire/service logement).
    if (['LOCATAIRE', 'SERVICE_LOGEMENT'].includes(req.user.role)) {
      await prisma.message.updateMany({
        where: { conversationId: id, expediteurId: { not: req.user.id }, lu: false },
        data: { lu: true },
      })
    }

    res.json(messages)
  } catch (err) {
    console.error('[Chat] getMessages:', err)
    next(err)
  }
}

// ─── d) Prendre en charge une conversation ─────────────────────────────────────
// PATCH /api/conversations/:id/prendre-en-charge

export async function prendreEnCharge(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const conv = await prisma.conversation.findUnique({ where: { id } })
    if (!conv) return res.status(404).json({ message: 'Conversation introuvable.' })

    const updated = await prisma.conversation.update({
      where: { id },
      data: { serviceLogementId: req.user.id, statut: 'ACTIVE' },
      include: INCLUDE_CONVERSATION,
    })

    await prisma.message.create({
      data: {
        conversationId: id,
        expediteurId: req.user.id,
        contenu: 'Le Service Logement a pris en charge votre dossier. Vous pouvez maintenant échanger directement.',
        type: 'NOTIFICATION_SYSTEME',
      },
    })

    await creerNotification({
      utilisateurId: conv.locataireId,
      message: 'Le Service Logement a pris en charge votre dossier de demande de logement.',
      type: 'INFO',
    })

    req.app.get('io')?.to(`conv_${id}`).emit('conversation_active', { conversationId: id })

    res.json(updated)
  } catch (err) {
    console.error('[Chat] prendreEnCharge:', err)
    next(err)
  }
}

// ─── e) Terminer une conversation ──────────────────────────────────────────────
// PATCH /api/conversations/:id/terminer

export async function terminerConversation(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const conv = await prisma.conversation.findUnique({ where: { id } })
    if (!conv) return res.status(404).json({ message: 'Conversation introuvable.' })

    const updated = await prisma.conversation.update({
      where: { id },
      data: { statut: 'TERMINEE' },
      include: INCLUDE_CONVERSATION,
    })

    await prisma.message.create({
      data: {
        conversationId: id,
        expediteurId: req.user.id,
        contenu: "Dossier finalisé. Merci d'avoir choisi SONAPIE.",
        type: 'NOTIFICATION_SYSTEME',
      },
    })

    req.app.get('io')?.to(`conv_${id}`).emit('conversation_terminee', { conversationId: id })

    res.json(updated)
  } catch (err) {
    console.error('[Chat] terminerConversation:', err)
    next(err)
  }
}

// ─── f) Nombre de messages non lus ─────────────────────────────────────────────
// GET /api/conversations/non-lus

export async function getNombreNonLus(req, res, next) {
  try {
    let where
    switch (req.user.role) {
      case 'LOCATAIRE':
        where = { locataireId: req.user.id }
        break
      case 'SERVICE_LOGEMENT':
        where = { OR: [{ serviceLogementId: req.user.id }, { statut: 'EN_ATTENTE' }] }
        break
      case 'ADMIN':
      case 'SUPER_ADMIN':
        where = {}
        break
      default:
        return res.json({ total: 0 })
    }

    const conversations = await prisma.conversation.findMany({ where, select: { id: true } })
    const total = await prisma.message.count({
      where: {
        conversationId: { in: conversations.map(c => c.id) },
        lu: false,
        expediteurId: { not: req.user.id },
      },
    })

    res.json({ total })
  } catch (err) {
    console.error('[Chat] getNombreNonLus:', err)
    next(err)
  }
}

// ─── g) Agenda des rendez-vous ─────────────────────────────────────────────────
// GET /api/conversations/rendez-vous

const CONFIRMATION_PREFIX = '✓ Rendez-vous confirmé'

export async function getRendezVous(req, res, next) {
  try {
    let where
    switch (req.user.role) {
      case 'LOCATAIRE':
        where = { locataireId: req.user.id }
        break
      case 'SERVICE_LOGEMENT':
        where = { OR: [{ serviceLogementId: req.user.id }, { statut: 'EN_ATTENTE' }] }
        break
      case 'ADMIN':
      case 'SUPER_ADMIN':
        where = {}
        break
      default:
        return res.status(403).json({ message: 'Accès refusé.' })
    }

    const conversations = await prisma.conversation.findMany({
      where,
      select: {
        id: true,
        locataire: { select: { nom: true, prenom: true } },
        demande: { select: { logement: { select: { code: true, adresse: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, contenu: true, type: true, createdAt: true,
            expediteur: { select: { nom: true, prenom: true, role: true } },
          },
        },
      },
    })

    const rendezVous = []
    for (const conv of conversations) {
      const msgs = conv.messages

      // Un nouveau RENDEZ_VOUS reprogramme le précédent : seul le dernier proposé
      // dans la conversation représente le rendez-vous actuel. Sans ce filtre, une
      // reprogrammation laissait l'ancienne date visible comme un rendez-vous à
      // part entière, et sa confirmation (qui vise forcément la plus récente)
      // marquait aussi l'ancienne comme confirmée.
      let idx = -1
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].type === 'RENDEZ_VOUS') { idx = i; break }
      }
      if (idx === -1) continue
      const m = msgs[idx]

      let data
      try { data = JSON.parse(m.contenu) } catch { continue }
      if (!data.dateRendezVous || !data.lieuRendezVous) continue

      // "Confirmé" = un message de confirmation (texte préfixé) existe plus tard
      // dans la même conversation, après ce message RENDEZ_VOUS.
      const confirme = msgs.slice(idx + 1).some(
        later => later.type === 'TEXTE' && later.contenu.startsWith(CONFIRMATION_PREFIX),
      )

      rendezVous.push({
        id: m.id,
        conversationId: conv.id,
        dateRendezVous: data.dateRendezVous,
        lieuRendezVous: data.lieuRendezVous,
        noteRendezVous: data.note || null,
        confirme,
        locataire: conv.locataire,
        logement: conv.demande?.logement || null,
        expediteur: m.expediteur,
        createdAt: m.createdAt,
      })
    }

    rendezVous.sort((a, b) => new Date(a.dateRendezVous) - new Date(b.dateRendezVous))

    res.json(rendezVous)
  } catch (err) {
    console.error('[Chat] getRendezVous:', err)
    next(err)
  }
}
