import { prisma } from '../utils/prisma.js'
import { creerNotification, notifierRoles } from '../services/notification.service.js'
import cloudinary from '../config/cloudinary.js'
import PDFDocument from 'pdfkit'

const TYPES_DOCUMENT_DOSSIER = [
  'PIECE_IDENTITE', 'JUSTIFICATIF_DOMICILE', 'BULLETIN_SALAIRE', 'ATTESTATION_EMPLOI',
  'ACTE_NAISSANCE', 'PHOTO_IDENTITE', 'CONTRAT_TRAVAIL', 'AVIS_IMPOSITION', 'AUTRE',
]

const STATUTS_DOSSIER = ['INCOMPLET', 'SOUMIS', 'EN_ETUDE', 'VALIDE', 'REJETE']

const SEL_LOCATAIRE_COMPLET = {
  id: true, nom: true, prenom: true, email: true, telephone: true, typeLocataire: true,
}

// ─── a) Créer ou mettre à jour le dossier d'une demande ────────────────────────
// PUT /api/dossiers/:demandeId

// Le dossier n'est plus modifiable par le locataire une fois pris en étude ou
// validé par la Direction (INCOMPLET, SOUMIS et REJETE restent modifiables,
// pour permettre une correction avant une nouvelle soumission).
const STATUTS_DOSSIER_VERROUILLES = ['EN_ETUDE', 'VALIDE']

// Plafond de la colonne `revenuMensuel` (DECIMAL(10,2) → 8 chiffres avant la virgule).
const REVENU_MENSUEL_MAX = 99999999.99

export async function creerOuMettreAJourDossier(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const demande = await prisma.demandeLogement.findUnique({ where: { id: demandeId } })
    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' })
    if (demande.demandeurId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé à cette demande.' })
    }

    const dossierExistant = await prisma.dossierClient.findUnique({ where: { demandeId } })
    if (dossierExistant && STATUTS_DOSSIER_VERROUILLES.includes(dossierExistant.statut)) {
      return res.status(400).json({ message: 'Ce dossier ne peut plus être modifié (déjà en étude ou validé par la Direction).' })
    }

    const {
      dateNaissance, lieuNaissance, nationalite, situationFamiliale, nombreEnfants,
      employeur, poste, anciennete, revenuMensuel,
      ministere, direction, grade, indice,
    } = req.body

    if (revenuMensuel != null && revenuMensuel !== '') {
      const montant = Number(revenuMensuel)
      if (isNaN(montant) || montant < 0 || montant > REVENU_MENSUEL_MAX) {
        return res.status(400).json({
          message: `Le revenu mensuel doit être un nombre compris entre 0 et ${REVENU_MENSUEL_MAX.toLocaleString('fr-FR')} FCFA.`,
        })
      }
    }

    const data = {
      dateNaissance: dateNaissance ? new Date(dateNaissance) : null,
      lieuNaissance: lieuNaissance?.trim() || null,
      nationalite: nationalite?.trim() || null,
      situationFamiliale: situationFamiliale?.trim() || null,
      nombreEnfants: nombreEnfants != null && nombreEnfants !== '' ? parseInt(nombreEnfants) : null,
      employeur: employeur?.trim() || null,
      poste: poste?.trim() || null,
      anciennete: anciennete != null && anciennete !== '' ? parseInt(anciennete) : null,
      revenuMensuel: revenuMensuel != null && revenuMensuel !== '' ? revenuMensuel : null,
      ministere: ministere?.trim() || null,
      direction: direction?.trim() || null,
      grade: grade?.trim() || null,
      indice: indice?.trim() || null,
    }

    const dossier = await prisma.dossierClient.upsert({
      where: { demandeId },
      update: data,
      create: { demandeId, locataireId: req.user.id, ...data },
    })

    res.json(dossier)
  } catch (err) {
    console.error('[Dossier] creerOuMettreAJourDossier:', err)
    next(err)
  }
}

// ─── b) Soumettre le dossier ────────────────────────────────────────────────────
// POST /api/dossiers/:demandeId/soumettre

