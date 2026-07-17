import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3, Building2, FileText, Wrench, Download, Menu, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

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
    <div className="text-center py-10 px-4 rounded-xl bg-slate-50">
      <Icon size={30} className="mx-auto mb-2 text-slate-300" />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
      className="fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl border shadow-lg text-sm font-semibold min-w-[260px] bg-slate-800 border-slate-700 text-white">
      {toast.message}
    </motion.div>
  )
}

const cardClass = 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100'

export default function RapportsAdmin() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [mensuel, setMensuel] = useState([])
  const [mensuelError, setMensuelError] = useState(null)
  const [mensuelLoading, setMensuelLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setStatsLoading(true); setMensuelLoading(true)
    setStatsError(null); setMensuelError(null)
    const [r1, r2] = await Promise.allSettled([
      api.get('/admin/stats'),
      api.get('/admin/stats/demandes-mensuelles'),
    ])
    if (r1.status === 'fulfilled') setStats(r1.value.data)
    else setStatsError('Impossible de charger les statistiques.')
    setStatsLoading(false)

    if (r2.status === 'fulfilled') setMensuel(r2.value.data)
    else setMensuelError("Impossible de charger l'activité mensuelle.")
    setMensuelLoading(false)
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tauxOccupation = stats?.logements?.total
    ? Math.round((stats.logements.occupes / stats.logements.total) * 100)
    : 0

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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Rapports</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Statistiques et analyses</p>
              </div>
            </div>
            <button
              onClick={() => setToast({ message: 'Fonctionnalité à venir.' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
            >
              <Download size={15} /> Exporter PDF
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {statsError && <ErrorBanner message={statsError} onRetry={fetchAll} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Récap logements */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={18} style={{ color: O }} />
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Logements</h3>
              </div>
              {statsLoading ? <Skeleton className="h-32" /> : !stats ? null : (
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-2xl font-extrabold text-gray-900">{stats.logements.total}</span>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Disponibles</span><span className="font-semibold" style={{ color: G }}>{stats.logements.disponibles}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Occupés</span><span className="font-semibold" style={{ color: O }}>{stats.logements.occupes}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Maintenance</span><span className="font-semibold text-amber-500">{stats.logements.enMaintenance}</span></div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-500">Taux d'occupation</span>
                    <span className="font-bold" style={{ color: tauxOccupation > 70 ? G : O }}>{tauxOccupation}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Récap demandes */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} style={{ color: '#F59E0B' }} />
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demandes de logement</h3>
              </div>
              {statsLoading ? <Skeleton className="h-32" /> : !stats ? null : (
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-2xl font-extrabold text-gray-900">{stats.demandes.total}</span>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">En attente</span><span className="font-semibold text-amber-500">{stats.demandes.enAttente}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Nouvelles aujourd'hui</span><span className="font-semibold text-gray-900">{stats.demandes.nouvellesAujourdhui}</span></div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-500">Évolution ce mois</span>
                    <span className="font-bold" style={{ color: stats.demandes.cesMois >= 0 ? G : '#EF4444' }}>
                      {stats.demandes.cesMois >= 0 ? '+' : ''}{stats.demandes.cesMois}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Récap tickets */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <Wrench size={18} style={{ color: G }} />
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Maintenance</h3>
              </div>
              {statsLoading ? <Skeleton className="h-32" /> : !stats ? null : (
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">Total tickets</span>
                    <span className="text-2xl font-extrabold text-gray-900">{stats.tickets.total}</span>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">En cours</span><span className="font-semibold text-blue-600">{stats.tickets.enCours}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Clôturées ce mois</span><span className="font-semibold" style={{ color: G }}>{stats.tickets.clotureesCeMois}</span></div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-500">Mutations en attente</span>
                    <span className="font-bold text-amber-500">{stats.mutations?.enAttente ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Graphique */}
          <div className={cardClass}>
            <div className="mb-5">
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Activité mensuelle</h3>
              <p className="text-xs text-gray-400">6 derniers mois</p>
            </div>
            {mensuelError ? (
              <ErrorBanner message={mensuelError} onRetry={fetchAll} />
            ) : mensuelLoading ? (
              <Skeleton className="h-64" />
            ) : mensuel.every(m => m.demandes === 0 && m.tickets === 0) ? (
              <EmptyState title="Aucune activité enregistrée" subtitle="Les demandes et tickets apparaîtront ici dès leur création." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mensuel} barGap={6}>
                  <CartesianGrid vertical={false} stroke="#F4F6F9" />
                  <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F4F6F9' }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }} />
                  <Bar dataKey="demandes" name="Demandes logement" fill={O} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="tickets" name="Tickets maintenance" fill={G} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
