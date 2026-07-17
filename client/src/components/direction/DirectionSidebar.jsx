import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, ScrollText, BarChart3, LogOut, X, FolderCheck,
  Bell, Archive,
} from 'lucide-react'
import api from '../../services/api.js'

const O = '#E8520A'

const NAV_DASHBOARD = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord', path: '/direction/dashboard' },
]
const NAV_MUTATIONS = [
  { key: 'mutations', icon: ArrowLeftRight, label: 'Mutations', path: '/direction/mutations', badgeKey: 'mutations' },
]
const NAV_DOSSIERS = [
  { key: 'dossiers', icon: FolderCheck, label: 'Dossiers clients', path: '/direction/dossiers', badgeKey: 'dossiers' },
  { key: 'historique', icon: Archive, label: 'Historique dossiers', path: '/direction/historique' },
]
const NAV_RAPPORTS = [
  { key: 'rapports', icon: BarChart3,  label: 'Rapports',            path: '/direction/rapports' },
  { key: 'journal',  icon: ScrollText, label: "Journal d'activité",  path: '/direction/journal' },
]
const NAV_COMPTE = [
  { key: 'notifications', icon: Bell, label: 'Notifications', path: '/direction/notifications', badgeKey: 'notifications' },
]

// Petit cache mémoire pour le badge « Dossiers clients » (nombre de dossiers
// SOUMIS non encore traités) — même logique de cache court que fetchStatsCached.
const DOSSIERS_CACHE_TTL = 20000
let dossiersCountCache = null

async function fetchDossiersSoumisCountCached() {
  if (dossiersCountCache && Date.now() - dossiersCountCache.ts < DOSSIERS_CACHE_TTL) {
    return dossiersCountCache.count
  }
  const { data } = await api.get('/dossiers', { params: { statut: 'SOUMIS' } })
  const count = data.length
  dossiersCountCache = { count, ts: Date.now() }
  return count
}

// Petit cache mémoire pour /direction/stats : évite de re-fetcher (et de faire
// "clignoter" les badges) à chaque changement de page direction, la sidebar
// étant remontée à neuf sur chaque page. TTL court pour rester à jour.
const STATS_CACHE_TTL = 20000
let statsCache = null // { data, ts }

async function fetchStatsCached() {
  if (statsCache && Date.now() - statsCache.ts < STATS_CACHE_TTL) {
    return statsCache.data
  }
  const { data } = await api.get('/direction/stats')
  statsCache = { data, ts: Date.now() }
  return data
}

// Petit cache mémoire pour le badge « Notifications » (nombre de non lues).
const NOTIF_CACHE_TTL = 20000
let notifCountCache = null

async function fetchNotifCountCached() {
  if (notifCountCache && Date.now() - notifCountCache.ts < NOTIF_CACHE_TTL) {
    return notifCountCache.count
  }
  const { data } = await api.get('/direction/notifications')
  const count = data.nonLues
  notifCountCache = { count, ts: Date.now() }
  return count
}

