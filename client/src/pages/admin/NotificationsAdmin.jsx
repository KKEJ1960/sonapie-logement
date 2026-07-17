import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, CheckCircle, AlertTriangle, XCircle, RefreshCw, Menu, X,
  MoreVertical, CheckCheck, Trash2,
} from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'

const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
function timeAgo(dateStr) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 2592000) return `il y a ${Math.floor(s / 86400)} j`
  return formatDateTime(dateStr)
}

const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'
const primaryBtn = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-60'

// ─── Shared UI ────────────────────────────────────────────────────────────────
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
        style={{ maxWidth: width }} className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-h-[85vh] overflow-y-auto"
      >
        {children}
      </motion.div>
    </div>
  )
}
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

// ═════════════════════════════════════════════════════════════════════════════
// Section — Notifications (design identique à NotificationsDirection / Locataire)
// ═════════════════════════════════════════════════════════════════════════════
const NOTIF_TYPE_ICON = { INFO: Bell, SUCCESS: CheckCircle, WARNING: AlertTriangle, ERROR: XCircle }
const NOTIF_TYPE_CLS = {
  INFO:    { bg: '#EFF6FF', color: '#3B82F6' },
  SUCCESS: { bg: '#F0FDF4', color: '#16A34A' },
  WARNING: { bg: '#FFFBEB', color: '#D97706' },
  ERROR:   { bg: '#FEF2F2', color: '#DC2626' },
}
const NOTIF_FILTER_TABS = [
  { key: 'TOUTES', label: 'Toutes' },
  { key: 'NON_LUES', label: 'Non lues' },
  { key: 'LUES', label: 'Lues' },
]