export async function soumetteDossier(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const dossier = await prisma.dossierClient.findUnique({
      where: { demandeId },
      include: {
        documents: true,
        demande: { include: { logement: true, demandeur: true } },
      },
    })
    if (!dossier) return res.status(404).json({ message: 'Dossier introuvable.' })
    if (dossier.locataireId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé à ce dossier.' })
    }
    if (STATUTS_DOSSIER_VERROUILLES.includes(dossier.statut)) {
      return res.status(400).json({ message: 'Ce dossier ne peut plus être modifié (déjà en étude ou validé par la Direction).' })
    }
    if (dossier.documents.length === 0) {
      return res.status(400).json({ message: 'Ajoutez au moins un document avant de soumettre votre dossier.' })
    }

    const updated = await prisma.dossierClient.update({
      where: { demandeId },
      data: { statut: 'SOUMIS' },
    })

    const { demandeur, logement } = dossier.demande
    await notifierRoles(
      ['DIRECTION'],
      `Nouveau dossier soumis par ${demandeur.prenom} ${demandeur.nom}` +
        (logement ? ` pour le logement ${logement.code}.` : '.'),
      'INFO',
    )

    res.json(updated)
  } catch (err) {
    console.error('[Dossier] soumetteDossier:', err)
    next(err)
  }
}

// ─── c) Détail d'un dossier ─────────────────────────────────────────────────────
// GET /api/dossiers/:demandeId

export async function getDossier(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const dossier = await prisma.dossierClient.findUnique({
      where: { demandeId },
      include: {
        documents: true,
        locataire: { select: SEL_LOCATAIRE_COMPLET },
        demande: { include: { logement: true } },
      },
    })
    if (!dossier) return res.status(404).json({ message: 'Dossier introuvable.' })

    const rolesAutorises = ['DIRECTION', 'SERVICE_LOGEMENT', 'ADMIN', 'SUPER_ADMIN']
    const estProprietaire = req.user.role === 'LOCATAIRE' && dossier.locataireId === req.user.id
    if (!estProprietaire && !rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé à ce dossier.' })
    }

    res.json(dossier)
  } catch (err) {
    console.error('[Dossier] getDossier:', err)
    next(err)
  }
}

// ─── d) Uploader un document du dossier ────────────────────────────────────────
// POST /api/dossiers/:demandeId/documents

export async function uploaderDocument(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni.' })

    const { type } = req.body
    if (!type || !TYPES_DOCUMENT_DOSSIER.includes(type)) {
      if (req.file.filename) await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'auto' }).catch(() => {})
      return res.status(400).json({ message: `type invalide. Valeurs acceptées : ${TYPES_DOCUMENT_DOSSIER.join(', ')}.` })
    }

    const dossier = await prisma.dossierClient.findUnique({ where: { demandeId } })
    if (!dossier) {
      if (req.file.filename) await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'auto' }).catch(() => {})
      return res.status(404).json({ message: "Dossier introuvable. Renseignez d'abord vos informations." })
    }
    if (dossier.locataireId !== req.user.id) {
      if (req.file.filename) await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'auto' }).catch(() => {})
      return res.status(403).json({ message: 'Accès refusé à ce dossier.' })
    }
    if (STATUTS_DOSSIER_VERROUILLES.includes(dossier.statut)) {
      if (req.file.filename) await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'auto' }).catch(() => {})
      return res.status(400).json({ message: 'Ce dossier ne peut plus être modifié (déjà en étude ou validé par la Direction).' })
    }

    const document = await prisma.documentDossier.create({
      data: {
        dossierId: dossier.id,
        type,
        urlFichier: req.file.path,
        publicIdCloudinary: req.file.filename,
        nomOriginal: req.file.originalname || null,
      },
    })

    res.status(201).json(document)
  } catch (err) {
    console.error('[Dossier] uploaderDocument:', err)
    next(err)
  }
}

// ─── e) Supprimer un document du dossier ───────────────────────────────────────
// DELETE /api/dossiers/documents/:documentId

