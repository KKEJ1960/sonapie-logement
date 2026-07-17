import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart3, Menu, AlertTriangle, RefreshCw, TrendingUp, Clock3, Users } from 'lucide-react'
import api from '../../services/api.js'
import DirectionSidebar from '../../components/direction/DirectionSidebar.jsx'

const O = '#E8520A'
const G = '#2E7D32'

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
function EmptyState({ icon: Icon = BarChart3, title, subtitle }) {
  return (
    <div className="text-center py-10 px-4">
      <Icon size={28} className="text-slate-300 mx-auto mb-2" />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
const cardClass = 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100'

function StatCard({ icon: Icon, iconBg, iconColor, value, label, sub }) {
  return (
    <div className={cardClass}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function buildMonthlyData(demandes) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mois: MOIS_LABELS[d.getMonth()], validées: 0, rejetées: 0 })
  }
  const indexByKey = Object.fromEntries(months.map((m, i) => [m.key, i]))
  for (const d of demandes) {
    if (!d.dateValidationDirection) continue
    const date = new Date(d.dateValidationDirection)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const idx = indexByKey[key]
    if (idx === undefined) continue
    if (['VALIDEE_DIRECTION', 'EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(d.statut)) months[idx].validées++
    else if (d.statut === 'REJETEE_DIRECTION') months[idx].rejetées++
  }
  return months
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function RapportsDirection() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [stats, setStats] = useState(null)
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    const [r1, r2] = await Promise.allSettled([
      api.get('/direction/stats'),
      api.get('/direction/demandes'),
    ])
    if (r1.status === 'fulfilled') setStats(r1.value.data)
    if (r2.status === 'fulfilled') setDemandes(r2.value.data)
    if (r1.status === 'rejected' || r2.status === 'rejected') {
      setError('Impossible de charger les rapports.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['DIRECTION', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tauxApprobation = useMemo(() => {
    const s = stats?.demandesParStatut
    if (!s) return null
    const validees = (s.VALIDEE_DIRECTION || 0) + (s.EN_ETUDE_LOGEMENT || 0) + (s.APPROUVEE || 0)
    const rejeteesParDirection = s.REJETEE_DIRECTION || 0
    const decidees = validees + rejeteesParDirection
    if (decidees === 0) return null
    return Math.round((validees / decidees) * 100)
  }, [stats])

  const repartitionType = useMemo(() => {
    const counts = { FONCTIONNAIRE: 0, PRIVE: 0, AUTRES: 0 }
    for (const d of demandes) {
      const t = d.demandeur?.typeLocataire
      if (t === 'FONCTIONNAIRE') counts.FONCTIONNAIRE++
      else if (t === 'PRIVE') counts.PRIVE++
      else counts.AUTRES++
    }
    return counts
  }, [demandes])

  const monthlyData = useMemo(() => buildMonthlyData(demandes), [demandes])
  const hasMonthlyData = monthlyData.some(m => m.validées > 0 || m.rejetées > 0)

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
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Rapports</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Statistiques et analyses de l'activité Direction</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchAll} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={BarChart3} iconBg="#FFF4EF" iconColor={O}
                  value={stats?.totalValideesCeMois ?? 0} label="Demandes traitées ce mois" />
                <StatCard icon={TrendingUp} iconBg="#F0FDF4" iconColor={G}
                  value={tauxApprobation != null ? `${tauxApprobation}%` : '—'} label="Taux d'approbation"
                  sub="Parmi les demandes décidées par la Direction" />
                <StatCard icon={Clock3} iconBg="#EFF6FF" iconColor="#3B82F6"
                  value={stats?.delaiMoyenTraitementJours != null ? `${stats.delaiMoyenTraitementJours} j` : '—'} label="Délai moyen de traitement" />
                <StatCard icon={Users} iconBg="#F5F3FF" iconColor="#8B5CF6"
                  value={demandes.length} label="Fonctionnaires vs Privés"
                  sub={`${repartitionType.FONCTIONNAIRE} fonctionnaires · ${repartitionType.PRIVE} privés`} />
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demandes validées vs rejetées</h3>
                    <p className="text-xs text-gray-400">6 derniers mois</p>
                  </div>
                </div>

                {!hasMonthlyData ? (
                  <EmptyState title="Pas encore assez de données" subtitle="Les décisions de la Direction apparaîtront ici au fil du temps." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData} barGap={6}>
                      <CartesianGrid vertical={false} stroke="#F4F6F9" />
                      <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#F4F6F9' }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="validées" fill={G} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="rejetées" fill="#EF4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
