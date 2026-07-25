import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Users, ScrollText, Activity, Zap,
  Building2, FileText, Wrench, CheckCircle, RefreshCw,
  Search, KeyRound, UserPlus, Trash2, Power, Eye, EyeOff, X, Check,
  AlertTriangle, ChevronDown, LogOut, Copy, ArrowRight, Menu,
} from 'lucide-react'
import api from '../../services/api.js'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const RoleDistributionPieChart = lazy(() => import('./SuperAdminDashboardCharts.jsx').then(m => ({ default: m.RoleDistributionPieChart })))

const ROLE_META = {
  SUPER_ADMIN: { label: 'Super Admin',    color: '#E8520A' },
  ADMIN:       { label: 'Administrateur', color: '#3B82F6' },
  DIRECTION:   { label: 'Direction',      color: '#8B5CF6' },
  LOCATAIRE:   { label: 'Locataire',      color: '#F59E0B' },
  RESPONSABLE: { label: 'Responsable',    color: '#2E7D32' },
  TECHNICIEN:  { label: 'Technicien',     color: '#06B6D4' },
}

// Badges de rôle : couleurs pleines de la charte SONAPIE (pas de pastel Tailwind auto)
const ROLE_BADGE_CLS = {
  SUPER_ADMIN: 'bg-[#E8520A]/15 text-[#E8520A] border border-[#E8520A]/40 font-semibold',
  ADMIN:       'bg-blue-500/15 text-blue-400 border border-blue-500/40 font-semibold',
  DIRECTION:   'bg-violet-500/15 text-violet-400 border border-violet-500/40 font-semibold',
  LOCATAIRE:   'bg-[#E8520A]/15 text-[#E8520A] border border-[#E8520A]/40 font-semibold',
  RESPONSABLE: 'bg-green-500/15 text-green-400 border border-[#2E7D32]/40 font-semibold',
  TECHNICIEN:  'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 font-semibold',
}
const ACTIF_BADGE_CLS = 'bg-green-500/15 text-green-400 border border-[#2E7D32]/40'
const INACTIF_BADGE_CLS = 'bg-[#1E2A45] text-[#8B96AB]'

const LOG_TYPE_META = {
  CREATION:           { cls: 'bg-green-500/15 text-green-400' },
  MODIFICATION:       { cls: 'bg-blue-500/15 text-blue-400' },
  SUPPRESSION:        { cls: 'bg-red-500/15 text-red-400' },
  VALIDATION:         { cls: 'bg-green-500/15 text-green-400' },
  REJET:              { cls: 'bg-red-500/15 text-red-400' },
  CONNEXION:          { cls: 'bg-[#1E2A45] text-[#8B96AB]' },
  DESACTIVATION:      { cls: 'bg-[#E8520A]/15 text-[#E8520A]' },
  REACTIVATION:       { cls: 'bg-green-500/15 text-green-400' },
  RESET_MOT_DE_PASSE: { cls: 'bg-purple-500/15 text-purple-400' },
}

const MODULES = ['utilisateurs', 'demandes', 'tickets', 'logements', 'mutations']
const STATUTS_TICKET = [
  'SOUMIS', 'CONSTAT_PROGRAMME', 'CONSTAT_EFFECTUE', 'PRISE_EN_CHARGE_LOCATAIRE',
  'PRISE_EN_CHARGE_SONAPIE', 'EN_ATTENTE_CONFIRMATION_LOCATAIRE', 'ASSIGNE_TECHNICIEN',
  'EN_COURS', 'VERIFICATION_SONAPIE', 'CLOTURE', 'REOUVERT',
]
const STATUTS_DEMANDE = [
  'SOUMISE', 'EN_VALIDATION_DIRECTION', 'VALIDEE_DIRECTION', 'REJETEE_DIRECTION',
  'EN_ETUDE_LOGEMENT', 'APPROUVEE', 'REJETEE',
]

const NAV_ITEMS = [
  { key: 'overview', icon: LayoutDashboard, label: "Vue d'ensemble" },
  { key: 'users',    icon: Users,           label: 'Utilisateurs' },
  { key: 'logs',     icon: ScrollText,      label: "Logs d'activité" },
  { key: 'health',   icon: Activity,        label: 'Santé système' },
  { key: 'actions',  icon: Zap,             label: 'Actions rapides' },
]

const SECTION_META = {
  overview: { title: "Vue d'ensemble",  subtitle: 'Supervision globale du système SONAPIE' },
  users:    { title: 'Utilisateurs',    subtitle: 'Gestion complète de tous les comptes, tous rôles confondus' },
  logs:     { title: "Logs d'activité", subtitle: 'Historique des actions effectuées sur le système' },
  health:   { title: 'Santé système',   subtitle: 'Éléments bloqués nécessitant une intervention' },
  actions:  { title: 'Actions rapides', subtitle: 'Raccourcis vers les opérations fréquentes' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

function timeAgo(dateStr) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 2592000) return `il y a ${Math.floor(s / 86400)} j`
  return formatDate(dateStr)
}