export async function supprimerDocument(req, res, next) {
  try {
    const id = parseInt(req.params.documentId)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const document = await prisma.documentDossier.findUnique({
      where: { id },
      include: { dossier: true },
    })
    if (!document) return res.status(404).json({ message: 'Document introuvable.' })
    if (document.dossier.locataireId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé à ce document.' })
    }
    if (STATUTS_DOSSIER_VERROUILLES.includes(document.dossier.statut)) {
      return res.status(400).json({ message: 'Ce dossier ne peut plus être modifié (déjà en étude ou validé par la Direction).' })
    }

    if (document.publicIdCloudinary) {
      await cloudinary.uploader.destroy(document.publicIdCloudinary, { resource_type: 'auto' }).catch(e => {
        console.warn('[Dossier] Échec suppression Cloudinary:', e.message)
      })
    }

    await prisma.documentDossier.delete({ where: { id } })
    res.json({ message: 'Document supprimé avec succès.' })
  } catch (err) {
    console.error('[Dossier] supprimerDocument:', err)
    next(err)
  }
}

// ─── f) Valider/rejeter un document (Direction) ────────────────────────────────
// PATCH /api/dossiers/documents/:documentId/valider

export async function validerDocument(req, res, next) {
  try {
    const id = parseInt(req.params.documentId)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide.' })

    const { valide, commentaire } = req.body
    if (typeof valide !== 'boolean') {
      return res.status(400).json({ message: 'Le champ valide (booléen) est requis.' })
    }

    const document = await prisma.documentDossier.findUnique({ where: { id } })
    if (!document) return res.status(404).json({ message: 'Document introuvable.' })

    const updated = await prisma.documentDossier.update({
      where: { id },
      data: { valide, commentaire: commentaire?.trim() || null },
    })

    res.json(updated)
  } catch (err) {
    console.error('[Dossier] validerDocument:', err)
    next(err)
  }
}

// ─── g) Marquer un dossier en étude (Direction) ────────────────────────────────
// PATCH /api/dossiers/:demandeId/en-etude

export async function marquerEnEtude(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const dossier = await prisma.dossierClient.findUnique({ where: { demandeId } })
    if (!dossier) return res.status(404).json({ message: 'Dossier introuvable.' })

    const updated = await prisma.dossierClient.update({
      where: { demandeId },
      data: { statut: 'EN_ETUDE' },
    })

    await creerNotification({
      utilisateurId: dossier.locataireId,
      message: "Votre dossier est en cours d'étude par la Direction SONAPIE.",
      type: 'INFO',
    })

    res.json(updated)
  } catch (err) {
    console.error('[Dossier] marquerEnEtude:', err)
    next(err)
  }
}

// ─── h) Valider le dossier (Direction) ─────────────────────────────────────────
// PATCH /api/dossiers/:demandeId/valider

export async function validerDossier(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const dossier = await prisma.dossierClient.findUnique({
      where: { demandeId },
      include: { demande: { include: { logement: true } }, locataire: true },
    })
    if (!dossier) return res.status(404).json({ message: 'Dossier introuvable.' })

    const commentaire = req.body.commentaire?.trim() || null

    const updated = await prisma.dossierClient.update({
      where: { demandeId },
      data: { statut: 'VALIDE', dateEtude: new Date(), commentaireDirection: commentaire },
    })

    // Le circuit habituel fait passer la demande à EN_ETUDE_LOGEMENT via
    // validerDemande() — mais un dossier peut être constitué et validé avant que
    // ce circuit n'ait eu lieu. On rattrape ici si besoin, sans redéclencher les
    // notifications propres à validerDemande().
    if (!['EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(dossier.demande.statut)) {
      await prisma.demandeLogement.update({
        where: { id: demandeId },
        data: {
          statut: 'EN_ETUDE_LOGEMENT',
          valideParDirectionId: req.user.id,
          dateValidationDirection: dossier.demande.dateValidationDirection || new Date(),
        },
      })
    }

    const conversation = await prisma.conversation.upsert({
      where: { demandeId },
      update: {},
      create: { demandeId, locataireId: dossier.locataireId, statut: 'EN_ATTENTE' },
    })

    const logement = dossier.demande.logement
    const typeLabel = dossier.locataire.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Locataire Privé'

    await Promise.allSettled([
      creerNotification({
        utilisateurId: dossier.locataireId,
        message: 'Votre dossier a été validé ! Votre demande de logement est maintenant traitée par le Service Logement.',
        type: 'SUCCESS',
      }),
      notifierRoles(
        ['SERVICE_LOGEMENT'],
        `Dossier validé — ${dossier.locataire.prenom} ${dossier.locataire.nom} (${typeLabel}) souhaite visiter le logement ${logement?.code || 'demandé'}. Prenez contact avec lui pour fixer une date de visite.`,
        'SUCCESS',
      ),
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          expediteurId: req.user.id,
          contenu: `Dossier validé par la Direction. Le Service Logement peut maintenant contacter le locataire pour organiser la visite physique du logement ${logement?.code || 'demandé'}.`,
          type: 'NOTIFICATION_SYSTEME',
        },
      }),
    ])

    res.json(updated)
  } catch (err) {
    console.error('[Dossier] validerDossier:', err)
    next(err)
  }
}

