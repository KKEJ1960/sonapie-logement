import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Building2, FileText, Bell, BellRing, LogOut, Menu, X,
  Search, Camera, Edit, Trash2, ImageOff, Layers, Ruler, Wifi, Car, Wind,
  Shield, Sofa, ChevronLeft, ChevronRight, Plus, Check, AlertTriangle,
  RefreshCw, ChevronDown, Upload, ArrowUp, ArrowDown, Mail, Phone,
  CheckCircle, Droplet, Zap, ArrowUpDown, Eye, Waves, Trees, Dumbbell,
  Flame, Info, MessageCircle, Paperclip, Send, CheckCheck, ArrowLeft,
  Download, User, Briefcase, ScrollText, Calendar, CalendarPlus, CalendarDays, MapPin,
} from 'lucide-react'
import api from '../../services/api.js'
import { connectSocket, disconnectSocket } from '../../services/socket.js'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const NAV_ITEMS = [
  { key: 'overview', icon: LayoutDashboard, label: "Vue d'ensemble" },
  { key: 'parc',     icon: Building2,       label: 'Parc immobilier' },
  { key: 'demandes', icon: FileText,        label: 'Demandes à traiter' },
  { key: 'messages', icon: MessageCircle,   label: 'Messages' },
  { key: 'agenda',   icon: CalendarDays,    label: 'Agenda' },
  { key: 'alertes',  icon: Bell,            label: 'Alertes disponibilité' },
]

const SECTION_META = {
  overview: { title: "Vue d'ensemble",       subtitle: 'Aperçu global du parc immobilier' },
  parc:     { title: 'Parc immobilier',      subtitle: 'Créez, modifiez et illustrez vos logements' },
  demandes: { title: 'Demandes à traiter',   subtitle: 'Demandes validées par la Direction' },
  messages: { title: 'Messages',             subtitle: 'Échangez avec les locataires' },
  agenda:   { title: 'Agenda',               subtitle: 'Rendez-vous programmés avec les locataires' },
  alertes:  { title: 'Alertes disponibilité', subtitle: 'Locataires en attente de notification' },
}

const TYPES_LOGEMENT = ['F1', 'F2', 'F3', 'F4', 'F5', 'VILLA']
const TYPE_LOGEMENT_LABEL = { F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', VILLA: 'Villa' }
const TYPE_LOGEMENT_DESCRIPTION = {
  F1: 'F1 — Studio / 1 pièce',
  F2: 'F2 — Appartement 2 pièces',
  F3: 'F3 — Appartement 3 pièces',
  F4: 'F4 — Appartement 4 pièces',
  F5: 'F5 — Appartement 5 pièces',
  VILLA: 'Villa — Villa individuelle',
}

const TYPES_PIECE = [
  'FACADE', 'ENTREE', 'SALON', 'CUISINE', 'CHAMBRE_PRINCIPALE', 'CHAMBRE_2', 'CHAMBRE_3',
  'CHAMBRE', 'SALLE_DE_BAIN', 'TOILETTES', 'BALCON', 'TERRASSE', 'JARDIN', 'GARAGE', 'AUTRES_ESPACES', 'AUTRE',
]
const TYPE_PIECE_LABEL = {
  SALON: 'Salon', CHAMBRE: 'Chambre', CHAMBRE_PRINCIPALE: 'Chambre principale',
  CHAMBRE_2: 'Chambre 2', CHAMBRE_3: 'Chambre 3', CUISINE: 'Cuisine', SALLE_DE_BAIN: 'Salle de bain',
  TOILETTES: 'Toilettes', BALCON: 'Balcon', TERRASSE: 'Terrasse', JARDIN: 'Jardin',
  GARAGE: 'Garage / Parking', ENTREE: 'Entrée', FACADE: 'Façade / Extérieur',
  AUTRE: 'Autre', AUTRES_ESPACES: 'Autres espaces',
}

const STATUT_LOGEMENT_META = {
  DISPONIBLE:  { label: 'Disponible',  cls: 'bg-[#2E7D32] text-white' },
  OCCUPE:      { label: 'Occupé',      cls: 'bg-[#E8520A] text-white' },
  MAINTENANCE: { label: 'Maintenance', cls: 'bg-amber-500 text-white' },
}

const COMMODITES_META = [
  { key: 'eauCourante',       label: 'Eau courante',        icon: Droplet },
  { key: 'electricite',       label: 'Électricité',         icon: Zap },
  { key: 'meuble',            label: 'Logement meublé',     icon: Sofa },
  { key: 'parking',           label: 'Parking disponible',  icon: Car },
  { key: 'climatisation',     label: 'Climatisation',       icon: Wind },
  { key: 'internet',          label: 'Internet / Wifi',     icon: Wifi },
  { key: 'ascenseur',         label: 'Ascenseur',           icon: ArrowUpDown },
  { key: 'gardien',           label: 'Gardien / Sécurité',  icon: Shield },
  { key: 'piscine',           label: 'Piscine',             icon: Waves },
  { key: 'jardin',            label: 'Jardin / Espace vert', icon: Trees },
  { key: 'sallesDeSport',     label: 'Salle de sport',      icon: Dumbbell },
  { key: 'groupeElectrogene', label: 'Groupe électrogène',  icon: Flame },
]
// Icônes affichées sur les cards logement (sous-ensemble des commodités les plus visuelles)
const COMMODITES_CARD_ICONS = [
  { key: 'internet',       icon: Wifi },
  { key: 'parking',        icon: Car },
  { key: 'climatisation',  icon: Wind },
  { key: 'gardien',        icon: Shield },
  { key: 'meuble',         icon: Sofa },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────
const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const formatHeure = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const formatMontant = (m) => m != null ? `${Number(m).toLocaleString('fr-FR')} FCFA/mois` : null

function formatDateSeparateur(d) {
  const date = new Date(d)
  const auj = new Date()
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(date, auj)) return "Aujourd'hui"
  if (sameDay(date, hier)) return 'Hier'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function timeAgo(dateStr) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 2592000) return `il y a ${Math.floor(s / 86400)} j`
  return formatDate(dateStr)
}

// Ex: "Mercredi 16 juillet 2026 à 10h00"
function formatDateRendezVous(dateStr) {
  const d = new Date(dateStr)
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} à ${heure}`
}

function parseRendezVous(contenu) {
  try {
    const data = JSON.parse(contenu)
    if (!data.dateRendezVous || !data.lieuRendezVous) return null
    return data
  } catch {
    return null
  }
}

function apercuMessage(message) {
  if (!message) return 'Aucun message pour le moment'
  if (message.type === 'RENDEZ_VOUS') return '🗓️ Rendez-vous proposé'
  return message.contenu.length > 40 ? `${message.contenu.slice(0, 40)}…` : message.contenu
}

function joursDepuis(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

// Les photos sont stockées sur Cloudinary en pleine résolution (jusqu'à 1920×1080) ;
// on demande ici une version recadrée/compressée à la volée adaptée à chaque usage
// (carte, vignette…) au lieu de faire télécharger l'image originale pour un aperçu.
function cldThumb(url, w, h) {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) return url
  const params = h ? `f_auto,q_auto,w_${w},h_${h},c_fill` : `f_auto,q_auto,w_${w}`
  return url.replace('/upload/', `/upload/${params}/`)
}

const inp = 'w-full px-3.5 py-2.5 border border-gray-300 bg-white rounded-lg text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 transition'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition'
const primaryBtn = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition disabled:opacity-50'

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
  const warn = toast.type === 'warning'
  const info = toast.type === 'info'
  const cls = ok ? 'bg-green-50 border-green-200' : warn ? 'bg-amber-50 border-amber-200' : info ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
  const dotCls = ok ? 'bg-green-500' : warn ? 'bg-amber-500' : info ? 'bg-blue-500' : 'bg-red-500'
  const textCls = ok ? 'text-green-800' : warn ? 'text-amber-800' : info ? 'text-blue-800' : 'text-red-800'
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className={`fixed top-6 right-6 z-[9999] flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-lg min-w-[270px] max-w-[360px] ${cls}`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${dotCls}`}>
        {ok ? <Check size={13} color="#fff" strokeWidth={3} /> : warn ? <AlertTriangle size={13} color="#fff" strokeWidth={3} /> : info ? <Bell size={13} color="#fff" strokeWidth={3} /> : <X size={13} color="#fff" strokeWidth={3} />}
      </div>
      <span className={`flex-1 text-sm font-semibold ${textCls}`}>{toast.message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
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
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-100 shadow-2xl w-full max-h-[90vh] overflow-y-auto max-sm:rounded-none max-sm:max-w-full max-sm:h-full max-sm:max-h-full"
      >
        {children}
      </motion.div>
    </div>
  )
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

function EmptyState({ icon: Icon = Building2, title, subtitle, action }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-slate-300" />
      </div>
      <p className="text-base font-bold text-slate-700 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}
      {action}
    </div>
  )
}

