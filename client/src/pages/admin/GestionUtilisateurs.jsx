import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  UserPlus, Search, Edit2, Trash2,
  Users, Shield, HardHat, Wrench, Zap, Building2,
  Eye, EyeOff, Check, X, AlertTriangle, Power,
  RefreshCw, Menu,
} from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

// ─── Design tokens ────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const ROLE_CONFIG = {
  SUPER_ADMIN: {
    label: 'Super Admin', color: O, border: '#FED7AA',
    bg: '#FFF7ED', gradient: `linear-gradient(135deg, ${O}, #ff6b2b)`,
    icon: Zap,
  },
  ADMIN: {
    label: 'Administrateur', color: O, border: '#FED7AA',
    bg: '#FFF7ED', gradient: `linear-gradient(135deg, ${O}, #ff6b2b)`,
    icon: Shield,
  },
  DIRECTION: {
    label: 'Direction', color: '#0e7490', border: '#A5F3FC',
    bg: '#ECFEFF', gradient: 'linear-gradient(135deg, #0e7490, #22d3ee)',
    icon: Shield,
  },
  RESPONSABLE: {
    label: 'Resp. Technique', color: '#15803d', border: '#BBF7D0',
    bg: '#F0FDF4', gradient: 'linear-gradient(135deg, #16a34a, #4ade80)',
    icon: HardHat,
  },
  TECHNICIEN: {
    label: 'Technicien', color: '#1e40af', border: '#BFDBFE',
    bg: '#EFF6FF', gradient: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
    icon: Wrench,
  },
  SERVICE_LOGEMENT: {
    label: 'Service Logement', color: G, border: 'rgba(46,125,50,0.30)',
    bg: 'rgba(46,125,50,0.10)', gradient: 'linear-gradient(135deg, #2E7D32, #66bb6a)',
    icon: Building2,
  },
  LOCATAIRE: {
    label: 'Locataire', color: '#7C3AED', border: '#DDD6FE',
    bg: '#F5F3FF', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    icon: Users,
  },
}

const EMPTY_FORM = {
  nom: '', prenom: '', email: '', telephone: '',
  role: '', password: '', confirmPassword: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (nom, prenom) =>
  `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Input / select styles ────────────────────────────────────────────────────
const inp = (err) => ({
  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
  border: `1.5px solid ${err ? '#FCA5A5' : '#E5E7EB'}`,
  background: err ? '#FFF5F5' : '#FAFAFA',
  borderRadius: 10, fontSize: '0.875rem', color: '#1A1A1A',
  outline: 'none', fontFamily: "'Inter', sans-serif",
  transition: 'border-color 180ms, box-shadow 180ms, background 180ms',
})

const sel = (err) => ({
  ...inp(err), cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36,
})

const onFocus = (e) => {
  e.target.style.borderColor = O
  e.target.style.boxShadow = '0 0 0 3px rgba(232,82,10,0.12)'
  e.target.style.background = '#FFFFFF'
}
const onBlur = (e) => {
  e.target.style.borderColor = '#E5E7EB'
  e.target.style.boxShadow = 'none'
  e.target.style.background = '#FAFAFA'
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = memo(function StatCard({ icon: Icon, label, value, color, borderColor }) {
  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: 14,
        border: '1px solid #E5E7EB',
        borderBottom: `3px solid ${borderColor || color}`,
        padding: '14px 12px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'transform 200ms, box-shadow 200ms',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: 1.1 }}>
          {value}
        </p>
        <p style={{
          fontSize: '0.74rem', color: '#666666', margin: '5px 0 0', fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </p>
      </div>
    </div>
  )
})

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = memo(function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [toast])

  if (!toast) return null
  const ok = toast.type === 'success'

  return (
    <motion.div
      className="gu-toast"
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      style={{
        position: 'fixed', top: 24, right: 24, zIndex: 9999,
        background: ok ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}`,
        borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
        minWidth: 270, maxWidth: 360,
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: ok ? '#22c55e' : '#ef4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {ok
          ? <Check size={13} color="#fff" strokeWidth={3} />
          : <X size={13} color="#fff" strokeWidth={3} />}
      </div>
      <span style={{ flex: 1, fontSize: '0.84rem', color: ok ? '#166534' : '#991b1b', fontWeight: 600 }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 2, borderRadius: 4 }}
      >
        <X size={14} />
      </button>
    </motion.div>
  )
})

