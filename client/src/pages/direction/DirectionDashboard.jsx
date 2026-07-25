import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText, Clock, CheckCircle, XCircle, ArrowLeftRight, ScrollText,
  Menu, X, Bell, Zap, Eye, Hourglass, BarChart3,
  AlertTriangle, RefreshCw, Check, FolderCheck,
} from 'lucide-react'
import api from '../../services/api.js'
import DirectionSidebar from '../../components/direction/DirectionSidebar.jsx'

const Sparkline = lazy(() => import('./DirectionDashboardCharts.jsx').then(m => ({ default: m.Sparkline })))
const RepartitionPieChart = lazy(() => import('./DirectionDashboardCharts.jsx').then(m => ({ default: m.RepartitionPieChart })))
const DelaiAreaChart = lazy(() => import('./DirectionDashboardCharts.jsx').then(m => ({ default: m.DelaiAreaChart })))

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const PRIORITE_META = {
  URGENTE: { label: 'Urgent', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  HAUTE:   { label: 'Haute',  color: '#E8520A', bg: '#FFF7ED', border: '#FED7AA' },
  NORMALE: { label: 'Normale', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  BASSE:   { label: 'Basse',  color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
}

const PIPELINE_COLUMNS = [
  { key: 'SOUMISE',   statuts: ['SOUMISE'],                              label: 'Nouvelles',                    border: '#3B82F6' },
  { key: 'VALIDATION', statuts: ['EN_VALIDATION_DIRECTION'],             label: 'En validation',                border: '#E8520A' },
  { key: 'SERVICE_LOGEMENT', statuts: ['VALIDEE_DIRECTION', 'EN_ETUDE_LOGEMENT'], label: 'Validées → Service Logement', border: '#8B5CF6' },
  { key: 'APPROUVEE', statuts: ['APPROUVEE'],                            label: 'Approuvées',                   border: '#2E7D32' },
  { key: 'REJETEE',   statuts: ['REJETEE_DIRECTION', 'REJETEE'],         label: 'Rejetées',                     border: '#EF4444' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────
const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '')
const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

function timeAgo(dateStr) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 2592000) return `il y a ${Math.floor(s / 86400)} j`
  return formatDate(dateStr)
}

// ─── Small shared UI ─────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
      <span className="text-sm font-medium text-red-800 flex-1">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 border border-red-200 rounded-lg text-xs font-semibold text-red-600">
        <RefreshCw size={12} /> Réessayer
      </button>
    </div>
  )
}

