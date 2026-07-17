import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, FileText, ArrowLeftRight, Wrench, BarChart3,
  Settings, HelpCircle, LogOut, ChevronDown, X,
} from 'lucide-react'
import api from '../../services/api.js'

const O = '#E8520A'

const NAV_MAIN = [
  { key: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard',    path: '/admin/dashboard' },
  { key: 'utilisateurs', icon: Users,           label: 'Utilisateurs', path: '/admin/utilisateurs' },
  { key: 'logements',    icon: Building2,       label: 'Logements',    path: '/admin/logements' },
  { key: 'demandes',     icon: FileText,        label: 'Demandes',     path: '/admin/demandes',    badgeKey: 'demandes' },
  { key: 'mutations',    icon: ArrowLeftRight,  label: 'Mutations',    path: '/admin/mutations',   badgeKey: 'mutations' },
  { key: 'maintenance',  icon: Wrench,          label: 'Maintenance',  path: '/admin/maintenance', badgeKey: 'maintenance' },
  { key: 'rapports',     icon: BarChart3,       label: 'Rapports',     path: '/admin/rapports' },
]
const NAV_GENERAL = [
  { key: 'parametres', icon: Settings,   label: 'Paramètres', path: '/admin/parametres' },
  { key: 'aide',       icon: HelpCircle, label: 'Aide',       path: '/admin/aide' },
]

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'

// Petit cache mémoire pour /admin/stats : évite de re-fetcher (et de faire
// "clignoter" les badges) à chaque changement de page admin, la sidebar
// étant remontée à neuf sur chaque page. TTL court pour rester à jour.
const STATS_CACHE_TTL = 20000
let statsCache = null // { data, ts }

async function fetchStatsCached() {
  if (statsCache && Date.now() - statsCache.ts < STATS_CACHE_TTL) {
    return statsCache.data
  }
  const { data } = await api.get('/admin/stats')
  statsCache = { data, ts: Date.now() }
  return data
}

// ─── Contenu partagé (logo + nav + profil) ─────────────────────────────────────
function SidebarInner({ stats, currentUser, initials, activePath, onNavigate, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5">
        <img
          src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg" alt="SONAPIE"
          width="150" height="64" style={{ width: 150, height: 'auto', mixBlendMode: 'multiply' }}
        />
      </div>

      <nav className="flex-1 px-3 overflow-y-auto" aria-label="Navigation principale">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold px-3 mb-2">Menu</p>
        {NAV_MAIN.map(({ key, icon: Icon, label, path, badgeKey }) => {
          const active = activePath === path
          const badgeValue = badgeKey === 'demandes' ? stats?.demandes?.enAttente
            : badgeKey === 'mutations' ? stats?.mutations?.enAttente
            : badgeKey === 'maintenance' ? stats?.tickets?.enCours
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

        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold px-3 mt-5 mb-2">Général</p>
        {NAV_GENERAL.map(({ key, icon: Icon, label, path }) => (
          <button
            key={key}
            onClick={() => onNavigate(path)}
            aria-current={activePath === path ? 'page' : undefined}
            className="w-full flex items-center gap-3 mb-1 pl-3 pr-2.5 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#E8520A] rounded-xl transition"
          >
            <Icon size={17} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">{label}</span>
          </button>
        ))}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 mb-1 pl-3 pr-2.5 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition"
        >
          <LogOut size={17} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Se déconnecter</span>
        </button>
      </nav>

      <div className="bg-gray-50 rounded-2xl mx-3 mb-4 p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }} aria-hidden="true">
            <span className="text-xs font-extrabold text-white">{initials || 'AD'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.prenom} {currentUser.nom}</p>
            <p className="text-xs text-gray-500">Administrateur</p>
          </div>
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar partagée : desktop (sticky) + tiroir mobile (overlay) ─────────────
// Utilisation : <AdminSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
// Le parent doit fournir un bouton hamburger avec la classe "ad-hamburger" et
// onClick={() => setMobileNavOpen(true)} dans sa propre topbar.
export default function AdminSidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || '{}'), [])
  const initials = getInitials(currentUser.nom, currentUser.prenom)
  const [stats, setStats] = useState(statsCache?.data ?? null)

  const closeBtnRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    fetchStatsCached().then(setStats).catch(() => {})
  }, [])

  // Verrouille le scroll de l'arrière-plan + gère le focus + Échap pendant
  // que le tiroir mobile est ouvert, pour une navigation tactile propre.
  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement
    closeBtnRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
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
      {/* Desktop */}
      <aside className="ad-sidebar w-[260px] flex-shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0 overflow-y-auto flex flex-col z-40">
        <SidebarInner
          stats={stats} currentUser={currentUser} initials={initials}
          activePath={location.pathname} onNavigate={navigate} onLogout={logout}
        />
      </aside>

      {/* Tiroir mobile */}
      {open && (
        <div className="ad-overlay fixed inset-0 z-[199] bg-black/40" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className="ad-drawer fixed top-0 left-0 bottom-0 z-[200] w-[260px] max-w-[80vw] bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 will-change-transform"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        aria-hidden={!open}
      >
        <div className="relative flex-1 flex flex-col min-h-0">
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Fermer le menu"
            tabIndex={open ? 0 : -1}
            className="absolute top-3 right-3 p-3 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 z-10"
          >
            <X size={18} />
          </button>
          <SidebarInner
            stats={stats} currentUser={currentUser} initials={initials}
            activePath={location.pathname} onNavigate={goMobile} onLogout={logout}
          />
        </div>
      </aside>

      <style>{`
        @media (max-width: 767px) {
          .ad-sidebar { display: none !important; }
        }
        @media (min-width: 768px) {
          .ad-drawer, .ad-overlay, .ad-hamburger { display: none !important; }
        }
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
      `}</style>
    </>
  )
}
