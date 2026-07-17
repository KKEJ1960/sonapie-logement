import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Wrench, Search, Menu, X, AlertTriangle, RefreshCw, CalendarClock,
  UserCheck, CheckSquare, Eye,
} from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const TABS = [
  { key: 'TOUS',        label: 'Tous' },
  { key: 'A_PROGRAMMER', label: 'À programmer', statuts: ['SOUMIS'] },
  { key: 'EN_COURS',    label: 'En cours', statuts: [
    'CONSTAT_PROGRAMME', 'CONSTAT_EFFECTUE', 'PRISE_EN_CHARGE_SONAPIE', 'ASSIGNE_TECHNICIEN',
    'EN_COURS', 'PRISE_EN_CHARGE_LOCATAIRE', 'EN_ATTENTE_CONFIRMATION_LOCATAIRE',
  ] },
  { key: 'A_VERIFIER',  label: 'À vérifier', statuts: ['VERIFICATION_SONAPIE'] },
  { key: 'CLOTURES',    label: 'Clôturés', statuts: ['CLOTURE', 'REOUVERT'] },
]

const STATUT_TICKET_META = {
  SOUMIS:                            { label: 'Soumis',           cls: 'bg-slate-100 text-slate-600' },
  CONSTAT_PROGRAMME:                 { label: 'Constat prog.',    cls: 'bg-blue-50 text-blue-600' },
  CONSTAT_EFFECTUE:                  { label: 'Constat fait',     cls: 'bg-blue-50 text-blue-600' },
  PRISE_EN_CHARGE_LOCATAIRE:         { label: 'Prise en charge',  cls: 'bg-orange-50 text-[#E8520A]' },
  PRISE_EN_CHARGE_SONAPIE:           { label: 'Prise en charge',  cls: 'bg-orange-50 text-[#E8520A]' },
  EN_ATTENTE_CONFIRMATION_LOCATAIRE: { label: 'Attente confirm.', cls: 'bg-orange-50 text-[#E8520A]' },
  ASSIGNE_TECHNICIEN:                { label: 'Assigné',          cls: 'bg-blue-50 text-blue-600' },
  EN_COURS:                          { label: 'En cours',         cls: 'bg-blue-50 text-blue-600' },
  VERIFICATION_SONAPIE:              { label: 'Vérification',     cls: 'bg-purple-50 text-purple-600' },
  CLOTURE:                           { label: 'Clôturé',          cls: 'bg-green-50 text-[#2E7D32]' },
  REOUVERT:                          { label: 'Réouvert',         cls: 'bg-red-50 text-red-600' },
}

const PRIORITE_META = {
  URGENTE: { color: '#EF4444', bg: '#FEF2F2' },
  HAUTE:   { color: '#F59E0B', bg: '#FFFBEB' },
  NORMALE: { color: '#3B82F6', bg: '#EFF6FF' },
  BASSE:   { color: '#94A3B8', bg: '#F8FAFC' },
}

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '')

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'
const primaryBtn = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-60'