function EmptyState({ icon: Icon = FileText, title, subtitle }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
        <Icon size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

const cardClass = 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-shadow hover:shadow-md'

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function DirectionDashboard() {
  const navigate = useNavigate()
  const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || '{}'), [])
  const initials = getInitials(currentUser.nom, currentUser.prenom)

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  const [demandes, setDemandes] = useState([])
  const [demandesLoading, setDemandesLoading] = useState(true)
  const [demandesError, setDemandesError] = useState(null)

  const [dossiersSoumis, setDossiersSoumis] = useState([])
  const [dossiersLoading, setDossiersLoading] = useState(true)
  const [dossiersError, setDossiersError] = useState(null)

  const fetchAll = useCallback(async () => {
    setStatsLoading(true); setDemandesLoading(true); setDossiersLoading(true)
    setStatsError(null); setDemandesError(null); setDossiersError(null)

    const [r1, r2, r3] = await Promise.allSettled([
      api.get('/direction/stats'),
      api.get('/direction/demandes'),
      api.get('/dossiers', { params: { statut: 'SOUMIS' } }),
    ])

    if (r1.status === 'fulfilled') setStats(r1.value.data)
    else setStatsError('Impossible de charger les statistiques.')
    setStatsLoading(false)

    if (r2.status === 'fulfilled') setDemandes(r2.value.data)
    else setDemandesError('Impossible de charger les demandes.')
    setDemandesLoading(false)

    if (r3.status === 'fulfilled') setDossiersSoumis(r3.value.data.slice(0, 3))
    else setDossiersError('Impossible de charger les dossiers.')
    setDossiersLoading(false)
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['DIRECTION', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Modal validation / rejet ─────────────────────────────────────────────────
  const [selected, setSelected] = useState(null)
  const [commentaire, setCommentaire] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const openDetail = (d) => { setSelected(d); setCommentaire('') }
  const closeDetail = () => { setSelected(null); setCommentaire('') }

  const handleValider = async () => {
    setActionLoading(true)
    try {
      await api.put(`/direction/demandes/${selected.id}/valider`, { commentaire: commentaire.trim() || undefined })
      fire('success', `Demande #${selected.id} validée.`)
      closeDetail()
      fetchAll()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la validation.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejeter = async () => {
    if (!commentaire.trim()) { fire('error', 'Le motif de rejet est obligatoire.'); return }
    setActionLoading(true)
    try {
      await api.put(`/direction/demandes/${selected.id}/rejeter`, { motifRejet: commentaire.trim() })
      fire('success', `Demande #${selected.id} rejetée.`)
      closeDetail()
      fetchAll()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du rejet.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────────
  const pipelineGroups = useMemo(() => {
    const map = {}
    for (const col of PIPELINE_COLUMNS) {
      map[col.key] = demandes.filter(d => col.statuts.includes(d.statut))
    }
    return map
  }, [demandes])

  const urgentes = useMemo(() => (
    demandes.filter(d => d.statut === 'EN_VALIDATION_DIRECTION' && ['URGENTE', 'HAUTE'].includes(d.priorite))
  ), [demandes])

  const repartitionType = useMemo(() => {
    const counts = { FONCTIONNAIRE: 0, PRIVE: 0, AUTRES: 0 }
    for (const d of demandes) {
      const t = d.demandeur?.typeLocataire
      if (t === 'FONCTIONNAIRE') counts.FONCTIONNAIRE++
      else if (t === 'PRIVE') counts.PRIVE++
      else counts.AUTRES++
    }
    const total = demandes.length
    return {
      total,
      data: [
        { name: 'Fonctionnaires',    value: counts.FONCTIONNAIRE, color: O },
        { name: 'Locataires privés', value: counts.PRIVE,         color: G },
        { name: 'Autres',            value: counts.AUTRES,        color: '#3B82F6' },
      ].filter(d => d.value > 0),
    }
  }, [demandes])

  const activitesRecentes = useMemo(() => {
    const events = []
    for (const d of demandes) {
      if (d.dateValidationDirection) {
        const validee = d.statut === 'EN_ETUDE_LOGEMENT' || d.statut === 'APPROUVEE'
        events.push({
          id: `${d.id}-decision`, date: d.dateValidationDirection,
          type: validee ? 'validee' : 'rejetee',
          text: `Demande DM-${d.id} ${validee ? 'validée' : 'rejetée'} — ${d.demandeur?.prenom} ${d.demandeur?.nom}`,
        })
      }
      events.push({
        id: `${d.id}-recue`, date: d.dateDepot, type: 'nouvelle',
        text: `Demande DM-${d.id} reçue — ${d.demandeur?.prenom} ${d.demandeur?.nom}`,
      })
    }
    return events.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)
  }, [demandes])

  const areaData = useMemo(() => (
    (stats?.historique?.demandes || []).map((v, i) => ({ i, v }))
  ), [stats])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <DirectionSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">

        {/* Topbar */}
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
                className="dir-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Bonjour, {currentUser.prenom || 'Direction'}
                </h1>
                <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Pilotez efficacement la validation des demandes</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => navigate('/direction/notifications')}
                aria-label="Notifications" className="relative p-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
              >
                <Bell size={18} />
                {!!stats?.totalEnAttente && (
                  <span className="absolute -top-0.5 -right-0.5 text-[0.6rem] font-bold text-[#E8520A]">
                    {stats.totalEnAttente}
                  </span>
                )}
              </button>
              <span className="hidden md:block text-xs text-gray-400 font-medium whitespace-nowrap">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <div className="w-px h-6 bg-gray-200 hidden sm:block" />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                  <span className="text-xs font-extrabold text-white">{initials || 'DG'}</span>
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{currentUser.prenom} {currentUser.nom}</p>
                  <p className="text-xs text-gray-400 truncate">Direction Générale</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">

          {/* ── Section 1 : KPI cards ──────────────────────────────────────── */}
          {statsError ? (
            <ErrorBanner message={statsError} onRetry={fetchAll} />
          ) : statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}
            </div>
          ) : (
            <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}</div>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard icon={FileText} iconBg="#FFF4EF" iconColor={O}
                  value={stats.totalDemandes} label="Total demandes"
                  sparkline={<Sparkline data={stats.historique?.demandes} color={O} />} />
                <KpiCard icon={Clock} iconBg="#EFF6FF" iconColor="#3B82F6"
                  value={stats.demandesParStatut?.SOUMISE ?? 0} label="Nouvelles demandes"
                  sparkline={<Sparkline data={stats.historique?.demandes} color="#3B82F6" />} />
                <KpiCard icon={Hourglass} iconBg="#FFFBEB" iconColor={O}
                  value={
                    (stats.demandesParStatut?.EN_VALIDATION_DIRECTION ?? 0)
                    + (stats.demandesParStatut?.VALIDEE_DIRECTION ?? 0)
                    + (stats.demandesParStatut?.EN_ETUDE_LOGEMENT ?? 0)
                  }
                  label="En cours de traitement"
                  sparkline={<Sparkline data={stats.historique?.demandes} color={O} />} />
                <KpiCard icon={CheckCircle} iconBg="#F0FDF4" iconColor={G}
                  value={stats.demandesApprouveesMois ?? 0} label="Traitées ce mois"
                  sparkline={<Sparkline data={stats.historique?.validees} color={G} />} />
                <KpiCard icon={XCircle} iconBg="#FEF2F2" iconColor="#EF4444"
                  value={stats.demandesRejeteesMois ?? 0} label="Rejetées ce mois"
                  sparkline={<Sparkline data={stats.historique?.rejetees} color="#EF4444" />} />
              </div>
            </Suspense>
          )}

          {/* ── Section 2 : Flux des demandes ─────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${cardClass} mt-5`}>
            <h3 className="text-base font-bold text-gray-900 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Flux des demandes</h3>

            {demandesError ? (
              <ErrorBanner message={demandesError} onRetry={fetchAll} />
            ) : demandesLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-1">
                {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 min-w-[220px] flex-shrink-0" />)}
              </div>
            ) : demandes.length === 0 ? (
              <EmptyState icon={FileText} title="Aucune demande enregistrée" subtitle="Le flux apparaîtra ici dès la première demande." />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-1">
                {PIPELINE_COLUMNS.map(col => {
                  const items = pipelineGroups[col.key] || []
                  return (
                    <div key={col.key} className="bg-gray-50 rounded-xl p-4 min-w-[220px] flex-shrink-0 border-t-4" style={{ borderTopColor: col.border }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-gray-800">{col.label}</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{items.length}</span>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3">Aucune demande.</p>
                      ) : (
                        <div className="flex flex-col gap-2 mb-2">
                          {items.slice(0, 3).map(d => (
                            <div key={d.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                                <span className="text-[0.65rem] font-extrabold text-white">{getInitials(d.demandeur?.nom, d.demandeur?.prenom)}</span>
                              </div>
                              <p className="text-xs font-semibold text-gray-700 truncate">{truncate(`${d.demandeur?.prenom} ${d.demandeur?.nom}`, 18)}</p>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <p className="text-xs text-gray-400 text-center">+{items.length - 3} autres</p>
                          )}
                        </div>
                      )}
                      <button onClick={() => navigate('/direction/dossiers')} className="text-xs font-bold w-full text-center pt-1" style={{ color: O }}>
                        Voir tout
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* ── Section 2bis : Dossiers en attente ────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${cardClass} mt-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Dossiers à examiner</h3>
              <button onClick={() => navigate('/direction/dossiers')} className="text-xs font-bold" style={{ color: O }}>
                Voir tous les dossiers →
              </button>
            </div>

            {dossiersError ? (
              <ErrorBanner message={dossiersError} onRetry={fetchAll} />
            ) : dossiersLoading ? (
              <div className="flex flex-col gap-2.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : dossiersSoumis.length === 0 ? (
              <EmptyState icon={FolderCheck} title="Aucun dossier à examiner" subtitle="Les nouveaux dossiers soumis apparaîtront ici." />
            ) : (
              <div className="flex flex-col gap-2">
                {dossiersSoumis.map(dossier => (
                  <div key={dossier.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: dossier.locataire?.typeLocataire === 'FONCTIONNAIRE' ? G : O }}
                    >
                      <span className="text-xs font-extrabold text-white">{getInitials(dossier.locataire?.nom, dossier.locataire?.prenom)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {dossier.locataire?.prenom || 'Locataire'} {dossier.locataire?.nom || 'inconnu'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {dossier.demande?.logement?.code || 'Logement non renseigné'} · Soumis le {formatDate(dossier.updatedAt)}
                      </p>
                    </div>
                    <span className="text-[0.68rem] font-bold px-2 py-1 rounded-full flex-shrink-0 bg-blue-100 text-blue-700">
                      À étudier
                    </span>
                    <button onClick={() => navigate('/direction/dossiers')} className="text-xs font-bold flex-shrink-0" style={{ color: O }}>
                      Examiner →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Section 3 ─────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
            {/* Demandes urgentes */}
            <div className={`lg:col-span-2 ${cardClass}`}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                  <Zap size={16} style={{ color: O }} /> Demandes urgentes
                </h3>
                <button onClick={() => navigate('/direction/dossiers')} className="text-xs font-bold" style={{ color: O }}>
                  Voir toutes ({urgentes.length})
                </button>
              </div>

              {demandesLoading ? (
                <div className="flex flex-col gap-2.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : urgentes.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Aucune demande urgente" subtitle="Tout est sous contrôle." />
              ) : (
                <div className="flex flex-col gap-2">
                  {urgentes.map(d => {
                    const pm = PRIORITE_META[d.priorite] || PRIORITE_META.NORMALE
                    return (
                      <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                          <span className="text-xs font-extrabold text-white">{getInitials(d.demandeur?.nom, d.demandeur?.prenom)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            DM-{d.id} — {d.demandeur?.prenom} {d.demandeur?.nom}
                            <span className="text-gray-400 font-normal"> · {d.demandeur?.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}</span>
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(d.dateDepot)}</p>
                        </div>
                        <span className="text-[0.68rem] font-bold px-2 py-1 rounded-full flex-shrink-0 border" style={{ background: pm.bg, color: pm.color, borderColor: pm.border }}>
                          {pm.label}
                        </span>
                        <button onClick={() => openDetail(d)} aria-label={`Voir la demande DM-${d.id}`} className="p-2.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex-shrink-0">
                          <Eye size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Répartition par type */}
            <div className={cardClass}>
              <h3 className="text-base font-bold text-gray-900 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Répartition par type de demandeur</h3>
              {demandesLoading ? (
                <Skeleton className="h-56" />
              ) : repartitionType.total === 0 ? (
                <EmptyState icon={FileText} title="Aucune donnée" />
              ) : (
                <>
                  <div className="relative" style={{ height: 190 }}>
                    <Suspense fallback={<div className="w-full h-full rounded-full bg-gray-100 animate-pulse" />}>
                      <RepartitionPieChart data={repartitionType.data} />
                    </Suspense>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-3xl font-bold text-gray-900">{repartitionType.total}</p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-3">
                    {repartitionType.data.map(row => (
                      <div key={row.name} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.color }} />
                        <span className="text-gray-600 flex-1 truncate">{row.name}</span>
                        <span className="font-bold text-gray-900">{row.value}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">{Math.round((row.value / repartitionType.total) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* ── Section 4 ─────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            {/* Activités récentes */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Activités récentes</h3>
                <button onClick={() => navigate('/direction/journal')} className="text-xs font-bold" style={{ color: O }}>Voir toutes →</button>
              </div>
              {demandesLoading ? (
                <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : activitesRecentes.length === 0 ? (
                <EmptyState icon={ScrollText} title="Aucune activité récente" />
              ) : (
                <div className="flex flex-col gap-3">
                  {activitesRecentes.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3">
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: ev.type === 'validee' ? G : ev.type === 'rejetee' ? '#EF4444' : '#3B82F6' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700 truncate">{ev.text}</p>
                        <p className="text-xs text-gray-400">{timeAgo(ev.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance */}
            <div className={cardClass}>
              <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Délai moyen de traitement</h3>
              <p className="text-3xl font-bold mb-4" style={{ color: O, fontFamily: "'Syne', sans-serif" }}>
                {statsLoading ? '…' : (stats?.delaiMoyenTraitementJours != null ? `${stats.delaiMoyenTraitementJours} j` : '—')}
              </p>
              {statsLoading ? (
                <Skeleton className="h-28" />
              ) : areaData.every(p => p.v === 0) ? (
                <EmptyState icon={BarChart3} title="Pas encore assez de données" subtitle="L'activité récente apparaîtra ici." />
              ) : (
                <Suspense fallback={<Skeleton className="h-28" />}>
                  <DelaiAreaChart data={areaData} color={O} />
                </Suspense>
              )}
            </div>
          </motion.div>

          {/* ── Section 5 : Accès rapides ────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 mb-2">
            <QuickAccess icon={FileText} color={O} bg="#FFF4EF" label="Demandes en attente" onClick={() => navigate('/direction/dossiers')} />
            <QuickAccess icon={ArrowLeftRight} color="#3B82F6" bg="#EFF6FF" label="Mutations" onClick={() => navigate('/direction/mutations')} />
            <QuickAccess icon={BarChart3} color="#8B5CF6" bg="#F5F3FF" label="Rapports" onClick={() => navigate('/direction/rapports')} />
            <QuickAccess icon={ScrollText} color="#6B7280" bg="#F9FAFB" label="Journal d'activité" onClick={() => navigate('/direction/journal')} />
          </motion.div>
        </main>
      </div>

      {/* ══ Modal validation / rejet ══════════════════════════════════════════ */}
      <AnimatePresence>
        {selected && (
          <DetailModal
            demande={selected}
            commentaire={commentaire} setCommentaire={setCommentaire}
            loading={actionLoading}
            onValider={handleValider} onRejeter={handleRejeter}
            onClose={closeDetail}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ─── KPI card ───────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, iconColor, value, label, sparkline }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
      className={cardClass}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value ?? 0}</p>
      <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
      {sparkline}
    </motion.div>
  )
}

// ─── Quick access button ─────────────────────────────────────────────────────────
function QuickAccess({ icon: Icon, color, bg, label, onClick }) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl p-4 border border-gray-100 text-center hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: bg }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-xs font-semibold text-gray-700">{label}</p>
    </button>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  const ok = toast.type === 'success'
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className={`fixed top-6 right-6 z-[9999] flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-lg min-w-[270px] max-w-[360px] ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-red-500'}`}>
        {ok ? <Check size={13} color="#fff" strokeWidth={3} /> : <X size={13} color="#fff" strokeWidth={3} />}
      </div>
      <span className={`flex-1 text-sm font-semibold ${ok ? 'text-green-800' : 'text-red-800'}`}>{toast.message}</span>
      <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
    </motion.div>
  )
}

// ─── Modal détail / validation / rejet ──────────────────────────────────────────
function DetailModal({ demande, commentaire, setCommentaire, loading, onValider, onRejeter, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const pm = PRIORITE_META[demande.priorite] || PRIORITE_META.NORMALE

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        role="dialog" aria-modal="true" aria-label={`Demande DM-${demande.id}`}
        className="bg-white rounded-[22px] border border-slate-100 shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>Demande DM-{demande.id}</h2>
            <span className="text-[0.68rem] font-bold px-2 py-0.5 rounded-full border" style={{ background: pm.bg, color: pm.color, borderColor: pm.border }}>
              {pm.label}
            </span>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="bg-slate-100 rounded-lg p-1.5 text-slate-500"><X size={16} /></button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <InfoRow label="Demandeur" value={`${demande.demandeur?.prenom} ${demande.demandeur?.nom}`} />
            <InfoRow label="Type" value={demande.demandeur?.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'} />
            <InfoRow label="Email" value={demande.demandeur?.email || '—'} />
            <InfoRow label="Téléphone" value={demande.demandeur?.telephone || '—'} />
            <InfoRow label="Date de dépôt" value={formatDate(demande.dateDepot)} />
            <InfoRow label="Statut actuel" value={demande.statut} />
          </div>

          <div className="mb-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Motif</p>
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">{demande.motif}</p>
          </div>

          <div className="mb-5">
            <label htmlFor="dir-commentaire" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Commentaire <span className="text-slate-400 font-normal">(optionnel pour valider, obligatoire pour rejeter)</span>
            </label>
            <textarea
              id="dir-commentaire" rows={3}
              placeholder="Ajoutez un commentaire ou un motif de rejet…"
              value={commentaire} onChange={e => setCommentaire(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition resize-none"
            />
          </div>

          {demande.statut !== 'EN_VALIDATION_DIRECTION' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium mb-4 flex gap-2">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>Cette demande n'est plus en attente de validation (statut : {demande.statut}).</span>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              onClick={onRejeter} disabled={loading || demande.statut !== 'EN_VALIDATION_DIRECTION'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-50"
              style={{ background: '#DC2626' }}
            >
              <XCircle size={15} /> Rejeter
            </button>
            <button
              onClick={onValider} disabled={loading || demande.statut !== 'EN_VALIDATION_DIRECTION'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-50"
              style={{ background: G }}
            >
              <CheckCircle size={15} /> Valider
            </button>
          </div>
        </div>
      </motion.div>
    </div>
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