function Skeleton({ className }) {
  return <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="w-10 h-6 rounded-full flex-shrink-0 transition relative"
      style={{ background: checked ? O : '#E5E7EB' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Sidebar
// ═════════════════════════════════════════════════════════════════════════════
function SidebarContent({ activeSection, onNavigate, user, initials, badges, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-gray-200">
        <img
          src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg" alt="SONAPIE"
          width="140" height="60" style={{ width: 140, height: 'auto', mixBlendMode: 'multiply' }}
        />
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2E7D32]/10 border border-[#2E7D32]/30" style={{ color: G }}>
          <Building2 size={11} /> SERVICE LOGEMENT
        </div>
      </div>

      <nav className="flex-1 px-2.5 pt-3.5 overflow-y-auto" aria-label="Navigation principale">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = activeSection === key
          const badgeValue = badges?.[key]
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-2.5 mb-0.5 rounded-lg text-sm text-left transition ${
                active
                  ? 'bg-[#2E7D32]/10 border-l-4 border-[#2E7D32] font-semibold pl-[11px] pr-3.5 py-3'
                  : 'border-l-4 border-transparent text-gray-500 font-normal px-3.5 py-3 hover:bg-gray-50'
              }`}
              style={active ? { color: G } : undefined}
            >
              <Icon size={16} style={{ color: active ? G : '#9CA3AF', flexShrink: 0 }} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {!!badgeValue && (
                <span className="text-[0.62rem] font-bold" style={{ color: O }}>
                  {badgeValue}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mx-2.5 mt-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: G }}>
            <span className="text-xs font-extrabold text-white">{initials || 'SL'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.prenom} {user.nom}</p>
            <p className="text-xs text-gray-400">Service Logement</p>
          </div>
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        </div>
      </div>

      <div className="mx-2.5 mt-1 mb-3.5">
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition">
          <LogOut size={14} /> Se déconnecter
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// KPI Card
// ═════════════════════════════════════════════════════════════════════════════
function KpiCard({ icon: Icon, label, value, color, pulse }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={19} style={{ color }} />
        </div>
        {pulse && <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: color }} />}
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Logement Card (grille du parc immobilier)
// ═════════════════════════════════════════════════════════════════════════════
function LogementCard({ logement, onEdit, onDelete, onPhotos }) {
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
            <img src={cldThumb(photos[photoIdx]?.urlPhoto, 700, 394)} alt={logement.code} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
          {logement.superficie != null && (
            <span className="flex items-center gap-1"><Ruler size={12} /> {logement.superficie} m²</span>
          )}
          {logement.nombrePieces != null && (
            <span className="flex items-center gap-1"><Layers size={12} /> {logement.nombrePieces} pièce{logement.nombrePieces > 1 ? 's' : ''}</span>
          )}
        </div>

        {logement.montantLoyer != null && (
          <p className="text-sm font-bold mb-3" style={{ color: O }}>{formatMontant(logement.montantLoyer)}</p>
        )}

        {commodites.length > 0 && (
          <div className="flex items-center gap-2 mb-3.5 flex-wrap">
            {commodites.map(({ key, icon: CIcon }) => (
              <span key={key} title={COMMODITES_META.find(c => c.key === key)?.label} className="w-6 h-6 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                <CIcon size={12} />
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <button onClick={() => onPhotos(logement)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <Camera size={13} /> Photos
          </button>
          <button onClick={() => onEdit(logement)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <Edit size={13} /> Modifier
          </button>
          <div className="relative group flex-1">
            <button
              onClick={() => logement.statut !== 'OCCUPE' && onDelete(logement)}
              disabled={logement.statut === 'OCCUPE'}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-red-100 text-xs font-semibold text-red-500 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Trash2 size={13} /> Suppr.
            </button>
            {logement.statut === 'OCCUPE' && (
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-gray-900 text-white text-[0.65rem] opacity-0 group-hover:opacity-100 transition">
                Terminez l'occupation d'abord
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Demande Card (demandes à traiter)
// ═════════════════════════════════════════════════════════════════════════════
function DemandeCard({ demande, logement, onTraiter }) {
  const jours = joursDepuis(demande.dateTraitement || demande.dateDepot)
  const urgenceCls = jours > 7 ? 'text-red-500 bg-red-50 border-red-200' : jours > 3 ? 'text-[#E8520A] bg-[#E8520A]/10 border-[#E8520A]/30' : 'text-gray-500 bg-gray-50 border-gray-200'
  const photo = logement?.photos?.[0]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: G }}>
            <span className="text-sm font-extrabold text-white">{getInitials(demande.demandeur?.nom, demande.demandeur?.prenom)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{demande.demandeur?.prenom} {demande.demandeur?.nom}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
              {demande.demandeur?.email && <span className="flex items-center gap-1 truncate"><Mail size={11} /> {demande.demandeur.email}</span>}
              {demande.demandeur?.telephone && <span className="flex items-center gap-1"><Phone size={11} /> {demande.demandeur.telephone}</span>}
            </div>
            {demande.demandeur?.typeLocataire && (
              <span className="inline-block mt-1.5 text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-[#2E7D32]/10 text-[#2E7D32]">
                {demande.demandeur.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:w-56 flex-shrink-0 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {photo ? <img src={cldThumb(photo.urlPhoto, 120, 120)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <ImageOff size={16} className="text-slate-300" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{logement?.code || `#${demande.logementId}`}</p>
            <p className="text-xs text-gray-400 truncate">{logement?.adresse || '—'}</p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-400">Validé le {formatDate(demande.dateTraitement || demande.dateDepot)}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${urgenceCls}`}>
            En attente depuis {jours} jour{jours > 1 ? 's' : ''}
          </span>
          <button onClick={() => onTraiter(demande)} className="mt-1 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-xs font-bold transition" style={{ background: G }}>
            <CheckCircle size={13} /> Marquer comme traité
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section : Vue d'ensemble
// ═════════════════════════════════════════════════════════════════════════════
function OverviewSection({ stats, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />
  if (!stats) return null

  const { logements, demandes, alertes } = stats
  const repartition = [
    { label: 'Disponibles',   value: logements.disponibles,  color: G },
    { label: 'Occupés',       value: logements.occupes,      color: O },
    { label: 'En maintenance', value: logements.enMaintenance, color: '#F59E0B' },
  ]
  const totalRepartition = logements.total || 1

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total logements" value={logements.total} color={G} />
        <KpiCard icon={ImageOff} label="Sans photos" value={logements.sansPhotos} color="#EF4444" pulse={logements.sansPhotos > 0} />
        <KpiCard icon={FileText} label="Demandes à traiter" value={demandes.aTraiter} color={O} pulse={demandes.aTraiter > 0} />
        <KpiCard icon={Bell} label="Locataires à notifier" value={alertes.locatairesANotifier} color="#F59E0B" />
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Répartition du parc</h3>
        {logements.total === 0 ? (
          <EmptyState icon={Building2} title="Aucun logement enregistré" subtitle="La répartition apparaîtra ici dès l'ajout d'un logement." />
        ) : (
          <div className="space-y-3.5">
            {repartition.map(r => (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-600">{r.label}</span>
                  <span className="text-xs font-bold text-gray-900">{r.value}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(r.value / totalRepartition) * 100}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section : Parc immobilier
// ═════════════════════════════════════════════════════════════════════════════
function ParcSection({
  logements, loading, error, onRetry,
  search, onSearch, statutFilter, onStatutFilter, typeFilter, onTypeFilter,
  onCreate, onEdit, onDelete, onPhotos,
}) {
  const hasFilters = !!(search || statutFilter || typeFilter)

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Rechercher par code, adresse, ville, quartier…"
            className={`${inp} pl-9`}
          />
        </div>
        <select value={statutFilter} onChange={e => onStatutFilter(e.target.value)} className={`${sel} md:w-44`}>
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="OCCUPE">Occupé</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
        <select value={typeFilter} onChange={e => onTypeFilter(e.target.value)} className={`${sel} md:w-36`}>
          <option value="">Tous les types</option>
          {TYPES_LOGEMENT.map(t => <option key={t} value={t}>{TYPE_LOGEMENT_LABEL[t]}</option>)}
        </select>
        <button onClick={onCreate} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-white text-sm font-bold flex-shrink-0" style={{ background: O }}>
          <Plus size={15} /> Nouveau logement
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={onRetry} />
      ) : logements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={Building2}
            title={hasFilters ? 'Aucun logement ne correspond aux filtres' : 'Aucun logement enregistré'}
            subtitle={hasFilters ? 'Essayez de modifier votre recherche ou vos filtres.' : 'Ajoutez votre premier logement pour commencer.'}
            action={!hasFilters && (
              <button onClick={onCreate} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-white text-sm font-bold" style={{ background: O }}>
                <Plus size={15} /> Nouveau logement
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {logements.map(l => (
            <LogementCard key={l.id} logement={l} onEdit={onEdit} onDelete={onDelete} onPhotos={onPhotos} />
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal : édition d'un logement existant
// ═════════════════════════════════════════════════════════════════════════════
function EditLogementModal({ logement, onClose, onSaved, fire }) {
  const [form, setForm] = useState(() => ({
    code: logement.code || '', adresse: logement.adresse || '', ville: logement.ville || '',
    quartier: logement.quartier || '', type: logement.type || 'F2',
    superficie: logement.superficie ?? '', nombrePieces: logement.nombrePieces ?? '', etage: logement.etage ?? '',
    description: logement.description || '', titreCommercial: logement.titreCommercial || '',
    descriptionCommerciale: logement.descriptionCommerciale || '',
    montantLoyer: logement.montantLoyer ?? '',
    eauCourante: logement.eauCourante ?? true, electricite: logement.electricite ?? true,
    meuble: !!logement.meuble, parking: !!logement.parking, climatisation: !!logement.climatisation,
    internet: !!logement.internet, ascenseur: !!logement.ascenseur, gardien: !!logement.gardien,
    piscine: !!logement.piscine, jardin: !!logement.jardin,
    sallesDeSport: !!logement.sallesDeSport, groupeElectrogene: !!logement.groupeElectrogene,
  }))
  const [saving, setSaving] = useState(false)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const toggle = (field) => setForm(f => ({ ...f, [field]: !f[field] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.code.trim() || !form.adresse.trim() || !form.ville.trim() || !form.type) {
      fire('error', 'Code, adresse, ville et type sont requis.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim(), adresse: form.adresse.trim(), ville: form.ville.trim(),
        quartier: form.quartier.trim() || null, type: form.type,
        superficie: form.superficie !== '' ? Number(form.superficie) : null,
        nombrePieces: form.nombrePieces !== '' ? Number(form.nombrePieces) : null,
        etage: form.etage !== '' ? Number(form.etage) : 0,
        description: form.description.trim() || null,
        titreCommercial: form.titreCommercial.trim() || null,
        descriptionCommerciale: form.descriptionCommerciale.trim() || null,
        montantLoyer: form.montantLoyer !== '' ? Number(form.montantLoyer) : null,
        eauCourante: form.eauCourante, electricite: form.electricite, meuble: form.meuble,
        parking: form.parking, climatisation: form.climatisation, internet: form.internet,
        ascenseur: form.ascenseur, gardien: form.gardien,
        piscine: form.piscine, jardin: form.jardin,
        sallesDeSport: form.sallesDeSport, groupeElectrogene: form.groupeElectrogene,
      }
      await api.put(`/service-logement/logements/${logement.id}`, payload)
      fire('success', 'Logement modifié avec succès.')
      onSaved()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de modifier le logement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={640}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>
            Modifier {logement.code}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[62vh] overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Informations générales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Code *</label>
                <input value={form.code} onChange={e => set('code', e.target.value)} required className={inp} placeholder="LOG-001" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Type *</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={sel}>
                  {TYPES_LOGEMENT.map(t => <option key={t} value={t}>{TYPE_LOGEMENT_LABEL[t]}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Adresse *</label>
                <input value={form.adresse} onChange={e => set('adresse', e.target.value)} required className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Ville *</label>
                <input value={form.ville} onChange={e => set('ville', e.target.value)} required className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Quartier</label>
                <input value={form.quartier} onChange={e => set('quartier', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Superficie (m²)</label>
                <input type="number" min="0" step="0.1" value={form.superficie} onChange={e => set('superficie', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre de pièces</label>
                <input type="number" min="0" value={form.nombrePieces} onChange={e => set('nombrePieces', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Étage</label>
                <input type="number" value={form.etage} onChange={e => set('etage', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Loyer mensuel (FCFA)</label>
                <input type="number" min="0" value={form.montantLoyer} onChange={e => set('montantLoyer', e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Description</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Titre accrocheur</label>
                <input value={form.titreCommercial} onChange={e => set('titreCommercial', e.target.value)} className={inp} placeholder="Ex: Bel appartement lumineux au cœur de Cocody" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description technique</label>
                <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description commerciale</label>
                <textarea rows={2} value={form.descriptionCommerciale} onChange={e => set('descriptionCommerciale', e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Commodités</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {COMMODITES_META.map(({ key, label, icon: CIcon }) => (
                <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CIcon size={15} className="text-gray-400" strokeWidth={1.75} /> {label}
                  </span>
                  <Toggle checked={form[key]} onChange={() => toggle(key)} />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className={ghostBtn}>Annuler</button>
          <button type="submit" disabled={saving} className={primaryBtn} style={{ background: G }}>
            {saving && <Spinner />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal : suppression d'un logement
// ═════════════════════════════════════════════════════════════════════════════
function DeleteLogementModal({ logement, onClose, onDeleted, fire }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/service-logement/logements/${logement.id}`)
      fire('success', 'Logement supprimé avec succès.')
      onDeleted()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de supprimer ce logement.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal onClose={onClose} width={420}>
      <div className="p-6">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Supprimer {logement.code} ?</h2>
        <p className="text-sm text-gray-500 mb-6">Cette action est irréversible. Toutes les photos associées seront également supprimées.</p>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button onClick={handleDelete} disabled={deleting} className={primaryBtn} style={{ background: '#EF4444' }}>
            {deleting && <Spinner />} Supprimer
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal : création d'un logement — stepper 2 étapes
// ═════════════════════════════════════════════════════════════════════════════
const TYPES_PIECE_NOUVEAU = [
  'FACADE', 'ENTREE', 'SALON', 'CUISINE',
  'CHAMBRE_PRINCIPALE', 'CHAMBRE_2', 'CHAMBRE_3',
  'SALLE_DE_BAIN', 'TOILETTES', 'BALCON', 'TERRASSE',
  'JARDIN', 'GARAGE', 'AUTRES_ESPACES',
]

function emptyStepperForm() {
  return {
    code: '', type: 'F2', adresse: '', ville: '', quartier: '',
    superficie: '', nombrePieces: '', etage: '', montantLoyer: '',
    titreCommercial: '', descriptionCommerciale: '', description: '',
    eauCourante: true, electricite: true, meuble: false, parking: false,
    climatisation: false, internet: false, ascenseur: false, gardien: false,
    piscine: false, jardin: false, sallesDeSport: false, groupeElectrogene: false,
  }
}

function StepIndicator({ step }) {
  const steps = ['Informations', 'Description & commodités']
  return (
    <div className="flex px-6 pt-1">
      {steps.map((label, i) => {
        const idx = i + 1
        const active = step === idx
        const done = step > idx
        return (
          <div
            key={label}
            className="flex-1 pb-3 pt-4 border-b-2 transition-colors"
            style={{ borderColor: active ? O : done ? '#1A1A1A' : '#E5E7EB' }}
          >
            <span className="text-[0.7rem] font-semibold tracking-wide whitespace-nowrap" style={{ color: active ? '#1A1A1A' : done ? '#6B7280' : '#9CA3AF' }}>
              {String(idx).padStart(2, '0')}&ensp;{label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function InfoTooltip({ text }) {
  return (
    <span className="relative group inline-flex items-center ml-1.5 align-middle">
      <Info size={12} className="text-gray-400 cursor-help" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[0.68rem] leading-snug opacity-0 group-hover:opacity-100 transition z-10">
        {text}
      </span>
    </span>
  )
}

function CreerLogementStepperModal({ onClose, onCreated, fire }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(emptyStepperForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [stagedPhotos, setStagedPhotos] = useState([])
  const [stagedTypePiece, setStagedTypePiece] = useState('FACADE')
  const [stagedDragOver, setStagedDragOver] = useState(false)
  const stagedFileInputRef = useRef(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const toggle = (field) => setForm(f => ({ ...f, [field]: !f[field] }))

  const addStagedPhotos = (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    const items = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`, file, preview: URL.createObjectURL(file), typePiece: stagedTypePiece,
    }))
    setStagedPhotos(prev => [...prev, ...items])
  }

  const removeStagedPhoto = (id) => {
    setStagedPhotos(prev => {
      const target = prev.find(p => p.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter(p => p.id !== id)
    })
  }

  const handleNext = () => {
    const errs = {}
    if (!form.code.trim()) errs.code = 'Champ requis'
    if (!form.adresse.trim()) errs.adresse = 'Champ requis'
    if (!form.ville.trim()) errs.ville = 'Champ requis'
    if (!form.type) errs.type = 'Champ requis'
    setErrors(errs)
    if (Object.keys(errs).length === 0) setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim(), adresse: form.adresse.trim(), ville: form.ville.trim(),
        quartier: form.quartier.trim() || null, type: form.type,
        superficie: form.superficie !== '' ? Number(form.superficie) : null,
        nombrePieces: form.nombrePieces !== '' ? Number(form.nombrePieces) : null,
        etage: form.etage !== '' ? Number(form.etage) : 0,
        montantLoyer: form.montantLoyer !== '' ? Number(form.montantLoyer) : null,
        titreCommercial: form.titreCommercial.trim() || null,
        descriptionCommerciale: form.descriptionCommerciale.trim() || null,
        description: form.description.trim() || null,
        eauCourante: form.eauCourante, electricite: form.electricite, meuble: form.meuble,
        parking: form.parking, climatisation: form.climatisation, internet: form.internet,
        ascenseur: form.ascenseur, gardien: form.gardien,
        piscine: form.piscine, jardin: form.jardin,
        sallesDeSport: form.sallesDeSport, groupeElectrogene: form.groupeElectrogene,
      }
      const { data } = await api.post('/service-logement/logements', payload)

      if (stagedPhotos.length > 0) {
        let uploaded = 0
        let lastError = null
        for (const photo of stagedPhotos) {
          try {
            const fd = new FormData()
            fd.append('photo', photo.file)
            fd.append('typePiece', photo.typePiece)
            await api.post(`/service-logement/logements/${data.id}/photos`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
            uploaded++
          } catch (err) {
            // on continue avec les photos restantes même si l'une d'elles échoue
            lastError = err.response?.data?.message || err.message
          }
        }
        if (uploaded === stagedPhotos.length) {
          fire('success', `Logement ${data.code} créé avec succès. ${uploaded} photo${uploaded > 1 ? 's' : ''} ajoutée${uploaded > 1 ? 's' : ''}.`)
        } else if (uploaded > 0) {
          fire('warning', `Logement ${data.code} créé, mais ${stagedPhotos.length - uploaded} photo(s) sur ${stagedPhotos.length} n'ont pas pu être ajoutées${lastError ? ` (${lastError})` : ''}.`)
        } else {
          fire('warning', `Logement ${data.code} créé, mais aucune photo n'a pu être ajoutée${lastError ? ` (${lastError})` : ''}. Réessayez depuis "Photos".`)
        }
      } else {
        fire('success', `Logement ${data.code} créé avec succès.`)
      }

      onCreated(data)
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de créer le logement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={640}>
      <div className="flex items-center justify-between px-6 pt-6">
        <h2 className="text-lg font-extrabold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Créer un logement</h2>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
      </div>
      <StepIndicator step={step} />

      {step === 1 ? (
        <div className="px-6 py-5 space-y-5 max-h-[56vh] overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Identification</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center">
                  Code *
                  <InfoTooltip text="Code unique du logement. Utilisez un format cohérent : LOG-[VILLE]-[NUMÉRO]" />
                </label>
                <input value={form.code} onChange={e => set('code', e.target.value)} className={inp} placeholder="Ex: LOG-ABJ-001" />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Type *</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={sel}>
                  {TYPES_LOGEMENT.map(t => <option key={t} value={t}>{TYPE_LOGEMENT_DESCRIPTION[t]}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Localisation</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Adresse complète *</label>
                <textarea rows={2} value={form.adresse} onChange={e => set('adresse', e.target.value)} className={inp} />
                {errors.adresse && <p className="text-xs text-red-500 mt-1">{errors.adresse}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Ville *</label>
                  <input value={form.ville} onChange={e => set('ville', e.target.value)} className={inp} />
                  {errors.ville && <p className="text-xs text-red-500 mt-1">{errors.ville}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Quartier</label>
                  <input value={form.quartier} onChange={e => set('quartier', e.target.value)} className={inp} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Caractéristiques</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Superficie (m²)</label>
                <input type="number" min="0" step="0.1" value={form.superficie} onChange={e => set('superficie', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre de pièces</label>
                <input type="number" min="0" value={form.nombrePieces} onChange={e => set('nombrePieces', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Étage</label>
                <input type="number" value={form.etage} onChange={e => set('etage', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Loyer mensuel (FCFA)</label>
                <input type="number" min="0" value={form.montantLoyer} onChange={e => set('montantLoyer', e.target.value)} className={inp} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 space-y-5 max-h-[56vh] overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Présentation commerciale</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center">
                  Titre accrocheur
                  <InfoTooltip text="Ce titre apparaîtra en premier dans la galerie des locataires" />
                </label>
                <input value={form.titreCommercial} onChange={e => set('titreCommercial', e.target.value)} className={inp} placeholder="Ex: Bel appartement lumineux au cœur de Cocody" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">Description commerciale</label>
                  <span className="text-[0.68rem] text-gray-400">{form.descriptionCommerciale.length} / 500</span>
                </div>
                <textarea
                  rows={5} maxLength={500} value={form.descriptionCommerciale}
                  onChange={e => set('descriptionCommerciale', e.target.value)} className={inp}
                  placeholder="Décrivez ce logement de façon attractive : luminosité, vue, environnement, points forts..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Description technique
                  <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Usage interne</span>
                </label>
                <textarea
                  rows={3} value={form.description} onChange={e => set('description', e.target.value)} className={inp}
                  placeholder="Notes internes : état du logement, travaux récents, particularités techniques..."
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Commodités</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {COMMODITES_META.map(({ key, label, icon: CIcon }) => (
                <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CIcon size={15} className="text-gray-400" strokeWidth={1.75} /> {label}
                  </span>
                  <Toggle checked={form[key]} onChange={() => toggle(key)} />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Photos du logement</h3>
            <p className="text-xs text-gray-400 mb-3">Ajoutez des photos maintenant ou après la création</p>

            <div className="sm:w-64 mb-3">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ces photos correspondent à :</label>
              <select value={stagedTypePiece} onChange={e => setStagedTypePiece(e.target.value)} className={sel}>
                {TYPES_PIECE_NOUVEAU.map(t => <option key={t} value={t}>{TYPE_PIECE_LABEL[t]}</option>)}
              </select>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setStagedDragOver(true) }}
              onDragLeave={() => setStagedDragOver(false)}
              onDrop={e => { e.preventDefault(); setStagedDragOver(false); addStagedPhotos(e.dataTransfer.files) }}
              onClick={() => stagedFileInputRef.current?.click()}
              className={`h-32 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition ${stagedDragOver ? 'border-gray-900 bg-gray-50' : 'border-gray-300 border-dashed hover:border-gray-400 hover:bg-gray-50'}`}
            >
              <Camera size={20} className="text-gray-400" strokeWidth={1.5} />
              <p className="text-xs font-medium text-gray-600">Glissez vos photos ici ou cliquez</p>
              <p className="text-[0.68rem] text-gray-400">JPG, PNG, WebP • 10 Mo max</p>
              <input
                ref={stagedFileInputRef} type="file" multiple accept="image/*" hidden
                onChange={e => { addStagedPhotos(e.target.files); e.target.value = '' }}
              />
            </div>

            {stagedPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {stagedPhotos.map(photo => (
                  <div key={photo.id} className="relative rounded-lg overflow-hidden border border-gray-200 h-20">
                    <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button" onClick={() => removeStagedPhoto(photo.id)} aria-label="Retirer cette photo"
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-red-500"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
        {step === 1 ? (
          <button type="button" onClick={handleNext} className={primaryBtn} style={{ background: O }}>
            Suivant <ChevronRight size={15} />
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setStep(1)} className={`${ghostBtn} flex items-center gap-1.5`}><ChevronLeft size={15} /> Retour</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className={primaryBtn} style={{ background: O }}>
              {saving && <Spinner />} Créer le logement
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal : gestion des photos — "Visite guidée"
// ═════════════════════════════════════════════════════════════════════════════
function PhotosModal({ logement, onClose, fire, onPhotosChanged, onPreview, onOpenLightbox }) {
  const [photos, setPhotos] = useState(logement.photos || [])
  const [typePiece, setTypePiece] = useState('AUTRE')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [reordering, setReordering] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const fileInputRef = useRef(null)
  const uploadZoneRef = useRef(null)

  const refreshLogement = async () => {
    try {
      const { data } = await api.get(`/service-logement/logements/${logement.id}`)
      setPhotos(data.photos || [])
      onPhotosChanged(data.photos || [])
    } catch {
      // silencieux : la liste locale reste affichée
    }
  }

  const handleUpload = async () => {
    if (!file) { fire('error', 'Sélectionnez une photo à téléverser.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      fd.append('typePiece', typePiece)
      if (description.trim()) fd.append('description', description.trim())
      await api.post(`/service-logement/logements/${logement.id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      fire('success', 'Photo ajoutée avec succès.')
      setFile(null); setDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await refreshLogement()
    } catch (err) {
      fire('error', err.response?.data?.message || "Impossible d'ajouter cette photo.")
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.delete(`/service-logement/logements/${logement.id}/photos/${photoId}`)
      fire('success', 'Photo supprimée avec succès.')
      setConfirmDeleteId(null)
      await refreshLogement()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de supprimer cette photo.')
    }
  }

  // Réordonne uniquement au sein d'un groupe pièce : échange les valeurs d'ordre
  // des deux photos concernées, sans toucher aux autres pièces.
  const handleMoveInGroup = async (groupPhotos, index, direction) => {
    const target = index + direction
    if (target < 0 || target >= groupPhotos.length) return
    const a = groupPhotos[index]
    const b = groupPhotos[target]
    setReordering(a.id)
    try {
      const payload = [{ id: a.id, ordre: b.ordre }, { id: b.id, ordre: a.ordre }]
      const { data } = await api.put(`/service-logement/logements/${logement.id}/photos/ordre`, payload)
      setPhotos(data)
      onPhotosChanged(data)
    } catch (err) {
      fire('error', err.response?.data?.message || "Impossible de réordonner les photos.")
    } finally {
      setReordering(null)
    }
  }

  const handleAddHere = (type) => {
    setTypePiece(type)
    uploadZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    fileInputRef.current?.click()
  }

  const groupedPhotos = useMemo(() => {
    const groups = {}
    for (const photo of photos) {
      if (!groups[photo.typePiece]) groups[photo.typePiece] = []
      groups[photo.typePiece].push(photo)
    }
    return TYPES_PIECE.filter(t => groups[t]?.length).map(t => ({ type: t, photos: groups[t] }))
  }, [photos])

  return (
    <Modal onClose={onClose} width={760}>
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Visite guidée — {logement.code}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Organisez les photos par pièce pour offrir une visite virtuelle aux locataires</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button" onClick={onPreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
          >
            <Eye size={13} /> Aperçu client
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0"><X size={18} /></button>
        </div>
      </div>

      <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-6">
        <div ref={uploadZoneRef} className="rounded-xl border-2 border-dashed border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Photo</label>
              <button
                type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
              >
                <Upload size={15} /> {file ? file.name : 'Choisir une photo…'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="sm:w-40">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Pièce</label>
              <select value={typePiece} onChange={e => setTypePiece(e.target.value)} className={sel}>
                {TYPES_PIECE.map(t => <option key={t} value={t}>{TYPE_PIECE_LABEL[t]}</option>)}
              </select>
            </div>
            <div className="sm:w-48">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className={inp} placeholder="Optionnel" />
            </div>
            <button
              onClick={handleUpload} disabled={uploading || !file}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-60 flex-shrink-0"
              style={{ background: O }}
            >
              {uploading ? <Spinner /> : <Upload size={14} />} Téléverser
            </button>
          </div>
        </div>

        {photos.length === 0 ? (
          <EmptyState icon={ImageOff} title="Aucune photo" subtitle="Ajoutez la première photo de ce logement ci-dessus." />
        ) : (
          <div className="space-y-5">
            {groupedPhotos.map(group => (
              <div key={group.type} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                    <span className="uppercase tracking-wide">{TYPE_PIECE_LABEL[group.type]}</span>
                    <span className="text-xs font-semibold text-gray-400 normal-case">
                      ({group.photos.length} photo{group.photos.length > 1 ? 's' : ''})
                    </span>
                  </h4>
                  <button
                    type="button" onClick={() => handleAddHere(group.type)}
                    className="flex items-center gap-1 text-xs font-semibold hover:underline flex-shrink-0"
                    style={{ color: O }}
                  >
                    <Plus size={13} /> Ajouter une photo ici
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {group.photos.map((photo, idx) => {
                    const isPrincipale = photos[0]?.id === photo.id
                    return (
                      <div key={photo.id} className="relative rounded-xl overflow-hidden border border-gray-100 group/photo" style={{ aspectRatio: '4/3' }}>
                        <img src={cldThumb(photo.urlPhoto, 460, 345)} alt={photo.description || photo.typePiece} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        {isPrincipale && (
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-white text-[0.6rem] font-bold" style={{ background: G }}>
                            Principale
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/40 transition flex items-center justify-center gap-1.5 opacity-0 group-hover/photo:opacity-100">
                          <button
                            onClick={() => onOpenLightbox(photo.id)}
                            aria-label="Voir en grand" className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-700"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveInGroup(group.photos, idx, -1)} disabled={idx === 0 || !!reordering}
                            aria-label="Monter" className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-700 disabled:opacity-40"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveInGroup(group.photos, idx, 1)} disabled={idx === group.photos.length - 1 || !!reordering}
                            aria-label="Descendre" className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-700 disabled:opacity-40"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(photo.id)}
                            aria-label="Supprimer" className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {confirmDeleteId === photo.id && (
                          <div className="absolute inset-0 bg-white/97 flex flex-col items-center justify-center gap-2 p-2">
                            <p className="text-[0.65rem] font-semibold text-gray-700 text-center">Supprimer cette photo ?</p>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded-md border border-gray-200 text-[0.65rem] font-semibold text-gray-600">Annuler</button>
                              <button onClick={() => handleDeletePhoto(photo.id)} className="px-2 py-1 rounded-md bg-red-500 text-white text-[0.65rem] font-semibold">Suppr.</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Lightbox : visionneuse plein écran, navigue dans toutes les photos du logement
// ═════════════════════════════════════════════════════════════════════════════
function Lightbox({ photos, index, onIndexChange, onClose }) {
  const photo = photos[index]

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length)
      else if (e.key === 'ArrowRight') onIndexChange((index + 1) % photos.length)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, onIndexChange, photos.length, index])

  if (!photo) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1200] bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
        <X size={20} />
      </button>
      <span className="absolute top-4 left-4 text-white/70 text-sm font-semibold">{index + 1} / {photos.length}</span>

      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + photos.length) % photos.length) }}
          aria-label="Photo précédente"
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <img
        src={cldThumb(photo.urlPhoto, 1600)} alt={photo.description || photo.typePiece}
        onClick={e => e.stopPropagation()} className="max-w-full max-h-[75vh] object-contain rounded-lg"
      />
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % photos.length) }}
          aria-label="Photo suivante"
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <div className="mt-4 text-center px-4 max-w-lg" onClick={e => e.stopPropagation()}>
        <p className="text-white/90 text-sm font-semibold">
          {TYPE_PIECE_LABEL[photo.typePiece] || photo.typePiece}
        </p>
        {photo.description && <p className="text-white/60 text-xs mt-1">{photo.description}</p>}
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal : "Aperçu client" — simule exactement le rendu vu par un locataire
// ═════════════════════════════════════════════════════════════════════════════
function ClientPreviewModal({ logement, onClose }) {
  const [idx, setIdx] = useState(0)
  const photos = logement.photos || []
  const commodites = COMMODITES_META.filter(c => logement[c.key])
  const statutMeta = STATUT_LOGEMENT_META[logement.statut] || STATUT_LOGEMENT_META.DISPONIBLE

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Eye size={13} /> Aperçu client — ce que le locataire voit
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="relative bg-slate-100" style={{ aspectRatio: '16/9' }}>
          {photos.length > 0 ? (
            <>
              <img src={cldThumb(photos[idx]?.urlPhoto, 900, 506)} alt={logement.code} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)} aria-label="Photo précédente" className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setIdx(i => (i + 1) % photos.length)} aria-label="Photo suivante" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700">
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {photos.map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
              <ImageOff size={32} />
              <span className="text-sm font-semibold text-slate-400">Photos bientôt disponibles</span>
            </div>
          )}
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${statutMeta.cls}`}>
            {statutMeta.label}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs text-gray-400">{logement.code}</span>
            {logement.montantLoyer != null ? (
              <span className="font-bold text-sm" style={{ color: G }}>{formatMontant(logement.montantLoyer)}</span>
            ) : (
              <span className="text-xs text-gray-400">Loyer sur demande</span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-gray-900 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{logement.adresse}</h3>
          <p className="text-xs text-gray-500 mb-3">
            {logement.ville}{logement.quartier ? ` · ${logement.quartier}` : ''} · {TYPE_LOGEMENT_LABEL[logement.type]}
            {logement.superficie != null && ` · ${logement.superficie} m²`}
            {logement.nombrePieces != null && ` · ${logement.nombrePieces} pièces`}
          </p>

          {commodites.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {commodites.map(({ key, label, icon: CIcon }) => (
                <span key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-600">
                  <CIcon size={12} /> {label}
                </span>
              ))}
            </div>
          )}

          {logement.descriptionCommerciale ? (
            <p className="text-sm text-gray-600 leading-relaxed">{logement.descriptionCommerciale}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Aucune description commerciale renseignée.</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal : marquer une demande comme traitée (pas de route dédiée — honnête)
// ═════════════════════════════════════════════════════════════════════════════
function TraiterDemandeModal({ demande, onClose }) {
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  return (
    <Modal onClose={onClose} width={460}>
      <div className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          Marquer comme traité — {demande.demandeur?.prenom} {demande.demandeur?.nom}
        </h2>
        <p className="text-sm text-gray-500 mb-4">Ajoutez éventuellement une note sur le contact effectué avec le locataire.</p>

        <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes de contact (optionnel)</label>
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="Ex : Contacté par téléphone, remise des clés prévue le…" />

        {confirmed && (
          <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-amber-800">
              Fonctionnalité en cours de développement — aucune route backend ne permet encore de finaliser cette demande depuis cet écran. Vos notes n'ont pas été enregistrées.
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
          {!confirmed && (
            <button onClick={() => setConfirmed(true)} className={primaryBtn} style={{ background: G }}>
              <CheckCircle size={14} /> Confirmer
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section : Demandes à traiter
// ═════════════════════════════════════════════════════════════════════════════
function DemandesSection({ demandes, logementsById, loading, error, onRetry, onTraiter }) {
  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
  }
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />
  if (demandes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState icon={FileText} title="Aucune demande à traiter" subtitle="Les demandes validées par la Direction apparaîtront ici." />
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {demandes.map(d => (
        <DemandeCard key={d.id} demande={d} logement={logementsById[d.logementId]} onTraiter={onTraiter} />
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section : Messages (Service Logement)
// ═════════════════════════════════════════════════════════════════════════════
const STATUT_CONVERSATION_META = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACTIVE:     { label: 'En ligne',   cls: 'bg-green-50 text-green-700 border-green-200' },
  TERMINEE:   { label: 'Terminée',   cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

function ConversationBadgeStatut({ statut }) {
  const meta = STATUT_CONVERSATION_META[statut] || { label: statut, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold border whitespace-nowrap ${meta.cls}`}>
      {statut === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      {meta.label}
    </span>
  )
}

const TYPE_DOCUMENT_DOSSIER_LABEL = {
  PIECE_IDENTITE: "Pièce d'identité", JUSTIFICATIF_DOMICILE: 'Justificatif de domicile',
  BULLETIN_SALAIRE: 'Bulletin de salaire', ATTESTATION_EMPLOI: "Attestation d'emploi",
  ACTE_NAISSANCE: 'Acte de naissance', PHOTO_IDENTITE: "Photo d'identité",
  CONTRAT_TRAVAIL: 'Contrat de travail', AVIS_IMPOSITION: "Avis d'imposition", AUTRE: 'Autre',
}

const TABS_MESSAGES = [
  { key: 'EN_ATTENTE', label: 'À prendre en charge' },
  { key: 'ACTIVE',     label: 'Actives' },
  { key: 'TERMINEE',   label: 'Terminées' },
]

// ═════════════════════════════════════════════════════════════════════════════
// Section — Agenda des rendez-vous (vue Service Logement)
// ═════════════════════════════════════════════════════════════════════════════
const AGENDA_TABS_SL = [
  { key: 'AVENIR', label: 'À venir' },
  { key: 'PASSES', label: 'Passés' },
]
const CONFIRMATION_RDV_PREFIX = '✓ Rendez-vous confirmé'

function AgendaServiceSection({ fire, onProposerDate }) {
  const [rendezVous, setRendezVous] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('AVENIR')

  const fetchRendezVous = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/conversations/rendez-vous')
      setRendezVous(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les rendez-vous.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRendezVous() }, [fetchRendezVous])

  // Rejoint les conversations concernées et rafraîchit la liste dès que le
  // locataire confirme un rendez-vous pendant que cet onglet est déjà ouvert —
  // sinon "confirme" (dérivé côté serveur) ne se met à jour qu'au reload.
  const conversationIds = useMemo(
    () => [...new Set(rendezVous.map(r => r.conversationId))].join(','),
    [rendezVous],
  )
  useEffect(() => {
    if (!conversationIds) return
    const socket = connectSocket()
    conversationIds.split(',').forEach(id => socket.emit('rejoindre_conversation', id))

    const onNouveauMessage = (message) => {
      if (message.type === 'TEXTE' && message.contenu?.startsWith(CONFIRMATION_RDV_PREFIX)) {
        fetchRendezVous()
      }
    }
    socket.on('nouveau_message', onNouveauMessage)
    return () => { socket.off('nouveau_message', onNouveauMessage) }
  }, [conversationIds, fetchRendezVous])

  useEffect(() => () => disconnectSocket(), [])

  const maintenant = Date.now()
  const finSemaine = maintenant + 7 * 24 * 60 * 60 * 1000
  const aVenirCetteSemaine = useMemo(() => (
    rendezVous.filter(rdv => {
      const t = new Date(rdv.dateRendezVous).getTime()
      return t >= maintenant && t <= finSemaine
    }).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rendezVous])

  const filtered = useMemo(() => (
    rendezVous.filter(rdv => {
      const futur = new Date(rdv.dateRendezVous).getTime() >= maintenant
      return activeTab === 'AVENIR' ? futur : !futur
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rendezVous, activeTab])

  if (loading) return <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>
  if (error) return <ErrorBanner message={error} onRetry={fetchRendezVous} />

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1">
          {AGENDA_TABS_SL.map(t => (
            <button
              key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
              style={activeTab === t.key ? { background: O } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold text-gray-600">
          {aVenirCetteSemaine} rendez-vous à venir cette semaine
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState icon={Calendar} title="Aucun rendez-vous programmé" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(rdv => {
            const estPasse = new Date(rdv.dateRendezVous).getTime() < maintenant
            return (
              <div
                key={rdv.id}
                className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm border-l-4 ${estPasse ? 'border-l-gray-200 opacity-75' : 'border-l-[#E8520A]'}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white" style={{ background: O }}>
                      {getInitials(rdv.locataire?.nom, rdv.locataire?.prenom)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{rdv.locataire?.prenom} {rdv.locataire?.nom}</p>
                      {rdv.logement && <p className="text-xs text-gray-400">{rdv.logement.code} · {rdv.logement.adresse}</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    estPasse ? 'bg-gray-100 text-gray-500' : rdv.confirme ? 'bg-green-100 text-[#2E7D32]' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {estPasse ? '✗ Passé' : rdv.confirme ? '✓ Confirmé par le locataire' : '⏳ En attente de confirmation'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 mb-2">
                  <Calendar size={16} className="mt-0.5 flex-shrink-0" style={{ color: O }} />
                  <p className="text-sm text-gray-700">{formatDateRendezVous(rdv.dateRendezVous)}</p>
                </div>
                <div className="flex items-start gap-2.5 mb-3">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  <p className="text-sm text-gray-700">{rdv.lieuRendezVous}</p>
                </div>

                {!estPasse && (
                  <button
                    onClick={() => onProposerDate(rdv.conversationId)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold"
                    style={{ background: G }}
                  >
                    <CalendarPlus size={13} /> Proposer une nouvelle date
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MessagesSection({ currentUser, fire, autoOpenConversationId, onAutoOpened, onIncrementBadge }) {
  const [tab, setTab] = useState('EN_ATTENTE')
  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading] = useState(true)
  const [convError, setConvError] = useState(null)

  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [autreEcrit, setAutreEcrit] = useState(false)
  const [prenantEnCharge, setPrenantEnCharge] = useState(false)
  const [showDossierModal, setShowDossierModal] = useState(false)
  const [showRdvForm, setShowRdvForm] = useState(false)
  const [rdvDate, setRdvDate] = useState('')
  const [rdvLieu, setRdvLieu] = useState('')
  const [rdvNote, setRdvNote] = useState('')

  const messagesEndRef = useRef(null)
  const selectedConvIdRef = useRef(null)
  const typingThrottleRef = useRef(null)
  const typingResetRef = useRef(null)

  const fetchConversations = useCallback(async () => {
    setConvLoading(true); setConvError(null)
    try {
      const { data } = await api.get('/conversations')
      setConversations(data)
    } catch (err) {
      setConvError(err.response?.data?.message || 'Impossible de charger les conversations.')
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])
  useEffect(() => { selectedConvIdRef.current = selectedConv?.id || null }, [selectedConv])

  useEffect(() => {
    const socket = connectSocket()

    const onNouveauMessage = (message) => {
      const estConversationOuverte = message.conversationId === selectedConvIdRef.current

      if (estConversationOuverte) {
        setMessages(prev => {
          if (message.expediteurId === currentUser.id) {
            const idx = prev.findIndex(m => m._pending && m.contenu === message.contenu)
            if (idx !== -1) { const copy = [...prev]; copy[idx] = message; return copy }
          }
          return [...prev, message]
        })
        if (message.expediteurId !== currentUser.id) socket.emit('marquer_lu', message.conversationId)
      } else if (message.expediteurId !== currentUser.id) {
        fire('info', `Nouveau message de ${message.expediteur?.prenom || 'un locataire'}`)
        onIncrementBadge?.()
      }

      setConversations(prev => prev.map(c => {
        if (c.id !== message.conversationId) return c
        const isMine = message.expediteurId === currentUser.id
        return { ...c, dernierMessage: message, messagesNonLus: (isMine || estConversationOuverte) ? 0 : (c.messagesNonLus || 0) + 1 }
      }))
    }

    const onUtilisateurEcrit = (payload) => {
      if (payload.conversationId !== selectedConvIdRef.current) return
      setAutreEcrit(true)
      clearTimeout(typingResetRef.current)
      typingResetRef.current = setTimeout(() => setAutreEcrit(false), 3000)
    }

    const onMessagesLus = (payload) => {
      if (payload.conversationId !== selectedConvIdRef.current) return
      setMessages(prev => prev.map(m => m.expediteurId === currentUser.id ? { ...m, lu: true } : m))
    }

    // Signal qu'un locataire veut modifier un rendez-vous déjà confirmé —
    // visible même si sa conversation n'est pas ouverte.
    const onNotificationRdvModifie = (data) => {
      fire('warning', data.message)
    }

    // Rappel envoyé par le serveur quand l'heure d'un rendez-vous arrive —
    // seul moyen pour le Service Logement de le voir (pas d'onglet Notifications).
    const onRappelRdv = (data) => {
      fire('warning', data.message)
    }

    socket.on('nouveau_message', onNouveauMessage)
    socket.on('utilisateur_ecrit', onUtilisateurEcrit)
    socket.on('messages_lus', onMessagesLus)
    socket.on('notification_rdv_modifie', onNotificationRdvModifie)
    socket.on('rappel_rdv', onRappelRdv)

    return () => {
      socket.off('nouveau_message', onNouveauMessage)
      socket.off('utilisateur_ecrit', onUtilisateurEcrit)
      socket.off('messages_lus', onMessagesLus)
      socket.off('notification_rdv_modifie', onNotificationRdvModifie)
      socket.off('rappel_rdv', onRappelRdv)
      clearTimeout(typingResetRef.current)
      disconnectSocket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedConv) return
    connectSocket().emit('rejoindre_conversation', selectedConv.id)
  }, [selectedConv?.id])

  // Rejoint TOUTES les conversations dès qu'elles sont chargées, pas seulement
  // celle ouverte — sinon les messages d'une conversation non active n'arrivent
  // jamais (le serveur ne diffuse que dans les rooms rejointes).
  const conversationIds = useMemo(() => conversations.map(c => c.id).join(','), [conversations])
  useEffect(() => {
    if (!conversationIds) return
    const socket = connectSocket()
    conversationIds.split(',').forEach(id => socket.emit('rejoindre_conversation', id))
  }, [conversationIds])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, autreEcrit])

  const filtered = useMemo(() => conversations.filter(c => c.statut === tab), [conversations, tab])
  const counts = useMemo(() => ({
    EN_ATTENTE: conversations.filter(c => c.statut === 'EN_ATTENTE').length,
    ACTIVE: conversations.filter(c => c.statut === 'ACTIVE').length,
    TERMINEE: conversations.filter(c => c.statut === 'TERMINEE').length,
  }), [conversations])

  const openConversation = async (conv) => {
    setSelectedConv(conv)
    setAutreEcrit(false)
    setMessages([])
    setMessagesLoading(true)
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, messagesNonLus: 0 } : c))
    try {
      const { data } = await api.get(`/conversations/${conv.id}/messages`)
      setMessages(data)
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de charger les messages.')
    } finally {
      setMessagesLoading(false)
    }
  }

  // Ouverture automatique d'une conversation + formulaire RDV, demandée depuis
  // l'onglet Agenda ("Proposer une nouvelle date").
  useEffect(() => {
    if (!autoOpenConversationId || convLoading) return
    const conv = conversations.find(c => c.id === autoOpenConversationId)
    if (!conv) return
    setTab(conv.statut)
    openConversation(conv)
    setShowRdvForm(true)
    onAutoOpened?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenConversationId, convLoading, conversations])

  const handlePrendreEnCharge = async (conv) => {
    setPrenantEnCharge(true)
    try {
      const { data } = await api.patch(`/conversations/${conv.id}/prendre-en-charge`)
      setConversations(prev => prev.map(c => c.id === data.id ? data : c))
      setTab('ACTIVE')
      await openConversation(data)
      connectSocket().emit('rejoindre_conversation', data.id)
      fire('success', 'Conversation prise en charge.')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de prendre en charge cette conversation.')
    } finally {
      setPrenantEnCharge(false)
    }
  }

  const envoyerMessage = () => {
    const contenu = inputMessage.trim()
    if (!contenu || !selectedConv || selectedConv.statut === 'EN_ATTENTE') return
    const socket = connectSocket()
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, contenu, expediteurId: currentUser.id, expediteur: currentUser,
      lu: false, createdAt: new Date().toISOString(), type: 'TEXTE', _pending: true,
    }])
    socket.emit('envoyer_message', { conversationId: selectedConv.id, contenu, type: 'TEXTE' })
    setInputMessage('')
  }

  const envoyerRendezVous = () => {
    if (!rdvDate || !rdvLieu.trim() || !selectedConv || selectedConv.statut !== 'ACTIVE') return
    connectSocket().emit('envoyer_message', {
      conversationId: selectedConv.id,
      type: 'RENDEZ_VOUS',
      dateRendezVous: rdvDate,
      lieuRendezVous: rdvLieu.trim(),
      noteRendezVous: rdvNote.trim() || undefined,
    })
    setRdvDate(''); setRdvLieu(''); setRdvNote(''); setShowRdvForm(false)
  }

  const handleInputChange = (e) => {
    setInputMessage(e.target.value)
    if (!selectedConv || typingThrottleRef.current) return
    connectSocket().emit('en_train_decrire', selectedConv.id)
    typingThrottleRef.current = setTimeout(() => { typingThrottleRef.current = null }, 1000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() }
  }

  const handleAttemptFile = () => fire('warning', 'Partage de fichiers bientôt disponible.')

  if (convLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24" />)}</div>
  if (convError) return <ErrorBanner message={convError} onRetry={fetchConversations} />

  return (
    <div>
      <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 mb-4">
        {TABS_MESSAGES.map(t => (
          <button
            key={t.key} onClick={() => { setTab(t.key); setSelectedConv(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${tab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
            style={tab === t.key ? { background: O } : undefined}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex" style={{ height: 'calc(100vh - 260px)', minHeight: 460 }}>
        {/* Colonne gauche */}
        <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} md:w-[36%] w-full flex-col border-r border-gray-100`}>
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title={tab === 'EN_ATTENTE' ? 'Aucune conversation en attente' : tab === 'ACTIVE' ? 'Aucune conversation active' : 'Aucune conversation terminée'}
              />
            ) : filtered.map(conv => (
              <ConversationListItemSL
                key={conv.id} conv={conv} active={selectedConv?.id === conv.id}
                onClick={() => openConversation(conv)}
                onPrendreEnCharge={() => handlePrendreEnCharge(conv)}
                prenantEnCharge={prenantEnCharge}
              />
            ))}
          </div>
        </div>

        {/* Colonne droite */}
        <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <MessageCircle size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Sélectionnez une conversation pour afficher les messages.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-start gap-3 mb-2">
                  <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:bg-gray-50 flex-shrink-0">
                    <ArrowLeft size={18} />
                  </button>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white" style={{ background: O }}>
                    {getInitials(selectedConv.locataire?.nom, selectedConv.locataire?.prenom)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-gray-900">{selectedConv.locataire?.prenom} {selectedConv.locataire?.nom}</p>
                      {selectedConv.locataire?.typeLocataire && (
                        <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-[#2E7D32]/10 text-[#2E7D32]">
                          {selectedConv.locataire.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}
                        </span>
                      )}
                      <ConversationBadgeStatut statut={selectedConv.statut} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      {selectedConv.locataire?.email && <span className="flex items-center gap-1"><Mail size={11} /> {selectedConv.locataire.email}</span>}
                      {selectedConv.locataire?.telephone && <span className="flex items-center gap-1"><Phone size={11} /> {selectedConv.locataire.telephone}</span>}
                    </div>
                    {selectedConv.demande?.logement && (
                      <p className="text-xs text-gray-400 mt-0.5">{selectedConv.demande.logement.code} · {selectedConv.demande.logement.adresse}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setShowDossierModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition whitespace-nowrap">
                      <FileText size={13} /> Voir le dossier
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {messagesLoading ? (
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-10 w-2/3 self-start rounded-2xl" />
                    <Skeleton className="h-10 w-1/2 self-end rounded-2xl" />
                    <Skeleton className="h-10 w-3/5 self-start rounded-2xl" />
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => {
                      const prev = messages[i - 1]
                      const showDateSeparator = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
                      return (
                        <div key={m.id}>
                          {showDateSeparator && <p className="text-center text-xs text-gray-400 my-2">{formatDateSeparateur(m.createdAt)}</p>}
                          <ChatMessageBubbleSL message={m} isMine={m.expediteurId === currentUser.id} />
                        </div>
                      )
                    })}
                    {autreEcrit && <TypingIndicator label="Le locataire est en train d'écrire..." />}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {selectedConv.statut === 'EN_ATTENTE' ? (
                <div className="border-t border-gray-100 p-4 text-center text-sm text-amber-700 bg-amber-50">
                  Prenez en charge cette conversation pour pouvoir répondre.
                </div>
              ) : (
                <div className="border-t border-gray-100">
                  <AnimatePresence>
                    {showRdvForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white border border-gray-200 rounded-xl p-4 m-3 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Proposer un rendez-vous</p>
                            <button onClick={() => setShowRdvForm(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date et heure</label>
                              <input type="datetime-local" value={rdvDate} onChange={e => setRdvDate(e.target.value)} className={inp} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lieu de rendez-vous</label>
                              <input value={rdvLieu} onChange={e => setRdvLieu(e.target.value)} placeholder="Ex: Logement LOG-001, Cocody Abidjan" className={inp} />
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Note (optionnel)</label>
                            <input value={rdvNote} onChange={e => setRdvNote(e.target.value)} placeholder="Ex: Apportez vos documents" className={inp} />
                          </div>
                          <div className="flex gap-2.5">
                            <button onClick={() => setShowRdvForm(false)} className={`${ghostBtn} flex-1`}>Annuler</button>
                            <button
                              onClick={envoyerRendezVous} disabled={!rdvDate || !rdvLieu.trim()}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-bold text-sm disabled:opacity-50" style={{ background: G }}
                            >
                              <CalendarPlus size={14} /> Envoyer le rendez-vous
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-4 flex items-center gap-2.5">
                    <button onClick={handleAttemptFile} className="p-2.5 rounded-full text-gray-400 hover:bg-gray-100 flex-shrink-0" title="Joindre un fichier">
                      <Paperclip size={18} />
                    </button>
                    <button
                      onClick={() => setShowRdvForm(v => !v)}
                      className={`p-2.5 rounded-full flex-shrink-0 transition ${showRdvForm ? 'text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                      style={showRdvForm ? { background: G } : undefined}
                      title="Proposer un rendez-vous"
                    >
                      <CalendarPlus size={18} />
                    </button>
                    <input
                      value={inputMessage} onChange={handleInputChange} onKeyDown={handleKeyDown}
                      placeholder="Votre message..."
                      className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm outline-none focus:border-[#E8520A] transition"
                    />
                    <button
                      onClick={envoyerMessage} disabled={!inputMessage.trim()}
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white disabled:opacity-40 transition"
                      style={{ background: O }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDossierModal && selectedConv && (
          <DossierRapideModal demandeId={selectedConv.demande.id} onClose={() => setShowDossierModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function ConversationListItemSL({ conv, active, onClick, onPrendreEnCharge, prenantEnCharge }) {
  const nom = `${conv.locataire?.prenom || ''} ${conv.locataire?.nom || ''}`.trim() || 'Locataire'

  if (conv.statut === 'EN_ATTENTE') {
    return (
      <div className="rounded-xl p-4 mb-2 border border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white" style={{ background: O }}>
            {getInitials(conv.locataire?.nom, conv.locataire?.prenom)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{nom}</p>
            {conv.locataire?.typeLocataire && (
              <span className="inline-block mt-0.5 text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-[#2E7D32]/10 text-[#2E7D32]">
                {conv.locataire.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}
              </span>
            )}
            <p className="text-xs text-gray-400 truncate mt-1">
              {conv.demande?.logement ? `${conv.demande.logement.code} · ${conv.demande.logement.adresse}` : 'Demande sans logement associé'}
            </p>
            <p className="text-[0.68rem] text-gray-400 mt-0.5">Reçue {timeAgo(conv.createdAt)}</p>
          </div>
        </div>
        <button
          onClick={onPrendreEnCharge} disabled={prenantEnCharge}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold transition disabled:opacity-60"
          style={{ background: G }}
        >
          {prenantEnCharge ? <Spinner size={13} /> : <CheckCircle size={13} />} Prendre en charge
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-4 mb-2 border transition ${active ? 'border-[#E8520A] bg-orange-50/30' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white" style={{ background: O }}>
          {getInitials(conv.locataire?.nom, conv.locataire?.prenom)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-sm font-bold text-gray-900 truncate">{nom}</p>
            {conv.dernierMessage && <span className="text-[0.65rem] text-gray-400 flex-shrink-0">{timeAgo(conv.dernierMessage.createdAt)}</span>}
          </div>
          <p className="text-xs text-gray-400 truncate mb-1">
            {conv.demande?.logement ? `${conv.demande.logement.code} · ${conv.demande.logement.adresse}` : 'Demande sans logement associé'}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500 truncate flex-1">
              {apercuMessage(conv.dernierMessage)}
            </p>
            {conv.messagesNonLus > 0 && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-white" style={{ background: O }}>
                {conv.messagesNonLus}
              </span>
            )}
          </div>
          <div className="mt-1.5"><ConversationBadgeStatut statut={conv.statut} /></div>
        </div>
      </div>
    </button>
  )
}

function ChatMessageBubbleSL({ message, isMine }) {
  if (message.type === 'NOTIFICATION_SYSTEME') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-gray-400 italic bg-gray-50 rounded-full px-4 py-1">{message.contenu}</span>
      </div>
    )
  }

  if (message.type === 'RENDEZ_VOUS') {
    const rdv = parseRendezVous(message.contenu)
    if (rdv) {
      return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
          <div className="max-w-sm w-full bg-white border-2 rounded-2xl p-4" style={{ borderColor: G }}>
            <p className="text-sm font-semibold mb-2" style={{ color: G }}>🗓️ Rendez-vous proposé</p>
            <div className="h-px bg-gray-100 mb-2.5" />
            <div className="space-y-1.5">
              <p className="text-sm text-gray-800 flex items-start gap-1.5"><Calendar size={14} className="mt-0.5 flex-shrink-0" style={{ color: G }} /> <span><span className="font-semibold">Date :</span> {formatDateRendezVous(rdv.dateRendezVous)}</span></p>
              <p className="text-sm text-gray-800 flex items-start gap-1.5"><MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: G }} /> <span><span className="font-semibold">Lieu :</span> {rdv.lieuRendezVous}</span></p>
              {rdv.note && (
                <p className="text-sm text-gray-600 flex items-start gap-1.5"><ScrollText size={14} className="mt-0.5 flex-shrink-0 text-gray-400" /> <span><span className="font-semibold">Note :</span> {rdv.note}</span></p>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2.5">{formatHeure(message.createdAt)}</p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 ${isMine ? 'text-white rounded-2xl rounded-tr-none' : 'bg-white border border-gray-100 text-[#1A1A1A] rounded-2xl rounded-tl-none'}`}
        style={isMine ? { background: G } : undefined}
      >
        {message.urlFichier ? (
          <div className="flex items-center gap-2">
            <Paperclip size={14} className={isMine ? 'text-white/80' : 'text-gray-400'} />
            <span className="text-sm truncate">{message.nomFichier || 'Document'}</span>
            <a href={message.urlFichier} target="_blank" rel="noreferrer" className={isMine ? 'text-white' : 'text-blue-600'}><Download size={14} /></a>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.contenu}</p>
        )}
        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[0.65rem] ${isMine ? 'text-white/70' : 'text-gray-400'}`}>{formatHeure(message.createdAt)}</span>
          {isMine && <CheckCheck size={13} className={message.lu ? 'text-blue-300' : 'text-white/60'} />}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator({ label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"
            animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

function DossierRapideModal({ demandeId, onClose }) {
  const [dossier, setDossier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/dossiers/${demandeId}`)
      .then(({ data }) => { if (!cancelled) setDossier(data) })
      .catch(err => {
        if (cancelled) return
        if (err.response?.status === 404) setDossier(null)
        else setError(err.response?.data?.message || 'Impossible de charger le dossier.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [demandeId])

  return (
    <Modal onClose={onClose} width={560}>
      <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
        <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>
          {dossier ? `Dossier de ${dossier.locataire.prenom} ${dossier.locataire.nom}` : 'Dossier du locataire'}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0"><X size={18} /></button>
      </div>

      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-24" /></div>
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => {}} />
        ) : !dossier ? (
          <EmptyState icon={FileText} title="Aucun dossier constitué" subtitle="Ce locataire n'a pas encore rempli son dossier." />
        ) : (
          <>
            {dossier.locataire.typeLocataire && (
              <span className="inline-block mb-4 text-xs font-bold px-2.5 py-1 rounded-full bg-[#2E7D32]/10 text-[#2E7D32]">
                {dossier.locataire.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}
              </span>
            )}

            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2.5 flex items-center gap-1.5"><User size={12} /> Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Date de naissance</p><p className="font-semibold text-gray-800">{dossier.dateNaissance ? formatDate(dossier.dateNaissance) : '—'}</p></div>
                <div><p className="text-xs text-gray-400">Lieu de naissance</p><p className="font-semibold text-gray-800">{dossier.lieuNaissance || '—'}</p></div>
                <div><p className="text-xs text-gray-400">Situation familiale</p><p className="font-semibold text-gray-800">{dossier.situationFamiliale || '—'}</p></div>
                <div><p className="text-xs text-gray-400">Enfants à charge</p><p className="font-semibold text-gray-800">{dossier.nombreEnfants ?? '—'}</p></div>
              </div>
            </div>

            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2.5 flex items-center gap-1.5"><Briefcase size={12} /> Informations professionnelles</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {dossier.locataire.typeLocataire === 'FONCTIONNAIRE' ? (
                  <>
                    <div><p className="text-xs text-gray-400">Ministère</p><p className="font-semibold text-gray-800">{dossier.ministere || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Grade</p><p className="font-semibold text-gray-800">{dossier.grade || '—'}</p></div>
                  </>
                ) : (
                  <>
                    <div><p className="text-xs text-gray-400">Employeur</p><p className="font-semibold text-gray-800">{dossier.employeur || '—'}</p></div>
                    <div><p className="text-xs text-gray-400">Poste</p><p className="font-semibold text-gray-800">{dossier.poste || '—'}</p></div>
                  </>
                )}
                <div><p className="text-xs text-gray-400">Revenu mensuel</p><p className="font-semibold text-gray-800">{dossier.revenuMensuel != null ? `${Number(dossier.revenuMensuel).toLocaleString('fr-FR')} FCFA` : '—'}</p></div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2.5 flex items-center gap-1.5"><ScrollText size={12} /> Documents ({dossier.documents.length})</h3>
              {dossier.documents.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun document fourni.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dossier.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                      <FileText size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{TYPE_DOCUMENT_DOSSIER_LABEL[doc.type] || doc.type}</p>
                        <span className={`text-[0.65rem] font-bold ${doc.valide === true ? 'text-green-600' : doc.valide === false ? 'text-red-600' : 'text-gray-400'}`}>
                          {doc.valide === true ? 'Validé' : doc.valide === false ? 'Rejeté' : 'Fourni'}
                        </span>
                      </div>
                      <a href={doc.urlFichier} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg flex-shrink-0"><Download size={15} /></a>
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

// ═════════════════════════════════════════════════════════════════════════════
// Section : Alertes disponibilité
// ═════════════════════════════════════════════════════════════════════════════
function AlertesSection({ logementsDisponibles, locatairesANotifier, loading, error, onRetry, onNotify, notifyingId }) {
  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  }
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />

  if (!locatairesANotifier || locatairesANotifier === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState
          icon={CheckCircle}
          title={<span className="text-[#2E7D32]">Aucune alerte en attente ✓</span>}
          subtitle="Tous les locataires intéressés ont déjà été notifiés."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <BellRing size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <span className="text-sm font-semibold text-amber-800">
          {locatairesANotifier} locataire{locatairesANotifier > 1 ? 's' : ''} en attente d'une notification de disponibilité, tous logements confondus.
          Vérifiez ci-dessous quels logements disponibles concentrent ces alertes.
        </span>
      </div>

      {logementsDisponibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState icon={Building2} title="Aucun logement disponible" subtitle="Il n'y a actuellement aucun logement au statut Disponible." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {logementsDisponibles.map(l => (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {l.photos?.[0] ? <img src={cldThumb(l.photos[0].urlPhoto, 120, 120)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <ImageOff size={16} className="text-slate-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{l.code}</p>
                <p className="text-xs text-gray-400 truncate">{l.adresse}, {l.ville}</p>
              </div>
              <button
                onClick={() => onNotify(l)}
                disabled={notifyingId === l.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold flex-shrink-0 disabled:opacity-60"
                style={{ background: O }}
              >
                {notifyingId === l.id ? <Spinner size={12} /> : <Bell size={12} />} Vérifier les alertes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function ServiceLogementDashboard() {
  const navigate = useNavigate()
  const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || '{}'), [])
  const initials = getInitials(currentUser.nom, currentUser.prenom)

  const [activeSection, setActiveSection] = useState('overview')
  const [agendaTargetConvId, setAgendaTargetConvId] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [now] = useState(new Date())
  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  // ── Data state ────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  const [logements, setLogements] = useState([])
  const [logementsLoading, setLogementsLoading] = useState(true)
  const [logementsError, setLogementsError] = useState(null)

  const [demandes, setDemandes] = useState([])
  const [demandesLoading, setDemandesLoading] = useState(true)
  const [demandesError, setDemandesError] = useState(null)

  const [messagesNonLus, setMessagesNonLus] = useState(0)

  // ── Filtres parc immobilier ───────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchStats = useCallback(async () => {
    setStatsLoading(true); setStatsError(null)
    try {
      const { data } = await api.get('/service-logement/stats')
      setStats(data)
    } catch (err) {
      setStatsError(err.response?.data?.message || 'Impossible de charger les statistiques.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchLogements = useCallback(async () => {
    setLogementsLoading(true); setLogementsError(null)
    try {
      const { data } = await api.get('/service-logement/logements')
      setLogements(data)
    } catch (err) {
      setLogementsError(err.response?.data?.message || 'Impossible de charger le parc immobilier.')
    } finally {
      setLogementsLoading(false)
    }
  }, [])

  const fetchDemandes = useCallback(async () => {
    setDemandesLoading(true); setDemandesError(null)
    try {
      const { data } = await api.get('/service-logement/demandes')
      setDemandes(data)
    } catch (err) {
      setDemandesError(err.response?.data?.message || 'Impossible de charger les demandes.')
    } finally {
      setDemandesLoading(false)
    }
  }, [])

  const fetchMessagesNonLus = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations/non-lus')
      setMessagesNonLus(data.total || 0)
    } catch {
      // silencieux : un badge non chargé ne doit pas bloquer le reste du tableau de bord
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['SERVICE_LOGEMENT', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    Promise.allSettled([fetchStats(), fetchLogements(), fetchDemandes(), fetchMessagesNonLus()])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Verrouille le scroll + Échap + focus pendant le tiroir mobile
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
  const goTo = (key) => { setActiveSection(key); setMobileNavOpen(false) }

  // ── Modals ────────────────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [photosTarget, setPhotosTarget] = useState(null)
  const [traiterTarget, setTraiterTarget] = useState(null)
  const [notifyingId, setNotifyingId] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [showClientPreview, setShowClientPreview] = useState(false)

  const handlePhotosChanged = useCallback((newPhotos) => {
    setLogements(prev => prev.map(l => l.id === photosTarget?.id ? { ...l, photos: newPhotos } : l))
    setPhotosTarget(prev => prev ? { ...prev, photos: newPhotos } : prev)
  }, [photosTarget?.id])

  const handleOpenLightbox = useCallback((photoId) => {
    const idx = (photosTarget?.photos || []).findIndex(p => p.id === photoId)
    if (idx >= 0) setLightboxIndex(idx)
  }, [photosTarget])

  const handleLogementCreated = useCallback(() => {
    setShowCreateModal(false)
    fetchLogements(); fetchStats()
  }, [fetchLogements, fetchStats])

  const handleNotify = async (logement) => {
    setNotifyingId(logement.id)
    try {
      const { data } = await api.post(`/service-logement/logements/${logement.id}/notifier-alertes`)
      if (data.locatairesNotifies > 0) {
        fire('success', `${data.locatairesNotifies} locataire${data.locatairesNotifies > 1 ? 's' : ''} notifié${data.locatairesNotifies > 1 ? 's' : ''} pour ${logement.code}.`)
      } else {
        fire('success', `Aucun locataire en attente pour ${logement.code}.`)
      }
      await fetchStats()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de notifier les locataires.')
    } finally {
      setNotifyingId(null)
    }
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────────
  const logementsById = useMemo(() => Object.fromEntries(logements.map(l => [l.id, l])), [logements])
  const logementsDisponibles = useMemo(() => logements.filter(l => l.statut === 'DISPONIBLE'), [logements])

  const filteredLogements = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logements.filter(l => {
      if (statutFilter && l.statut !== statutFilter) return false
      if (typeFilter && l.type !== typeFilter) return false
      if (q && !['code', 'adresse', 'ville', 'quartier'].some(f => l[f]?.toLowerCase().includes(q))) return false
      return true
    })
  }, [logements, search, statutFilter, typeFilter])

  const badges = useMemo(() => ({
    demandes: demandes.length || null,
    alertes: stats?.alertes?.locatairesANotifier || null,
    messages: messagesNonLus || null,
  }), [demandes, stats, messagesNonLus])

  const meta = SECTION_META[activeSection]

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>

      {/* ══ Sidebar (desktop) ══════════════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-[100] w-64 bg-white border-r border-gray-200 flex-col shadow-sm">
        <SidebarContent activeSection={activeSection} onNavigate={goTo} user={currentUser} initials={initials} badges={badges} onLogout={logout} />
      </aside>

      {/* ══ Mobile drawer ══════════════════════════════════════════════════════ */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[199] bg-black/35" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <aside
        className="md:hidden fixed top-0 left-0 bottom-0 z-[200] w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 will-change-transform"
        style={{ transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        role="dialog" aria-modal="true" aria-label="Menu de navigation" aria-hidden={!mobileNavOpen}
      >
        <button
          ref={mobileCloseBtnRef} onClick={() => setMobileNavOpen(false)} aria-label="Fermer le menu"
          tabIndex={mobileNavOpen ? 0 : -1}
          className="absolute top-3 right-3 p-3 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 z-10"
        >
          <X size={18} />
        </button>
        <SidebarContent activeSection={activeSection} onNavigate={goTo} user={currentUser} initials={initials} badges={badges} onLogout={logout} />
      </aside>

      {/* ══ Main ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden md:ml-64">

        {/* Topbar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 md:px-7 py-3.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
                className="md:hidden p-3 -ml-3 rounded-lg text-gray-600"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>{meta.title}</h1>
                <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">{meta.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-green-500/10 text-green-600 border-green-500/30 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Système opérationnel
              </span>
              <span className="hidden md:inline text-xs text-gray-400 whitespace-nowrap">
                {now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} · {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="w-px h-6 bg-gray-200 hidden sm:block" />
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: G }}>
                <span className="text-xs font-extrabold text-white">{initials}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-7">
          {activeSection === 'overview' && (
            <OverviewSection stats={stats} loading={statsLoading} error={statsError} onRetry={fetchStats} />
          )}

          {activeSection === 'parc' && (
            <ParcSection
              logements={filteredLogements} loading={logementsLoading} error={logementsError} onRetry={fetchLogements}
              search={search} onSearch={setSearch}
              statutFilter={statutFilter} onStatutFilter={setStatutFilter}
              typeFilter={typeFilter} onTypeFilter={setTypeFilter}
              onCreate={() => setShowCreateModal(true)}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              onPhotos={setPhotosTarget}
            />
          )}

          {activeSection === 'demandes' && (
            <DemandesSection
              demandes={demandes} logementsById={logementsById}
              loading={demandesLoading} error={demandesError} onRetry={fetchDemandes}
              onTraiter={setTraiterTarget}
            />
          )}

          {activeSection === 'messages' && (
            <MessagesSection
              currentUser={currentUser} fire={fire}
              autoOpenConversationId={agendaTargetConvId}
              onAutoOpened={() => setAgendaTargetConvId(null)}
              onIncrementBadge={() => setMessagesNonLus(prev => (prev || 0) + 1)}
            />
          )}
          {activeSection === 'agenda' && (
            <AgendaServiceSection
              fire={fire}
              onProposerDate={(conversationId) => { setAgendaTargetConvId(conversationId); setActiveSection('messages') }}
            />
          )}

          {activeSection === 'alertes' && (
            <AlertesSection
              logementsDisponibles={logementsDisponibles}
              locatairesANotifier={stats?.alertes?.locatairesANotifier || 0}
              loading={statsLoading || logementsLoading} error={statsError || logementsError} onRetry={() => { fetchStats(); fetchLogements() }}
              onNotify={handleNotify} notifyingId={notifyingId}
            />
          )}
        </div>
      </div>

      {/* ══ Modals ═════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <CreerLogementStepperModal
            onClose={() => setShowCreateModal(false)}
            fire={fire}
            onCreated={handleLogementCreated}
          />
        )}
        {editTarget && (
          <EditLogementModal
            logement={editTarget}
            onClose={() => setEditTarget(null)}
            fire={fire}
            onSaved={() => { setEditTarget(null); fetchLogements(); fetchStats() }}
          />
        )}
        {deleteTarget && (
          <DeleteLogementModal
            logement={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            fire={fire}
            onDeleted={() => { setDeleteTarget(null); fetchLogements(); fetchStats() }}
          />
        )}
        {photosTarget && (
          <PhotosModal
            logement={photosTarget}
            onClose={() => { setPhotosTarget(null); fetchStats() }}
            fire={fire}
            onPhotosChanged={handlePhotosChanged}
            onPreview={() => setShowClientPreview(true)}
            onOpenLightbox={handleOpenLightbox}
          />
        )}
        {traiterTarget && (
          <TraiterDemandeModal demande={traiterTarget} onClose={() => setTraiterTarget(null)} />
        )}
        {lightboxIndex !== null && photosTarget && (
          <Lightbox
            photos={photosTarget.photos || []}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
        {showClientPreview && photosTarget && (
          <ClientPreviewModal logement={photosTarget} onClose={() => setShowClientPreview(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
