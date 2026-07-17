import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText, Search, Menu, X, AlertTriangle, RefreshCw,
  Eye, MessageCircle,
} from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'

const TABS = [
  { key: 'TOUTES',    label: 'Toutes' },
  { key: 'EN_ETUDE',  label: 'En étude' },
  { key: 'APPROUVEE', label: 'Approuvées' },
  { key: 'REJETEE',   label: 'Rejetées' },
  { key: 'ANNULEE',   label: 'Annulées' },
]

const STATUT_DEMANDE_META = {
  SOUMISE:                 { label: 'Soumise',             cls: 'bg-blue-50 text-blue-600 border border-blue-200' },
  EN_VALIDATION_DIRECTION: { label: 'En validation',       cls: 'bg-amber-50 text-amber-600 border border-amber-200' },
  VALIDEE_DIRECTION:       { label: 'Validée',              cls: 'bg-violet-50 text-violet-600 border border-violet-200' },
  EN_ETUDE_LOGEMENT:       { label: "À l'étude",            cls: 'bg-orange-50 text-[#E8520A] border border-orange-200', pulse: true },
  APPROUVEE:               { label: 'Approuvée',            cls: 'bg-green-50 text-[#2E7D32] border border-green-200' },
  REJETEE:                 { label: 'Rejetée',              cls: 'bg-red-50 text-red-600 border border-red-200' },
  REJETEE_DIRECTION:       { label: 'Rejetée (direction)',  cls: 'bg-red-100 text-red-800 border border-red-300' },
  ANNULEE:                 { label: 'Annulée',              cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

const PRIORITE_META = {
  URGENTE: { color: '#EF4444', bg: '#FEF2F2' },
  HAUTE:   { color: '#F59E0B', bg: '#FFFBEB' },
  NORMALE: { color: '#3B82F6', bg: '#EFF6FF' },
  BASSE:   { color: '#94A3B8', bg: '#F8FAFC' },
}

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'

// ─── Shared UI ────────────────────────────────────────────────────────────────
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
        style={{ maxWidth: width }}
        className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-h-[85vh] overflow-y-auto"
      >
        {children}
      </motion.div>
    </div>
  )
}
// ─── Modal : voir détail (lecture seule) ────────────────────────────────────────
function DetailModal({ demande, conversationId, onClose }) {
  const navigate = useNavigate()
  const meta = STATUT_DEMANDE_META[demande.statut] || { label: demande.statut, cls: 'bg-gray-100 text-gray-600' }
  return (
    <Modal onClose={onClose} width={480}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-extrabold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demande #{demande.id}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
      </div>
      <div className="px-6 py-5 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-400">Demandeur</span><span className="font-semibold text-gray-900">{demande.demandeur?.prenom} {demande.demandeur?.nom}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="font-semibold text-gray-900">{demande.demandeur?.email}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Logement demandé</span><span className="font-semibold text-gray-900">{demande.logement?.code || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Priorité</span><span className="font-semibold text-gray-900">{demande.priorite}</span></div>
        <div className="flex justify-between items-center"><span className="text-gray-400">Statut</span><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span></div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-gray-400 mb-1">Motif</p>
          <p className="text-gray-700">{demande.motif}</p>
        </div>

        {demande.commentaireDirection && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-gray-400 mb-1">Commentaire de la Direction</p>
            <p className="text-gray-700">{demande.commentaireDirection}</p>
          </div>
        )}

        {demande.commentaire && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-gray-400 mb-1">Commentaire</p>
            <p className="text-gray-700">{demande.commentaire}</p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 space-y-1.5">
          <p className="text-gray-400 mb-1">Historique</p>
          <div className="flex justify-between"><span className="text-gray-400">Date de dépôt</span><span className="font-medium text-gray-700">{formatDate(demande.dateDepot)}</span></div>
          {demande.dateValidationDirection && (
            <div className="flex justify-between"><span className="text-gray-400">Validation Direction</span><span className="font-medium text-gray-700">{formatDate(demande.dateValidationDirection)}</span></div>
          )}
          {demande.dateTraitement && (
            <div className="flex justify-between"><span className="text-gray-400">Date de traitement</span><span className="font-medium text-gray-700">{formatDate(demande.dateTraitement)}</span></div>
          )}
        </div>

        {conversationId && (
          <button
            onClick={() => navigate(`/admin/conversations/${conversationId}`)}
            className="flex items-center gap-1.5 pt-1 text-sm font-semibold"
            style={{ color: O }}
          >
            <MessageCircle size={15} /> Voir la conversation
          </button>
        )}
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
export default function DemandesAdmin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeTab, setActiveTab] = useState('TOUTES')
  const [search, setSearch] = useState('')
  const [prioriteFilter, setPrioriteFilter] = useState('')
  const [logementFilter, setLogementFilter] = useState(location.state?.logementId || null)
  const logementFilterCode = location.state?.logementCode

  const [detailTarget, setDetailTarget] = useState(null)
  const [conversationsByDemande, setConversationsByDemande] = useState({})

  const fetchDemandes = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [{ data }, { data: conversations }] = await Promise.all([
        api.get('/admin/demandes', { params: { limit: 100 } }),
        api.get('/conversations'),
      ])
      setDemandes(data)
      setConversationsByDemande(Object.fromEntries(
        conversations.filter(c => c.demande).map(c => [c.demande.id, c.id]),
      ))
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les demandes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchDemandes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return demandes.filter(d => {
      if (activeTab === 'EN_ETUDE' && d.statut !== 'EN_ETUDE_LOGEMENT') return false
      if (activeTab === 'APPROUVEE' && d.statut !== 'APPROUVEE') return false
      if (activeTab === 'REJETEE' && !['REJETEE', 'REJETEE_DIRECTION'].includes(d.statut)) return false
      if (activeTab === 'ANNULEE' && d.statut !== 'ANNULEE') return false
      if (prioriteFilter && d.priorite !== prioriteFilter) return false
      if (logementFilter && d.logementId !== logementFilter) return false
      if (q) {
        const full = `${d.demandeur?.prenom || ''} ${d.demandeur?.nom || ''} ${d.demandeur?.email || ''}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [demandes, activeTab, search, prioriteFilter, logementFilter])

  const clearLogementFilter = () => { setLogementFilter(null); navigate(location.pathname, { replace: true, state: {} }) }

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
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Demandes de logement</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Consultation des demandes validées par la Direction</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex-shrink-0">
              Lecture seule — attribution et rejet réservés au Super Administrateur
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {logementFilter && (
            <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-5">
              <span className="flex-1 text-sm font-medium text-blue-800">Filtré sur le logement {logementFilterCode || `#${logementFilter}`}</span>
              <button onClick={clearLogementFilter} className="text-xs font-semibold text-blue-600 hover:underline">Retirer le filtre</button>
            </div>
          )}

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
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Demandeur', 'Logement demandé', 'Motif', 'Priorité', 'Statut', 'Date dépôt', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={7} className="p-10 text-center text-gray-400 text-sm">Chargement des demandes…</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={7}><EmptyState title="Aucune demande trouvée" subtitle="Aucune demande ne correspond à ces filtres." /></td></tr>
                      ) : (
                        filtered.map(d => {
                          const meta = STATUT_DEMANDE_META[d.statut] || { label: d.statut, cls: 'bg-gray-100 text-gray-600' }
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
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{d.logement?.code || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 max-w-[220px] truncate">{d.motif}</td>
                              <td className="px-4 py-3">
                                <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: PRIORITE_META[d.priorite]?.bg, color: PRIORITE_META[d.priorite]?.color }}>
                                  {d.priorite}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>
                                  {meta.pulse && <span className="w-1.5 h-1.5 rounded-full bg-[#E8520A] animate-pulse" />}
                                  {meta.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(d.dateDepot)}</td>
                              <td className="px-4 py-3">
                                <button onClick={() => setDetailTarget(d)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold whitespace-nowrap">
                                  <Eye size={12} /> Voir détail
                                </button>
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
        {detailTarget && <DetailModal demande={detailTarget} conversationId={conversationsByDemande[detailTarget.id]} onClose={() => setDetailTarget(null)} />}
      </AnimatePresence>
    </div>
  )
}