// ─── Contenu partagé (logo + nav) ───────────────────────────────────────────────
function SidebarInner({ stats, dossiersCount, notifCount, activePath, onNavigate, onLogout }) {
  const renderGroup = (title, items) => (
    <>
      {title && <p className="text-xs text-gray-400 uppercase tracking-wider font-bold px-3 mb-2 mt-5 first:mt-0">{title}</p>}
      {items.map(({ key, icon: Icon, label, path, badgeKey }) => {
        const active = activePath === path
        const badgeValue = badgeKey === 'mutations' ? stats?.detail?.mutations?.enAttente
          : badgeKey === 'dossiers' ? dossiersCount
          : badgeKey === 'notifications' ? notifCount
          : null
        return (
          <button
            key={key}
            onClick={() => onNavigate(path)}
            aria-current={active ? 'page' : undefined}
            className={`w-full flex items-center gap-3 mb-1 pl-3 pr-2.5 py-3 text-sm transition ${
              active
                ? 'border-l-4 border-[#E8520A] bg-[#E8520A]/10 text-[#E8520A] font-semibold rounded-r-xl'
                : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:text-[#E8520A] rounded-xl'
            }`}
          >
            <Icon size={17} style={{ color: active ? O : '#9CA3AF' }} className="flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">{label}</span>
            {!!badgeValue && (
              <span className="text-[0.68rem] font-bold text-[#E8520A]">
                {badgeValue}
                <span className="sr-only"> en attente</span>
              </span>
            )}
          </button>
        )
      })}
    </>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5">
        <img
          src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg" alt="SONAPIE"
          width="150" height="64" style={{ width: 150, height: 'auto', mixBlendMode: 'multiply' }}
        />
      </div>

      <nav className="flex-1 px-3 overflow-y-auto" aria-label="Navigation principale">
        {renderGroup(null, NAV_DASHBOARD)}
        {renderGroup('Dossiers clients', NAV_DOSSIERS)}
        {renderGroup('Gestion des mutations', NAV_MUTATIONS)}
        {renderGroup('Compte', NAV_COMPTE)}
        {renderGroup('Rapports', NAV_RAPPORTS)}
      </nav>

      <div className="mx-3 mb-1">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition"
        >
          <LogOut size={17} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Se déconnecter</span>
        </button>
      </div>
      <div className="h-3" />
    </div>
  )
}

// ─── Sidebar partagée : desktop (sticky) + tiroir mobile (overlay) ─────────────
// Utilisation : <DirectionSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
// Le parent doit fournir un bouton hamburger avec la classe "dir-hamburger" et
// onClick={() => setMobileNavOpen(true)} dans sa propre topbar.
export default function DirectionSidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState(statsCache?.data ?? null)
  const [dossiersCount, setDossiersCount] = useState(dossiersCountCache?.count ?? null)
  const [notifCount, setNotifCount] = useState(notifCountCache?.count ?? null)

  const closeBtnRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    fetchStatsCached().then(setStats).catch(() => {})
    fetchDossiersSoumisCountCached().then(setDossiersCount).catch(() => {})
    fetchNotifCountCached().then(setNotifCount).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement
    closeBtnRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  const logout = () => { sessionStorage.removeItem('token'); sessionStorage.removeItem('user'); navigate('/login') }
  const goMobile = (path) => { navigate(path); onClose?.() }

  return (
    <>
      <aside className="dir-sidebar w-[264px] flex-shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0 overflow-y-auto flex flex-col z-40">
        <SidebarInner stats={stats} dossiersCount={dossiersCount} notifCount={notifCount} activePath={location.pathname} onNavigate={navigate} onLogout={logout} />
      </aside>

      {open && <div className="dir-overlay fixed inset-0 z-[199] bg-black/40" onClick={onClose} aria-hidden="true" />}
      <aside
        className="dir-drawer fixed top-0 left-0 bottom-0 z-[200] w-[264px] max-w-[80vw] bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 will-change-transform"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
        role="dialog" aria-modal="true" aria-label="Menu de navigation" aria-hidden={!open}
      >
        <div className="relative flex-1 flex flex-col min-h-0">
          <button
            ref={closeBtnRef} onClick={onClose} aria-label="Fermer le menu"
            tabIndex={open ? 0 : -1}
            className="absolute top-3 right-3 p-3 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 z-10"
          >
            <X size={18} />
          </button>
          <SidebarInner stats={stats} dossiersCount={dossiersCount} notifCount={notifCount} activePath={location.pathname} onNavigate={goMobile} onLogout={logout} />
        </div>
      </aside>

      <style>{`
        @media (max-width: 767px) { .dir-sidebar { display: none !important; } }
        @media (min-width: 768px) { .dir-drawer, .dir-overlay, .dir-hamburger { display: none !important; } }
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
      `}</style>
    </>
  )
}