// ─── Modal ────────────────────────────────────────────────────────────────────
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.60)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          animation: 'modal-in 0.18s ease-out',
          background: '#FFFFFF', borderRadius: 22,
          border: '1px solid #F1F5F9',
          boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: width,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({ label, required, error, children, half }) {
  return (
    <div style={{ marginBottom: 14, flex: half ? '1 1 calc(50% - 6px)' : '1 1 100%' }}>
      <label style={{
        display: 'block', fontSize: '0.8rem', fontWeight: 600,
        color: '#475569', marginBottom: 5,
      }}>
        {label}
        {required && <span style={{ color: O, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: '0.73rem', color: '#EF4444', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={11} /> {error}
        </p>
      )}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ onReset }) {
  return (
    <div style={{ padding: '56px 24px', textAlign: 'center' }}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ marginBottom: 16 }}>
        <circle cx="36" cy="36" r="34" fill="#F1F5F9" />
        <circle cx="36" cy="27" r="10" fill="#CBD5E1" />
        <path d="M14 58c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: '0 0 6px', fontFamily: "'Syne', sans-serif" }}>
        Aucun utilisateur trouvé
      </p>
      <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: '0 0 20px' }}>
        Essayez de modifier vos filtres de recherche.
      </p>
      <button
        onClick={onReset}
        style={{
          padding: '8px 18px', background: '#F8FAFC',
          border: '1.5px solid #E2E8F0', borderRadius: 10,
          color: '#475569', fontWeight: 600, fontSize: '0.85rem',
          fontFamily: "'Inter', sans-serif", cursor: 'pointer',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
        onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
      >
        Réinitialiser les filtres
      </button>
    </div>
  )
}