const inp = 'w-full px-3.5 py-2.5 border border-[#1E2A45] bg-[#0B1120] rounded-lg text-sm text-[#F1F5F9] placeholder:text-[#8B96AB] outline-none focus:border-[#E8520A] focus:bg-[#0B1120] focus:ring-[3px] focus:ring-[#E8520A]/10 transition font-[Inter]'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-[#1E2A45] rounded-xl bg-[#131C31] text-[#8B96AB] font-semibold text-sm hover:bg-[#1E2A45] hover:text-[#F1F5F9] transition'
const primaryBtn = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-60'

// ─── Small shared components ────────────────────────────────────────────────────
function Spinner({ size = 15 }) {
  return (
    <span
      style={{ width: size, height: size, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#FFFFFF' }}
      className="inline-block rounded-full animate-spin"
    />
  )
}

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
      className={`fixed top-6 right-6 z-[9999] flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-lg min-w-[270px] max-w-[360px] bg-[#131C31] ${ok ? 'border-green-500/30' : 'border-red-500/30'}`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-red-500'}`}>
        {ok ? <Check size={13} color="#fff" strokeWidth={3} /> : <X size={13} color="#fff" strokeWidth={3} />}
      </div>
      <span className={`flex-1 text-sm font-semibold ${ok ? 'text-green-300' : 'text-red-300'}`}>{toast.message}</span>
      <button onClick={onClose} className="text-[#8B96AB] hover:text-[#F1F5F9]"><X size={14} /></button>
    </motion.div>
  )
}

function Modal({ onClose, width = 480, children }) {
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

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        className="bg-[#131C31] rounded-[22px] border border-[#1E2A45] shadow-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {children}
      </motion.div>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
      <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
      <span className="flex-1 text-sm font-medium text-red-300">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 px-3 py-1 bg-red-500/15 border border-red-500/30 rounded-lg text-xs font-semibold text-red-300">
        <RefreshCw size={12} /> Réessayer
      </button>
    </div>
  )
}

function EmptyState({ icon: Icon = ScrollText, title, subtitle }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-full bg-[#1E2A45] flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-[#8B96AB]" />
      </div>
      <p className="text-base font-bold text-[#F1F5F9] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</p>
      {subtitle && <p className="text-sm text-[#8B96AB]">{subtitle}</p>}
    </div>
  )
}

function Skeleton({ className }) {
  return <div className={`bg-[#1E2A45] rounded-lg animate-pulse ${className}`} />
}

function StatusBadge({ status }) {
  const map = {
    OK:       { dot: 'bg-[#2E7D32]',  cls: 'bg-green-500/10 text-green-400 border-green-500/30',  text: 'Système opérationnel' },
    WARNING:  { dot: 'bg-[#E8520A]', cls: 'bg-[#E8520A]/10 text-[#E8520A] border-[#E8520A]/30', text: 'Attention requise' },
    CRITICAL: { dot: 'bg-red-500',    cls: 'bg-red-500/10 text-red-400 border-red-500/30',        text: 'Intervention requise' },
  }
  const m = map[status] || { dot: 'bg-[#8B96AB]', cls: 'bg-[#1E2A45] text-[#8B96AB] border-[#1E2A45]', text: 'Chargement…' }
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap ${m.cls}`}>
      <span className={`w-2 h-2 rounded-full ${m.dot} ${status ? 'animate-pulse' : ''}`} />
      {m.text}
    </span>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || '{}'), [])
  const initials = getInitials(currentUser.nom, currentUser.prenom)

  const [activeSection, setActiveSection] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  // ── Health ──────────────────────────────────────────────────────────────────
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(null)

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true); setHealthError(null)
    try {
      const { data } = await api.get('/super-admin/health')
      setHealth(data)
    } catch (err) {
      setHealthError(err.response?.data?.message || 'Impossible de charger la santé du système.')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  // ── Users ───────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('ALL')
  const [userStatusFilter, setUserStatusFilter] = useState('ALL')

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true); setUsersError(null)
    try {
      const { data } = await api.get('/super-admin/utilisateurs')
      setUsers(data)
    } catch (err) {
      setUsersError(err.response?.data?.message || 'Impossible de charger les utilisateurs.')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const filteredUsers = useMemo(() => users.filter(u => {
    const q = userSearch.toLowerCase()
    const ms = !q || u.nom.toLowerCase().includes(q) || u.prenom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const mr = userRoleFilter === 'ALL' || u.role === userRoleFilter
    const mv = userStatusFilter === 'ALL' || (userStatusFilter === 'ACTIF' && u.actif) || (userStatusFilter === 'INACTIF' && !u.actif)
    return ms && mr && mv
  }), [users, userSearch, userRoleFilter, userStatusFilter])

  // ── Logs ────────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState(null)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logModuleFilter, setLogModuleFilter] = useState('ALL')
  const [logTypeFilter, setLogTypeFilter] = useState('ALL')
  const [logDateDebut, setLogDateDebut] = useState('')
  const [logDateFin, setLogDateFin] = useState('')

  const fetchLogs = useCallback(async (page = 1, replace = false) => {
    setLogsLoading(true); setLogsError(null)
    try {
      const { data } = await api.get('/super-admin/logs', {
        params: {
          page, limit: 20,
          module: logModuleFilter !== 'ALL' ? logModuleFilter : undefined,
          typeAction: logTypeFilter !== 'ALL' ? logTypeFilter : undefined,
          dateDebut: logDateDebut || undefined,
          dateFin: logDateFin || undefined,
        },
      })
      setLogs(prev => replace ? data.logs : [...prev, ...data.logs])
      setLogsPage(data.pagination.page)
      setLogsTotalPages(data.pagination.totalPages)
    } catch (err) {
      setLogsError(err.response?.data?.message || 'Impossible de charger les logs.')
    } finally {
      setLogsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logModuleFilter, logTypeFilter, logDateDebut, logDateFin])

  const resetLogFilters = () => { setLogModuleFilter('ALL'); setLogTypeFilter('ALL'); setLogDateDebut(''); setLogDateFin('') }

  // ── User detail modal ───────────────────────────────────────────────────────
  const [detailUserId, setDetailUserId] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openUserDetail = useCallback(async (id) => {
    setDetailUserId(id); setDetailData(null); setDetailLoading(true)
    try {
      const { data } = await api.get(`/super-admin/utilisateurs/${id}`)
      setDetailData(data)
    } catch (err) {
      fire('error', "Impossible de charger le détail de l'utilisateur.")
      setDetailUserId(null)
    } finally {
      setDetailLoading(false)
    }
  }, [fire])

  // ── Reset password modal ─────────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState(null)
  const [resetResult, setResetResult] = useState(null)
  const [resetLoading, setResetLoading] = useState(false)

  const openReset = (user) => { setResetTarget(user); setResetResult(null) }
  const confirmReset = async () => {
    setResetLoading(true)
    try {
      const { data } = await api.post(`/super-admin/utilisateurs/${resetTarget.id}/reset-password`)
      setResetResult(data.motDePasseTemporaire)
      fire('success', 'Mot de passe réinitialisé avec succès.')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la réinitialisation.')
    } finally {
      setResetLoading(false)
    }
  }
  const copyPassword = () => {
    navigator.clipboard?.writeText(resetResult || '')
    fire('success', 'Mot de passe copié dans le presse-papier.')
  }

  // ── Toggle / Delete ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleToggle = async (u) => {
    try {
      await api.patch(`/admin/utilisateurs/${u.id}/toggle`)
      await fetchUsers()
      fire('success', `Compte ${u.actif ? 'désactivé' : 'activé'}.`)
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du changement de statut.')
    }
  }
  const confirmDelete = async () => {
    setDeleteLoading(true)
    try {
      await api.delete(`/admin/utilisateurs/${deleteTarget.id}`)
      await fetchUsers()
      setDeleteTarget(null)
      fire('success', 'Compte supprimé.')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la suppression.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Forcer statut (tickets / demandes) ───────────────────────────────────────
  const [forceItem, setForceItem] = useState(null) // { kind: 'ticket' | 'demande', id, statutActuel }
  const [forceStatut, setForceStatut] = useState('')
  const [forceRaison, setForceRaison] = useState('')
  const [forceLoading, setForceLoading] = useState(false)

  const openForce = (kind, item) => { setForceItem({ kind, id: item.id, statutActuel: item.statut }); setForceStatut(''); setForceRaison('') }
  const confirmForce = async () => {
    if (!forceStatut || !forceRaison.trim()) { fire('error', 'Le nouveau statut et la raison sont obligatoires.'); return }
    setForceLoading(true)
    try {
      const path = forceItem.kind === 'ticket'
        ? `/super-admin/tickets/${forceItem.id}/forcer-statut`
        : `/super-admin/demandes/${forceItem.id}/forcer-statut`
      await api.put(path, { statut: forceStatut, raison: forceRaison.trim() })
      fire('success', 'Statut forcé avec succès.')
      setForceItem(null)
      fetchHealth()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du forçage du statut.')
    } finally {
      setForceLoading(false)
    }
  }

  // ── Créer un admin (Actions rapides) ─────────────────────────────────────────
  const EMPTY_ADMIN_FORM = { nom: '', prenom: '', email: '', telephone: '', password: '', confirmPassword: '' }
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM)
  const [adminErrs, setAdminErrs] = useState({})
  const [adminLoading, setAdminLoading] = useState(false)
  const [showAdminPwd, setShowAdminPwd] = useState(false)

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!adminForm.nom.trim()) errs.nom = 'Champ requis'
    if (!adminForm.prenom.trim()) errs.prenom = 'Champ requis'
    if (!adminForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) errs.email = 'Email invalide'
    if (!adminForm.password || adminForm.password.length < 8) errs.password = 'Minimum 8 caractères'
    if (adminForm.password !== adminForm.confirmPassword) errs.confirmPassword = 'Ne correspondent pas'
    if (Object.keys(errs).length) { setAdminErrs(errs); return }

    setAdminLoading(true)
    try {
      await api.post('/admin/utilisateurs', {
        nom: adminForm.nom.trim(), prenom: adminForm.prenom.trim(), email: adminForm.email.trim(),
        telephone: adminForm.telephone.trim(), role: 'ADMIN', password: adminForm.password,
      })
      fire('success', 'Compte administrateur créé avec succès.')
      setShowCreateAdmin(false); setAdminForm(EMPTY_ADMIN_FORM); setAdminErrs({})
      fetchUsers()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la création.')
    } finally {
      setAdminLoading(false)
    }
  }

  // ── Rechercher un utilisateur pour reset (Actions rapides) ───────────────────
  const [showResetSearch, setShowResetSearch] = useState(false)
  const [resetSearchQuery, setResetSearchQuery] = useState('')
  const resetSearchResults = useMemo(() => {
    if (!resetSearchQuery.trim()) return []
    const q = resetSearchQuery.toLowerCase()
    return users.filter(u =>
      u.nom.toLowerCase().includes(q) || u.prenom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    ).slice(0, 6)
  }, [resetSearchQuery, users])

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || u.role !== 'SUPER_ADMIN') { navigate('/login'); return }
    fetchHealth()
    fetchUsers()
    fetchLogs(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // body a un fond clair fixe (styles.css) : sur les pages courtes, le scroll
  // interne du body laisse apparaître ce fond clair sous le contenu sombre.
  useEffect(() => {
    const previousBg = document.body.style.background
    document.body.style.background = '#0B1120'
    return () => { document.body.style.background = previousBg }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetchLogs(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logModuleFilter, logTypeFilter, logDateDebut, logDateFin])

  // Verrouille le scroll de l'arrière-plan + Échap + rend le focus au bouton
  // hamburger pendant que le tiroir mobile est ouvert.
  const mobileCloseBtnRef = useRef(null)
  const mobilePreviouslyFocused = useRef(null)
  useEffect(() => {
    if (!mobileNavOpen) return

    mobilePreviouslyFocused.current = document.activeElement
    mobileCloseBtnRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => { if (e.key === 'Escape') setMobileNavOpen(false) }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      mobilePreviouslyFocused.current?.focus?.()
    }
  }, [mobileNavOpen])

  const logout = () => { sessionStorage.removeItem('token'); sessionStorage.removeItem('user'); navigate('/login') }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const roleChartData = useMemo(() => {
    if (!health) return []
    return Object.entries(health.utilisateurs.parRole)
      .filter(([, v]) => v > 0)
      .map(([role, value]) => ({ name: ROLE_META[role]?.label || role, value, role }))
  }, [health])

  const meta = SECTION_META[activeSection]

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: '#0B1120', fontFamily: "'Inter', sans-serif" }}>

      {/* ══ Sidebar (desktop) ══════════════════════════════════════════════════ */}
      <aside className="sa-desk fixed top-0 left-0 bottom-0 z-[100] w-64 bg-[#0B1120] border-r border-[#1E2A45] flex-col shadow-sm">
        <SidebarContent
          activeSection={activeSection}
          onNavigate={setActiveSection}
          user={currentUser}
          initials={initials}
          onLogout={logout}
        />
      </aside>

      {/* ══ Mobile drawer ══════════════════════════════════════════════════════ */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[199] bg-black/35" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <aside
        className="fixed top-0 left-0 bottom-0 z-[200] w-64 bg-[#0B1120] border-r border-[#1E2A45] flex flex-col transition-transform duration-300 will-change-transform"
        style={{ transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        aria-hidden={!mobileNavOpen}
      >
        <button
          ref={mobileCloseBtnRef}
          onClick={() => setMobileNavOpen(false)}
          aria-label="Fermer le menu"
          tabIndex={mobileNavOpen ? 0 : -1}
          className="absolute top-3 right-3 p-3 rounded-lg text-[#8B96AB] hover:bg-[#1E2A45] hover:text-[#F1F5F9] z-10"
        >
          <X size={18} />
        </button>
        <SidebarContent
          activeSection={activeSection}
          onNavigate={(k) => { setActiveSection(k); setMobileNavOpen(false) }}
          user={currentUser}
          initials={initials}
          onLogout={logout}
        />
      </aside>

      {/* ══ Main ═══════════════════════════════════════════════════════════════ */}
      <div className="sa-main flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden md:ml-64">

        {/* Topbar */}
        <div className="sticky top-0 z-40 bg-[#0B1120] border-b border-[#1E2A45] px-4 md:px-7 py-3.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={mobileNavOpen}
                className="md:hidden p-3 -ml-3 rounded-lg text-[#8B96AB]"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-[#F1F5F9] truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {meta.title}
                </h1>
                <p className="text-xs md:text-sm text-[#8B96AB] truncate hidden sm:block">{meta.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge status={health?.systemStatus} />
              <span className="hidden lg:block text-xs text-[#8B96AB] font-medium whitespace-nowrap">
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('fr-FR')}
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                <span className="text-sm font-extrabold text-white">{initials}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-7 pb-8">
          {activeSection === 'overview' && (
            <OverviewSection
              health={health} healthLoading={healthLoading} healthError={healthError}
              onRetry={fetchHealth} roleChartData={roleChartData}
            />
          )}
          {activeSection === 'users' && (
            <UsersSection
              users={filteredUsers} loading={usersLoading} error={usersError} onRetry={fetchUsers}
              search={userSearch} setSearch={setUserSearch}
              roleFilter={userRoleFilter} setRoleFilter={setUserRoleFilter}
              statusFilter={userStatusFilter} setStatusFilter={setUserStatusFilter}
              currentUser={currentUser}
              onView={openUserDetail} onReset={openReset} onToggle={handleToggle} onDelete={setDeleteTarget}
            />
          )}
          {activeSection === 'logs' && (
            <LogsSection
              logs={logs} loading={logsLoading} error={logsError} onRetry={() => fetchLogs(1, true)}
              moduleFilter={logModuleFilter} setModuleFilter={setLogModuleFilter}
              typeFilter={logTypeFilter} setTypeFilter={setLogTypeFilter}
              dateDebut={logDateDebut} setDateDebut={setLogDateDebut}
              dateFin={logDateFin} setDateFin={setLogDateFin}
              onReset={resetLogFilters}
              page={logsPage} totalPages={logsTotalPages}
              onLoadMore={() => fetchLogs(logsPage + 1, false)}
            />
          )}
          {activeSection === 'health' && (
            <HealthDetailSection
              health={health} loading={healthLoading} error={healthError} onRetry={fetchHealth}
              onForceTicket={(item) => openForce('ticket', item)}
              onForceDemande={(item) => openForce('demande', item)}
            />
          )}
          {activeSection === 'actions' && (
            <ActionsSection
              recentLogs={logs.slice(0, 5)}
              onCreateAdmin={() => setShowCreateAdmin(true)}
              onOpenResetSearch={() => setShowResetSearch(true)}
              onGoHealth={() => setActiveSection('health')}
              onGoLogs={() => setActiveSection('logs')}
            />
          )}
        </main>

        {/* Mobile bottom nav */}
        <nav className="sa-bottomnav fixed bottom-0 left-0 right-0 z-50 bg-[#0B1120] border-t border-[#1E2A45] flex h-[58px] shadow-[0_-2px_8px_rgba(0,0,0,0.3)]" aria-label="Navigation principale">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
            const a = activeSection === key
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                aria-current={a ? 'page' : undefined}
                aria-label={label}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 border-t-2"
                style={{ borderTopColor: a ? O : 'transparent' }}
              >
                <Icon size={17} style={{ color: a ? O : '#8B96AB' }} aria-hidden="true" />
                <span className="text-[0.58rem]" style={{ color: a ? O : '#8B96AB', fontWeight: a ? 700 : 400 }} aria-hidden="true">
                  {label.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ══════════════════════════════ MODALS ═══════════════════════════════ */}
      <AnimatePresence>
        {detailUserId && (
          <UserDetailModal
            loading={detailLoading} data={detailData}
            onClose={() => { setDetailUserId(null); setDetailData(null) }}
          />
        )}

        {resetTarget && (
          <ResetPasswordModal
            target={resetTarget} result={resetResult} loading={resetLoading}
            onConfirm={confirmReset} onCopy={copyPassword}
            onClose={() => { setResetTarget(null); setResetResult(null) }}
          />
        )}

        {deleteTarget && (
          <Modal onClose={() => setDeleteTarget(null)} width={400}>
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-[#F1F5F9] mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Supprimer ce compte ?</h2>
              <p className="text-sm text-[#8B96AB] mb-1">Vous allez supprimer définitivement le compte de</p>
              <p className="text-base font-bold text-[#F1F5F9] mb-4">{deleteTarget.prenom} {deleteTarget.nom}</p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2 text-sm text-red-300 font-medium mb-5">
                Cette action est irréversible.
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setDeleteTarget(null)} className={`${ghostBtn} flex-1`}>Annuler</button>
                <button onClick={confirmDelete} disabled={deleteLoading} className={primaryBtn} style={{ background: deleteLoading ? '#FCA5A5' : '#EF4444' }}>
                  {deleteLoading ? <Spinner /> : <><Trash2 size={14} /> Supprimer</>}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {forceItem && (
          <ForceStatusModal
            item={forceItem}
            statut={forceStatut} setStatut={setForceStatut}
            raison={forceRaison} setRaison={setForceRaison}
            loading={forceLoading}
            onConfirm={confirmForce}
            onClose={() => setForceItem(null)}
          />
        )}

        {showCreateAdmin && (
          <Modal onClose={() => setShowCreateAdmin(false)}>
            <div className="p-6 pb-4 bg-gradient-to-br from-[#E8520A]/10 to-[#131C31] border-b border-[#1E2A45] rounded-t-[22px] flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#F1F5F9] mb-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>Créer un Administrateur</h2>
                <p className="text-xs text-[#8B96AB]">Rôle pré-sélectionné : <span className="font-semibold" style={{ color: O }}>ADMIN</span></p>
              </div>
              <button onClick={() => setShowCreateAdmin(false)} className="bg-[#1E2A45] rounded-lg p-1.5 text-[#8B96AB] hover:text-[#F1F5F9]"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6">
              <div className="flex gap-3 mb-3.5">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Prénom <span style={{ color: O }}>*</span></label>
                  <input className={inp} value={adminForm.prenom} onChange={e => setAdminForm(p => ({ ...p, prenom: e.target.value }))} />
                  {adminErrs.prenom && <p className="text-xs text-red-400 mt-1">{adminErrs.prenom}</p>}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Nom <span style={{ color: O }}>*</span></label>
                  <input className={inp} value={adminForm.nom} onChange={e => setAdminForm(p => ({ ...p, nom: e.target.value }))} />
                  {adminErrs.nom && <p className="text-xs text-red-400 mt-1">{adminErrs.nom}</p>}
                </div>
              </div>
              <div className="mb-3.5">
                <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Adresse email <span style={{ color: O }}>*</span></label>
                <input type="email" className={inp} value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} />
                {adminErrs.email && <p className="text-xs text-red-400 mt-1">{adminErrs.email}</p>}
              </div>
              <div className="mb-3.5">
                <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Téléphone</label>
                <input className={inp} value={adminForm.telephone} onChange={e => setAdminForm(p => ({ ...p, telephone: e.target.value }))} />
              </div>
              <div className="mb-3.5">
                <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Mot de passe <span style={{ color: O }}>*</span></label>
                <div className="relative">
                  <input type={showAdminPwd ? 'text' : 'password'} className={inp} style={{ paddingRight: 42 }}
                    value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowAdminPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B96AB]">
                    {showAdminPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {adminErrs.password && <p className="text-xs text-red-400 mt-1">{adminErrs.password}</p>}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Confirmer le mot de passe <span style={{ color: O }}>*</span></label>
                <input type="password" className={inp} value={adminForm.confirmPassword} onChange={e => setAdminForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                {adminErrs.confirmPassword && <p className="text-xs text-red-400 mt-1">{adminErrs.confirmPassword}</p>}
              </div>
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setShowCreateAdmin(false)} className={`${ghostBtn} flex-none px-5`}>Annuler</button>
                <button type="submit" disabled={adminLoading} className={primaryBtn} style={{ background: adminLoading ? '#f0956a' : O }}>
                  {adminLoading ? <Spinner /> : <><UserPlus size={15} /> Créer l'administrateur</>}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {showResetSearch && (
          <Modal onClose={() => { setShowResetSearch(false); setResetSearchQuery('') }} width={440}>
            <div className="p-6 pb-4 border-b border-[#1E2A45] flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#F1F5F9] mb-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>Rechercher un utilisateur</h2>
                <p className="text-xs text-[#8B96AB]">Pour déclencher la réinitialisation de son mot de passe</p>
              </div>
              <button onClick={() => { setShowResetSearch(false); setResetSearchQuery('') }} className="bg-[#1E2A45] rounded-lg p-1.5 text-[#8B96AB] hover:text-[#F1F5F9]"><X size={16} /></button>
            </div>
            <div className="p-6">
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B96AB]" />
                <input
                  autoFocus placeholder="Nom, prénom ou email…"
                  className={inp} style={{ paddingLeft: 36 }}
                  value={resetSearchQuery} onChange={e => setResetSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {resetSearchQuery.trim() && resetSearchResults.length === 0 && (
                  <p className="text-sm text-[#8B96AB] text-center py-6">Aucun utilisateur trouvé.</p>
                )}
                {resetSearchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { openReset(u); setShowResetSearch(false); setResetSearchQuery('') }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#1E2A45] border border-transparent hover:border-[#1E2A45] text-left transition"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ROLE_META[u.role]?.color || '#94A3B8' }}>
                      <span className="text-xs font-extrabold text-white">{getInitials(u.nom, u.prenom)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#F1F5F9] truncate">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-[#8B96AB] truncate">{u.email}</p>
                    </div>
                    <KeyRound size={15} className="text-[#8B96AB] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) {
          .sa-bottomnav { display: none !important; }
        }
        @media (max-width: 767px) {
          .sa-desk { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Sidebar
// ═════════════════════════════════════════════════════════════════════════════
function SidebarContent({ activeSection, onNavigate, user, initials, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-[#1E2A45]">
        <div className="inline-block bg-white rounded-lg p-2">
          <img
            src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg" alt="SONAPIE"
            width="140" height="60" style={{ width: 140, height: 'auto', mixBlendMode: 'multiply' }}
          />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${O}1A`, border: `1px solid ${O}4D`, color: O }}>
          <Zap size={11} /> SUPER ADMINISTRATEUR
        </div>
      </div>

      <nav className="flex-1 px-2.5 pt-3.5 overflow-y-auto" aria-label="Navigation principale">
        <p className="text-[0.62rem] font-bold tracking-widest uppercase text-[#8B96AB] mb-2 ml-1">Navigation</p>
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = activeSection === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-2.5 mb-0.5 rounded-lg text-sm text-left transition ${
                active
                  ? 'bg-[#E8520A]/10 border-l-4 border-[#E8520A] text-[#E8520A] font-semibold pl-[11px] pr-3.5 py-3'
                  : 'border-l-4 border-transparent text-[#8B96AB] font-normal px-3.5 py-3 hover:bg-[#1E2A45]'
              }`}
            >
              <Icon size={16} style={{ color: active ? O : '#8B96AB', flexShrink: 0 }} aria-hidden="true" />
              <span className="flex-1">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mx-2.5 mt-2 p-2.5 rounded-xl bg-[#131C31] border border-[#1E2A45]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
            <span className="text-xs font-extrabold text-white">{initials || 'SA'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#F1F5F9] truncate">{user.prenom} {user.nom}</p>
            <p className="text-xs text-[#8B96AB]">Super Administrateur</p>
          </div>
          <ChevronDown size={14} className="text-[#8B96AB] flex-shrink-0" />
        </div>
      </div>

      <div className="mx-2.5 mt-1 mb-3.5">
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition">
          <LogOut size={14} /> Se déconnecter
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section 1 — Vue d'ensemble
// ═════════════════════════════════════════════════════════════════════════════
function KpiCard({ icon: Icon, iconBg, iconColor, value, label, subInfo, badge }) {
  return (
    <div className="bg-[#131C31] rounded-2xl p-5 md:p-6 shadow-sm border border-[#1E2A45] hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3.5" style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <p className="text-2xl font-bold text-[#F1F5F9] mb-0.5">{value ?? '—'}</p>
      <p className="text-xs text-[#8B96AB] font-medium mb-2">{label}</p>
      {subInfo && <p className="text-xs font-semibold" style={{ color: G }}>{subInfo}</p>}
      {badge}
    </div>
  )
}

function OverviewSection({ health, healthLoading, healthError, onRetry, roleChartData }) {
  if (healthError) return <ErrorBanner message={healthError} onRetry={onRetry} />

  if (healthLoading || !health) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-36" />)}
      </div>
    )
  }

  const { utilisateurs, logements, demandes, tickets, systemStatus } = health
  const totalBloques = demandes.bloqueesPlusDe7Jours + tickets.bloqueesPlusDe5Jours

  return (
    <div>
      {/* 1A — KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <KpiCard
          icon={Users} iconBg={`${O}26`} iconColor={O}
          value={utilisateurs.total} label="Utilisateurs total"
          subInfo={`${utilisateurs.nouveauxCe7Jours} nouveaux cette semaine`}
          badge={utilisateurs.inactifsDepuis30Jours > 0 && (
            <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              {utilisateurs.inactifsDepuis30Jours} inactifs
            </span>
          )}
        />
        <KpiCard
          icon={Building2} iconBg="#3B82F626" iconColor="#60A5FA"
          value={logements.total} label="Logements gérés"
          subInfo={`${logements.disponibles} disponibles · ${logements.occupes} occupés`}
        />
        <KpiCard
          icon={FileText} iconBg="#CA8A0426" iconColor="#FACC15"
          value={demandes.enAttente} label="Demandes en attente"
          badge={demandes.bloqueesPlusDe7Jours > 0 && (
            <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
              ⚠ {demandes.bloqueesPlusDe7Jours} bloquées +7j
            </span>
          )}
        />
        <KpiCard
          icon={Wrench} iconBg={`${G}26`} iconColor="#4ADE80"
          value={tickets.ouverts} label="Tickets ouverts"
          badge={tickets.bloqueesPlusDe5Jours > 0 && (
            <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
              ⚠ {tickets.bloqueesPlusDe5Jours} bloqués +5j
            </span>
          )}
        />
      </div>

      {/* 1B — Santé système */}
      <div className="bg-[#131C31] rounded-2xl p-5 md:p-6 border border-[#1E2A45] mb-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Activity size={16} style={{ color: O }} />
            <h3 className="text-sm font-bold text-[#F1F5F9]" style={{ fontFamily: "'Syne', sans-serif" }}>Santé du système</h3>
            <StatusBadge status={systemStatus} />
          </div>
          <button onClick={onRetry} className="flex items-center gap-1.5 text-xs font-semibold text-[#8B96AB] hover:text-[#F1F5F9] px-2.5 py-1.5 rounded-lg hover:bg-[#1E2A45]">
            <RefreshCw size={12} /> Actualiser
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <HealthIndicator label="Demandes bloquées +7j" value={demandes.bloqueesPlusDe7Jours} bad={demandes.bloqueesPlusDe7Jours > 0} />
          <HealthIndicator label="Tickets bloqués +5j" value={tickets.bloqueesPlusDe5Jours} bad={tickets.bloqueesPlusDe5Jours > 0} />
          <HealthIndicator label="Comptes inactifs" value={utilisateurs.inactifsDepuis30Jours} bad={utilisateurs.inactifsDepuis30Jours > 0} warn />
          <HealthIndicator label="Nouveaux comptes (7j)" value={utilisateurs.nouveauxCe7Jours} neutral />
        </div>

        {totalBloques === 0 ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-2.5">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-green-300">Aucun problème détecté — Système opérationnel</span>
          </div>
        ) : (
          <div className="bg-[#E8520A]/10 border border-[#E8520A]/30 rounded-xl p-4 flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-[#E8520A] flex-shrink-0" />
            <span className="text-sm font-semibold text-orange-300">{totalBloques} élément(s) bloqué(s) — consultez la Santé système pour agir.</span>
          </div>
        )}
      </div>

      {/* 1C — Répartition par rôle */}
      <div className="bg-[#131C31] rounded-2xl p-5 md:p-6 border border-[#1E2A45]">
        <h3 className="text-sm font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Répartition des utilisateurs par rôle</h3>
        {roleChartData.length === 0 ? (
          <EmptyState icon={Users} title="Aucun utilisateur" subtitle="La répartition apparaîtra ici dès qu'il y aura des comptes." />
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div style={{ width: '100%', maxWidth: 240, height: 220 }}>
              <Suspense fallback={<div className="w-full h-full rounded-full bg-[#1E2A45] animate-pulse" />}>
                <RoleDistributionPieChart
                  data={roleChartData.map(entry => ({ ...entry, color: ROLE_META[entry.role]?.color || '#94A3B8' }))}
                />
              </Suspense>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2.5 w-full">
              {Object.entries(health.utilisateurs.parRole).map(([role, value]) => (
                <div key={role} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ROLE_META[role]?.color }} />
                  <span className="text-[#8B96AB] flex-1 truncate">{ROLE_META[role]?.label || role}</span>
                  <span className="font-bold text-[#F1F5F9]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HealthIndicator({ label, value, bad, warn, neutral }) {
  const color = bad ? '#F87171' : warn ? '#FBBF24' : neutral ? '#60A5FA' : '#4ADE80'
  const bg = bad ? '#EF444426' : warn ? '#F59E0B26' : neutral ? '#3B82F626' : `${G}26`
  return (
    <div className="rounded-xl p-3.5 text-center" style={{ background: bg }}>
      <p className="text-2xl font-bold mb-0.5" style={{ color }}>{value}</p>
      <p className="text-xs text-[#8B96AB] font-medium">{label}</p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section 2 — Utilisateurs
// ═════════════════════════════════════════════════════════════════════════════
function UsersSection({
  users, loading, error, onRetry, search, setSearch,
  roleFilter, setRoleFilter, statusFilter, setStatusFilter,
  currentUser, onView, onReset, onToggle, onDelete,
}) {
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />

  return (
    <div>
      <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl p-3 flex flex-wrap items-center gap-2.5 mb-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B96AB]" />
          <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className={inp} style={{ paddingLeft: 36 }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={`${sel} flex-none !w-auto min-w-[160px]`}>
          <option value="ALL">Tous les rôles</option>
          {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${sel} flex-none !w-auto min-w-[140px]`}>
          <option value="ALL">Tous statuts</option>
          <option value="ACTIF">Actif</option>
          <option value="INACTIF">Inactif</option>
        </select>
        <span className="text-xs text-[#8B96AB] ml-auto whitespace-nowrap">
          {loading ? '…' : `${users.length} résultat${users.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {loading ? (
        <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl shadow-sm flex items-center justify-center gap-3 py-10 text-[#8B96AB]">
          <div className="w-4.5 h-4.5 border-2 rounded-full animate-spin" style={{ borderColor: '#1E2A45', borderTopColor: O }} />
          <span className="text-sm">Chargement des utilisateurs…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl shadow-sm">
          <EmptyState icon={Users} title="Aucun utilisateur trouvé" subtitle="Essayez de modifier vos filtres." />
        </div>
      ) : (
        <>
          {/* ── Desktop : tableau ─────────────────────────────────────────────── */}
          <div className="hidden md:block bg-[#131C31] border border-[#1E2A45] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-[#0B1120] border-b border-[#1E2A45]">
                    {['Utilisateur', 'Rôle', 'Type', 'Statut', 'Créé le', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[0.68rem] font-bold text-[#8B96AB] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    const rm = ROLE_META[u.role] || { label: u.role, color: '#94A3B8' }
                    const badgeCls = ROLE_BADGE_CLS[u.role] || 'bg-[#1E2A45] text-[#8B96AB] border border-[#1E2A45] font-semibold'
                    const isSelf = u.email === currentUser?.email
                    return (
                      <tr key={u.id} className={idx < users.length - 1 ? 'border-b border-[#1E2A45]' : ''} style={{ background: isSelf ? 'rgba(232,82,10,0.06)' : 'transparent' }}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: rm.color }}>
                              <span className="text-xs font-extrabold text-white">{getInitials(u.nom, u.prenom)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-[#F1F5F9] truncate">{u.prenom} {u.nom}</p>
                                {isSelf && <span className="text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${O}1A`, color: O }}>Vous</span>}
                              </div>
                              <p className="text-xs text-[#8B96AB] truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs ${badgeCls}`}>
                            {rm.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#8B96AB]">{u.typeLocataire || '—'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${u.actif ? ACTIF_BADGE_CLS : INACTIF_BADGE_CLS}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.actif ? 'bg-[#2E7D32] animate-pulse' : 'bg-[#8B96AB]'}`} />
                            {u.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#8B96AB] whitespace-nowrap">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1.5">
                            <IconBtn title="Voir le détail" color="#60A5FA" bg="#3B82F626" onClick={() => onView(u.id)}><Eye size={14} /></IconBtn>
                            <IconBtn title="Réinitialiser le mot de passe" color="#A78BFA" bg="#7C3AED26" onClick={() => onReset(u)}><KeyRound size={14} /></IconBtn>
                            {!isSelf && (
                              <>
                                <IconBtn title={u.actif ? 'Désactiver' : 'Activer'} color={u.actif ? '#FBBF24' : '#4ADE80'} bg={u.actif ? '#F59E0B26' : '#22C55E26'} onClick={() => onToggle(u)}><Power size={14} /></IconBtn>
                                <IconBtn title="Supprimer" color="#F87171" bg="#EF444426" onClick={() => onDelete(u)}><Trash2 size={14} /></IconBtn>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile : cards ────────────────────────────────────────────────── */}
          <div className="block md:hidden">
            {users.map(u => {
              const rm = ROLE_META[u.role] || { label: u.role, color: '#94A3B8' }
              const badgeCls = ROLE_BADGE_CLS[u.role] || 'bg-[#1E2A45] text-[#8B96AB] border border-[#1E2A45] font-semibold'
              const isSelf = u.email === currentUser?.email
              return (
                <div key={u.id} className="bg-[#131C31] rounded-xl p-4 border border-[#1E2A45] mb-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: rm.color }}>
                        <span className="text-xs font-extrabold text-white">{getInitials(u.nom, u.prenom)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-[#F1F5F9] truncate">{u.prenom} {u.nom}</p>
                          {isSelf && <span className="text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${O}1A`, color: O }}>Vous</span>}
                        </div>
                        <p className="text-xs text-[#8B96AB] truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-xs whitespace-nowrap ${badgeCls}`}>
                      {rm.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1E2A45]">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${u.actif ? ACTIF_BADGE_CLS : INACTIF_BADGE_CLS}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.actif ? 'bg-[#2E7D32] animate-pulse' : 'bg-[#8B96AB]'}`} />
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                    <span className="text-xs text-[#8B96AB]">Créé le {formatDate(u.createdAt)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <IconBtn title="Voir le détail" color="#60A5FA" bg="#3B82F626" onClick={() => onView(u.id)}><Eye size={14} /></IconBtn>
                    <IconBtn title="Réinitialiser le mot de passe" color="#A78BFA" bg="#7C3AED26" onClick={() => onReset(u)}><KeyRound size={14} /></IconBtn>
                    {!isSelf && (
                      <>
                        <IconBtn title={u.actif ? 'Désactiver' : 'Activer'} color={u.actif ? '#FBBF24' : '#4ADE80'} bg={u.actif ? '#F59E0B26' : '#22C55E26'} onClick={() => onToggle(u)}><Power size={14} /></IconBtn>
                        <IconBtn title="Supprimer" color="#F87171" bg="#EF444426" onClick={() => onDelete(u)}><Trash2 size={14} /></IconBtn>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function IconBtn({ children, title, color, bg, onClick }) {
  return (
    <button
      title={title} aria-label={title} onClick={onClick}
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:scale-110 transition"
      style={{ background: bg, color }}
    >
      {children}
    </button>
  )
}

function UserDetailModal({ loading, data, onClose }) {
  return (
    <Modal onClose={onClose} width={520}>
      <div className="p-6 pb-4 border-b border-[#1E2A45] flex items-start justify-between">
        <h2 className="text-lg font-bold text-[#F1F5F9]" style={{ fontFamily: "'Syne', sans-serif" }}>Profil utilisateur</h2>
        <button onClick={onClose} className="bg-[#1E2A45] rounded-lg p-1.5 text-[#8B96AB] hover:text-[#F1F5F9]"><X size={16} /></button>
      </div>
      <div className="p-6">
        {loading || !data ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16" /><Skeleton className="h-24" /><Skeleton className="h-24" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ROLE_META[data.role]?.color || '#94A3B8' }}>
                <span className="text-base font-extrabold text-white">{getInitials(data.nom, data.prenom)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-[#F1F5F9] truncate">{data.prenom} {data.nom}</p>
                <p className="text-sm text-[#8B96AB] truncate">{data.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              <InfoRow label="Rôle" value={ROLE_META[data.role]?.label || data.role} />
              <InfoRow label="Statut" value={data.actif ? 'Actif' : 'Inactif'} />
              <InfoRow label="Téléphone" value={data.telephone || '—'} />
              <InfoRow label="Type locataire" value={data.typeLocataire || '—'} />
              <InfoRow label="Matricule" value={data.numeroMatricule || '—'} />
              <InfoRow label="Créé le" value={formatDate(data.createdAt)} />
            </div>

            {data.occupationActuelle && (
              <div className="mb-5">
                <p className="text-xs font-bold text-[#8B96AB] uppercase tracking-wider mb-2">Occupation actuelle</p>
                <div className="bg-[#0B1120] border border-[#1E2A45] rounded-xl p-3 text-sm">
                  <p className="font-semibold text-[#F1F5F9]">{data.occupationActuelle.logement?.code} — {data.occupationActuelle.logement?.adresse}</p>
                  <p className="text-[#8B96AB] text-xs mt-1">Depuis le {formatDate(data.occupationActuelle.dateEntree)}</p>
                </div>
              </div>
            )}

            {(Object.keys(data.demandes || {}).length > 0 || Object.keys(data.tickets || {}).length > 0) && (
              <div className="mb-5">
                <p className="text-xs font-bold text-[#8B96AB] uppercase tracking-wider mb-2">Demandes / tickets</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.demandes || {}).map(([s, n]) => (
                    <span key={`d-${s}`} className="text-xs px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-medium">{s}: {n}</span>
                  ))}
                  {Object.entries(data.tickets || {}).map(([s, n]) => (
                    <span key={`t-${s}`} className="text-xs px-2 py-1 rounded-lg bg-green-500/15 text-green-400 font-medium">{s}: {n}</span>
                  ))}
                  {Object.keys(data.demandes || {}).length === 0 && Object.keys(data.tickets || {}).length === 0 && (
                    <span className="text-xs text-[#8B96AB]">Aucune demande ou ticket.</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-[#8B96AB] uppercase tracking-wider mb-2">Dernières activités</p>
              {(!data.dernieresActivites || data.dernieresActivites.length === 0) ? (
                <p className="text-sm text-[#8B96AB]">Aucune activité enregistrée.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.dernieresActivites.map(log => (
                    <div key={log.id} className="flex items-start gap-2 text-sm">
                      <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${LOG_TYPE_META[log.typeAction]?.cls || 'bg-[#1E2A45] text-[#8B96AB]'}`}>
                        {log.typeAction}
                      </span>
                      <span className="flex-1 text-[#8B96AB] text-xs">{log.description}</span>
                      <span className="text-xs text-[#8B96AB] whitespace-nowrap">{timeAgo(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#8B96AB]">{label}</p>
      <p className="font-semibold text-[#F1F5F9]">{value}</p>
    </div>
  )
}

function ResetPasswordModal({ target, result, loading, onConfirm, onCopy, onClose }) {
  return (
    <Modal onClose={onClose} width={420}>
      <div className="p-6">
        {!result ? (
          <>
            <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
              <KeyRound size={26} className="text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-[#F1F5F9] text-center mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
              Réinitialiser le mot de passe de {target.prenom} {target.nom} ?
            </h2>
            <p className="text-sm text-[#8B96AB] text-center mb-5">Un mot de passe temporaire sera généré et affiché une seule fois.</p>
            <div className="flex gap-2.5">
              <button onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
              <button onClick={onConfirm} disabled={loading} className={primaryBtn} style={{ background: loading ? '#f0956a' : O }}>
                {loading ? <Spinner /> : 'Confirmer la réinitialisation'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-[#F1F5F9] mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Mot de passe réinitialisé</h2>
            <p className="text-sm text-[#8B96AB] mb-4">Communiquez ce mot de passe à l'utilisateur — il ne sera affiché qu'une seule fois.</p>
            <div className="bg-[#E8520A]/10 border rounded-xl p-4 flex items-center justify-between gap-3 mb-4" style={{ borderColor: `${O}4D` }}>
              <span className="font-mono text-lg font-bold" style={{ color: O }}>{result}</span>
              <button onClick={onCopy} className="p-2 rounded-lg bg-[#131C31] border" style={{ borderColor: `${O}4D`, color: O }}>
                <Copy size={15} />
              </button>
            </div>
            <button onClick={onClose} className={`${ghostBtn} w-full`}>Fermer</button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section 3 — Logs d'activité
// ═════════════════════════════════════════════════════════════════════════════
function LogsSection({
  logs, loading, error, onRetry, moduleFilter, setModuleFilter, typeFilter, setTypeFilter,
  dateDebut, setDateDebut, dateFin, setDateFin, onReset, page, totalPages, onLoadMore,
}) {
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />

  return (
    <div>
      <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl p-3 flex flex-wrap items-center gap-2.5 mb-4 shadow-sm">
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className={`${sel} flex-none !w-auto min-w-[160px]`}>
          <option value="ALL">Tous les modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} flex-none !w-auto min-w-[170px]`}>
          <option value="ALL">Tous les types</option>
          {Object.keys(LOG_TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={`${inp} flex-none !w-auto`} />
        <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={`${inp} flex-none !w-auto`} />
        <button onClick={onReset} className="text-xs font-semibold text-[#8B96AB] hover:text-[#F1F5F9] px-2.5 py-1.5 rounded-lg hover:bg-[#1E2A45] ml-auto">
          Réinitialiser filtres
        </button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl">
          <EmptyState icon={ScrollText} title="Aucun log d'activité" subtitle="Les actions effectuées sur le système apparaîtront ici." />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {logs.map(log => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>
          {page < totalPages && (
            <div className="flex justify-center mt-5">
              <button onClick={onLoadMore} disabled={loading} className="px-5 py-2.5 rounded-xl border border-[#1E2A45] bg-[#131C31] text-sm font-semibold text-[#8B96AB] hover:bg-[#1E2A45] hover:text-[#F1F5F9] flex items-center gap-2">
                {loading ? <Spinner size={14} /> : null}
                {loading ? 'Chargement…' : 'Charger plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LogEntry({ log }) {
  const meta = LOG_TYPE_META[log.typeAction] || { cls: 'bg-[#1E2A45] text-[#8B96AB]' }
  return (
    <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-md ${meta.cls}`}>{log.typeAction}</span>
        <span className="text-xs text-[#8B96AB]">· {log.module}</span>
      </div>
      <p className="text-sm font-bold text-[#F1F5F9] mb-0.5 break-words">{log.utilisateur?.prenom} {log.utilisateur?.nom}</p>
      <p className="text-sm text-[#8B96AB] mb-1.5 break-words">{log.description}</p>
      <p className="text-xs text-[#8B96AB] break-words">{timeAgo(log.createdAt)}{log.adresseIp ? ` · ${log.adresseIp}` : ''}</p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section 4 — Santé système (détail)
// ═════════════════════════════════════════════════════════════════════════════
function HealthDetailSection({ health, loading, error, onRetry, onForceTicket, onForceDemande }) {
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />
  if (loading || !health) {
    return <div className="flex flex-col gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
  }

  const demandes = health.demandes.listeBloquees || []
  const tickets = health.tickets.listeBloquees || []

  return (
    <div className="flex flex-col gap-5">
      <BlockedTable
        title="Demandes bloquées (+7 jours)"
        items={demandes}
        emptyLabel="Aucune demande bloquée"
        onForce={onForceDemande}
      />
      <BlockedTable
        title="Tickets bloqués (+5 jours)"
        items={tickets}
        emptyLabel="Aucun ticket bloqué"
        onForce={onForceTicket}
      />
    </div>
  )
}

function BlockedTable({ title, items, emptyLabel, onForce }) {
  return (
    <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#1E2A45] flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#F1F5F9]" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${items.length > 0 ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={CheckCircle} title={emptyLabel} subtitle="Rien à signaler pour l'instant." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-[#0B1120] border-b border-[#1E2A45]">
                {['ID', 'Demandeur', 'Statut actuel', 'Bloqué depuis', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[0.68rem] font-bold text-[#8B96AB] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={idx < items.length - 1 ? 'border-b border-[#1E2A45]' : ''}>
                  <td className="px-4 py-3 text-sm font-bold text-[#F1F5F9]">#{item.id}</td>
                  <td className="px-4 py-3 text-sm text-[#8B96AB]">{item.demandeur ? `${item.demandeur.prenom} ${item.demandeur.nom}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-[#1E2A45] text-[#8B96AB]">{item.statut}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-400 font-semibold">{item.joursBloque} j</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onForce(item)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition">
                      Forcer statut
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ForceStatusModal({ item, statut, setStatut, raison, setRaison, loading, onConfirm, onClose }) {
  const options = item.kind === 'ticket' ? STATUTS_TICKET : STATUTS_DEMANDE
  return (
    <Modal onClose={onClose} width={460}>
      <div className="p-6 pb-4 border-b border-[#1E2A45] flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>
            Forcer le statut — {item.kind === 'ticket' ? 'Ticket' : 'Demande'} #{item.id}
          </h2>
          <p className="text-xs text-[#8B96AB]">Statut actuel : {item.statutActuel}</p>
        </div>
        <button onClick={onClose} className="bg-[#1E2A45] rounded-lg p-1.5 text-[#8B96AB] hover:text-[#F1F5F9]"><X size={16} /></button>
      </div>
      <div className="p-6">
        <div className="bg-[#E8520A]/10 border border-[#E8520A]/30 rounded-xl p-3 text-xs text-orange-300 font-medium mb-4 flex gap-2">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span>Cette action bypass le workflow normal. Elle sera enregistrée dans les logs.</span>
        </div>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Nouveau statut <span className="text-red-400">*</span></label>
          <select value={statut} onChange={e => setStatut(e.target.value)} className={sel}>
            <option value="">Sélectionner un statut</option>
            {options.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#8B96AB] mb-1.5">Raison <span className="text-red-400">*</span></label>
          <textarea
            rows={3} placeholder="Expliquez pourquoi vous forcez ce changement…"
            value={raison} onChange={e => setRaison(e.target.value)}
            className={`${inp} resize-none`}
          />
        </div>
        <div className="flex gap-2.5">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button onClick={onConfirm} disabled={loading} className={primaryBtn} style={{ background: loading ? '#FCA5A5' : '#DC2626' }}>
            {loading ? <Spinner /> : 'Appliquer le changement forcé'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section 5 — Actions rapides
// ═════════════════════════════════════════════════════════════════════════════
function ActionCard({ icon: Icon, iconBg, iconColor, title, desc, buttonLabel, onClick }) {
  return (
    <div className="bg-[#131C31] rounded-2xl p-5 md:p-6 border border-[#1E2A45] shadow-sm flex flex-col hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3.5" style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <h3 className="text-sm font-bold text-[#F1F5F9] mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</h3>
      <p className="text-xs text-[#8B96AB] mb-4 flex-1">{desc}</p>
      <button onClick={onClick} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition" style={{ background: O }}>
        {buttonLabel} <ArrowRight size={14} />
      </button>
    </div>
  )
}

function ActionsSection({ recentLogs, onCreateAdmin, onOpenResetSearch, onGoHealth, onGoLogs }) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <ActionCard
          icon={UserPlus} iconBg={`${O}1A`} iconColor={O}
          title="Créer un Admin"
          desc="Ajouter un nouveau compte Administrateur SONAPIE."
          buttonLabel="Créer" onClick={onCreateAdmin}
        />
        <ActionCard
          icon={KeyRound} iconBg="#7C3AED26" iconColor="#A78BFA"
          title="Réinitialiser un mot de passe"
          desc="Débloquer un utilisateur qui ne peut plus se connecter."
          buttonLabel="Rechercher un utilisateur" onClick={onOpenResetSearch}
        />
        <ActionCard
          icon={Zap} iconBg="#DC262626" iconColor="#F87171"
          title="Forcer un statut"
          desc="Débloquer une demande ou un ticket coincé dans le workflow."
          buttonLabel="Identifier l'élément bloqué" onClick={onGoHealth}
        />
        <ActionCard
          icon={ScrollText} iconBg="#3B82F626" iconColor="#60A5FA"
          title="Voir les logs récents"
          desc="Consulter l'activité récente du système."
          buttonLabel="Ouvrir les logs" onClick={onGoLogs}
        />
      </div>

      <div className="bg-[#131C31] border border-[#1E2A45] rounded-2xl p-5 md:p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Activité récente</h3>
        {recentLogs.length === 0 ? (
          <EmptyState icon={ScrollText} title="Aucune activité récente" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentLogs.map(log => <LogEntry key={log.id} log={log} />)}
          </div>
        )}
      </div>
    </div>
  )
}
