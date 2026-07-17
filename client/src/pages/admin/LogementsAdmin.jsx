import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Search, ChevronLeft, ChevronRight, ImageOff, Ruler, Layers,
  Wifi, Car, Wind, Shield, Sofa, FileText, Menu, AlertTriangle, RefreshCw,
} from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const TYPE_LOGEMENT_LABEL = { F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', VILLA: 'Villa' }

const STATUT_LOGEMENT_META = {
  DISPONIBLE:  { label: 'Disponible',  cls: 'bg-[#2E7D32] text-white' },
  OCCUPE:      { label: 'Occupé',      cls: 'bg-[#E8520A] text-white' },
  MAINTENANCE: { label: 'Maintenance', cls: 'bg-amber-500 text-white' },
}

const COMMODITES_CARD_ICONS = [
  { key: 'internet',      icon: Wifi,  label: 'Internet / Wifi' },
  { key: 'parking',       icon: Car,   label: 'Parking' },
  { key: 'climatisation', icon: Wind,  label: 'Climatisation' },
  { key: 'gardien',       icon: Shield, label: 'Gardien' },
  { key: 'meuble',        icon: Sofa,  label: 'Meublé' },
]

const formatMontant = (m) => m != null ? `${Number(m).toLocaleString('fr-FR')} FCFA/mois` : null

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
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
function EmptyState({ icon: Icon = Building2, title, subtitle }) {
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

// ─── Logement Card (lecture seule) ──────────────────────────────────────────────
function LogementCard({ logement, onVoirDemandes }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const photos = logement.photos || []
  const statutMeta = STATUT_LOGEMENT_META[logement.statut] || STATUT_LOGEMENT_META.DISPONIBLE
  const commodites = COMMODITES_CARD_ICONS.filter(c => logement[c.key])

  const prevPhoto = (e) => { e.stopPropagation(); setPhotoIdx(i => (i - 1 + photos.length) % photos.length) }
  const nextPhoto = (e) => { e.stopPropagation(); setPhotoIdx(i => (i + 1) % photos.length) }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-slate-100">
        {photos.length > 0 ? (
          <>
            <img src={photos[photoIdx]?.urlPhoto} alt={logement.code} className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <>
                <button onClick={prevPhoto} aria-label="Photo précédente" className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700 hover:bg-white">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={nextPhoto} aria-label="Photo suivante" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700 hover:bg-white">
                  <ChevronRight size={15} />
                </button>
              </>
            )}
            <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[0.65rem] font-semibold">
              {photoIdx + 1}/{photos.length} photo{photos.length > 1 ? 's' : ''}
            </span>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-300">
            <ImageOff size={26} />
            <span className="text-xs font-semibold text-slate-400">Aucune photo</span>
          </div>
        )}
        <span className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-[0.65rem] font-bold ${statutMeta.cls}`}>
          {statutMeta.label}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-extrabold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>{logement.code}</h3>
          <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
            {TYPE_LOGEMENT_LABEL[logement.type]}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-0.5 truncate">{logement.adresse}</p>
        <p className="text-xs text-gray-400 mb-3 truncate">{logement.ville}{logement.quartier ? ` · ${logement.quartier}` : ''}</p>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {logement.superficie != null && <span className="flex items-center gap-1"><Ruler size={12} /> {logement.superficie} m²</span>}
          {logement.nombrePieces != null && <span className="flex items-center gap-1"><Layers size={12} /> {logement.nombrePieces} pièce{logement.nombrePieces > 1 ? 's' : ''}</span>}
        </div>

        {logement.montantLoyer != null && (
          <p className="text-sm font-bold mb-3" style={{ color: O }}>{formatMontant(logement.montantLoyer)}</p>
        )}

        {commodites.length > 0 && (
          <div className="flex items-center gap-2 mb-3.5 flex-wrap">
            {commodites.map(({ key, icon: CIcon, label }) => (
              <span key={key} title={label} className="w-6 h-6 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                <CIcon size={12} />
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <button onClick={() => onVoirDemandes(logement)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <FileText size={13} /> Voir les demandes
          </button>
        </div>
        {logement.statut === 'DISPONIBLE' && (
          <p className="text-[0.68rem] text-gray-400 text-center mt-2">Attribution gérée par le Service Logement</p>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function LogementsAdmin() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [logements, setLogements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchLogements = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/logements')
      setLogements(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger le parc immobilier.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchLogements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const kpis = useMemo(() => ({
    total: logements.length,
    disponibles: logements.filter(l => l.statut === 'DISPONIBLE').length,
    occupes: logements.filter(l => l.statut === 'OCCUPE').length,
    enMaintenance: logements.filter(l => l.statut === 'MAINTENANCE').length,
  }), [logements])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logements.filter(l => {
      if (statutFilter && l.statut !== statutFilter) return false
      if (typeFilter && l.type !== typeFilter) return false
      if (q && !['code', 'adresse', 'ville', 'quartier'].some(f => l[f]?.toLowerCase().includes(q))) return false
      return true
    })
  }, [logements, search, statutFilter, typeFilter])

  const voirDemandes = (logement) => navigate('/admin/demandes', { state: { logementId: logement.id, logementCode: logement.code } })

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
                className="ad-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0">
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Logements</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Vue d'ensemble du parc immobilier</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              Lecture seule — gestion via Service Logement
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchLogements} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard icon={Building2} label="Total" value={kpis.total} color={O} />
              <KpiCard icon={Building2} label="Disponibles" value={kpis.disponibles} color={G} />
              <KpiCard icon={Building2} label="Occupés" value={kpis.occupes} color={O} />
              <KpiCard icon={Building2} label="En maintenance" value={kpis.enMaintenance} color="#F59E0B" />
            </div>
          )}

          {!error && (
            <>
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par code, ville…" className={`${inp} pl-9`} />
                </div>
                <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className={`${sel} md:w-44`}>
                  <option value="">Tous les statuts</option>
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="OCCUPE">Occupé</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} md:w-36`}>
                  <option value="">Tous les types</option>
                  {Object.entries(TYPE_LOGEMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <EmptyState title="Aucun logement trouvé" subtitle="Essayez de modifier votre recherche ou vos filtres." />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(l => (
                    <LogementCard key={l.id} logement={l} onVoirDemandes={voirDemandes} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
