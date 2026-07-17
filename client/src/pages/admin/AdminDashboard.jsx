import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  Building2, FileText, Wrench,
  Bell,
  ArrowUpRight, Users, CheckCircle2, Plus, Menu,
} from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const ROLE_COLOR = {
  SUPER_ADMIN: '#E8520A', ADMIN: '#E8520A', DIRECTION: '#8B5CF6',
  RESPONSABLE: '#2E7D32', TECHNICIEN: '#3B82F6', LOCATAIRE: '#F59E0B',
}
const ROLE_LABEL = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrateur', DIRECTION: 'Direction',
  RESPONSABLE: 'Responsable', TECHNICIEN: 'Technicien', LOCATAIRE: 'Locataire',
}

// Badges de rôle : couleurs pleines de la charte SONAPIE (pas de pastel Tailwind auto)
const ROLE_BADGE_CLS = {
  SUPER_ADMIN: 'bg-[#E8520A]/15 text-[#E8520A] border border-[#E8520A]/40 font-semibold',
  ADMIN:       'bg-blue-500/15 text-blue-600 border border-blue-500/40 font-semibold',
  DIRECTION:   'bg-violet-500/15 text-violet-600 border border-violet-500/40 font-semibold',
  LOCATAIRE:   'bg-[#E8520A]/15 text-[#E8520A] border border-[#E8520A]/40 font-semibold',
  RESPONSABLE: 'bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/40 font-semibold',
  TECHNICIEN:  'bg-cyan-500/15 text-cyan-600 border border-cyan-500/40 font-semibold',
}
const ACTIF_BADGE_CLS = 'bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/40'
const INACTIF_BADGE_CLS = 'bg-gray-200 text-gray-600'

const PRIORITE_META = {
  URGENTE: { color: '#EF4444', bg: '#FEF2F2' },
  HAUTE:   { color: '#F59E0B', bg: '#FFFBEB' },
  NORMALE: { color: '#3B82F6', bg: '#EFF6FF' },
  BASSE:   { color: '#94A3B8', bg: '#F8FAFC' },
}

const STATUT_DEMANDE_META = {
  SOUMISE:                  { label: 'Soumise',            cls: 'bg-slate-100 text-slate-600' },
  EN_VALIDATION_DIRECTION:  { label: 'En validation',      cls: 'bg-blue-50 text-blue-600' },
  VALIDEE_DIRECTION:        { label: 'Validée',            cls: 'bg-green-50 text-green-700' },
  REJETEE_DIRECTION:        { label: 'Rejetée (direction)',cls: 'bg-red-50 text-red-600' },
  EN_ETUDE_LOGEMENT:        { label: "À l'étude",          cls: 'bg-orange-50 text-[#E8520A]' },
  APPROUVEE:                { label: 'Approuvée',          cls: 'bg-green-50 text-[#2E7D32]' },
  REJETEE:                  { label: 'Rejetée',            cls: 'bg-red-50 text-red-600' },
}

const STATUT_TICKET_META = {
  SOUMIS:                            { label: 'Soumis',       cls: 'bg-slate-100 text-slate-600' },
  CONSTAT_PROGRAMME:                 { label: 'Constat prog.',cls: 'bg-blue-50 text-blue-600' },
  CONSTAT_EFFECTUE:                  { label: 'Constat fait', cls: 'bg-blue-50 text-blue-600' },
  PRISE_EN_CHARGE_LOCATAIRE:         { label: 'Prise en charge', cls: 'bg-orange-50 text-[#E8520A]' },
  PRISE_EN_CHARGE_SONAPIE:           { label: 'Prise en charge', cls: 'bg-orange-50 text-[#E8520A]' },
  EN_ATTENTE_CONFIRMATION_LOCATAIRE: { label: 'Attente confirm.', cls: 'bg-orange-50 text-[#E8520A]' },
  ASSIGNE_TECHNICIEN:                { label: 'Assigné',      cls: 'bg-blue-50 text-blue-600' },
  EN_COURS:                          { label: 'En cours',     cls: 'bg-blue-50 text-blue-600' },
  VERIFICATION_SONAPIE:              { label: 'Vérification', cls: 'bg-purple-50 text-purple-600' },
  CLOTURE:                           { label: 'Clôturé',      cls: 'bg-green-50 text-[#2E7D32]' },
  REOUVERT:                          { label: 'Réouvert',     cls: 'bg-red-50 text-red-600' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '')

// ─── Small shared UI ─────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <span className="text-sm font-medium text-red-800 flex-1">{message}</span>
      <button onClick={onRetry} className="px-3 py-1 bg-red-100 border border-red-200 rounded-lg text-xs font-semibold text-red-600">Réessayer</button>
    </div>
  )
}