// ─── i) Rejeter le dossier (Direction) ─────────────────────────────────────────
// PATCH /api/dossiers/:demandeId/rejeter

export async function rejeterDossier(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const commentaire = req.body.commentaire?.trim()
    if (!commentaire) {
      return res.status(400).json({ message: 'Le commentaire est requis pour rejeter un dossier.' })
    }

    const dossier = await prisma.dossierClient.findUnique({ where: { demandeId } })
    if (!dossier) return res.status(404).json({ message: 'Dossier introuvable.' })

    const updated = await prisma.dossierClient.update({
      where: { demandeId },
      data: { statut: 'REJETE', commentaireDirection: commentaire },
    })

    await creerNotification({
      utilisateurId: dossier.locataireId,
      message: `Votre dossier a été rejeté. Motif : ${commentaire}`,
      type: 'ERROR',
    })

    res.json(updated)
  } catch (err) {
    console.error('[Dossier] rejeterDossier:', err)
    next(err)
  }
}

// ─── j) Tous les dossiers (Direction) ──────────────────────────────────────────
// GET /api/dossiers

export async function getDossiersDirection(req, res, next) {
  try {
    const { statut } = req.query
    if (statut && !STATUTS_DOSSIER.includes(statut)) {
      return res.status(400).json({ message: `statut invalide. Valeurs acceptées : ${STATUTS_DOSSIER.join(', ')}.` })
    }

    const dossiers = await prisma.dossierClient.findMany({
      where: statut ? { statut } : {},
      orderBy: { updatedAt: 'desc' },
      include: {
        documents: true,
        locataire: { select: SEL_LOCATAIRE_COMPLET },
        demande: { include: { logement: true } },
      },
    })

    res.json(dossiers)
  } catch (err) {
    console.error('[Dossier] getDossiersDirection:', err)
    next(err)
  }
}

// ─── k) Historique de tous les dossiers, tous statuts (Direction / Admin) ──────
// GET /api/dossiers/historique

export async function getHistoriqueDossiers(req, res, next) {
  try {
    const dossiers = await prisma.dossierClient.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        documents: true,
        locataire: { select: SEL_LOCATAIRE_COMPLET },
        demande: { include: { logement: true } },
      },
    })

    const locataireIds = dossiers.map(d => d.locataireId)
    const occupations = await prisma.occupation.findMany({
      where: { utilisateurId: { in: locataireIds }, statut: 'ACTIVE' },
      include: { logement: { select: { id: true, code: true, adresse: true, type: true } } },
    })
    const occupationParLocataire = Object.fromEntries(occupations.map(o => [o.utilisateurId, o]))

    const result = dossiers.map(d => ({
      ...d,
      occupationActive: occupationParLocataire[d.locataireId] || null,
    }))

    res.json(result)
  } catch (err) {
    console.error('[Dossier] getHistoriqueDossiers:', err)
    next(err)
  }
}

// Télécharge une image (ex: document Cloudinary) en Buffer pour l'intégrer au
// PDF. Node 22 fournit fetch/AbortController nativement — pas besoin de
// node-fetch. Timeout court pour ne pas bloquer la génération du PDF sur une
// image lente ou indisponible : on continue sans elle plutôt que d'échouer.
async function telechargerImage(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    console.warn('[Dossier] Image non téléchargeable:', url, err.message)
    return null
  }
}

// ─── l) Export PDF d'un dossier (Direction / Admin) ────────────────────────────
// GET /api/dossiers/:demandeId/export-pdf

