import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollText, Menu, AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import api from '../../services/api.js'
import DirectionSidebar from '../../components/direction/DirectionSidebar.jsx'

const O = '#E8520A'
const G = '#2E7D32'

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const sel = `${inp} cursor-pointer`

function formatDateTime(d) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function timeAgo(dateStr) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 2592000) return `il y a ${Math.floor(s / 86400)} j`
  return formatDateTime(dateStr)
}

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
function EmptyState({ icon: Icon = ScrollText, title, subtitle }) {
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

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function JournalDirection() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [demandes, setDemandes] = useState([])
  const [mutations, setMutations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    const [r1, r2] = await Promise.allSettled([
      api.get('/direction/demandes'),
      api.get('/direction/mutations'),
    ])
    if (r1.status === 'fulfilled') setDemandes(r1.value.data)
    if (r2.status === 'fulfilled') setMutations(r2.value.data)
    if (r1.status === 'rejected' && r2.status === 'rejected') {
      setError("Impossible de charger l'historique.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['DIRECTION', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const events = useMemo(() => {
    const list = []
    for (const d of demandes) {
      if (!d.dateValidationDirection) continue
      const validee = ['VALIDEE_DIRECTION', 'EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(d.statut)
      list.push({
        id: `demande-${d.id}`, entity: 'demande', ref: `DM-${d.id}`, date: d.dateValidationDirection,
        type: validee ? 'VALIDATION' : 'REJET',
        nom: `${d.demandeur?.prenom || ''} ${d.demandeur?.nom || ''}`.trim(),
        commentaire: d.commentaireDirection,
      })
    }
    for (const m of mutations) {
      if (!m.dateValidationDirection) continue
      const validee = ['VALIDEE_DIRECTION', 'EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(m.statut)
      list.push({
        id: `mutation-${m.id}`, entity: 'mutation', ref: `MU-${m.id}`, date: m.dateValidationDirection,
        type: validee ? 'VALIDATION' : 'REJET',
        nom: `${m.demandeur?.prenom || ''} ${m.demandeur?.nom || ''}`.trim(),
        commentaire: m.commentaireDirection,
      })
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [demandes, mutations])

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (typeFilter && e.entity !== typeFilter) return false
      if (dateDebut && new Date(e.date) < new Date(dateDebut)) return false
      if (dateFin && new Date(e.date) > new Date(`${dateFin}T23:59:59`)) return false
      return true
    })
  }, [events, typeFilter, dateDebut, dateFin])

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
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Journal d'activité</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Historique des décisions de la Direction</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-3xl">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchAll} />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={`${inp} sm:w-44`} aria-label="Date début" />
                <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={`${inp} sm:w-44`} aria-label="Date fin" />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} sm:w-48`}>
                  <option value="">Tous les types</option>
                  <option value="demande">Demandes</option>
                  <option value="mutation">Mutations</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
                {loading ? (
                  <div className="flex flex-col gap-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                ) : filtered.length === 0 ? (
                  <EmptyState title="Aucune activité trouvée" subtitle="Les décisions de la Direction apparaîtront ici." />
                ) : (
                  <div className="flex flex-col">
                    {filtered.map((ev, i) => (
                      <div key={ev.id} className={`flex items-start gap-3 py-3.5 ${i < filtered.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        <span
                          className="flex-shrink-0 mt-0.5 text-[0.65rem] font-bold px-2 py-1 rounded-full"
                          style={ev.type === 'VALIDATION' ? { background: '#F0FDF4', color: G } : { background: '#FEF2F2', color: '#DC2626' }}
                        >
                          {ev.type === 'VALIDATION' ? <CheckCircle size={11} className="inline -mt-0.5 mr-1" /> : <XCircle size={11} className="inline -mt-0.5 mr-1" />}
                          {ev.type}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700">
                            {ev.entity === 'demande' ? 'Demande' : 'Mutation'} <span className="font-semibold text-gray-900">{ev.ref}</span> de <span className="font-semibold text-gray-900">{ev.nom}</span> {ev.type === 'VALIDATION' ? 'validée' : 'rejetée'}
                          </p>
                          {ev.commentaire && <p className="text-xs text-gray-500 mt-0.5">{ev.commentaire}</p>}
                          <p className="text-xs text-gray-400 mt-0.5" title={formatDateTime(ev.date)}>{timeAgo(ev.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
