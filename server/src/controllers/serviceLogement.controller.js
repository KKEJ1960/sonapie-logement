import { prisma } from '../utils/prisma.js'
import cloudinary from '../config/cloudinary.js'
import { creerNotification } from '../services/notification.service.js'

const TYPES_LOGEMENT = ['F1', 'F2', 'F3', 'F4', 'F5', 'VILLA']
const TYPES_PIECE = [
  'SALON', 'CHAMBRE', 'CHAMBRE_PRINCIPALE', 'CHAMBRE_2', 'CHAMBRE_3', 'CUISINE', 'SALLE_DE_BAIN', 'TOILETTES',
  'BALCON', 'TERRASSE', 'JARDIN', 'GARAGE', 'ENTREE', 'FACADE', 'AUTRE', 'AUTRES_ESPACES',
]

// ─── Sélecteurs ───────────────────────────────────────────────────────────────

// Forme minimale d'une photo, utilisée dans les listes et la vue publique
// (pas d'ID Cloudinary interne exposé).
const SEL_PHOTO_PUBLIC = {
  id: true, typePiece: true, urlPhoto: true, description: true, ordre: true, createdAt: true,
}

const SEL_DEMANDEUR = {
  id: true, nom: true, prenom: true, email: true, telephone: true, typeLocataire: true,
}

const COMMODITES_FIELDS = [
  'meuble', 'parking', 'gardien', 'eauCourante', 'electricite',
  'climatisation', 'internet', 'ascenseur',
  'piscine', 'jardin', 'sallesDeSport', 'groupeElectrogene',
]

function isStaff(req) {
  return ['SERVICE_LOGEMENT', 'SUPER_ADMIN'].includes(req.user.role)
}

function debutMois() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// ─── a) Créer un logement ─────────────────────────────────────────────────────
// POST /api/service-logement/logements

export async function creerLogement(req, res) {
  try {
    const {
      code, adresse, ville, quartier, type, superficie, nombrePieces, etage,
      description, descriptionCommerciale, titreCommercial, montantLoyer,
      meuble, parking, gardien, eauCourante, electricite, climatisation, internet, ascenseur,
      piscine, jardin, sallesDeSport, groupeElectrogene,
    } = req.body

    if (!code?.trim() || !adresse?.trim() || !ville?.trim() || !type) {
      return res.status(400).json({ message: 'code, adresse, ville et type sont requis.' })
    }
    if (!TYPES_LOGEMENT.includes(type)) {
      return res.status(400).json({ message: `type invalide. Valeurs acceptées : ${TYPES_LOGEMENT.join(', ')}.` })
    }

    const existant = await prisma.logement.findUnique({ where: { code: code.trim() } })
    if (existant) {
      return res.status(409).json({ message: 'Ce code de logement est déjà utilisé.' })
    }

    const logement = await prisma.logement.create({
      data: {
        code: code.trim(),
        adresse: adresse.trim(),
        ville: ville.trim(),
        quartier: quartier?.trim() || null,
        type,
        superficie: superficie != null ? parseFloat(superficie) : null,
        nombrePieces: nombrePieces != null ? parseInt(nombrePieces) : null,
        etage: etage != null ? parseInt(etage) : 0,
        statut: 'DISPONIBLE',
        description: description?.trim() || null,
        descriptionCommerciale: descriptionCommerciale?.trim() || null,
        titreCommercial: titreCommercial?.trim() || null,
        montantLoyer: montantLoyer != null ? montantLoyer : null,
        meuble: !!meuble,
        parking: !!parking,
        gardien: !!gardien,
        eauCourante: eauCourante ?? true,
        electricite: electricite ?? true,
        climatisation: !!climatisation,
        internet: !!internet,
        ascenseur: !!ascenseur,
        piscine: !!piscine,
        jardin: !!jardin,
        sallesDeSport: !!sallesDeSport,
        groupeElectrogene: !!groupeElectrogene,
      },
    })

    res.status(201).json(logement)
  } catch (err) {
    console.error('[ServiceLogement] creerLogement:', err)
    res.status(500).json({ message: 'Erreur lors de la création du logement.' })
  }
}

// ─── b) Modifier un logement ──────────────────────────────────────────────────
// PUT /api/service-logement/logements/:id

