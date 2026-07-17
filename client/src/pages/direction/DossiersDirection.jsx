import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText, Search, Menu, X, AlertTriangle, RefreshCw, Eye, Check,
  User, Briefcase, ScrollText, Camera, FolderCheck, Download, CheckCircle, XCircle,
} from 'lucide-react'
import api from '../../services/api.js'
import DirectionSidebar from '../../components/direction/DirectionSidebar.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const TABS_DOSSIER = [
  { key: 'A_ETUDIER',  label: 'À étudier',  statuts: ['SOUMIS', 'EN_ETUDE'] },
  { key: 'VALIDES',    label: 'Validés',    statuts: ['VALIDE'] },
  { key: 'REJETES',    label: 'Rejetés',    statuts: ['REJETE'] },
  { key: 'INCOMPLETS', label: 'Incomplets', statuts: ['INCOMPLET'] },
]

const STATUT_DOSSIER_META = {
  SOUMIS:     { label: 'À étudier',          cls: 'bg-blue-100 text-blue-700' },
  EN_ETUDE:   { label: "En cours d'étude",   cls: 'bg-amber-100 text-amber-700' },
  VALIDE:     { label: 'Validé',              cls: 'bg-green-100 text-[#2E7D32]' },
  REJETE:     { label: 'Rejeté',              cls: 'bg-red-100 text-red-600' },
  INCOMPLET:  { label: 'Incomplet',           cls: 'bg-gray-100 text-gray-500' },
}

// Statut de la DEMANDE liée (distinct du statut du dossier lui-même).
const DEMANDE_STATUT_CHIP = {
  SOUMISE:                 { label: 'Demande soumise',                cls: 'bg-blue-50 text-blue-600' },
  EN_VALIDATION_DIRECTION: { label: 'Demande en validation Direction', cls: 'bg-amber-50 text-amber-700' },
  VALIDEE_DIRECTION:       { label: 'Demande validée',                 cls: 'bg-violet-50 text-violet-600' },
  EN_ETUDE_LOGEMENT:       { label: 'Demande en étude logement',       cls: 'bg-blue-50 text-blue-600' },
  APPROUVEE:               { label: 'Demande approuvée',               cls: 'bg-green-50 text-green-700' },
  REJETEE_DIRECTION:       { label: 'Demande rejetée (Direction)',     cls: 'bg-red-50 text-red-600' },
  REJETEE:                 { label: 'Demande rejetée',                cls: 'bg-red-50 text-red-600' },
  ANNULEE:                 { label: 'Demande annulée',                cls: 'bg-gray-50 text-gray-500' },
}