export async function exporterDossierPDF(req, res, next) {
  try {
    const demandeId = parseInt(req.params.demandeId)
    if (isNaN(demandeId)) return res.status(400).json({ message: 'demandeId invalide.' })

    const dossier = await prisma.dossierClient.findUnique({
      where: { demandeId },
      include: {
        locataire: true,
        demande: { include: { logement: true } },
        documents: true,
      },
    })

    if (!dossier) {
      return res.status(404).json({ message: 'Dossier introuvable.' })
    }

    // bufferPages est requis pour pouvoir revenir sur les pages déjà générées
    // (numérotation du pied de page) juste avant doc.end().
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="dossier-${dossier.locataire.nom}-${dossier.locataire.prenom}.pdf"`,
    )

    doc.pipe(res)

    const ajouterSectionTitre = (titre) => {
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#E8520A').text(titre.toUpperCase())
      doc.fillColor('black')
      doc.moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).strokeColor('#E8520A').lineWidth(1).stroke()
      doc.moveDown(0.8)
    }

    // EN-TÊTE
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#E8520A').text('SONAPIE', { align: 'center' })
    doc.fillColor('black')
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text("Société Nationale de Gestion du Patrimoine Immobilier de l'État", { align: 'center' })
    doc.fillColor('black')

    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E8520A').lineWidth(2).stroke()
    doc.moveDown()

    doc.fontSize(14).font('Helvetica-Bold').text('DOSSIER DE DEMANDE DE LOGEMENT', { align: 'center' })

    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(
        `Dossier N° ${dossier.id} — Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        { align: 'center' },
      )
    doc.fillColor('black')

    doc.moveDown(2)

    // INFOS CLIENT
    ajouterSectionTitre('Informations du demandeur')
    doc.fontSize(10).font('Helvetica')
    doc.text(`Nom et prénom : ${dossier.locataire.prenom} ${dossier.locataire.nom}`)
    doc.text(`Email : ${dossier.locataire.email}`)
    doc.text(`Téléphone : ${dossier.locataire.telephone || 'Non renseigné'}`)
    doc.text(`Type : ${dossier.locataire.typeLocataire === 'FONCTIONNAIRE' ? "Fonctionnaire de l'État" : 'Locataire Privé'}`)
    if (dossier.dateNaissance) {
      doc.text(`Date de naissance : ${new Date(dossier.dateNaissance).toLocaleDateString('fr-FR')}`)
    }
    doc.text(`Situation familiale : ${dossier.situationFamiliale || 'Non renseignée'}`)

    // INFOS PROFESSIONNELLES
    ajouterSectionTitre('Situation professionnelle')
    doc.fontSize(10).font('Helvetica')
    if (dossier.locataire.typeLocataire === 'FONCTIONNAIRE') {
      doc.text(`Ministère : ${dossier.ministere || 'Non renseigné'}`)
      doc.text(`Grade : ${dossier.grade || 'Non renseigné'}`)
    } else {
      doc.text(`Employeur : ${dossier.employeur || 'Non renseigné'}`)
      doc.text(`Poste : ${dossier.poste || 'Non renseigné'}`)
    }
    doc.text(`Revenu mensuel : ${dossier.revenuMensuel ? `${dossier.revenuMensuel} FCFA` : 'Non renseigné'}`)

    // LOGEMENT DEMANDÉ
    if (dossier.demande?.logement) {
      const log = dossier.demande.logement
      ajouterSectionTitre('Logement demandé')
      doc.fontSize(10).font('Helvetica')
      doc.text(`Code : ${log.code}`)
      doc.text(`Adresse : ${log.adresse}`)
      doc.text(`Type : ${log.type}`)
      doc.text(`Superficie : ${log.superficie ? `${log.superficie} m²` : 'N/A'}`)
    }

    // DOCUMENTS FOURNIS — sur une nouvelle page, avec les images intégrées
    doc.addPage()
    ajouterSectionTitre('Documents fournis')

    if (dossier.documents.length === 0) {
      doc.fontSize(10).font('Helvetica').fillColor('gray').text('Aucun document fourni')
      doc.fillColor('black')
    } else {
      for (const [index, docItem] of dossier.documents.entries()) {
        const statut = docItem.valide === true ? '✓ Validé'
          : docItem.valide === false ? '✗ Rejeté'
          : '⏳ En attente de vérification'

        const nomType = docItem.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

        doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${nomType}`)

        doc.fontSize(9).font('Helvetica')
          .fillColor(docItem.valide === true ? '#2E7D32' : docItem.valide === false ? '#DC2626' : '#92400E')
          .text(`Statut : ${statut}`)
        doc.fillColor('black')

        if (docItem.commentaire) {
          doc.fontSize(9).fillColor('#666666').text(`Note Direction : ${docItem.commentaire}`)
          doc.fillColor('black')
        }

        doc.moveDown(0.5)

        const isImage = docItem.urlFichier && /\.(jpg|jpeg|png|webp)$/i.test(docItem.urlFichier)
        const isCloudinaryImage = docItem.urlFichier
          && docItem.urlFichier.includes('cloudinary.com')
          && !docItem.urlFichier.includes('.pdf')

        if (isImage || isCloudinaryImage) {
          try {
            let imageUrl = docItem.urlFichier
            if (imageUrl.includes('cloudinary.com')) {
              imageUrl = imageUrl.replace('/upload/', '/upload/w_800,h_600,c_limit,f_jpg,q_80/')
            }

            const imageBuffer = await telechargerImage(imageUrl)

            if (imageBuffer) {
              const positionActuelle = doc.y
              const hauteurImage = 200
              const margeBasPage = 100
              if (positionActuelle + hauteurImage > doc.page.height - margeBasPage) {
                doc.addPage()
              }

              doc.image(imageBuffer, { fit: [450, 250], align: 'center' })
              doc.moveDown(0.5)

              doc.fontSize(8).fillColor('#666666').text(docItem.nomOriginal || nomType, { align: 'center' })
              doc.fillColor('black')
            } else {
              doc.fontSize(9).fillColor('#666666')
                .text('[Image non disponible — consultez le dossier en ligne]', { align: 'center' })
              doc.fillColor('black')
            }
          } catch (imgErr) {
            console.warn('[Dossier] Erreur image PDF:', imgErr.message)
            doc.fontSize(9).fillColor('#666666').text('[Image non disponible]')
            doc.fillColor('black')
          }
        } else if (docItem.urlFichier?.includes('.pdf')) {
          doc.fontSize(9).fillColor('#3B82F6')
            .text(`Document PDF joint — Lien : ${docItem.urlFichier}`, { link: docItem.urlFichier, underline: true })
          doc.fillColor('black')
        }

        doc.moveDown()

        if (index < dossier.documents.length - 1) {
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke()
          doc.moveDown()
        }
      }
    }

    // DÉCISION DIRECTION
    ajouterSectionTitre('Décision de la Direction')
    doc.fontSize(10).font('Helvetica')
    doc.text(`Statut du dossier : ${dossier.statut}`)
    if (dossier.commentaireDirection) {
      doc.text(`Commentaire : ${dossier.commentaireDirection}`)
    }
    if (dossier.dateEtude) {
      doc.text(`Date de décision : ${new Date(dossier.dateEtude).toLocaleDateString('fr-FR')}`)
    }

    // PIED DE PAGE — numérotation sur chaque page (avant doc.end() : une fois le
    // document finalisé, pdfkit ne permet plus de revenir sur les pages).
    // Le pied de page est dessiné dans la marge basse : pdfkit ajouterait sinon
    // silencieusement une page vierge à chaque fois qu'un texte est positionné
    // sous la limite margins.bottom, même avec des coordonnées x/y explicites.
    const { count } = doc.bufferedPageRange()
    for (let i = 0; i < count; i++) {
      doc.switchToPage(i)
      const bottomMargin = doc.page.margins.bottom
      doc.page.margins.bottom = 0

      doc.moveTo(50, doc.page.height - 50).lineTo(545, doc.page.height - 50)
        .strokeColor('#E5E7EB').lineWidth(0.5).stroke()

      doc.fontSize(7).fillColor('#999999').text(
        `SONAPIE — Document confidentiel — Page ${i + 1} / ${count}`,
        50, doc.page.height - 40,
        { align: 'center', width: 495, lineBreak: false },
      )
      doc.fillColor('black')
      doc.page.margins.bottom = bottomMargin
    }

    doc.end()
  } catch (err) {
    console.error('[Dossier] exporterDossierPDF:', err)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erreur lors de la génération du PDF.' })
    } else {
      res.end()
    }
  }
}