function NotificationDetailModal({ notification, onClose, onDelete }) {
  const Icon = NOTIF_TYPE_ICON[notification.type] || Bell
  const c = NOTIF_TYPE_CLS[notification.type] || NOTIF_TYPE_CLS.INFO
  return (
    <Modal onClose={onClose} width={440}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
            <Icon size={20} style={{ color: c.color }} />
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed mb-4">{notification.message}</p>
        <p className="text-xs text-gray-400">{formatDateTime(notification.createdAt)}</p>
        {notification.lien && (
          <a href={notification.lien} className="inline-block mt-4 text-sm font-semibold text-[#E8520A] hover:underline">
            Voir plus →
          </a>
        )}
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
          <button
            onClick={() => { onDelete(notification.id); onClose() }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 bg-red-50 border border-red-200 font-bold text-sm hover:bg-red-100 transition"
          >
            <Trash2 size={14} /> Supprimer cette notification
          </button>
        </div>
      </div>
    </Modal>
  )
}

function NotificationsList({
  notifications, loading, error, onRetry,
  onMarkOne, onMarkAll, onMarkSelectedRead, onDeleteOne, onDeleteMany,
}) {
  const [filterTab, setFilterTab] = useState('TOUTES')
  const [selected, setSelected] = useState(new Set())
  const [deletingIds, setDeletingIds] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(null) // 'LUS' | 'TOUT' | null
  const [confirmDeleteSelection, setConfirmDeleteSelection] = useState(false)
  const [detailTarget, setDetailTarget] = useState(null)

  // Ouvrir une notification la marque comme lue — une seule fois : si elle
  // est déjà lue, on se contente d'afficher le détail sans rappeler l'API.
  const openDetail = (n) => {
    setDetailTarget(n)
    if (!n.lu) onMarkOne(n.id)
  }

  const filtered = useMemo(() => {
    if (filterTab === 'NON_LUES') return notifications.filter(n => !n.lu)
    if (filterTab === 'LUES') return notifications.filter(n => n.lu)
    return notifications
  }, [notifications, filterTab])

  const hasUnread = notifications.some(n => !n.lu)
  const allFilteredSelected = filtered.length > 0 && selected.size === filtered.length

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map(n => n.id)))
  }
  const clearSelection = () => { setSelected(new Set()); setConfirmDeleteSelection(false) }

  const handleDeleteOne = (id) => {
    setDeletingIds(prev => [...prev, id])
    setTimeout(() => onDeleteOne(id), 300)
  }

  const handleMarkSelectedRead = () => {
    onMarkSelectedRead(Array.from(selected))
  }

  const handleDeleteSelected = () => {
    onDeleteMany({ ids: Array.from(selected) })
    clearSelection()
  }

  if (error) return <ErrorBanner message={error} onRetry={onRetry} />

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      {/* Barre d'actions principale */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            ref={el => { if (el) el.indeterminate = selected.size > 0 && !allFilteredSelected }}
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            disabled={filtered.length === 0}
            aria-label="Tout sélectionner"
            className="w-4 h-4 rounded border-gray-300 text-[#E8520A] focus:ring-[#E8520A] cursor-pointer disabled:cursor-default"
          />
          <span className="text-sm text-gray-500">
            {selected.size > 0 ? `${selected.size} sélectionnée${selected.size > 1 ? 's' : ''}` : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {hasUnread && (
            <button onClick={onMarkAll} className="text-sm font-semibold text-[#E8520A] hover:underline whitespace-nowrap">Tout marquer comme lu</button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)} aria-label="Plus d'options" aria-expanded={showMenu}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5">
                  <button
                    onClick={() => { setShowMenu(false); setConfirmBulk('LUS') }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    Supprimer les lus
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setConfirmBulk('TOUT') }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    Tout supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="inline-flex bg-gray-50 border border-gray-100 rounded-lg p-1 mb-4">
        {NOTIF_FILTER_TABS.map(t => (
          <button
            key={t.key} onClick={() => setFilterTab(t.key)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${filterTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Barre d'actions contextuelle */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#1A1A1A] text-white rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2.5">
              <span className="text-sm font-semibold">{selected.size} notification{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}</span>
              <div className="flex items-center gap-4 flex-wrap">
                <button onClick={handleMarkSelectedRead} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition">
                  <CheckCheck size={15} /> Marquer lues
                </button>
                {confirmDeleteSelection ? (
                  <span className="flex items-center gap-2 text-xs">
                    Supprimer {selected.size} notification{selected.size > 1 ? 's' : ''} ?
                    <button onClick={() => setConfirmDeleteSelection(false)} className="underline text-white/80 hover:text-white">Annuler</button>
                    <button onClick={handleDeleteSelected} className="font-bold text-red-400 underline hover:text-red-300">Confirmer</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteSelection(true)} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition">
                    <Trash2 size={15} /> Supprimer
                  </button>
                )}
                <button onClick={clearSelection} className="text-sm text-white/60 hover:text-white transition">✕ Désélectionner tout</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste */}
      {loading ? (
        <div className="flex flex-col gap-2.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={64} className="text-gray-200 mx-auto mb-4" />
          <p className="text-base font-bold text-gray-700" style={{ fontFamily: "'Syne', sans-serif" }}>Aucune notification</p>
          <p className="text-sm text-gray-400 mt-1">Vous êtes à jour !</p>
        </div>
      ) : (
        <div>
          {filtered.map(n => {
            const Icon = NOTIF_TYPE_ICON[n.type] || Bell
            const c = NOTIF_TYPE_CLS[n.type] || NOTIF_TYPE_CLS.INFO
            const isDeleting = deletingIds.includes(n.id)
            const isSelected = selected.has(n.id)
            return (
              <div
                key={n.id}
                className={`group flex items-start px-2 border-b border-gray-50 transition-all duration-300 ${
                  isDeleting ? 'opacity-0 max-h-0 overflow-hidden py-0 mb-0' : 'opacity-100 max-h-32 py-3 mb-0'
                } ${!n.lu ? 'border-l-4 border-l-[#E8520A] bg-orange-50/20' : 'bg-white hover:bg-gray-50/50'}`}
              >
                <input
                  type="checkbox" checked={isSelected} onChange={() => toggleSelect(n.id)}
                  aria-label="Sélectionner cette notification"
                  className={`w-5 h-5 rounded border-gray-300 mr-3 mt-1 flex-shrink-0 text-[#E8520A] focus:ring-[#E8520A] cursor-pointer transition-opacity ${selected.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                />
                <button onClick={() => openDetail(n)} className="flex items-start gap-3 flex-1 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
                    <Icon size={16} style={{ color: c.color }} />
                  </div>
                  <div className="min-w-0 flex-1 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.lu ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.lu && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ml-auto" style={{ background: O }} />}
                  </div>
                </button>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeleteOne(n.id)} title="Supprimer"
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation suppression groupée */}
      <AnimatePresence>
        {confirmBulk && (
          <Modal onClose={() => setConfirmBulk(null)} width={400}>
            <div className="p-6">
              <h3 className="text-base font-bold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
                {confirmBulk === 'TOUT' ? 'Tout supprimer' : 'Supprimer les notifications lues'}
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                {confirmBulk === 'TOUT'
                  ? 'Supprimer toutes vos notifications ? Cette action est irréversible.'
                  : 'Supprimer toutes les notifications lues ?'}
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setConfirmBulk(null)} className={`${ghostBtn} flex-1`}>Annuler</button>
                <button
                  onClick={() => {
                    onDeleteMany(confirmBulk === 'TOUT' ? { supprimerTout: true } : { supprimerLus: true })
                    setConfirmBulk(null)
                  }}
                  className={primaryBtn} style={{ background: '#EF4444' }}
                >
                  {confirmBulk === 'TOUT' ? 'Tout supprimer' : 'Confirmer'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailTarget && (
          <NotificationDetailModal notification={detailTarget} onClose={() => setDetailTarget(null)} onDelete={handleDeleteOne} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Page principale
// ═════════════════════════════════════════════════════════════════════════════
export default function NotificationsAdmin() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/admin/notifications')
      setNotifications(data.notifications)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger vos notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
              className="ad-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Notifications</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Toutes vos notifications</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <NotificationsList
            notifications={notifications} loading={loading} error={error} onRetry={fetchNotifications}
            onMarkOne={async (id) => {
              try {
                await api.patch(`/admin/notifications/${id}/lue`)
                fetchNotifications()
              } catch { fire('error', 'Impossible de marquer cette notification comme lue.') }
            }}
            onMarkAll={async () => {
              try {
                await api.patch('/admin/notifications/tout-lu')
                fire('success', 'Toutes les notifications ont été marquées comme lues.')
                fetchNotifications()
              } catch { fire('error', 'Une erreur est survenue.') }
            }}
            onMarkSelectedRead={async (ids) => {
              try {
                await Promise.all(ids.map(id => api.patch(`/admin/notifications/${id}/lue`)))
                fetchNotifications()
              } catch { fire('error', 'Impossible de marquer ces notifications comme lues.') }
            }}
            onDeleteOne={async (id) => {
              try {
                await api.delete(`/admin/notifications/${id}`)
                fetchNotifications()
              } catch { fire('error', 'Impossible de supprimer cette notification.') }
            }}
            onDeleteMany={async (payload) => {
              try {
                const { data } = await api.delete('/admin/notifications', { data: payload })
                fire('success', `${data.deleted} notification${data.deleted > 1 ? 's' : ''} supprimée${data.deleted > 1 ? 's' : ''}.`)
                fetchNotifications()
              } catch { fire('error', 'Impossible de supprimer ces notifications.') }
            }}
          />
        </main>
      </div>

      <AnimatePresence>{toast && <Toast toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