// ─── UserCard (mobile) ────────────────────────────────────────────────────────
const UserCard = memo(function UserCard({ user, onEdit, onToggle, onDelete, isSelf, isProtected, canDelete }) {
  const rc     = ROLE_CONFIG[user.role] || ROLE_CONFIG.LOCATAIRE
  const RcIcon = rc.icon || Users
  return (
    <div style={{
      background: isSelf ? 'rgba(232,82,10,0.03)' : '#FFFFFF',
      borderRadius: 14, padding: '14px 16px',
      border: '1px solid #E5E7EB',
      boxShadow: isSelf ? `inset 3px 0 0 ${O}, 0 1px 4px rgba(0,0,0,0.04)` : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: rc.gradient || '#E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isSelf ? `0 0 0 2px #FFFFFF, 0 0 0 3.5px ${O}` : 'none',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF' }}>
            {getInitials(user.nom, user.prenom)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
              {user.prenom} {user.nom}
            </p>
            {isSelf && (
              <span style={{
                fontSize: '0.63rem', fontWeight: 700, padding: '1px 6px',
                background: 'rgba(232,82,10,0.1)', color: O,
                borderRadius: 99, border: `1px solid rgba(232,82,10,0.25)`,
              }}>
                Vous
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.76rem', color: '#666666', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 9px 4px 7px', borderRadius: 8, flexShrink: 0,
          background: rc.bg, color: rc.color,
          border: `1px solid ${rc.border}`,
          fontSize: '0.74rem', fontWeight: 600,
        }}>
          <RcIcon size={11} />
          {rc.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 99, fontSize: '0.76rem', fontWeight: 600,
          background: user.actif ? '#F0FDF4' : '#F9FAFB',
          color: user.actif ? G : '#9CA3AF',
          border: `1px solid ${user.actif ? '#A7F3D0' : '#E5E7EB'}`,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: user.actif ? '#22c55e' : '#CBD5E1',
            animation: user.actif ? 'pulse-ring 1.5s ease-out infinite' : 'none',
          }} />
          {user.actif ? 'Actif' : 'Inactif'}
        </span>
        {isProtected ? (
          <span style={{ fontSize: '0.74rem', color: '#9CA3AF', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Shield size={13} style={{ color: O }} /> Protégé
          </span>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn color="#1e40af" bg="#EFF6FF" hv="#DBEAFE" title="Modifier"    onClick={() => onEdit(user)}><Edit2  size={14} /></Btn>
            <Btn color={user.actif ? '#92400e' : '#15803d'} bg={user.actif ? '#FFFBEB' : '#F0FDF4'} hv={user.actif ? '#FEF3C7' : '#DCFCE7'} title={user.actif ? 'Désactiver' : 'Activer'} onClick={() => onToggle(user)}><Power size={14} /></Btn>
            {canDelete && (
              <Btn color="#dc2626" bg="#FEF2F2" hv="#FEE2E2" title="Supprimer" onClick={() => onDelete(user)}><Trash2 size={14} /></Btn>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// ─── Action button ────────────────────────────────────────────────────────────
function Btn({ children, title, color, bg, hv, onClick }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: 8, border: 'none',
        cursor: 'pointer', background: bg, color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 150ms, transform 100ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = hv; e.currentTarget.style.transform = 'scale(1.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = bg;  e.currentTarget.style.transform = 'scale(1)' }}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#FFFFFF', borderRadius: '50%',
      display: 'inline-block', animation: 'spin .7s linear infinite',
    }} />
  )
}

// ─── Shared button styles ─────────────────────────────────────────────────────
const primaryBtn = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '11px 16px', border: 'none', borderRadius: 12, cursor: 'pointer',
  color: '#FFFFFF', fontWeight: 700, fontSize: '0.875rem',
  fontFamily: "'Inter', sans-serif", transition: 'opacity 150ms',
}
const ghostBtn = {
  flex: '0 0 auto', padding: '11px 18px', border: '1.5px solid #E2E8F0',
  borderRadius: 12, background: '#FFFFFF', color: '#475569',
  fontWeight: 600, fontSize: '0.875rem',
  fontFamily: "'Inter', sans-serif", cursor: 'pointer',
  transition: 'background 150ms',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GestionUtilisateurs() {
  const navigate = useNavigate()

  // ── Data state ────────────────────────────────────────────────────────────
  const [users,       setUsers]       = useState([])
  const [fetching,    setFetching]    = useState(true)
  const [fetchError,  setFetchError]  = useState(null)

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [target,     setTarget]     = useState(null)

  // ── Form state ────────────────────────────────────────────────────────────
  const [cForm,  setCForm]  = useState(EMPTY_FORM)
  const [cErrs,  setCErrs]  = useState({})
  const [eForm,  setEForm]  = useState({})
  const [eErrs,  setEErrs]  = useState({})

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [toast,    setToast]    = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}')

  // ── Fetch users ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const { data } = await api.get('/admin/utilisateurs')
      setUsers(data)
    } catch (err) {
      setFetchError('Impossible de charger la liste des utilisateurs.')
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || '{}')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) navigate('/login')
    else fetchUsers()
  }, [])

  const fire = useCallback((type, message) => setToast({ type, message }), [])

  // ── Derived data ──────────────────────────────────────────────────────────
  // Défense en profondeur : même si le backend filtre déjà, un ADMIN standard
  // ne doit jamais voir un compte SUPER_ADMIN dans cette interface.
  const visibleUsers = useMemo(() => (
    currentUser?.role === 'ADMIN' ? users.filter(u => u.role !== 'SUPER_ADMIN') : users
  ), [users, currentUser?.role])

  const filtered = useMemo(() => visibleUsers.filter(u => {
    const q = search.toLowerCase()
    const ms = !q || u.nom.toLowerCase().includes(q) || u.prenom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const mr = filterRole   === 'ALL' || u.role === filterRole
    const mv = filterStatus === 'ALL' || (filterStatus === 'ACTIF' && u.actif) || (filterStatus === 'INACTIF' && !u.actif)
    return ms && mr && mv
  }), [visibleUsers, search, filterRole, filterStatus])

  const stats = useMemo(() => ({
    total:        visibleUsers.length,
    admins:       visibleUsers.filter(u => u.role === 'ADMIN').length,
    responsables: visibleUsers.filter(u => u.role === 'RESPONSABLE').length,
    techniciens:  visibleUsers.filter(u => u.role === 'TECHNICIEN').length,
  }), [visibleUsers])

  // ── Validation ────────────────────────────────────────────────────────────
  function vCreate() {
    const e = {}
    if (!cForm.nom.trim())    e.nom  = 'Champ requis'
    if (!cForm.prenom.trim()) e.prenom = 'Champ requis'
    if (!cForm.email.trim())  e.email = 'Champ requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cForm.email)) e.email = 'Email invalide'
    if (!cForm.role)          e.role = 'Champ requis'
    if (!cForm.password)      e.password = 'Champ requis'
    else if (cForm.password.length < 8) e.password = 'Minimum 8 caractères'
    if (!cForm.confirmPassword) e.confirmPassword = 'Champ requis'
    else if (cForm.password !== cForm.confirmPassword) e.confirmPassword = 'Ne correspondent pas'
    return e
  }
  function vEdit() {
    const e = {}
    if (!eForm.nom?.trim())    e.nom    = 'Champ requis'
    if (!eForm.prenom?.trim()) e.prenom = 'Champ requis'
    if (!eForm.email?.trim())  e.email  = 'Champ requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eForm.email)) e.email = 'Email invalide'
    if (!eForm.role)           e.role   = 'Champ requis'
    return e
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    const errs = vCreate()
    if (Object.keys(errs).length) { setCErrs(errs); return }
    setLoading(true)
    try {
      await api.post('/admin/utilisateurs', {
        nom:       cForm.nom.trim(),
        prenom:    cForm.prenom.trim(),
        email:     cForm.email.trim(),
        telephone: cForm.telephone.trim(),
        role:      cForm.role,
        password:  cForm.password,
      })
      await fetchUsers()
      setCForm(EMPTY_FORM); setCErrs({})
      setShowCreate(false)
      fire('success', 'Compte créé avec succès !')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    const errs = vEdit()
    if (Object.keys(errs).length) { setEErrs(errs); return }
    setLoading(true)
    try {
      await api.put(`/admin/utilisateurs/${eForm.id}`, {
        nom:       eForm.nom.trim(),
        prenom:    eForm.prenom.trim(),
        email:     eForm.email.trim(),
        telephone: (eForm.telephone || '').trim(),
        role:      eForm.role,
      })
      await fetchUsers()
      setShowEdit(false)
      fire('success', 'Compte modifié avec succès !')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la modification.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await api.delete(`/admin/utilisateurs/${target.id}`)
      await fetchUsers()
      setShowDelete(false); setTarget(null)
      fire('success', 'Compte supprimé.')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la suppression.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = useCallback(async (user) => {
    try {
      await api.patch(`/admin/utilisateurs/${user.id}/toggle`)
      await fetchUsers()
      fire('success', `Compte ${user.actif ? 'désactivé' : 'activé'}.`)
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du changement de statut.')
    }
  }, [fire, fetchUsers])

  const handleSearch  = useCallback((e) => setSearch(e.target.value), [])
  const openEdit      = useCallback((user) => { setEForm({ ...user }); setEErrs({}); setShowEdit(true) }, [])
  const openDelete    = useCallback((user) => { setTarget(user); setShowDelete(true) }, [])
  const resetFilters  = useCallback(() => { setSearch(''); setFilterRole('ALL'); setFilterStatus('ALL') }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden" style={{ background: '#F4F6F9' }}>

      {/* ── Sticky topbar ───────────────────────────────────────────────── */}
      <div className="gu-topbar" style={{
        background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
        padding: '18px 24px 16px', position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={mobileNavOpen}
            className="ad-hamburger md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 12, marginLeft: -12, display: 'flex', color: '#374151', borderRadius: 8, flexShrink: 0 }}
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="gu-breadcrumb" style={{ fontSize: '0.74rem', color: '#94A3B8', margin: '0 0 2px', fontWeight: 500 }}>
              Dashboard / Utilisateurs
            </p>
            <h1 className="gu-page-title" style={{
              fontFamily: "'Syne', sans-serif", fontSize: '1.55rem',
              fontWeight: 700, color: '#1A1A1A', margin: 0,
            }}>
              Gestion des utilisateurs
            </h1>
          </div>
        </div>
        <button
          className="gu-btn-new"
          onClick={() => { setCForm(EMPTY_FORM); setCErrs({}); setShowPwd(false); setShowPwd2(false); setShowCreate(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', background: O,
            boxShadow: '0 4px 12px rgba(232,82,10,0.22)',
            color: '#FFFFFF', border: 'none', borderRadius: 12,
            fontWeight: 700, fontSize: '0.875rem',
            fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            flexShrink: 0, touchAction: 'manipulation',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#c4430a' }}
          onMouseLeave={e => { e.currentTarget.style.background = O }}
        >
          <UserPlus size={16} />
          <span className="gu-btn-text">Nouvel utilisateur</span>
        </button>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="gu-content" style={{ padding: '24px 24px 48px' }}>

        {/* Erreur de chargement */}
        {fetchError && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12,
            padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.875rem', color: '#991b1b', fontWeight: 500 }}>{fetchError}</span>
            <button
              onClick={fetchUsers}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', background: '#FEE2E2',
                border: '1px solid #FECACA', borderRadius: 8,
                fontSize: '0.8rem', fontWeight: 600, color: '#DC2626', cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} /> Réessayer
            </button>
          </div>
        )}

        {/* ── Stats cards ───────────────────────────────────────────────── */}
        <div className="gu-stats" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginBottom: 24,
        }}>
          <StatCard icon={Users}    label="Utilisateurs"  value={fetching ? '…' : stats.total}        color={O}        borderColor={O} />
          <StatCard icon={Shield}   label="Admins"        value={fetching ? '…' : stats.admins}       color={O}        borderColor={O} />
          <StatCard icon={HardHat}  label="Responsables"  value={fetching ? '…' : stats.responsables} color={G}        borderColor={G} />
          <StatCard icon={Wrench}   label="Techniciens"   value={fetching ? '…' : stats.techniciens}  color="#3B82F6"  borderColor="#3B82F6" />
        </div>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="gu-filters" style={{
          background: '#FFFFFF', border: '1px solid #E5E7EB',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap', marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div className="gu-search" style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              placeholder="Rechercher par nom, email…"
              value={search}
              onChange={handleSearch}
              onFocus={onFocus} onBlur={onBlur}
              style={{ ...inp(false), paddingLeft: 36 }}
            />
          </div>

          <select className="gu-sel-role" value={filterRole} onChange={e => setFilterRole(e.target.value)} onFocus={onFocus} onBlur={onBlur}
            style={{ ...sel(false), flex: '0 0 auto', minWidth: 158 }}>
            <option value="ALL">Tous les rôles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Administrateur</option>
            <option value="DIRECTION">Direction</option>
            <option value="RESPONSABLE">Resp. Technique</option>
            <option value="TECHNICIEN">Technicien</option>
            <option value="SERVICE_LOGEMENT">Service Logement</option>
            <option value="LOCATAIRE">Locataire</option>
          </select>

          <select className="gu-sel-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} onFocus={onFocus} onBlur={onBlur}
            style={{ ...sel(false), flex: '0 0 auto', minWidth: 150 }}>
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
          </select>

          <span className="gu-count" style={{ fontSize: '0.78rem', color: '#94A3B8', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {fetching ? '…' : `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ── Desktop table ─────────────────────────────────────────────── */}
        <div className="gu-table-wrap" style={{
          background: '#FFFFFF', border: '1px solid #E5E7EB',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: '#F4F6F9', borderBottom: '1px solid #E5E7EB' }}>
                  {['Utilisateur', 'Rôle', 'Téléphone', 'Créé le', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '12px 18px', textAlign: 'left',
                      fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8',
                      textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr>
                    <td colSpan={6}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: 12, color: '#94A3B8' }}>
                        <div style={{ width: 18, height: 18, border: '2.5px solid #E5E7EB', borderTopColor: O, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                        <span style={{ fontSize: '0.875rem' }}>Chargement des utilisateurs…</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}><EmptyState onReset={resetFilters} /></td>
                  </tr>
                ) : (
                  filtered.map((user, idx) => {
                    const rc     = ROLE_CONFIG[user.role] || ROLE_CONFIG.LOCATAIRE
                    const RcIcon = rc.icon || Users
                    const isSelf = user.email === currentUser?.email
                    // Sécurité redondante : un ADMIN standard ne doit jamais pouvoir
                    // agir sur un compte SUPER_ADMIN (le backend filtre déjà cette liste).
                    const isProtected = isSelf || (user.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN')

                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: idx < filtered.length - 1 ? '1px solid #E5E7EB' : 'none',
                          background: isSelf ? 'rgba(232,82,10,0.03)' : 'transparent',
                          boxShadow: isSelf ? 'inset 3px 0 0 #E8520A' : 'none',
                          transition: 'background 120ms',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isSelf ? 'rgba(232,82,10,0.06)' : 'rgba(232,82,10,0.025)'}
                        onMouseLeave={e => e.currentTarget.style.background = isSelf ? 'rgba(232,82,10,0.03)' : 'transparent'}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                              background: rc.gradient || '#E5E7EB',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: isSelf ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${O}` : 'none',
                            }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF' }}>
                                {getInitials(user.nom, user.prenom)}
                              </span>
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1A1A1A' }}>
                                  {user.prenom} {user.nom}
                                </p>
                                {isSelf && (
                                  <span style={{
                                    fontSize: '0.65rem', fontWeight: 700, lineHeight: 1,
                                    padding: '2px 7px', borderRadius: 99,
                                    background: 'rgba(232,82,10,0.1)',
                                    color: O, border: `1px solid rgba(232,82,10,0.25)`,
                                  }}>
                                    Vous
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: 0, fontSize: '0.76rem', color: '#666666' }}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px 5px 8px', borderRadius: 8,
                            background: rc.bg, color: rc.color,
                            border: `1px solid ${rc.border}`,
                            fontSize: '0.78rem', fontWeight: 600,
                          }}>
                            <RcIcon size={13} />
                            {rc.label}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: user.telephone ? '#1A1A1A' : '#D1D5DB' }}>
                          {user.telephone || '—'}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: '#666666', whiteSpace: 'nowrap' }}>
                          {formatDate(user.createdAt)}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 99,
                            background: user.actif ? '#F0FDF4' : '#F9FAFB',
                            color: user.actif ? G : '#9CA3AF',
                            border: `1px solid ${user.actif ? '#A7F3D0' : '#E5E7EB'}`,
                            fontSize: '0.78rem', fontWeight: 600,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: user.actif ? '#22c55e' : '#CBD5E1',
                              animation: user.actif ? 'pulse-ring 1.5s ease-out infinite' : 'none',
                              flexShrink: 0,
                            }} />
                            {user.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {isProtected ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: '0.74rem', color: '#9CA3AF', fontStyle: 'italic',
                            }}>
                              <Shield size={13} style={{ color: O, flexShrink: 0 }} />
                              Compte protégé
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Btn color="#1e40af" bg="#EFF6FF" hv="#DBEAFE" title="Modifier"  onClick={() => openEdit(user)}><Edit2  size={14} /></Btn>
                              <Btn color={user.actif ? '#92400e' : '#15803d'} bg={user.actif ? '#FFFBEB' : '#F0FDF4'} hv={user.actif ? '#FEF3C7' : '#DCFCE7'} title={user.actif ? 'Désactiver' : 'Activer'} onClick={() => handleToggle(user)}><Power size={14} /></Btn>
                              {currentUser?.role === 'SUPER_ADMIN' && (
                                <Btn color="#dc2626" bg="#FEF2F2" hv="#FEE2E2" title="Supprimer" onClick={() => openDelete(user)}><Trash2 size={14} /></Btn>
                              )}
                            </div>
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

        {/* ── Mobile cards ──────────────────────────────────────────────── */}
        <div className="gu-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
          {fetching ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <div style={{ width: 22, height: 22, border: '2.5px solid #E5E7EB', borderTopColor: O, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
              Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            filtered.map(user => (
              <UserCard
                key={user.id} user={user}
                isSelf={user.email === currentUser?.email}
                isProtected={user.email === currentUser?.email || (user.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN')}
                canDelete={currentUser?.role === 'SUPER_ADMIN'}
                onEdit={openEdit}
                onToggle={handleToggle}
                onDelete={openDelete}
              />
            ))
          )}
        </div>

      </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>

        {/* ── Create modal ───────────────────────────────────────────────── */}
        {showCreate && (
          <Modal onClose={() => setShowCreate(false)}>
            <div style={{
              padding: '22px 24px 18px',
              background: 'linear-gradient(135deg, #fff7ed, #ffffff)',
              borderBottom: '1px solid #FEE8D5',
              borderRadius: '22px 22px 0 0',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>
                  Créer un compte
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
                  Tous les champs marqués <span style={{ color: O }}>*</span> sont obligatoires
                </p>
              </div>
              <button onClick={() => setShowCreate(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 9, cursor: 'pointer', padding: 7, display: 'flex', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '18px 24px 22px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px' }}>
                <Field label="Prénom" required error={cErrs.prenom} half>
                  <input style={inp(cErrs.prenom)} value={cForm.prenom} onFocus={onFocus} onBlur={onBlur}
                    onChange={e => { setCForm(p => ({ ...p, prenom: e.target.value })); setCErrs(p => ({ ...p, prenom: '' })) }} />
                </Field>
                <Field label="Nom" required error={cErrs.nom} half>
                  <input style={inp(cErrs.nom)} value={cForm.nom} onFocus={onFocus} onBlur={onBlur}
                    onChange={e => { setCForm(p => ({ ...p, nom: e.target.value })); setCErrs(p => ({ ...p, nom: '' })) }} />
                </Field>
              </div>

              <Field label="Adresse email" required error={cErrs.email}>
                <input type="email" style={inp(cErrs.email)} value={cForm.email} onFocus={onFocus} onBlur={onBlur}
                  onChange={e => { setCForm(p => ({ ...p, email: e.target.value })); setCErrs(p => ({ ...p, email: '' })) }} />
              </Field>

              <Field label="Numéro de téléphone" error={cErrs.telephone}>
                <input placeholder="+225 07 00 00 00 00" style={inp(false)} value={cForm.telephone} onFocus={onFocus} onBlur={onBlur}
                  onChange={e => setCForm(p => ({ ...p, telephone: e.target.value }))} />
              </Field>

              <Field label="Rôle" required error={cErrs.role}>
                <select style={sel(cErrs.role)} value={cForm.role} onFocus={onFocus} onBlur={onBlur}
                  onChange={e => { setCForm(p => ({ ...p, role: e.target.value })); setCErrs(p => ({ ...p, role: '' })) }}>
                  <option value="">Sélectionner un rôle</option>
                  <option value="ADMIN">Administrateur</option>
                  <option value="DIRECTION">Direction</option>
                  <option value="RESPONSABLE">Responsable Technique</option>
                  <option value="TECHNICIEN">Technicien</option>
                  <option value="SERVICE_LOGEMENT">Service Logement</option>
                  <option value="LOCATAIRE">Locataire</option>
                </select>
              </Field>

              <Field label="Mot de passe" required error={cErrs.password}>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'}
                    style={{ ...inp(cErrs.password), paddingRight: 42 }}
                    value={cForm.password} onFocus={onFocus} onBlur={onBlur}
                    onChange={e => { setCForm(p => ({ ...p, password: e.target.value })); setCErrs(p => ({ ...p, password: '' })) }} />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              <Field label="Confirmer le mot de passe" required error={cErrs.confirmPassword}>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd2 ? 'text' : 'password'}
                    style={{ ...inp(cErrs.confirmPassword), paddingRight: 42 }}
                    value={cForm.confirmPassword} onFocus={onFocus} onBlur={onBlur}
                    onChange={e => { setCForm(p => ({ ...p, confirmPassword: e.target.value })); setCErrs(p => ({ ...p, confirmPassword: '' })) }} />
                  <button type="button" onClick={() => setShowPwd2(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                    {showPwd2 ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={ghostBtn}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
                  Annuler
                </button>
                <button type="submit" disabled={loading}
                  style={{ ...primaryBtn, background: loading ? '#f0956a' : O, boxShadow: loading ? 'none' : '0 3px 10px rgba(232,82,10,0.25)' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c4430a' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = O }}>
                  {loading ? <Spinner /> : <><UserPlus size={15} /> Créer le compte</>}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── Edit modal ─────────────────────────────────────────────────── */}
        {showEdit && (
          <Modal onClose={() => setShowEdit(false)}>
            <div style={{
              padding: '22px 24px 18px',
              background: 'linear-gradient(135deg, #f0fdf4, #ffffff)',
              borderBottom: '1px solid #DCFCE7',
              borderRadius: '22px 22px 0 0',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>
                  Modifier le compte
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
                  {eForm.prenom} {eForm.nom}
                </p>
              </div>
              <button onClick={() => setShowEdit(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 9, cursor: 'pointer', padding: 7, display: 'flex', color: '#64748B' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEdit} style={{ padding: '18px 24px 22px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px' }}>
                <Field label="Prénom" required error={eErrs.prenom} half>
                  <input style={inp(eErrs.prenom)} value={eForm.prenom || ''} onFocus={onFocus} onBlur={onBlur}
                    onChange={e => { setEForm(p => ({ ...p, prenom: e.target.value })); setEErrs(p => ({ ...p, prenom: '' })) }} />
                </Field>
                <Field label="Nom" required error={eErrs.nom} half>
                  <input style={inp(eErrs.nom)} value={eForm.nom || ''} onFocus={onFocus} onBlur={onBlur}
                    onChange={e => { setEForm(p => ({ ...p, nom: e.target.value })); setEErrs(p => ({ ...p, nom: '' })) }} />
                </Field>
              </div>

              <Field label="Adresse email" required error={eErrs.email}>
                <input type="email" style={inp(eErrs.email)} value={eForm.email || ''} onFocus={onFocus} onBlur={onBlur}
                  onChange={e => { setEForm(p => ({ ...p, email: e.target.value })); setEErrs(p => ({ ...p, email: '' })) }} />
              </Field>

              <Field label="Numéro de téléphone">
                <input placeholder="+225 07 00 00 00 00" style={inp(false)} value={eForm.telephone || ''} onFocus={onFocus} onBlur={onBlur}
                  onChange={e => setEForm(p => ({ ...p, telephone: e.target.value }))} />
              </Field>

              {currentUser?.role === 'SUPER_ADMIN' ? (
                <Field label="Rôle" required error={eErrs.role}>
                  <select style={sel(eErrs.role)} value={eForm.role || ''} onFocus={onFocus} onBlur={onBlur}
                    onChange={e => { setEForm(p => ({ ...p, role: e.target.value })); setEErrs(p => ({ ...p, role: '' })) }}>
                    <option value="">Sélectionner un rôle</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="DIRECTION">Direction</option>
                    <option value="RESPONSABLE">Responsable Technique</option>
                    <option value="TECHNICIEN">Technicien</option>
                    <option value="SERVICE_LOGEMENT">Service Logement</option>
                    <option value="LOCATAIRE">Locataire</option>
                  </select>
                </Field>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0 0 3px' }}>
                    Rôle : <strong style={{ color: '#374151' }}>{ROLE_CONFIG[eForm.role]?.label || eForm.role}</strong>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic', margin: 0 }}>
                    Le rôle ne peut être modifié que par un Super Administrateur
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setShowEdit(false)} style={ghostBtn}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
                  Annuler
                </button>
                <button type="submit" disabled={loading}
                  style={{ ...primaryBtn, background: loading ? '#86efac' : G, boxShadow: loading ? 'none' : '0 3px 10px rgba(46,125,50,0.22)' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1b5e20' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = G }}>
                  {loading ? <Spinner /> : <><Check size={15} /> Enregistrer</>}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── Delete modal ───────────────────────────────────────────────── */}
        {showDelete && target && (
          <Modal onClose={() => setShowDelete(false)} width={400}>
            <div style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={26} style={{ color: '#EF4444' }} />
              </div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                Supprimer ce compte ?
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 6px' }}>
                Vous allez supprimer définitivement le compte de
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 18px' }}>
                {target.prenom} {target.nom}
              </p>
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 10, padding: '9px 14px',
                fontSize: '0.8rem', color: '#DC2626', marginBottom: 22, fontWeight: 500,
              }}>
                Cette action est irréversible.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDelete(false)} style={{ ...ghostBtn, flex: 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={loading}
                  style={{ ...primaryBtn, background: loading ? '#FCA5A5' : '#EF4444', boxShadow: loading ? 'none' : '0 4px 14px rgba(239,68,68,0.25)' }}>
                  {loading ? <Spinner /> : <><Trash2 size={14} /> Supprimer</>}
                </button>
              </div>
            </div>
          </Modal>
        )}

      </AnimatePresence>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <style>{`
        .gu-table-wrap { display: block; }
        .gu-cards      { display: none;  }

        @media (max-width: 640px) {
          .gu-table-wrap   { display: none !important; }
          .gu-cards        { display: flex !important; flex-direction: column; gap: 10px; }
          .gu-topbar       { padding: 12px 14px 10px !important; }
          .gu-content      { padding: 12px 12px 20px !important; }
          .gu-stats        { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .gu-filters      { padding: 10px 12px !important; }
          .gu-search       { flex: 1 1 100% !important; }
          .gu-sel-role,
          .gu-sel-status   { flex: 1 1 calc(50% - 5px) !important; min-width: 0 !important; }
          .gu-count        { display: none !important; }
          .gu-toast        { top: 64px !important; right: 12px !important; left: 12px !important;
                             min-width: 0 !important; max-width: calc(100vw - 24px) !important; }
        }

        @media (max-width: 420px) {
          .gu-breadcrumb   { display: none !important; }
          .gu-page-title   { font-size: 1.2rem !important; }
          .gu-btn-text     { display: none !important; }
          .gu-btn-new      { padding: 10px 13px !important; }
        }

        @media (max-width: 359px) {
          .gu-stats        { grid-template-columns: 1fr !important; }
          .gu-sel-role,
          .gu-sel-status   { flex: 1 1 100% !important; }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .gu-content      { padding: 18px 18px 32px !important; }
          .gu-stats        { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (min-width: 1440px) {
          .gu-content      { padding: 28px 32px 56px !important; }
          .gu-stats        { gap: 18px !important; }
        }

        @keyframes modal-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
          70%  { box-shadow: 0 0 0 5px rgba(34,197,94,0);  }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0);    }
        }
      `}</style>
    </div>
  )
}