function Skeleton({ className }) { return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} /> }
function Spinner() { return <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="inline-block animate-spin" /> }
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
function EmptyState({ icon: Icon = Wrench, title, subtitle }) {
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
function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15` }}>
        <Icon size={19} style={{ color }} />
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
function Modal({ onClose, width = 460, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])
  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        style={{ maxWidth: width }} className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-h-[85vh] overflow-y-auto">
        {children}
      </motion.div>
    </div>
  )
}

// ─── Modal : programmer le constat ──────────────────────────────────────────────
function ProgrammerConstatModal({ ticket, technicienUtiles, onClose, fire, onDone }) {
  const [agentConstatId, setAgentConstatId] = useState('')
  const [dateConstatPrevue, setDateConstatPrevue] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agentConstatId) { fire('error', 'Sélectionnez un technicien.'); return }
    setSaving(true)
    try {
      await api.put(`/tickets/${ticket.id}/programmer-constat`, {
        agentConstatId: Number(agentConstatId),
        dateConstatPrevue: dateConstatPrevue || null,
      })
      fire('success', 'Constat programmé avec succès.')
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de programmer le constat.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={440}>
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Programmer un constat</h2>
        <p className="text-sm text-gray-500 mb-4">Ticket #{ticket.id} — {ticket.titre}</p>

        <label className="text-xs font-semibold text-gray-600 mb-1 block">Technicien / agent *</label>
        <select value={agentConstatId} onChange={e => setAgentConstatId(e.target.value)} className={`${sel} mb-3.5`}>
          <option value="">Sélectionner…</option>
          {technicienUtiles.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
        </select>

        <label className="text-xs font-semibold text-gray-600 mb-1 block">Date de passage prévue (optionnel)</label>
        <input type="date" value={dateConstatPrevue} onChange={e => setDateConstatPrevue(e.target.value)} className={inp} />

        <div className="flex items-center gap-3 mt-5">
          <button type="button" onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button type="submit" disabled={saving} className={primaryBtn} style={{ background: O }}>
            {saving && <Spinner />} <CalendarClock size={14} /> Programmer
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal : assigner un technicien ─────────────────────────────────────────────
function AssignerTechnicienModal({ ticket, techniciens, onClose, fire, onDone }) {
  const [technicienId, setTechnicienId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!technicienId) { fire('error', 'Sélectionnez un technicien.'); return }
    setSaving(true)
    try {
      await api.put(`/tickets/${ticket.id}/assigner-technicien`, { technicienId: Number(technicienId) })
      fire('success', 'Technicien assigné avec succès.')
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || "Impossible d'assigner ce technicien.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={420}>
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Assigner un technicien</h2>
        <p className="text-sm text-gray-500 mb-4">Ticket #{ticket.id} — {ticket.titre}</p>

        <label className="text-xs font-semibold text-gray-600 mb-1 block">Technicien *</label>
        <select value={technicienId} onChange={e => setTechnicienId(e.target.value)} className={sel}>
          <option value="">Sélectionner…</option>
          {techniciens.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
        </select>

        <div className="flex items-center gap-3 mt-5">
          <button type="button" onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button type="submit" disabled={saving} className={primaryBtn} style={{ background: O }}>
            {saving && <Spinner />} <UserCheck size={14} /> Assigner
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal : vérifier et clôturer ────────────────────────────────────────────────
function VerifierModal({ ticket, onClose, fire, onDone }) {
  const [conforme, setConforme] = useState(null)
  const [commentaireVerification, setCommentaireVerification] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (conforme === null) { fire('error', 'Indiquez si la réparation est conforme.'); return }
    setSaving(true)
    try {
      await api.put(`/tickets/${ticket.id}/verifier`, { conforme, commentaireVerification: commentaireVerification.trim() || undefined })
      fire('success', conforme ? 'Ticket clôturé avec succès.' : 'Ticket réouvert.')
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de vérifier ce ticket.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={440}>
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Vérifier la réparation</h2>
        <p className="text-sm text-gray-500 mb-4">Ticket #{ticket.id} — {ticket.titre}</p>

        <p className="text-xs font-semibold text-gray-600 mb-2">La réparation est-elle conforme ? *</p>
        <div className="flex items-center gap-3 mb-3.5">
          <button type="button" onClick={() => setConforme(true)}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold border transition ${conforme === true ? 'text-white border-transparent' : 'text-gray-500 border-gray-200'}`}
            style={{ background: conforme === true ? G : '#fff' }}>
            Oui, conforme
          </button>
          <button type="button" onClick={() => setConforme(false)}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold border transition ${conforme === false ? 'text-white border-transparent' : 'text-gray-500 border-gray-200'}`}
            style={{ background: conforme === false ? '#EF4444' : '#fff' }}>
            Non, à revoir
          </button>
        </div>

        <label className="text-xs font-semibold text-gray-600 mb-1 block">Commentaire {conforme === false && <span style={{ color: O }}>*</span>}</label>
        <textarea rows={2} value={commentaireVerification} onChange={e => setCommentaireVerification(e.target.value)} className={inp} placeholder="Détails de la vérification…" />

        <div className="flex items-center gap-3 mt-5">
          <button type="button" onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button type="submit" disabled={saving} className={primaryBtn} style={{ background: conforme === false ? '#EF4444' : G }}>
            {saving && <Spinner />} <CheckSquare size={14} /> Valider
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal : détail (lecture seule) ─────────────────────────────────────────────
function DetailModal({ ticket, onClose }) {
  const meta = STATUT_TICKET_META[ticket.statut] || { label: ticket.statut, cls: 'bg-gray-100 text-gray-600' }
  return (
    <Modal onClose={onClose} width={480}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-extrabold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Ticket #{ticket.id}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
      </div>
      <div className="px-6 py-5 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-400">Titre</span><span className="font-semibold text-gray-900">{ticket.titre}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Demandeur</span><span className="font-semibold text-gray-900">{ticket.demandeur?.prenom} {ticket.demandeur?.nom}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Logement</span><span className="font-semibold text-gray-900">{ticket.logement?.code || '—'}</span></div>
        <div className="flex justify-between items-center"><span className="text-gray-400">Statut</span><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Date de dépôt</span><span className="font-semibold text-gray-900">{formatDate(ticket.dateDepot)}</span></div>
        {ticket.intervention?.technicien && (
          <div className="flex justify-between"><span className="text-gray-400">Technicien</span><span className="font-semibold text-gray-900">{ticket.intervention.technicien.prenom} {ticket.intervention.technicien.nom}</span></div>
        )}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-gray-400 mb-1">Description</p>
          <p className="text-gray-700">{ticket.description}</p>
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
export default function MaintenanceAdmin() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [tickets, setTickets] = useState([])
  const [techniciens, setTechniciens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeTab, setActiveTab] = useState('TOUS')
  const [search, setSearch] = useState('')
  const [prioriteFilter, setPrioriteFilter] = useState('')
  const [logementFilter, setLogementFilter] = useState('')

  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  const [programmerTarget, setProgrammerTarget] = useState(null)
  const [assignerTarget, setAssignerTarget] = useState(null)
  const [verifierTarget, setVerifierTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    const [r1, r2] = await Promise.allSettled([
      api.get('/tickets'),
      api.get('/admin/utilisateurs'),
    ])
    if (r1.status === 'fulfilled') setTickets(r1.value.data)
    else setError(r1.reason?.response?.data?.message || 'Impossible de charger les tickets.')
    if (r2.status === 'fulfilled') setTechniciens(r2.value.data.filter(u => u.role === 'TECHNICIEN' && u.actif))
    setLoading(false)
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logementsUniques = useMemo(() => {
    const map = new Map()
    tickets.forEach(t => { if (t.logement) map.set(t.logement.id, t.logement) })
    return [...map.values()]
  }, [tickets])

  const kpis = useMemo(() => {
    const now = new Date()
    return {
      total: tickets.length,
      aTraiter: tickets.filter(t => t.statut === 'SOUMIS').length,
      enCours: tickets.filter(t => TABS.find(tab => tab.key === 'EN_COURS').statuts.includes(t.statut)).length,
      clotureesCeMois: tickets.filter(t => t.statut === 'CLOTURE' && t.dateCloture && new Date(t.dateCloture).getMonth() === now.getMonth() && new Date(t.dateCloture).getFullYear() === now.getFullYear()).length,
    }
  }, [tickets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const tab = TABS.find(t => t.key === activeTab)
    return tickets.filter(t => {
      if (tab?.statuts && !tab.statuts.includes(t.statut)) return false
      if (prioriteFilter && t.priorite !== prioriteFilter) return false
      if (logementFilter && String(t.logement?.id) !== logementFilter) return false
      if (q) {
        const full = `${t.titre} ${t.demandeur?.prenom || ''} ${t.demandeur?.nom || ''}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [tickets, activeTab, search, prioriteFilter, logementFilter])

  const refresh = useCallback(() => {
    setProgrammerTarget(null); setAssignerTarget(null); setVerifierTarget(null)
    fetchAll()
  }, [fetchAll])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
              className="ad-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Maintenance & Interventions</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Suivi des tickets de maintenance</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchAll} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (
                  <>
                    <KpiCard icon={Wrench} label="Total" value={kpis.total} color={O} />
                    <KpiCard icon={Wrench} label="À traiter" value={kpis.aTraiter} color="#F59E0B" />
                    <KpiCard icon={Wrench} label="En cours" value={kpis.enCours} color="#3B82F6" />
                    <KpiCard icon={Wrench} label="Clôturées ce mois" value={kpis.clotureesCeMois} color={G} />
                  </>
                )}
              </div>

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
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className={`${inp} pl-9`} />
                </div>
                <select value={prioriteFilter} onChange={e => setPrioriteFilter(e.target.value)} className={`${sel} md:w-40`}>
                  <option value="">Toutes priorités</option>
                  <option value="URGENTE">Urgente</option>
                  <option value="HAUTE">Haute</option>
                  <option value="NORMALE">Normale</option>
                  <option value="BASSE">Basse</option>
                </select>
                <select value={logementFilter} onChange={e => setLogementFilter(e.target.value)} className={`${sel} md:w-44`}>
                  <option value="">Tous les logements</option>
                  {logementsUniques.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Ticket', 'Logement', 'Demandeur', 'Priorité', 'Statut', 'Date', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={7} className="p-10 text-center text-gray-400 text-sm">Chargement des tickets…</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={7}><EmptyState title="Aucun ticket trouvé" subtitle="Aucun ticket ne correspond à ces filtres." /></td></tr>
                      ) : (
                        filtered.map(t => {
                          const meta = STATUT_TICKET_META[t.statut] || { label: t.statut, cls: 'bg-gray-100 text-gray-600' }
                          return (
                            <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold text-gray-900">#{t.id}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{truncate(t.titre, 40)}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{t.logement?.code || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100">
                                    <span className="text-[0.6rem] font-bold text-slate-600">{getInitials(t.demandeur?.nom, t.demandeur?.prenom)}</span>
                                  </div>
                                  <span className="text-sm text-gray-700 whitespace-nowrap">{t.demandeur?.prenom} {t.demandeur?.nom}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: PRIORITE_META[t.priorite]?.bg, color: PRIORITE_META[t.priorite]?.color }}>
                                  {t.priorite}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(t.dateDepot)}</td>
                              <td className="px-4 py-3">
                                {t.statut === 'SOUMIS' ? (
                                  <button onClick={() => setProgrammerTarget(t)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap" style={{ background: O }}>
                                    <CalendarClock size={12} /> Programmer constat
                                  </button>
                                ) : t.statut === 'PRISE_EN_CHARGE_SONAPIE' ? (
                                  <button onClick={() => setAssignerTarget(t)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap" style={{ background: O }}>
                                    <UserCheck size={12} /> Assigner technicien
                                  </button>
                                ) : t.statut === 'VERIFICATION_SONAPIE' ? (
                                  <button onClick={() => setVerifierTarget(t)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap" style={{ background: G }}>
                                    <CheckSquare size={12} /> Vérifier
                                  </button>
                                ) : (
                                  <button onClick={() => setDetailTarget(t)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold whitespace-nowrap">
                                    <Eye size={12} /> Voir détail
                                  </button>
                                )}
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
        {programmerTarget && (
          <ProgrammerConstatModal ticket={programmerTarget} technicienUtiles={techniciens} onClose={() => setProgrammerTarget(null)} fire={fire} onDone={refresh} />
        )}
        {assignerTarget && (
          <AssignerTechnicienModal ticket={assignerTarget} techniciens={techniciens} onClose={() => setAssignerTarget(null)} fire={fire} onDone={refresh} />
        )}
        {verifierTarget && (
          <VerifierModal ticket={verifierTarget} onClose={() => setVerifierTarget(null)} fire={fire} onDone={refresh} />
        )}
        {detailTarget && <DetailModal ticket={detailTarget} onClose={() => setDetailTarget(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
