import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText, Search, Menu, X, AlertTriangle, RefreshCw, CheckCircle, XCircle, Eye, ImageOff, FolderOpen,
} from 'lucide-react'
import api from '../../services/api.js'
import DirectionSidebar from '../../components/direction/DirectionSidebar.jsx'
import { DossierDetailModal } from './DossiersDirection.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const TABS = [
  { key: 'TOUTES',      label: 'Toutes' },
  { key: 'NOUVELLES',   label: 'Nouvelles' },
  { key: 'VALIDATION',  label: 'En validation' },
  { key: 'TRAITEES',    label: 'Traitées' },
  { key: 'REJETEES',    label: 'Rejetées' },
]

const STATUT_META = {
  SOUMISE:                 { label: 'Soumise',              cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  EN_VALIDATION_DIRECTION: { label: 'En validation',        cls: 'bg-amber-50 text-amber-700 border-amber-200', pulse: true },
  VALIDEE_DIRECTION:       { label: 'Validée',               cls: 'bg-violet-50 text-violet-600 border-violet-200' },
  EN_ETUDE_LOGEMENT:       { label: "En étude logement",    cls: 'bg-orange-50 text-[#E8520A] border-orange-200' },
  APPROUVEE:               { label: 'Approuvée',             cls: 'bg-green-50 text-[#2E7D32] border-green-200' },
  REJETEE_DIRECTION:       { label: 'Rejetée (Direction)',  cls: 'bg-red-100 text-red-800 border-red-300' },
  REJETEE:                 { label: 'Rejetée',               cls: 'bg-red-50 text-red-600 border-red-200' },
  ANNULEE:                 { label: 'Annulée',               cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const PRIORITE_META = {
  URGENTE: { color: '#EF4444', bg: '#FEF2F2' },
  HAUTE:   { color: '#E8520A', bg: '#FFF7ED' },
  NORMALE: { color: '#3B82F6', bg: '#EFF6FF' },
  BASSE:   { color: '#94A3B8', bg: '#F8FAFC' },
}

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Spinner() { return <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="inline-block animate-spin" /> }
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
function EmptyState({ icon: Icon = FileText, title, subtitle }) {
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
function Modal({ onClose, width = 480, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])
  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        style={{ maxWidth: width }} className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-h-[85vh] overflow-y-auto"
      >
        {children}
      </motion.div>
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
  const cls = toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800'
    : toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-red-50 border-red-200 text-red-800'
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
      className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl border shadow-lg text-sm font-semibold min-w-[260px] max-w-[360px] ${cls}`}
    >
      {toast.message}
    </motion.div>
  )
}
function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800 truncate">{value}</p>
    </div>
  )
}

// ─── Modal : valider une demande ────────────────────────────────────────────────
function ValiderModal({ demande, onClose, fire, onDone }) {
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await api.put(`/direction/demandes/${demande.id}/valider`, { commentaire: commentaire.trim() || undefined })
      fire('success', `Demande #${demande.id} validée.`)
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la validation.')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          Valider la demande — {demande.demandeur?.prenom} {demande.demandeur?.nom}
        </h2>
        <p className="text-sm text-gray-500 mb-4">Cette demande passera au Service Logement pour attribution d'un logement.</p>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Commentaire (optionnel)</label>
        <textarea rows={3} value={commentaire} onChange={e => setCommentaire(e.target.value)} className={inp} placeholder="Précisions sur la validation…" />
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
          <button onClick={handleConfirm} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: G }}>
            {saving && <Spinner />} <CheckCircle size={14} /> Valider
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal : rejeter une demande ─────────────────────────────────────────────────
function RejeterModal({ demande, onClose, fire, onDone }) {
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReject = async () => {
    if (!motif.trim()) return
    setSaving(true)
    try {
      await api.put(`/direction/demandes/${demande.id}/rejeter`, { motifRejet: motif.trim() })
      fire('success', `Demande #${demande.id} rejetée.`)
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du rejet.')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          Rejeter la demande — {demande.demandeur?.prenom} {demande.demandeur?.nom}
        </h2>
        <p className="text-sm text-gray-500 mb-4">Le motif du rejet sera communiqué au demandeur.</p>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Motif du rejet <span style={{ color: O }}>*</span></label>
        <textarea rows={3} value={motif} onChange={e => setMotif(e.target.value)} className={inp} placeholder="Expliquez pourquoi cette demande est rejetée…" />
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
          <button onClick={handleReject} disabled={!motif.trim() || saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50" style={{ background: '#EF4444' }}>
            {saving && <Spinner />} <XCircle size={14} /> Confirmer le rejet
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal : détail (lecture seule) ─────────────────────────────────────────────
function DetailModal({ demande, onClose }) {
  const meta = STATUT_META[demande.statut] || { label: demande.statut, cls: 'bg-gray-100 text-gray-600' }
  const photo = demande.logement?.photos?.[0]

  return (
    <Modal onClose={onClose} width={520}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-extrabold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demande DM-{demande.id}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
      </div>
      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Demandeur" value={`${demande.demandeur?.prenom} ${demande.demandeur?.nom}`} />
          <InfoRow label="Type" value={demande.demandeur?.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'} />
          <InfoRow label="Email" value={demande.demandeur?.email || '—'} />
          <InfoRow label="Téléphone" value={demande.demandeur?.telephone || '—'} />
          <InfoRow label="Priorité" value={demande.priorite} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Statut</span>
          </div>
        </div>
        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.cls}`}>{meta.label}</span>

        {demande.logement && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Logement demandé</p>
            <div className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {photo ? <img src={photo.urlPhoto} alt="" className="w-full h-full object-cover" /> : <ImageOff size={16} className="text-slate-300" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{demande.logement.code}</p>
                <p className="text-xs text-gray-400 truncate">{demande.logement.adresse}, {demande.logement.ville}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Motif</p>
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">{demande.motif}</p>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Historique</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Dépôt de la demande</span><span className="font-semibold text-gray-800">{formatDateTime(demande.dateDepot)}</span></div>
            {demande.dateValidationDirection && (
              <div className="flex justify-between"><span className="text-gray-500">Décision Direction</span><span className="font-semibold text-gray-800">{formatDateTime(demande.dateValidationDirection)}</span></div>
            )}
            {demande.dateTraitement && (
              <div className="flex justify-between"><span className="text-gray-500">Traitement Service Logement</span><span className="font-semibold text-gray-800">{formatDateTime(demande.dateTraitement)}</span></div>
            )}
          </div>
          {demande.commentaireDirection && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-2.5 mt-2">
              <span className="font-semibold text-gray-600">Commentaire Direction : </span>{demande.commentaireDirection}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
        <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function DemandesDirection() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeTab, setActiveTab] = useState('TOUTES')
  const [search, setSearch] = useState('')
  const [prioriteFilter, setPrioriteFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [validerTarget, setValiderTarget] = useState(null)
  const [rejeterTarget, setRejeterTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [dossierTarget, setDossierTarget] = useState(null)
  const [dossierLoadingId, setDossierLoadingId] = useState(null)

  // Suivi local (non persisté) : demandes dont le dossier a été consulté au
  // moins une fois, et demandes pour lesquelles on a déjà constaté l'absence
  // de dossier — évite de refaire un aller-retour réseau à chaque affichage.
  const [dossiersConsultes, setDossiersConsultes] = useState(new Set())
  const [dossiersIntrouvables, setDossiersIntrouvables] = useState(new Set())
  const [avertissementTarget, setAvertissementTarget] = useState(null) // { id, action: 'valider' | 'rejeter' }

  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  const handleVoirDossier = async (demande) => {
    setDossierLoadingId(demande.id)
    try {
      const { data } = await api.get(`/dossiers/${demande.id}`)
      setDossiersConsultes(prev => new Set(prev).add(demande.id))
      setDossierTarget(data)
    } catch (err) {
      setDossiersConsultes(prev => new Set(prev).add(demande.id))
      if (err.response?.status === 404) {
        setDossiersIntrouvables(prev => new Set(prev).add(demande.id))
        fire('warning', "Ce demandeur n'a pas encore constitué son dossier.")
      } else {
        fire('error', "Impossible de charger le dossier de ce demandeur.")
      }
    } finally {
      setDossierLoadingId(null)
    }
  }

  const handleValiderClick = (d) => {
    if (dossiersConsultes.has(d.id)) { setValiderTarget(d); return }
    fire('warning', "Nous vous recommandons de consulter le dossier du demandeur avant de prendre une décision.")
    setAvertissementTarget({ id: d.id, action: 'valider' })
  }
  const handleRejeterClick = (d) => {
    if (dossiersConsultes.has(d.id)) { setRejeterTarget(d); return }
    fire('warning', "Nous vous recommandons de consulter le dossier du demandeur avant de prendre une décision.")
    setAvertissementTarget({ id: d.id, action: 'rejeter' })
  }

  const fetchDemandes = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/direction/demandes')
      setDemandes(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les demandes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['DIRECTION', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchDemandes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDone = useCallback(() => {
    setValiderTarget(null); setRejeterTarget(null)
    fetchDemandes()
  }, [fetchDemandes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return demandes.filter(d => {
      if (activeTab === 'NOUVELLES' && d.statut !== 'SOUMISE') return false
      if (activeTab === 'VALIDATION' && d.statut !== 'EN_VALIDATION_DIRECTION') return false
      if (activeTab === 'TRAITEES' && !['VALIDEE_DIRECTION', 'EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(d.statut)) return false
      if (activeTab === 'REJETEES' && !['REJETEE_DIRECTION', 'REJETEE'].includes(d.statut)) return false
      if (prioriteFilter && d.priorite !== prioriteFilter) return false
      if (typeFilter && d.demandeur?.typeLocataire !== typeFilter) return false
      if (q) {
        const full = `${d.demandeur?.prenom || ''} ${d.demandeur?.nom || ''} ${d.demandeur?.email || ''}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [demandes, activeTab, search, prioriteFilter, typeFilter])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <DirectionSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
              className="dir-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Demandes de logement</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Validez ou rejetez les demandes soumises par les locataires</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchDemandes} />
          ) : (
            <>
              <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1.5 mb-5 w-fit flex-wrap shadow-sm">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    style={{ background: activeTab === t.key ? O : 'transparent' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un demandeur…" className={`${inp} pl-9`} />
                </div>
                <select value={prioriteFilter} onChange={e => setPrioriteFilter(e.target.value)} className={`${sel} md:w-44`}>
                  <option value="">Toutes priorités</option>
                  <option value="URGENTE">Urgente</option>
                  <option value="HAUTE">Haute</option>
                  <option value="NORMALE">Normale</option>
                  <option value="BASSE">Basse</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} md:w-48`}>
                  <option value="">Tous les types</option>
                  <option value="FONCTIONNAIRE">Fonctionnaire</option>
                  <option value="PRIVE">Privé</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Demandeur', 'Type', 'Logement demandé', 'Motif', 'Priorité', 'Statut', 'Date', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={8} className="p-10 text-center text-gray-400 text-sm">Chargement des demandes…</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={8}><EmptyState title="Aucune demande trouvée" subtitle="Aucune demande ne correspond à ces filtres." /></td></tr>
                      ) : (
                        filtered.map(d => {
                          const meta = STATUT_META[d.statut] || { label: d.statut, cls: 'bg-gray-100 text-gray-600' }
                          const isEnValidation = d.statut === 'EN_VALIDATION_DIRECTION'
                          return (
                            <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100">
                                    <span className="text-[0.65rem] font-bold text-slate-600">{getInitials(d.demandeur?.nom, d.demandeur?.prenom)}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{d.demandeur?.prenom} {d.demandeur?.nom}</p>
                                    <p className="text-xs text-gray-400 truncate">{d.demandeur?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{d.demandeur?.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{d.logement?.code || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{d.motif}</td>
                              <td className="px-4 py-3">
                                <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: PRIORITE_META[d.priorite]?.bg, color: PRIORITE_META[d.priorite]?.color }}>
                                  {d.priorite}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col items-start gap-1">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.cls}`}>
                                    {meta.pulse && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                    {meta.label}
                                  </span>
                                  {dossiersIntrouvables.has(d.id) && (
                                    <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                                      Dossier incomplet
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(d.dateDepot)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => handleVoirDossier(d)} title="Voir le dossier" disabled={dossierLoadingId === d.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                                  >
                                    <FolderOpen size={12} /> {dossierLoadingId === d.id ? '…' : 'Voir le dossier'}
                                  </button>
                                  {isEnValidation ? (
                                    avertissementTarget?.id === d.id ? (
                                      <>
                                        {avertissementTarget.action === 'valider' ? (
                                          <button onClick={() => { setValiderTarget(d); setAvertissementTarget(null) }} title="Valider quand même" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap" style={{ background: '#D97706' }}>
                                            <AlertTriangle size={12} /> Valider quand même
                                          </button>
                                        ) : (
                                          <button onClick={() => { setRejeterTarget(d); setAvertissementTarget(null) }} title="Rejeter quand même" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap" style={{ background: '#D97706' }}>
                                            <AlertTriangle size={12} /> Rejeter quand même
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => handleValiderClick(d)} title="Valider" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap" style={{ background: G }}>
                                          <CheckCircle size={12} /> Valider
                                        </button>
                                        <button onClick={() => handleRejeterClick(d)} title="Rejeter" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold whitespace-nowrap">
                                          <XCircle size={12} /> Rejeter
                                        </button>
                                      </>
                                    )
                                  ) : (
                                    <button onClick={() => setDetailTarget(d)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold whitespace-nowrap">
                                      <Eye size={12} /> Voir détail
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {validerTarget && <ValiderModal demande={validerTarget} onClose={() => setValiderTarget(null)} fire={fire} onDone={handleDone} />}
        {rejeterTarget && <RejeterModal demande={rejeterTarget} onClose={() => setRejeterTarget(null)} fire={fire} onDone={handleDone} />}
        {detailTarget && <DetailModal demande={detailTarget} onClose={() => setDetailTarget(null)} />}
        {dossierTarget && (
          <DossierDetailModal
            dossier={dossierTarget}
            onClose={() => setDossierTarget(null)}
            fire={fire}
            onUpdated={() => { setDossierTarget(null); fetchDemandes() }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