const DOCUMENTS_FONCTIONNAIRE = [
  { type: 'PIECE_IDENTITE',    label: "Pièce d'identité",                     requis: true,  icon: User },
  { type: 'PHOTO_IDENTITE',    label: "Photo d'identité",                     requis: true,  icon: Camera },
  { type: 'BULLETIN_SALAIRE',  label: 'Bulletin de salaire (3 derniers mois)', requis: true, icon: FileText },
  { type: 'ATTESTATION_EMPLOI', label: "Attestation d'emploi",                requis: true,  icon: Briefcase },
  { type: 'ACTE_NAISSANCE',    label: 'Acte de naissance',                    requis: false, icon: ScrollText },
]
const DOCUMENTS_PRIVE = [
  { type: 'PIECE_IDENTITE',   label: "Pièce d'identité",           requis: true,  icon: User },
  { type: 'PHOTO_IDENTITE',   label: "Photo d'identité",           requis: true,  icon: Camera },
  { type: 'CONTRAT_TRAVAIL',  label: 'Contrat de travail',         requis: true,  icon: Briefcase },
  { type: 'BULLETIN_SALAIRE', label: '3 derniers bulletins de salaire', requis: true, icon: FileText },
  { type: 'AVIS_IMPOSITION',  label: "Avis d'imposition",          requis: false, icon: ScrollText },
]

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '')
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Spinner() { return <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="inline-block animate-spin" /> }
function Skeleton({ className }) { return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} /> }
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
      <span className="flex-1 text-sm font-medium text-red-800">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 px-3 py-1 bg-red-100 border border-red-200 rounded-lg text-xs font-semibold text-red-600">
        <RefreshCw size={12} /> Réessayer
      </button>
    </div>
  )
}
function EmptyState({ icon: Icon = FolderCheck, title, subtitle }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-slate-300" />
      </div>
      <p className="text-base font-bold text-slate-700 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</p>
      {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
    </div>
  )
}
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
      className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl border shadow-lg text-sm font-semibold min-w-[260px] max-w-[360px] ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
    >
      {toast.message}
    </motion.div>
  )
}
function Champ({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={value ? 'text-sm font-semibold text-gray-800' : 'text-sm text-gray-400 italic'}>{value || 'Non renseigné'}</p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Card — dossier (liste)
// ═════════════════════════════════════════════════════════════════════════════
function DossierCard({ dossier, onExaminer, onMarquerEnEtude, onExportPDF, exporting, onValiderDemande, onRejeterDemande }) {
  const documentsMeta = dossier.locataire?.typeLocataire === 'FONCTIONNAIRE' ? DOCUMENTS_FONCTIONNAIRE : DOCUMENTS_PRIVE
  const requisTotal = documentsMeta.length
  const fournis = dossier.documents.length
  const pct = requisTotal > 0 ? Math.min(100, Math.round((fournis / requisTotal) * 100)) : 0
  const jours = Math.floor((Date.now() - new Date(dossier.updatedAt).getTime()) / 86400000)
  const meta = STATUT_DOSSIER_META[dossier.statut] || { label: dossier.statut, cls: 'bg-gray-100 text-gray-500' }
  const enCours = ['SOUMIS', 'EN_ETUDE'].includes(dossier.statut)
  const demandeStatut = dossier.demande?.statut
  const demandeChip = DEMANDE_STATUT_CHIP[demandeStatut]

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold text-white"
            style={{ background: dossier.locataire?.typeLocataire === 'FONCTIONNAIRE' ? G : O }}
          >
            {getInitials(dossier.locataire?.nom, dossier.locataire?.prenom)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{dossier.locataire?.prenom} {dossier.locataire?.nom}</p>
            <p className="text-xs text-gray-400 truncate">{dossier.locataire?.email || 'Non renseigné'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {dossier.locataire?.typeLocataire && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dossier.locataire.typeLocataire === 'FONCTIONNAIRE' ? 'bg-[#2E7D32]/10 text-[#2E7D32]' : 'bg-[#E8520A]/10 text-[#E8520A]'}`}>
              {dossier.locataire.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}
            </span>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-3 text-xs text-gray-400">
        <span>Mis à jour le {formatDate(dossier.updatedAt)}</span>
        {enCours && (
          <span className={jours > 7 ? 'font-bold text-red-500' : 'font-semibold text-gray-500'}>
            Soumis il y a {jours} jour{jours > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
          {dossier.demande?.logement ? `${dossier.demande.logement.code} · ${truncate(dossier.demande.logement.adresse, 30)}` : 'Aucun logement associé'}
        </span>
        {demandeChip && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${demandeChip.cls}`}>{demandeChip.label}</span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Documents fournis</span>
          <span className="text-xs font-bold text-gray-600">{fournis} / {requisTotal}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: O }} />
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <button onClick={() => onExaminer(dossier)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold" style={{ background: O }}>
          <Eye size={13} /> Examiner le dossier
        </button>
        {dossier.statut === 'SOUMIS' && (
          <button onClick={() => onMarquerEnEtude(dossier)} className={ghostBtn}>Marquer en étude</button>
        )}

        {demandeStatut === 'EN_VALIDATION_DIRECTION' && (
          <>
            <button onClick={() => onValiderDemande(dossier)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ background: G }}>
              <CheckCircle size={13} /> Valider la demande
            </button>
            <button onClick={() => onRejeterDemande(dossier)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold">
              <XCircle size={13} /> Rejeter la demande
            </button>
          </>
        )}
        {demandeStatut === 'EN_ETUDE_LOGEMENT' && (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-[#2E7D32]">✓ Validée — en traitement</span>
        )}
        {demandeStatut === 'APPROUVEE' && (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-[#2E7D32]">✓ Logement attribué</span>
        )}
        {['REJETEE', 'REJETEE_DIRECTION'].includes(demandeStatut) && (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-600">✗ Rejetée</span>
        )}

        <button
          onClick={() => onExportPDF(dossier)} disabled={exporting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold disabled:opacity-60"
        >
          <Download size={13} /> {exporting ? '…' : 'Exporter PDF'}
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Card — document (tab Documents du modal)
// ═════════════════════════════════════════════════════════════════════════════
function DocumentReviewCard({ doc, meta, onValidate }) {
  const [showReject, setShowReject] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  // Une fois une décision prise (valide true ou false), elle est définitive :
  // pas de "Modifier le statut" pour revenir en arrière.
  const dejaTranche = doc.valide != null

  const Icon = meta?.icon || FileText

  const handleValider = async () => {
    setSaving(true)
    await onValidate(doc.id, true, null)
    setSaving(false)
  }
  const handleRejeter = async () => {
    if (!commentaire.trim()) return
    setSaving(true)
    await onValidate(doc.id, false, commentaire.trim())
    setSaving(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon size={17} className="text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-bold text-gray-900">{meta?.label || doc.type}</p>
            <span className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full ${
              doc.valide === true ? 'bg-green-100 text-green-700' : doc.valide === false ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {doc.valide === true ? '✓ Validé' : doc.valide === false ? '✗ Rejeté' : 'Non vérifié'}
            </span>
          </div>
          <a href={doc.urlFichier} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
            Voir le document
          </a>
          {doc.commentaire && (
            <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <span className="font-semibold">Commentaire Direction : </span>{doc.commentaire}
            </p>
          )}

          {!dejaTranche && (
            showReject ? (
              <div className="mt-2.5">
                <textarea
                  rows={2} value={commentaire} onChange={e => setCommentaire(e.target.value)}
                  placeholder="Motif du rejet…" className={`${inp} text-xs`}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShowReject(false)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">Annuler</button>
                  <button
                    onClick={handleRejeter} disabled={saving || !commentaire.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold disabled:opacity-50" style={{ background: '#DC2626' }}
                  >
                    {saving && <Spinner />} Confirmer le rejet
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={handleValider} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold disabled:opacity-50" style={{ background: G }}
                >
                  {saving && <Spinner />} ✓ Valider
                </button>
                <button onClick={() => setShowReject(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold" style={{ background: '#DC2626' }}>
                  ✗ Rejeter
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Valider / Rejeter la DEMANDE liée à un dossier
// ═════════════════════════════════════════════════════════════════════════════
function ValiderDemandeModal({ dossier, onClose, fire, onDone }) {
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  const documentsMeta = dossier.locataire?.typeLocataire === 'FONCTIONNAIRE' ? DOCUMENTS_FONCTIONNAIRE : DOCUMENTS_PRIVE
  const requisTotal = documentsMeta.length
  const fournis = dossier.documents.length
  const logement = dossier.demande?.logement
  const dossierIncomplet = !['SOUMIS', 'VALIDE'].includes(dossier.statut)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await api.put(`/direction/demandes/${dossier.demandeId}/valider`, { commentaire: commentaire.trim() || undefined })
      fire('success', 'Demande validée ! Le Service Logement a été notifié.')
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la validation.')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md"
      >
        <div className="p-6">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            Valider la demande de logement
          </h2>
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
            <p><span className="text-gray-400">Demandeur : </span><span className="font-semibold text-gray-800">{dossier.locataire?.prenom} {dossier.locataire?.nom}</span></p>
            <p><span className="text-gray-400">Logement : </span><span className="font-semibold text-gray-800">{logement ? `${logement.code} — ${logement.adresse}` : 'Non renseigné'}</span></p>
            <p><span className="text-gray-400">Type : </span><span className="font-semibold text-gray-800">{dossier.locataire?.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}</span></p>
            <p><span className="text-gray-400">Documents fournis : </span><span className="font-semibold text-gray-800">{fournis} / {requisTotal} requis</span></p>
          </div>
          {dossierIncomplet && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 mb-4">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Le dossier de ce client n'a pas encore été soumis ou est incomplet. Êtes-vous sûr de vouloir valider ?</span>
            </div>
          )}
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Commentaire (optionnel)</label>
          <textarea rows={3} value={commentaire} onChange={e => setCommentaire(e.target.value)} className={inp} placeholder="Précisions sur la validation…" />
          <div className="flex items-center gap-3 mt-5">
            <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
            <button
              onClick={handleConfirm} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: G }}
            >
              {saving && <Spinner />} Confirmer la validation
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function RejeterDemandeModal({ dossier, onClose, fire, onDone }) {
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReject = async () => {
    if (!motif.trim()) return
    setSaving(true)
    try {
      await api.put(`/direction/demandes/${dossier.demandeId}/rejeter`, { motifRejet: motif.trim() })
      fire('success', 'Demande rejetée.')
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du rejet.')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md"
      >
        <div className="p-6">
          <h2 className="text-lg font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Rejeter la demande</h2>
          <p className="text-sm text-gray-500 mb-4">Le motif du rejet sera communiqué au demandeur.</p>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Motif du rejet <span style={{ color: O }}>*</span></label>
          <textarea rows={3} value={motif} onChange={e => setMotif(e.target.value)} className={inp} placeholder="Expliquez pourquoi cette demande est rejetée…" />
          <div className="flex items-center gap-3 mt-5">
            <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
            <button
              onClick={handleReject} disabled={!motif.trim() || saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50" style={{ background: '#EF4444' }}
            >
              {saving && <Spinner />} Confirmer le rejet
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Examen du dossier
// ═════════════════════════════════════════════════════════════════════════════
export function DossierDetailModal({ dossier: initialDossier, onClose, fire, onUpdated }) {
  const [dossier, setDossier] = useState(initialDossier)
  const [tab, setTab] = useState('PROFIL')
  const [decisionCommentaire, setDecisionCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  const locataire = dossier.locataire
  const demande = dossier.demande
  const logement = demande?.logement
  const meta = STATUT_DOSSIER_META[dossier.statut] || { label: dossier.statut, cls: 'bg-gray-100 text-gray-500' }
  const documentsMeta = locataire?.typeLocataire === 'FONCTIONNAIRE' ? DOCUMENTS_FONCTIONNAIRE : DOCUMENTS_PRIVE

  const montantLoyer = logement?.montantLoyer != null ? Number(logement.montantLoyer) : null
  const revenu = dossier.revenuMensuel != null ? Number(dossier.revenuMensuel) : null
  const ratio = (montantLoyer != null && revenu) ? Math.round((montantLoyer / revenu) * 100) : null
  const ratioMeta = ratio == null ? null
    : ratio < 30 ? { label: 'Solvable ✓', cls: 'bg-green-100 text-green-700' }
    : ratio <= 40 ? { label: 'Limite', cls: 'bg-amber-100 text-amber-700' }
    : { label: 'Attention', cls: 'bg-red-100 text-red-600' }

  const docsRequisNonValides = documentsMeta.filter(m => m.requis).filter(m => {
    const doc = dossier.documents.find(d => d.type === m.type)
    return !doc || doc.valide !== true
  })

  const handleValiderDoc = async (docId, valide, commentaire) => {
    try {
      const { data } = await api.patch(`/dossiers/documents/${docId}/valider`, { valide, commentaire })
      setDossier(prev => ({ ...prev, documents: prev.documents.map(d => d.id === docId ? data : d) }))
      fire('success', valide ? 'Document validé.' : 'Document rejeté.')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de mettre à jour ce document.')
    }
  }

  const handleValiderDossier = async () => {
    setSaving(true)
    try {
      await api.patch(`/dossiers/${dossier.demandeId}/valider`, { commentaire: decisionCommentaire.trim() || undefined })
      try {
        await api.put(`/direction/demandes/${dossier.demandeId}/valider`, { commentaire: decisionCommentaire.trim() || undefined })
      } catch (err) {
        // La validation du dossier a déjà fait passer la demande à EN_ETUDE_LOGEMENT
        // dans le cas courant (rattrapage côté dossier.controller.js) — un 400 ici
        // signifie juste qu'elle n'était plus EN_VALIDATION_DIRECTION, pas un échec réel.
        if (err.response?.status !== 400) throw err
      }
      fire('success', 'Dossier et demande validés !')
      onUpdated()
      onClose()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de valider ce dossier.')
    } finally {
      setSaving(false)
    }
  }

  const handleRejeterDossier = async () => {
    if (!decisionCommentaire.trim()) { fire('error', 'Un commentaire est requis pour rejeter un dossier.'); return }
    setSaving(true)
    try {
      await api.patch(`/dossiers/${dossier.demandeId}/rejeter`, { commentaire: decisionCommentaire.trim() })
      try {
        await api.put(`/direction/demandes/${dossier.demandeId}/rejeter`, { motifRejet: decisionCommentaire.trim() })
      } catch (err) {
        if (err.response?.status !== 400) throw err
      }
      fire('success', 'Dossier et demande rejetés.')
      onUpdated()
      onClose()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de rejeter ce dossier.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        role="dialog" aria-modal="true" aria-label={`Dossier de ${locataire?.prenom} ${locataire?.nom}`}
        className="bg-white rounded-[22px] border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-extrabold text-white"
                style={{ background: locataire?.typeLocataire === 'FONCTIONNAIRE' ? G : O }}
              >
                {getInitials(locataire?.nom, locataire?.prenom)}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {locataire?.prenom} {locataire?.nom}
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  <span>{locataire?.email || 'Non renseigné'}</span>
                  <span>{locataire?.telephone || 'Non renseigné'}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="bg-slate-100 rounded-lg p-1.5 text-slate-500 flex-shrink-0"><X size={16} /></button>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {locataire?.typeLocataire && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${locataire.typeLocataire === 'FONCTIONNAIRE' ? 'bg-[#2E7D32]/10 text-[#2E7D32]' : 'bg-[#E8520A]/10 text-[#E8520A]'}`}>
                {locataire.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}
              </span>
            )}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
          </div>
          {logement ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700">
              <span className="font-bold">{logement.code}</span> · {logement.type} · {logement.adresse}
              {montantLoyer != null && <> · {montantLoyer.toLocaleString('fr-FR')} FCFA/mois</>}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 italic">Aucun logement associé à cette demande.</div>
          )}
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-gray-100">
          {[
            { key: 'PROFIL', label: 'Profil' },
            { key: 'PRO', label: 'Situation pro.' },
            { key: 'DOCUMENTS', label: 'Documents' },
          ].map(t => (
            <button
              key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === t.key ? 'border-[#E8520A] text-[#E8520A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* TAB 1 — Profil personnel */}
          {tab === 'PROFIL' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <Champ label="Date de naissance" value={dossier.dateNaissance ? formatDate(dossier.dateNaissance) : null} />
                <Champ label="Lieu de naissance" value={dossier.lieuNaissance} />
                <Champ label="Nationalité" value={dossier.nationalite} />
                <Champ label="Situation familiale" value={dossier.situationFamiliale} />
                <Champ label="Nombre d'enfants" value={dossier.nombreEnfants != null ? String(dossier.nombreEnfants) : null} />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                {locataire?.typeLocataire === 'FONCTIONNAIRE' ? (
                  <>
                    <p className="text-sm font-bold text-blue-800 mb-1">Fonctionnaire de l'État</p>
                    <p className="text-xs text-blue-700">
                      Documents attendus : Pièce d'identité, Attestation d'emploi, Bulletins de salaire.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-blue-800 mb-2">Locataire privé — Analyse de solvabilité</p>
                    {ratio != null ? (
                      <div className="space-y-0.5">
                        <p className="text-xs text-blue-700">Revenu mensuel : {revenu.toLocaleString('fr-FR')} FCFA</p>
                        <p className="text-xs text-blue-700">Loyer demandé : {montantLoyer.toLocaleString('fr-FR')} FCFA</p>
                        <p className="text-xs text-blue-700">Ratio loyer/revenu : {ratio}%</p>
                        <span className={`inline-block mt-1.5 text-[0.68rem] font-bold px-2.5 py-1 rounded-full ${ratioMeta.cls}`}>{ratioMeta.label}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-blue-700">Revenu ou loyer non renseigné — impossible de calculer le ratio.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2 — Situation professionnelle */}
          {tab === 'PRO' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {locataire?.typeLocataire === 'FONCTIONNAIRE' ? (
                  <>
                    <Champ label="Ministère de tutelle" value={dossier.ministere} />
                    <Champ label="Direction / Service" value={dossier.direction} />
                    <Champ label="Grade" value={dossier.grade} />
                    <Champ label="Indice" value={dossier.indice} />
                    <Champ label="Ancienneté" value={dossier.anciennete != null ? `${dossier.anciennete} an${dossier.anciennete > 1 ? 's' : ''}` : null} />
                    <Champ label="Revenu mensuel net" value={revenu != null ? `${revenu.toLocaleString('fr-FR')} FCFA` : null} />
                  </>
                ) : (
                  <>
                    <Champ label="Employeur" value={dossier.employeur} />
                    <Champ label="Poste" value={dossier.poste} />
                    <Champ label="Ancienneté" value={dossier.anciennete != null ? `${dossier.anciennete} an${dossier.anciennete > 1 ? 's' : ''}` : null} />
                    <Champ label="Revenu mensuel net" value={revenu != null ? `${revenu.toLocaleString('fr-FR')} FCFA` : null} />
                  </>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2.5">Évaluation financière</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>Loyer demandé : <span className="font-semibold">{montantLoyer != null ? `${montantLoyer.toLocaleString('fr-FR')} FCFA` : 'Non renseigné'}</span></p>
                  <p>Revenu déclaré : <span className="font-semibold">{revenu != null ? `${revenu.toLocaleString('fr-FR')} FCFA` : 'Non renseigné'}</span></p>
                  <p>Ratio : <span className="font-semibold">{ratio != null ? `${ratio}%` : '—'}</span></p>
                </div>
                {ratioMeta && (
                  <span className={`inline-block mt-2.5 text-[0.68rem] font-bold px-2.5 py-1 rounded-full ${ratioMeta.cls}`}>{ratioMeta.label}</span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3 — Documents */}
          {tab === 'DOCUMENTS' && (
            <div className="flex flex-col gap-2.5">
              {documentsMeta.map(m => {
                const doc = dossier.documents.find(d => d.type === m.type)
                return doc
                  ? <DocumentReviewCard key={m.type} doc={doc} meta={m} onValidate={handleValiderDoc} />
                  : (
                    <div key={m.type} className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <m.icon size={17} className="text-gray-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-500">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.requis ? 'Requis — pas encore fourni' : 'Optionnel — pas encore fourni'}</p>
                      </div>
                    </div>
                  )
              })}
            </div>
          )}
        </div>

        {/* FOOTER — Décision finale */}
        {['SOUMIS', 'EN_ETUDE'].includes(dossier.statut) && (
          <div className="border-t border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Décision sur le dossier</h3>
            <textarea
              rows={3} value={decisionCommentaire} onChange={e => setDecisionCommentaire(e.target.value)}
              placeholder="Ajoutez un commentaire sur votre décision…" className={inp}
            />
            {docsRequisNonValides.length > 0 && (
              <div className="mt-2.5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{docsRequisNonValides.length} document{docsRequisNonValides.length > 1 ? 's' : ''} requis non encore validé{docsRequisNonValides.length > 1 ? 's' : ''}.</span>
              </div>
            )}
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={handleRejeterDossier} disabled={saving || !decisionCommentaire.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-50"
                style={{ background: '#DC2626' }}
              >
                {saving && <Spinner />} ✗ Rejeter le dossier ET la demande
              </button>
              <button
                onClick={handleValiderDossier} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-50"
                style={{ background: G }}
              >
                {saving && <Spinner />} ✓ Valider le dossier ET la demande
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Page principale
// ═════════════════════════════════════════════════════════════════════════════
export default function DossiersDirection() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeTab, setActiveTab] = useState('A_ETUDIER')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [examenTarget, setExamenTarget] = useState(null)
  const [validerDemandeTarget, setValiderDemandeTarget] = useState(null)
  const [rejeterDemandeTarget, setRejeterDemandeTarget] = useState(null)
  const [exportingId, setExportingId] = useState(null)
  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  const handleDemandeActionDone = useCallback(() => {
    setValiderDemandeTarget(null); setRejeterDemandeTarget(null)
    fetchDossiers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exporterPDF = async (dossier) => {
    setExportingId(dossier.demandeId)
    const nomClient = `${dossier.locataire?.prenom || ''}-${dossier.locataire?.nom || ''}`.trim() || `dossier-${dossier.demandeId}`
    try {
      const response = await api.get(`/dossiers/${dossier.demandeId}/export-pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `dossier-${nomClient}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      fire('error', 'Erreur lors de la génération du PDF.')
    } finally {
      setExportingId(null)
    }
  }

  const fetchDossiers = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/dossiers')
      setDossiers(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les dossiers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['DIRECTION', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchDossiers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMarquerEnEtude = async (dossier) => {
    try {
      await api.patch(`/dossiers/${dossier.demandeId}/en-etude`)
      fire('success', 'Dossier marqué en étude.')
      fetchDossiers()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de mettre à jour ce dossier.')
    }
  }

  const handleUpdated = useCallback(() => { fetchDossiers() }, [fetchDossiers])

  const filtered = useMemo(() => {
    const tab = TABS_DOSSIER.find(t => t.key === activeTab)
    const q = search.trim().toLowerCase()
    return dossiers.filter(d => {
      if (!tab.statuts.includes(d.statut)) return false
      if (typeFilter && d.locataire?.typeLocataire !== typeFilter) return false
      if (q) {
        const full = `${d.locataire?.prenom || ''} ${d.locataire?.nom || ''} ${d.locataire?.email || ''}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [dossiers, activeTab, search, typeFilter])

  const counts = useMemo(() => Object.fromEntries(
    TABS_DOSSIER.map(t => [t.key, dossiers.filter(d => t.statuts.includes(d.statut)).length]),
  ), [dossiers])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <DirectionSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
              className="dir-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Dossiers clients</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Examinez et validez les dossiers des demandeurs de logement</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchDossiers} />
          ) : (
            <>
              <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1.5 mb-5 w-fit flex-wrap shadow-sm">
                {TABS_DOSSIER.map(t => (
                  <button
                    key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    style={{ background: activeTab === t.key ? O : 'transparent' }}
                  >
                    {t.label}
                    {counts[t.key] > 0 && (
                      <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {counts[t.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher nom/email…" className={`${inp} pl-9`} />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} md:w-52`}>
                  <option value="">Tous les types</option>
                  <option value="FONCTIONNAIRE">Fonctionnaire</option>
                  <option value="PRIVE">Privé</option>
                </select>
              </div>

              {loading ? (
                <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-52" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <EmptyState
                    title={
                      activeTab === 'A_ETUDIER' ? 'Aucun dossier à étudier'
                      : activeTab === 'VALIDES' ? 'Aucun dossier validé'
                      : activeTab === 'REJETES' ? 'Aucun dossier rejeté'
                      : 'Aucun dossier incomplet'
                    }
                    subtitle="Les dossiers apparaîtront ici une fois soumis par les locataires."
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map(dossier => (
                    <DossierCard
                      key={dossier.id} dossier={dossier}
                      onExaminer={setExamenTarget}
                      onMarquerEnEtude={handleMarquerEnEtude}
                      onExportPDF={exporterPDF}
                      exporting={exportingId === dossier.demandeId}
                      onValiderDemande={setValiderDemandeTarget}
                      onRejeterDemande={setRejeterDemandeTarget}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {examenTarget && (
          <DossierDetailModal
            dossier={examenTarget}
            onClose={() => setExamenTarget(null)}
            fire={fire}
            onUpdated={handleUpdated}
          />
        )}
        {validerDemandeTarget && (
          <ValiderDemandeModal
            dossier={validerDemandeTarget}
            onClose={() => setValiderDemandeTarget(null)}
            fire={fire}
            onDone={handleDemandeActionDone}
          />
        )}
        {rejeterDemandeTarget && (
          <RejeterDemandeModal
            dossier={rejeterDemandeTarget}
            onClose={() => setRejeterDemandeTarget(null)}
            fire={fire}
            onDone={handleDemandeActionDone}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