export async function modifierLogement(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const existant = await prisma.logement.findUnique({ where: { id } })
    if (!existant) return res.status(404).json({ message: 'Logement introuvable.' })

    // Le statut (OCCUPE/MAINTENANCE/DISPONIBLE) est géré par le workflow
    // (attribution, fin d'occupation, etc.) — jamais modifiable directement ici.
    // eslint-disable-next-line no-unused-vars
    const { statut, code, ...rest } = req.body

    if (code && code.trim() !== existant.code) {
      const doublon = await prisma.logement.findUnique({ where: { code: code.trim() } })
      if (doublon) return res.status(409).json({ message: 'Ce code de logement est déjà utilisé.' })
    }

    const data = {}
    const champsTextuels = ['adresse', 'ville', 'quartier', 'type', 'description', 'descriptionCommerciale', 'titreCommercial']
    for (const champ of champsTextuels) {
      if (rest[champ] !== undefined) data[champ] = typeof rest[champ] === 'string' ? rest[champ].trim() || null : rest[champ]
    }
    if (rest.type !== undefined && !TYPES_LOGEMENT.includes(rest.type)) {
      return res.status(400).json({ message: `type invalide. Valeurs acceptées : ${TYPES_LOGEMENT.join(', ')}.` })
    }
    if (rest.superficie !== undefined) data.superficie = rest.superficie != null ? parseFloat(rest.superficie) : null
    if (rest.nombrePieces !== undefined) data.nombrePieces = rest.nombrePieces != null ? parseInt(rest.nombrePieces) : null
    if (rest.etage !== undefined) data.etage = rest.etage != null ? parseInt(rest.etage) : 0
    if (rest.montantLoyer !== undefined) data.montantLoyer = rest.montantLoyer
    if (code) data.code = code.trim()

    for (const champ of COMMODITES_FIELDS) {
      if (rest[champ] !== undefined) data[champ] = !!rest[champ]
    }

    const logement = await prisma.logement.update({ where: { id }, data })
    res.json(logement)
  } catch (err) {
    console.error('[ServiceLogement] modifierLogement:', err)
    res.status(500).json({ message: 'Erreur lors de la modification du logement.' })
  }
}

// ─── c) Supprimer un logement ─────────────────────────────────────────────────
// DELETE /api/service-logement/logements/:id

export async function supprimerLogement(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const logement = await prisma.logement.findUnique({ where: { id } })
    if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })

    if (logement.statut === 'OCCUPE') {
      return res.status(400).json({
        message: 'Impossible de supprimer un logement occupé. Terminez l\'occupation d\'abord.',
      })
    }

    const photos = await prisma.photoLogement.findMany({ where: { logementId: id } })
    for (const photo of photos) {
      if (photo.publicIdCloudinary) {
        await cloudinary.uploader.destroy(photo.publicIdCloudinary).catch(e => {
          console.warn('[ServiceLogement] Échec suppression Cloudinary:', e.message)
        })
      }
    }

    // Les PhotoLogement sont supprimées en cascade par la contrainte FK.
    await prisma.logement.delete({ where: { id } })

    res.json({ message: 'Logement supprimé avec succès.' })
  } catch (err) {
    console.error('[ServiceLogement] supprimerLogement:', err)
    res.status(500).json({ message: 'Erreur lors de la suppression du logement.' })
  }
}

// ─── d) Liste des logements ────────────────────────────────────────────────────
// GET /api/service-logement/logements  ET  GET /api/logements (partagé)