function EmptyState({ icon: Icon = CheckCircle2, title, subtitle, tone = 'neutral' }) {
  const iconColor = tone === 'success' ? '#22c55e' : '#CBD5E1'
  const bg = tone === 'success' ? 'bg-green-50' : 'bg-slate-50'
  return (
    <div className={`text-center py-10 px-4 rounded-xl ${bg}`}>
      <Icon size={30} style={{ color: iconColor }} className="mx-auto mb-2" />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

const cardClass = 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-shadow hover:shadow-md'

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate()
  const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || '{}'), [])
  const initials = getInitials(currentUser.nom, currentUser.prenom)

  const [chartTab, setChartTab] = useState('Mois')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  const [mensuel, setMensuel] = useState([])
  const [mensuelLoading, setMensuelLoading] = useState(true)
  const [mensuelError, setMensuelError] = useState(null)

  const [actionsDemandes, setActionsDemandes] = useState([])
  const [actionsLoading, setActionsLoading] = useState(true)
  const [actionsError, setActionsError] = useState(null)

  const [recentDemandes, setRecentDemandes] = useState([])
  const [recentDemandesLoading, setRecentDemandesLoading] = useState(true)
  const [recentDemandesError, setRecentDemandesError] = useState(null)

  const [recentTickets, setRecentTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState(null)

  const [teamUsers, setTeamUsers] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState(null)

  const [notifNonLues, setNotifNonLues] = useState(0)

  const fetchAll = useCallback(async () => {
    setStatsLoading(true); setMensuelLoading(true); setActionsLoading(true)
    setRecentDemandesLoading(true); setTicketsLoading(true); setTeamLoading(true)
    setStatsError(null); setMensuelError(null); setActionsError(null)
    setRecentDemandesError(null); setTicketsError(null); setTeamError(null)

    const [r1, r2, r3, r4, r5, r6, r7] = await Promise.allSettled([
      api.get('/admin/stats'),
      api.get('/admin/stats/demandes-mensuelles'),
      api.get('/admin/demandes', { params: { limit: 3, statut: 'EN_ETUDE_LOGEMENT' } }),
      api.get('/admin/demandes', { params: { limit: 5 } }),
      api.get('/tickets'),
      api.get('/admin/utilisateurs'),
      api.get('/admin/notifications'),
    ])

    if (r1.status === 'fulfilled') setStats(r1.value.data)
    else setStatsError('Impossible de charger les statistiques.')
    setStatsLoading(false)

    if (r2.status === 'fulfilled') setMensuel(r2.value.data)
    else setMensuelError("Impossible de charger l'activité mensuelle.")
    setMensuelLoading(false)

    if (r3.status === 'fulfilled') setActionsDemandes(r3.value.data)
    else setActionsError('Impossible de charger les actions requises.')
    setActionsLoading(false)

    if (r4.status === 'fulfilled') setRecentDemandes(r4.value.data)
    else setRecentDemandesError('Impossible de charger les demandes récentes.')
    setRecentDemandesLoading(false)

    if (r5.status === 'fulfilled') setRecentTickets(r5.value.data.slice(0, 5))
    else setTicketsError('Impossible de charger les tickets récents.')
    setTicketsLoading(false)

    if (r6.status === 'fulfilled') {
      // Défense en profondeur : même si le backend filtre déjà, un ADMIN standard
      // ne doit jamais voir un compte SUPER_ADMIN dans "Équipe SONAPIE".
      const visibles = currentUser?.role === 'ADMIN'
        ? r6.value.data.filter(u => u.role !== 'SUPER_ADMIN')
        : r6.value.data
      setTeamUsers(visibles.slice(0, 4))
    } else {
      setTeamError("Impossible de charger l'équipe.")
    }
    setTeamLoading(false)

    if (r7.status === 'fulfilled') setNotifNonLues(r7.value.data.nonLues)
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

  const occupationData = useMemo(() => {
    if (!stats?.logements) return []
    const { occupes, disponibles, enMaintenance } = stats.logements
    return [
      { name: 'Occupés',     value: occupes,      color: O },
      { name: 'Disponibles', value: disponibles,  color: G },
      { name: 'Maintenance', value: enMaintenance, color: '#F59E0B' },
    ].filter(d => d.value > 0)
  }, [stats])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>

      <AdminSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* ══ Content ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={mobileNavOpen}
                className="ad-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Planifiez, supervisez et gérez le patrimoine SONAPIE</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/notifications')}
                aria-label="Notifications" className="relative p-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
              >
                <Bell size={18} />
                {notifNonLues > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[0.6rem] font-bold text-[#E8520A]">
                    {notifNonLues}
                  </span>
                )}
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                  <span className="text-xs font-extrabold text-white">{initials || 'AD'}</span>
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{currentUser.prenom} {currentUser.nom}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[140px]">{currentUser.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">

          {/* ── Section 1 : KPI cards ──────────────────────────────────────── */}
          {statsError ? (
            <ErrorBanner message={statsError} onRetry={fetchAll} />
          ) : statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl p-6 text-white shadow-sm"
                style={{ background: O }}
              >
                <div className="flex items-start justify-between mb-8">
                  <Building2 size={22} className="text-white" />
                  <ArrowUpRight size={18} className="text-white/80" />
                </div>
                <p className="text-3xl font-bold mb-1">{stats.logements.total}</p>
                <p className="text-sm text-white/90 mb-2">Total Logements</p>
                <p className="text-xs text-white/80 font-semibold">↑ {stats.logements.disponibles} disponibles</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.01 }} className={cardClass}
              >
                <div className="flex items-start justify-between mb-8">
                  <Users size={22} style={{ color: O }} />
                  <ArrowUpRight size={18} className="text-gray-300" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.logements.occupes}</p>
                <p className="text-sm text-gray-500 mb-2">Logements Occupés</p>
                <p className="text-xs font-semibold" style={{ color: tauxOccupation > 70 ? G : O }}>Taux : {tauxOccupation}%</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.01 }} className={cardClass}
              >
                <div className="flex items-start justify-between mb-8">
                  <FileText size={22} style={{ color: '#F59E0B' }} />
                  {stats.demandes.enAttente > 0 && <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />}
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.demandes.enAttente}</p>
                <p className="text-sm text-gray-500 mb-2">Demandes en Attente</p>
                <p className="text-xs font-semibold text-gray-400">{stats.demandes.nouvellesAujourdhui} nouvelles aujourd'hui</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.01 }} className={cardClass}
              >
                <div className="flex items-start justify-between mb-8">
                  <Wrench size={22} style={{ color: G }} />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.tickets.enCours}</p>
                <p className="text-sm text-gray-500 mb-2">Interventions en Cours</p>
                <p className="text-xs font-semibold text-gray-400">{stats.tickets.clotureesCeMois} clôturées ce mois</p>
              </motion.div>
            </div>
          )}

          {/* ── Section 2 ────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"
          >
            {/* Graphique */}
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Activité des demandes</h3>
                  <p className="text-xs text-gray-400">6 derniers mois</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  {['Semaine', 'Mois', 'Année'].map(t => {
                    const active = chartTab === t
                    const disabled = t !== 'Mois'
                    return (
                      <button
                        key={t}
                        disabled={disabled}
                        title={disabled ? 'Données disponibles bientôt' : undefined}
                        onClick={() => setChartTab(t)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                          active ? 'text-white' : disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                        }`}
                        style={{ background: active ? O : 'transparent' }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {mensuelError ? (
                <ErrorBanner message={mensuelError} onRetry={fetchAll} />
              ) : mensuelLoading ? (
                <Skeleton className="h-64" />
              ) : mensuel.every(m => m.demandes === 0 && m.tickets === 0) ? (
                <EmptyState title="Aucune activité enregistrée" subtitle="Les demandes et tickets apparaîtront ici dès leur création." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
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

            {/* Actions requises */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Actions requises</h3>
                <button onClick={() => navigate('/admin/demandes')} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <Plus size={12} /> Nouvelle
                </button>
              </div>

              {actionsError ? (
                <ErrorBanner message={actionsError} onRetry={fetchAll} />
              ) : actionsLoading ? (
                <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : actionsDemandes.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Aucune action requise ✓" tone="success" />
              ) : (
                <div className="flex flex-col gap-3">
                  {actionsDemandes.map(d => {
                    const pm = PRIORITE_META[d.priorite] || PRIORITE_META.NORMALE
                    return (
                      <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                        <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: pm.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            Demande #{d.id} — {d.demandeur?.prenom} {d.demandeur?.nom}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(d.dateDepot)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${STATUT_DEMANDE_META[d.statut]?.cls || 'bg-gray-100 text-gray-600'}`}>
                              {STATUT_DEMANDE_META[d.statut]?.label || d.statut}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => navigate('/admin/demandes')} className="text-xs font-bold flex-shrink-0" style={{ color: O }}>
                          Traiter →
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Section 3 ────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"
          >
            {/* Équipe */}
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Équipe SONAPIE</h3>
                <button onClick={() => navigate('/admin/utilisateurs')} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <Plus size={12} /> Ajouter
                </button>
              </div>

              {teamError ? (
                <ErrorBanner message={teamError} onRetry={fetchAll} />
              ) : teamLoading ? (
                <div className="flex flex-col gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : teamUsers.length === 0 ? (
                <EmptyState icon={Users} title="Aucun membre d'équipe" />
              ) : (
                <div className="flex flex-col gap-1">
                  {teamUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ROLE_COLOR[u.role] || '#94A3B8' }}>
                        <span className="text-xs font-extrabold text-white">{getInitials(u.nom, u.prenom)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.prenom} {u.nom}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <span className={`hidden sm:inline-flex text-xs px-2.5 py-1 rounded-lg flex-shrink-0 ${ROLE_BADGE_CLS[u.role] || 'bg-slate-100 text-slate-600 border border-slate-200 font-semibold'}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 border ${u.actif ? ACTIF_BADGE_CLS : INACTIF_BADGE_CLS}`}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Occupation du parc */}
            <div className={cardClass}>
              <h3 className="text-base font-bold text-gray-900 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Occupation du parc</h3>

              {statsLoading ? (
                <Skeleton className="h-56" />
              ) : !stats?.logements?.total ? (
                <EmptyState icon={Building2} title="Aucun logement enregistré" subtitle="Le taux d'occupation apparaîtra ici." />
              ) : (
                <>
                  <div className="relative" style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={occupationData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={90} paddingAngle={2} startAngle={90} endAngle={-270}>
                          {occupationData.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-4xl font-bold text-gray-900">{tauxOccupation}%</p>
                      <p className="text-xs text-gray-400">occupé</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-3">
                    {[
                      { label: 'Occupés', value: stats.logements.occupes, color: O },
                      { label: 'Disponibles', value: stats.logements.disponibles, color: G },
                      { label: 'Maintenance', value: stats.logements.enMaintenance, color: '#F59E0B' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.color }} />
                        <span className="text-gray-600 flex-1">{row.label}</span>
                        <span className="font-bold text-gray-900">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* ── Section 4 ────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6"
          >
            {/* Demandes récentes */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demandes récentes</h3>
                <button onClick={() => navigate('/admin/demandes')} className="text-xs font-bold flex items-center gap-1" style={{ color: O }}>
                  Voir tout →
                </button>
              </div>

              {recentDemandesError ? (
                <ErrorBanner message={recentDemandesError} onRetry={fetchAll} />
              ) : recentDemandesLoading ? (
                <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : recentDemandes.length === 0 ? (
                <EmptyState icon={FileText} title="Aucune demande enregistrée" />
              ) : (
                <div className="flex flex-col">
                  {recentDemandes.map(d => (
                    <div key={d.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100">
                        <span className="text-[0.65rem] font-bold text-slate-600">{getInitials(d.demandeur?.nom, d.demandeur?.prenom)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{d.demandeur?.prenom} {d.demandeur?.nom}</p>
                        <p className="text-xs text-gray-400 truncate">{truncate(d.motif, 40)}</p>
                      </div>
                      <span className="hidden sm:inline-flex text-[0.68rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: PRIORITE_META[d.priorite]?.bg, color: PRIORITE_META[d.priorite]?.color }}>
                        {d.priorite}
                      </span>
                      <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUT_DEMANDE_META[d.statut]?.cls || 'bg-gray-100 text-gray-600'}`}>
                        {STATUT_DEMANDE_META[d.statut]?.label || d.statut}
                      </span>
                      <span className="hidden md:inline text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{formatDate(d.dateDepot)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tickets récents */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Tickets récents</h3>
                <button onClick={() => navigate('/admin/maintenance')} className="text-xs font-bold flex items-center gap-1" style={{ color: G }}>
                  Voir tout →
                </button>
              </div>

              {ticketsError ? (
                <ErrorBanner message={ticketsError} onRetry={fetchAll} />
              ) : ticketsLoading ? (
                <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : recentTickets.length === 0 ? (
                <EmptyState icon={Wrench} title="Aucun ticket enregistré" />
              ) : (
                <div className="flex flex-col">
                  {recentTickets.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100">
                        <span className="text-[0.65rem] font-bold text-slate-600">{getInitials(t.demandeur?.nom, t.demandeur?.prenom)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{t.demandeur?.prenom} {t.demandeur?.nom}</p>
                        <p className="text-xs text-gray-400 truncate">{truncate(t.titre, 40)}</p>
                      </div>
                      <span className="hidden sm:inline-flex text-[0.68rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: PRIORITE_META[t.priorite]?.bg, color: PRIORITE_META[t.priorite]?.color }}>
                        {t.priorite}
                      </span>
                      <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUT_TICKET_META[t.statut]?.cls || 'bg-gray-100 text-gray-600'}`}>
                        {STATUT_TICKET_META[t.statut]?.label || t.statut}
                      </span>
                      <span className="hidden md:inline text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{formatDate(t.dateDepot)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