export async function getLogements(req, res) {
  try {
    const { statut, ville, type, search } = req.query

    const where = {}
    if (statut) where.statut = statut
    if (ville) where.ville = { contains: ville }
    if (type) where.type = type
    if (search?.trim()) {
      const q = search.trim()
      where.OR = [
        { code: { contains: q } },
        { adresse: { contains: q } },
        { ville: { contains: q } },
        { quartier: { contains: q } },
      ]
    }

    const logements = await prisma.logement.findMany({
      where,
      include: {
        photos: { select: SEL_PHOTO_PUBLIC, orderBy: { ordre: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(logements)
  } catch (err) {
    console.error('[ServiceLogement] getLogements:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}

// ─── e) Détail d'un logement ───────────────────────────────────────────────────
// GET /api/service-logement/logements/:id  ET  GET /api/logements/:id (partagé)

export async function getLogementDetail(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    if (isStaff(req)) {
      const logement = await prisma.logement.findUnique({
        where: { id },
        include: {
          photos: { orderBy: { ordre: 'asc' } },
          occupations: {
            where: { statut: 'ACTIVE' },
            include: { utilisateur: { select: SEL_DEMANDEUR } },
          },
          demandes: {
            take: 5,
            orderBy: { dateDepot: 'desc' },
            include: { demandeur: { select: SEL_DEMANDEUR } },
          },
          tickets: {
            take: 5,
            orderBy: { dateDepot: 'desc' },
            include: { demandeur: { select: SEL_DEMANDEUR } },
          },
        },
      })
      if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })
      return res.json(logement)
    }

    // Vue publique (locataire ou tout autre rôle connecté) : jamais d'infos occupant.
    const logement = await prisma.logement.findUnique({
      where: { id },
      include: {
        photos: { select: SEL_PHOTO_PUBLIC, orderBy: { ordre: 'asc' } },
      },
    })
    if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })

    const demandeActive = await prisma.demandeLogement.findFirst({
      where: {
        logementId: id,
        demandeurId: req.user.id,
        statut: { notIn: ['REJETEE', 'REJETEE_DIRECTION'] },
      },
      select: { id: true },
    })

    res.json({ ...logement, dejaDemandeParMoi: !!demandeActive })
  } catch (err) {
    console.error('[ServiceLogement] getLogementDetail:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}

// ─── f) Uploader une photo de logement ────────────────────────────────────────
// POST /api/service-logement/logements/:id/photos

export async function uploaderPhotoLogement(req, res) {
  try {
    const logementId = parseInt(req.params.id)
    if (isNaN(logementId)) return res.status(400).json({ message: 'ID invalide.' })

    if (!req.file) {
      return res.status(400).json({ message: 'Aucune photo fournie.' })
    }

    const { typePiece, description, ordre } = req.body

    if (typePiece && !TYPES_PIECE.includes(typePiece)) {
      if (req.file.filename) await cloudinary.uploader.destroy(req.file.filename).catch(() => {})
      return res.status(400).json({ message: `typePiece invalide. Valeurs acceptées : ${TYPES_PIECE.join(', ')}.` })
    }

    const logement = await prisma.logement.findUnique({ where: { id: logementId } })
    if (!logement) {
      if (req.file.filename) await cloudinary.uploader.destroy(req.file.filename).catch(() => {})
      return res.status(404).json({ message: 'Logement introuvable.' })
    }

    const photo = await prisma.photoLogement.create({
      data: {
        logementId,
        uploadedById: req.user.id,
        typePiece: typePiece || 'AUTRE',
        urlPhoto: req.file.path,
        publicIdCloudinary: req.file.filename,
        description: description?.trim() || null,
        ordre: ordre != null ? parseInt(ordre) : 0,
      },
    })

    res.status(201).json(photo)
  } catch (err) {
    console.error('[ServiceLogement] uploaderPhotoLogement:', err)
    res.status(500).json({ message: 'Erreur lors de l\'upload de la photo.' })
  }
}

// ─── g) Supprimer une photo de logement ───────────────────────────────────────
// DELETE /api/service-logement/logements/:id/photos/:photoId

export async function supprimerPhotoLogement(req, res) {
  try {
    const logementId = parseInt(req.params.id)
    const photoId = parseInt(req.params.photoId)
    if (isNaN(logementId) || isNaN(photoId)) return res.status(400).json({ message: 'ID invalide.' })

    const photo = await prisma.photoLogement.findUnique({ where: { id: photoId } })
    if (!photo || photo.logementId !== logementId) {
      return res.status(404).json({ message: 'Photo introuvable.' })
    }

    if (photo.publicIdCloudinary) {
      await cloudinary.uploader.destroy(photo.publicIdCloudinary).catch(e => {
        console.warn('[ServiceLogement] Échec suppression Cloudinary:', e.message)
      })
    }

    await prisma.photoLogement.delete({ where: { id: photoId } })

    res.json({ success: true })
  } catch (err) {
    console.error('[ServiceLogement] supprimerPhotoLogement:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}

// ─── h) Réordonner les photos ──────────────────────────────────────────────────
// PUT /api/service-logement/logements/:id/photos/ordre

export async function reordonnerPhotos(req, res) {
  try {
    const logementId = parseInt(req.params.id)
    if (isNaN(logementId)) return res.status(400).json({ message: 'ID invalide.' })

    const ordres = req.body
    if (!Array.isArray(ordres) || ordres.length === 0) {
      return res.status(400).json({ message: 'Un tableau [{ id, ordre }] est requis.' })
    }

    await Promise.all(
      ordres.map(({ id, ordre }) =>
        prisma.photoLogement.updateMany({
          where: { id: parseInt(id), logementId },
          data: { ordre: parseInt(ordre) },
        }),
      ),
    )

    const photos = await prisma.photoLogement.findMany({
      where: { logementId },
      orderBy: { ordre: 'asc' },
    })

    res.json(photos)
  } catch (err) {
    console.error('[ServiceLogement] reordonnerPhotos:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}

// ─── i) Demandes à traiter ─────────────────────────────────────────────────────
// GET /api/service-logement/demandes

export async function getDemandesATraiter(req, res) {
  try {
    const demandes = await prisma.demandeLogement.findMany({
      where: { statut: 'APPROUVEE' },
      include: {
        demandeur: { select: SEL_DEMANDEUR },
        logement: true,
      },
      orderBy: { dateTraitement: 'asc' },
    })
    res.json(demandes)
  } catch (err) {
    console.error('[ServiceLogement] getDemandesATraiter:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}

// ─── j) Statistiques ───────────────────────────────────────────────────────────
// GET /api/service-logement/stats

export async function getStats(req, res) {
  try {
    const [
      total, disponibles, occupes, enMaintenance, sansPhotos,
      aTraiter, traiteesCeMois,
      demandesAvecAlerte,
    ] = await Promise.all([
      prisma.logement.count(),
      prisma.logement.count({ where: { statut: 'DISPONIBLE' } }),
      prisma.logement.count({ where: { statut: 'OCCUPE' } }),
      prisma.logement.count({ where: { statut: 'MAINTENANCE' } }),
      prisma.logement.count({ where: { photos: { none: {} } } }),
      prisma.demandeLogement.count({ where: { statut: 'APPROUVEE' } }),
      prisma.demandeLogement.count({ where: { dateTraitement: { gte: debutMois() } } }),
      prisma.demandeLogement.findMany({
        where: { alerteDisponibilite: true, logement: { statut: 'DISPONIBLE' } },
        select: { demandeurId: true },
      }),
    ])

    const locatairesANotifier = new Set(demandesAvecAlerte.map(d => d.demandeurId)).size

    res.json({
      logements: { total, disponibles, occupes, enMaintenance, sansPhotos },
      demandes: { aTraiter, traiteesCeMois },
      alertes: { locatairesANotifier },
    })
  } catch (err) {
    console.error('[ServiceLogement] getStats:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}

// ─── k) Notifier les alertes de disponibilité ────────────────────────────────
// POST /api/service-logement/logements/:id/notifier-alertes

export async function notifierAlertesDisponibilite(req, res) {
  try {
    const logementId = parseInt(req.params.id)
    if (isNaN(logementId)) return res.status(400).json({ message: 'ID invalide.' })

    const logement = await prisma.logement.findUnique({ where: { id: logementId } })
    if (!logement) return res.status(404).json({ message: 'Logement introuvable.' })

    const demandesAvecAlerte = await prisma.demandeLogement.findMany({
      where: { logementId, alerteDisponibilite: true },
      select: { demandeurId: true },
    })

    const demandeurIds = [...new Set(demandesAvecAlerte.map(d => d.demandeurId))]

    await Promise.allSettled(
      demandeurIds.map(demandeurId =>
        creerNotification({
          utilisateurId: demandeurId,
          message: `Le logement ${logement.code} est maintenant disponible. Vous pouvez soumettre une demande.`,
          type: 'INFO',
        }),
      ),
    )

    // Évite de renotifier les mêmes locataires à chaque nouvel appel.
    await prisma.demandeLogement.updateMany({
      where: { logementId, alerteDisponibilite: true },
      data: { alerteDisponibilite: false },
    })

    res.json({ locatairesNotifies: demandeurIds.length })
  } catch (err) {
    console.error('[ServiceLogement] notifierAlertesDisponibilite:', err)
    res.status(500).json({ message: 'Erreur serveur.' })
  }
}
