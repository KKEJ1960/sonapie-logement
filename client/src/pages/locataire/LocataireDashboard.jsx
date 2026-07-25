import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home, Building2, FileText, Wrench, CreditCard, User, Bell, HelpCircle,
  Headphones, Menu, X, LogOut, ChevronDown, ChevronRight, ChevronsLeft, Plus,
  CheckCircle, Clock, Calendar, AlertTriangle, RefreshCw, Check, Camera,
  ArrowLeftRight, Image as ImageIcon, MapPin, Layers, Ruler,
  ScrollText, Settings, Download, Trash2, Phone, Upload, Eye, EyeOff, Lightbulb,
  Search, ChevronLeft, ImageOff, Wifi, Car, Wind, Sofa, Shield, ArrowUpDown, BellRing,
  Waves, Trees, Dumbbell, Flame, Droplet, Zap,
  FolderCheck, Activity, MessageCircle, Briefcase, XCircle,
  Paperclip, Send, CheckCheck, ArrowLeft, MoreVertical, CalendarDays,
  BedSingle, BedDouble, ChefHat, ShowerHead, Toilet, DoorOpen, DoorClosed, Leaf, LandPlot, Package,
} from 'lucide-react'
import api from '../../services/api.js'
import { connectSocket, disconnectSocket } from '../../services/socket.js'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'
const GRADIENT = 'linear-gradient(135deg, #E8520A 0%, #ff8c4a 100%)'

const NAV_MAIN = [
  { key: 'accueil', icon: Home, label: 'Accueil' },
]
const NAV_ESPACE = [
  { key: 'logements',      icon: Building2,  label: 'Logements' },
  { key: 'visiter',        icon: Eye,        label: 'Visiter' },
  { key: 'logement',       icon: Home,       label: 'Mon logement', requiertLogement: true },
  { key: 'demandes',       icon: FileText,   label: 'Mes demandes' },
  { key: 'dossier',        icon: FolderCheck, label: 'Mon dossier' },
  { key: 'suivi',          icon: Activity,   label: 'Suivi de ma demande' },
  { key: 'interventions',  icon: Wrench,     label: 'Mes interventions', requiertLogement: true },
  { key: 'paiements',      icon: CreditCard, label: 'Mes paiements', requiertLogement: true },
]
const NAV_COMPTE = [
  { key: 'chat',           icon: MessageCircle, label: 'Mes messages' },
  { key: 'agenda',         icon: CalendarDays, label: 'Agenda' },
  { key: 'profil',         icon: User,  label: 'Profil' },
  { key: 'notifications',  icon: Bell,  label: 'Notifications' },
  { key: 'parametres',     icon: Settings, label: 'Paramètres' },
  { key: 'aide',           icon: HelpCircle, label: 'Aide & support' },
]

// Sections dont la visibilité dépend de l'attribution effective d'un logement.
const SECTIONS_REQUIERENT_LOGEMENT = NAV_ESPACE.filter(i => i.requiertLogement).map(i => i.key)

const SECTION_META = {
  accueil:       { title: 'Accueil',            subtitle: 'Vue générale de votre espace locataire' },
  logement:      { title: 'Mon logement',       subtitle: 'Détails de votre logement actuel' },
  logements:     { title: 'Logements disponibles', subtitle: 'Découvrez et visitez les logements du parc SONAPIE' },
  visiter:       { title: 'Visiter un logement',  subtitle: 'Découvrez chaque logement en détail avant de faire votre demande' },
  demandes:      { title: 'Mes demandes',       subtitle: 'Demandes de logement et de mutation' },
  dossier:       { title: 'Constitution du dossier', subtitle: 'Complétez votre dossier pour accélérer le traitement de votre demande' },
  suivi:         { title: 'Suivi de ma demande', subtitle: "L'avancement de votre demande, étape par étape" },
  interventions: { title: 'Mes interventions',  subtitle: 'Suivi de vos tickets de maintenance' },
  paiements:     { title: 'Mes paiements',      subtitle: 'Historique de vos paiements de loyer' },
  chat:          { title: 'Mes messages',       subtitle: 'Échangez avec le Service Logement' },
  agenda:        { title: 'Agenda',             subtitle: 'Vos rendez-vous avec le Service Logement' },
  profil:        { title: 'Profil',             subtitle: 'Informations de votre compte' },
  notifications: { title: 'Notifications',      subtitle: 'Toutes vos notifications' },
  parametres:    { title: 'Paramètres',         subtitle: 'Sécurité et préférences du compte' },
  aide:          { title: 'Aide & support',     subtitle: "Besoin d'assistance ? Contactez-nous" },
}

// ─── Dossier client (constitution du dossier de demande) ──────────────────────
const DOCUMENTS_FONCTIONNAIRE = [
  { type: 'PIECE_IDENTITE',    label: "Pièce d'identité",                  requis: true,  icon: User },
  { type: 'PHOTO_IDENTITE',    label: "Photo d'identité",                  requis: true,  icon: Camera },
  { type: 'BULLETIN_SALAIRE',  label: 'Bulletin de salaire (3 derniers mois)', requis: true, icon: FileText },
  { type: 'ATTESTATION_EMPLOI', label: "Attestation d'emploi",             requis: true,  icon: Briefcase },
  { type: 'ACTE_NAISSANCE',    label: 'Acte de naissance',                 requis: false, icon: ScrollText },
]
const DOCUMENTS_PRIVE = [
  { type: 'PIECE_IDENTITE',   label: "Pièce d'identité",           requis: true,  icon: User },
  { type: 'PHOTO_IDENTITE',   label: "Photo d'identité",           requis: true,  icon: Camera },
  { type: 'CONTRAT_TRAVAIL',  label: 'Contrat de travail',         requis: true,  icon: Briefcase },
  { type: 'BULLETIN_SALAIRE', label: '3 derniers bulletins de salaire', requis: true, icon: FileText },
  { type: 'AVIS_IMPOSITION',  label: "Avis d'imposition",          requis: false, icon: ScrollText },
]

// Plafond de la colonne `revenuMensuel` côté serveur (DECIMAL(10,2)).
const REVENU_MENSUEL_MAX = 99999999.99

// ─── Statuts tickets ────────────────────────────────────────────────────────────
const STATUT_TICKET_META = {
  SOUMIS:                            { label: 'Soumis',                  cls: 'bg-blue-50 text-blue-600 border-blue-200',
    texte: 'Votre signalement a été reçu, en attente de programmation d\'un constat.' },
  CONSTAT_PROGRAMME:                 { label: 'Constat programmé',       cls: 'bg-amber-50 text-amber-700 border-amber-200',
    texte: 'Un agent va passer effectuer le constat.' },
  CONSTAT_EFFECTUE:                  { label: 'Constat effectué',        cls: 'bg-violet-50 text-violet-600 border-violet-200',
    texte: 'Le constat est fait — merci de choisir le mode de réparation.' },
  PRISE_EN_CHARGE_LOCATAIRE:         { label: 'Pris en charge (vous)',    cls: 'bg-orange-50 text-[#E8520A] border-orange-200',
    texte: 'Vous avez choisi de réparer vous-même.' },
  PRISE_EN_CHARGE_SONAPIE:           { label: 'Pris en charge (SONAPIE)', cls: 'bg-orange-50 text-[#E8520A] border-orange-200',
    texte: 'La SONAPIE va assigner un technicien.' },
  EN_ATTENTE_CONFIRMATION_LOCATAIRE: { label: 'En attente de confirmation', cls: 'bg-amber-50 text-amber-700 border-amber-200',
    texte: 'En attente de votre confirmation.' },
  ASSIGNE_TECHNICIEN:                { label: 'Technicien assigné',      cls: 'bg-orange-50 text-[#E8520A] border-orange-200',
    texte: 'Un technicien a été assigné à votre dossier.' },
  EN_COURS:                          { label: 'En cours',                cls: 'bg-orange-50 text-[#E8520A] border-orange-200',
    texte: "L'intervention est en cours." },
  VERIFICATION_SONAPIE:              { label: 'Vérification',            cls: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    texte: 'En attente de vérification par la SONAPIE.' },
  CLOTURE:                           { label: 'Clôturé',                 cls: 'bg-green-50 text-green-700 border-green-200',
    texte: 'Ticket clôturé — problème résolu.' },
  REOUVERT:                          { label: 'Réouvert',                cls: 'bg-red-50 text-red-600 border-red-200',
    texte: 'Le ticket a été réouvert suite à une non-conformité.' },
}

const NEXT_STEP_TEXT = {
  SOUMIS: 'Un agent va programmer un constat à votre domicile prochainement.',
  CONSTAT_PROGRAMME: (t) => t.dateConstatPrevue
    ? `Un agent passera le ${formatDate(t.dateConstatPrevue)} pour constater le problème.`
    : 'Un agent va passer constater le problème signalé.',
  CONSTAT_EFFECTUE: 'Merci de choisir si vous souhaitez réparer vous-même ou confier la réparation à la SONAPIE.',
  PRISE_EN_CHARGE_LOCATAIRE: "Vous avez choisi de réparer vous-même. Une fois terminé, confirmez la réparation depuis le détail du ticket.",
  PRISE_EN_CHARGE_SONAPIE: 'La SONAPIE va assigner un technicien pour effectuer la réparation.',
  EN_ATTENTE_CONFIRMATION_LOCATAIRE: 'En attente de votre confirmation.',
  ASSIGNE_TECHNICIEN: 'Un technicien a été assigné et interviendra prochainement.',
  EN_COURS: 'L\'intervention est en cours par notre technicien.',
  VERIFICATION_SONAPIE: 'La SONAPIE vérifie la conformité de la réparation avant clôture.',
  REOUVERT: 'La réparation n\'était pas conforme, le ticket a été réouvert pour un nouveau passage.',
}

const STEPS_TICKET = ['Déclarée', 'Constat', 'En cours', 'Terminé']

function getTicketDoneCount(statut) {
  switch (statut) {
    case 'SOUMIS':
    case 'CONSTAT_PROGRAMME': return 1
    case 'CONSTAT_EFFECTUE':
    case 'PRISE_EN_CHARGE_LOCATAIRE':
    case 'PRISE_EN_CHARGE_SONAPIE':
    case 'EN_ATTENTE_CONFIRMATION_LOCATAIRE':
    case 'ASSIGNE_TECHNICIEN':
    case 'EN_COURS':
    case 'REOUVERT': return 2
    case 'VERIFICATION_SONAPIE': return 3
    case 'CLOTURE': return 4
    default: return 0
  }
}

// ─── Statuts demandes / mutations (StatutDemande) ─────────────────────────────
const STATUT_DEMANDE_META = {
  SOUMISE:                 { label: 'Soumise',                cls: 'bg-blue-50 text-blue-600 border-blue-200',    step: 0 },
  EN_VALIDATION_DIRECTION: { label: 'En validation Direction', cls: 'bg-amber-50 text-amber-700 border-amber-200', step: 1 },
  VALIDEE_DIRECTION:       { label: 'Validée par la Direction', cls: 'bg-violet-50 text-violet-600 border-violet-200', step: 2 },
  EN_ETUDE_LOGEMENT:       { label: 'En étude logement',       cls: 'bg-orange-50 text-[#E8520A] border-orange-200', step: 2 },
  APPROUVEE:               { label: 'Approuvée',               cls: 'bg-green-50 text-green-700 border-green-200', step: 3 },
  REJETEE_DIRECTION:       { label: 'Rejetée (Direction)',     cls: 'bg-red-50 text-red-600 border-red-200',       step: -1 },
  REJETEE:                 { label: 'Rejetée',                 cls: 'bg-red-50 text-red-600 border-red-200',       step: -1 },
  ANNULEE:                 { label: 'Annulée',                 cls: 'bg-gray-100 text-gray-500 border-gray-200',   step: 0 },
}
const STEPS_DEMANDE = ['Soumise', 'Validation Direction', 'Étude logement', 'Décision']

const STATUT_PAIEMENT_META = {
  PAYE:       { label: 'Payé',       cls: 'bg-green-50 text-green-700 border-green-200' },
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  EN_RETARD:  { label: 'En retard',  cls: 'bg-red-50 text-red-600 border-red-200' },
  ANNULE:     { label: 'Annulé',     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const MOIS_LABEL = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const TYPE_PHOTO_LABEL = {
  SIGNALEMENT:       'Signalement',
  CONSTAT:           'Constat',
  AVANT_REPARATION:  'Avant réparation',
  APRES_REPARATION:  'Après réparation',
}

// ─── Logements (section "Logements disponibles") ─────────────────────────────
const TYPE_LOGEMENT_LABEL = { F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', VILLA: 'Villa' }
const STATUT_LOGEMENT_META = {
  DISPONIBLE:  { label: 'Disponible', cls: 'bg-[#2E7D32] text-white' },
  OCCUPE:      { label: 'Occupé',     cls: 'bg-gray-600 text-white' },
  MAINTENANCE: { label: 'En travaux', cls: 'bg-amber-500 text-white' },
}
const TYPE_PIECE_LABEL = {
  SALON: 'Salon', CHAMBRE: 'Chambre', CHAMBRE_PRINCIPALE: 'Chambre principale',
  CHAMBRE_2: 'Chambre 2', CHAMBRE_3: 'Chambre 3', CUISINE: 'Cuisine', SALLE_DE_BAIN: 'Salle de bain',
  TOILETTES: 'Toilettes', BALCON: 'Balcon', TERRASSE: 'Terrasse', JARDIN: 'Jardin',
  GARAGE: 'Garage / Parking', ENTREE: 'Entrée', FACADE: 'Façade / Extérieur',
  AUTRE: 'Photo', AUTRES_ESPACES: 'Autres espaces',
}
const TYPE_PIECE_ICON = {
  SALON:              { icon: Sofa,       color: '#8B5CF6' },
  CHAMBRE:            { icon: BedSingle,  color: '#3B82F6' },
  CHAMBRE_PRINCIPALE: { icon: BedDouble,  color: '#3B82F6' },
  CHAMBRE_2:          { icon: BedSingle,  color: '#3B82F6' },
  CHAMBRE_3:          { icon: BedSingle,  color: '#3B82F6' },
  CUISINE:            { icon: ChefHat,    color: '#F59E0B' },
  SALLE_DE_BAIN:      { icon: ShowerHead, color: '#06B6D4' },
  TOILETTES:          { icon: Toilet,     color: '#0EA5E9' },
  BALCON:             { icon: DoorOpen,   color: '#22C55E' },
  TERRASSE:           { icon: LandPlot,   color: '#84CC16' },
  JARDIN:             { icon: Leaf,       color: '#22C55E' },
  GARAGE:             { icon: Car,        color: '#6B7280' },
  ENTREE:             { icon: DoorClosed, color: '#F97316' },
  FACADE:             { icon: Building2,  color: O },
  AUTRE:              { icon: Camera,     color: '#6B7280' },
  AUTRES_ESPACES:     { icon: Package,    color: '#6B7280' },
}
const COMMODITES_LOGEMENT_META = [
  { key: 'internet',          label: 'Wifi',               icon: Wifi,        color: '#3B82F6' },
  { key: 'parking',           label: 'Parking',            icon: Car,         color: '#6B7280' },
  { key: 'climatisation',     label: 'Climatisation',      icon: Wind,        color: '#06B6D4' },
  { key: 'meuble',            label: 'Meublé',             icon: Sofa,        color: '#8B5CF6' },
  { key: 'gardien',           label: 'Gardien',            icon: Shield,      color: '#F59E0B' },
  { key: 'ascenseur',         label: 'Ascenseur',          icon: ArrowUpDown, color: '#EC4899' },
  { key: 'eauCourante',       label: 'Eau courante',       icon: Droplet,     color: '#0EA5E9' },
  { key: 'electricite',       label: 'Électricité',        icon: Zap,         color: '#EAB308' },
  { key: 'piscine',           label: 'Piscine',            icon: Waves,       color: '#06B6D4' },
  { key: 'jardin',            label: 'Jardin / Espace vert', icon: Trees,     color: '#22C55E' },
  { key: 'sallesDeSport',     label: 'Salle de sport',     icon: Dumbbell,    color: '#EF4444' },
  { key: 'groupeElectrogene', label: 'Groupe électrogène', icon: Flame,       color: '#F97316' },
]
function formatMontant(m) { return m != null ? `${Number(m).toLocaleString('fr-FR')} FCFA/mois` : null }

// ─── Helpers ────────────────────────────────────────────────────────────────────
const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
function formatDate(d) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function formatDateTime(d) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function formatHeure(d) { return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
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

// Préfixe du message texte envoyé lors de la confirmation d'un rendez-vous —
// sert aussi à détecter, à partir de l'historique, qu'un RDV est déjà confirmé
// (voir CONFIRMATION_PREFIX côté serveur dans chat.controller.js).
const CONFIRMATION_RDV_PREFIX = '✓ Rendez-vous confirmé'

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

// Les photos sont stockées sur Cloudinary en pleine résolution (jusqu'à 1920×1080) ;
// on demande ici une version recadrée/compressée à la volée adaptée à chaque usage
// (carte, vignette…) au lieu de faire télécharger l'image originale pour un aperçu.
function cldThumb(url, w, h) {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) return url
  const params = h ? `f_auto,q_auto,w_${w},h_${h},c_fill` : `f_auto,q_auto,w_${w}`
  return url.replace('/upload/', `/upload/${params}/`)
}

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition font-[Inter] disabled:opacity-60 disabled:cursor-not-allowed'
const sel = `${inp} cursor-pointer`
const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'
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
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 flex items-center justify-center p-4">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-[22px] border border-slate-100 shadow-2xl w-full max-h-[90vh] overflow-y-auto"
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

function EmptyState({ icon: Icon = ScrollText, title, subtitle, action }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-slate-300" />
      </div>
      <p className="text-base font-bold text-slate-700 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mb-3">{subtitle}</p>}
      {action}
    </div>
  )
}

function Skeleton({ className }) {
  return <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />
}

function StatutTicketBadge({ statut }) {
  const m = STATUT_TICKET_META[statut] || { label: statut, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${m.cls}`}>{m.label}</span>
}

function StatutDemandeBadge({ statut }) {
  const m = STATUT_DEMANDE_META[statut] || { label: statut, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${m.cls}`}>{m.label}</span>
}

// ── Stepper ticket (4 étapes) ──────────────────────────────────────────────────
function TicketStepper({ doneCount }) {
  return (
    <div className="flex items-center">
      {STEPS_TICKET.map((label, i) => {
        const idx = i + 1
        const done = idx <= doneCount
        const active = idx === doneCount + 1 && doneCount < 4
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  done ? 'text-white' : active ? 'text-white animate-pulse' : 'bg-gray-100 text-gray-400'
                }`}
                style={(done || active) ? { background: O } : undefined}
              >
                {done ? <Check size={14} /> : idx}
              </div>
              <span className={`text-[0.65rem] mt-1.5 font-semibold text-center whitespace-nowrap ${done || active ? 'text-[#E8520A]' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS_TICKET.length - 1 && (
              <div className={`flex-1 h-[3px] mx-1.5 rounded-full mb-4 ${idx <= doneCount ? '' : 'bg-gray-100'}`} style={idx <= doneCount ? { background: O } : undefined} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Mini stepper demandes/mutations ────────────────────────────────────────────
function DemandeMiniStepper({ statut }) {
  const meta = STATUT_DEMANDE_META[statut]
  const rejected = meta?.step === -1
  const step = rejected ? (statut === 'REJETEE_DIRECTION' ? 1 : 2) : (meta?.step ?? 0)
  return (
    <div className="flex items-center gap-1">
      {STEPS_DEMANDE.map((label, i) => {
        const idx = i + 1
        const done = idx <= step
        const isRejectPoint = rejected && idx === step
        return (
          <div key={label} title={label} className="flex-1 h-1.5 rounded-full" style={{
            background: isRejectPoint ? '#EF4444' : done ? O : '#E5E7EB',
          }} />
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Sidebar
// ═════════════════════════════════════════════════════════════════════════════
function SidebarContent({ activeSection, onNavigate, user, initials, badges, onLogout, onContact, collapsed, onToggleCollapse, aUnLogement }) {
  const navEspace = NAV_ESPACE.filter(item => !item.requiertLogement || aUnLogement)

  const renderItem = ({ key, icon: Icon, label }) => {
    const active = activeSection === key
    const badgeValue = badges?.[key]
    return (
      <button
        key={key}
        onClick={() => onNavigate(key)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center gap-2.5 mb-0.5 rounded-lg text-sm text-left transition ${collapsed ? 'justify-center px-0 py-3' : ''} ${
          active
            ? `bg-[#E8520A]/10 text-[#E8520A] font-semibold ${collapsed ? 'border-l-4 border-[#E8520A]' : 'border-l-4 border-[#E8520A] pl-[11px] pr-3.5 py-3'}`
            : `text-gray-500 font-normal hover:bg-gray-50 ${collapsed ? 'border-l-4 border-transparent' : 'border-l-4 border-transparent px-3.5 py-3'}`
        }`}
      >
        <span className="relative flex-shrink-0 inline-flex">
          <Icon size={16} style={{ color: active ? O : '#9CA3AF' }} aria-hidden="true" />
          {collapsed && !!badgeValue && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: O }} />
          )}
        </span>
        {!collapsed && <span className="flex-1">{label}</span>}
        {!collapsed && !!badgeValue && (
          <span className="text-[0.62rem] font-bold text-[#E8520A]">
            {badgeValue}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className={`pt-5 pb-4 border-b border-gray-200 flex items-center ${collapsed ? 'px-2.5 justify-center' : 'px-5 justify-between'}`}>
        {!collapsed && (
          <img
            src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg" alt="SONAPIE"
            width="140" height="60" style={{ width: 140, height: 'auto', mixBlendMode: 'multiply' }}
          />
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition flex-shrink-0"
          >
            <ChevronsLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2.5 pt-3.5 overflow-y-auto overflow-x-hidden" aria-label="Navigation principale">
        {NAV_MAIN.map(renderItem)}
        {!collapsed && <p className="text-[0.62rem] font-bold tracking-widest uppercase text-slate-400 mb-2 mt-4 ml-1">Mon espace</p>}
        {collapsed && <div className="h-3" />}
        {navEspace.map(renderItem)}
        {!collapsed && <p className="text-[0.62rem] font-bold tracking-widest uppercase text-slate-400 mb-2 mt-4 ml-1">Mon compte</p>}
        {collapsed && <div className="h-3" />}
        {NAV_COMPTE.map(renderItem)}
      </nav>

      {!collapsed && (
        <div className="mx-2.5 mt-2 p-4 rounded-2xl text-white" style={{ background: GRADIENT }}>
          <Headphones size={20} className="mb-2" />
          <p className="text-xs font-semibold leading-snug mb-3">Notre équipe est là pour vous aider</p>
          <button onClick={onContact} className="w-full bg-white rounded-lg py-2 text-xs font-bold" style={{ color: O }}>
            Nous contacter
          </button>
        </div>
      )}
      {collapsed && (
        <button onClick={onContact} title="Nous contacter" className="mx-2.5 mt-2 p-3 rounded-2xl text-white flex items-center justify-center" style={{ background: GRADIENT }}>
          <Headphones size={18} />
        </button>
      )}

      <div className={`mx-2.5 mt-3 rounded-xl bg-gray-50 border border-gray-200 ${collapsed ? 'p-2 flex justify-center' : 'p-2.5'}`}>
        <div className={`flex items-center ${collapsed ? '' : 'gap-2.5'}`}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }} title={collapsed ? `${user.prenom} ${user.nom}` : undefined}>
            <span className="text-xs font-extrabold text-white">{initials || 'L'}</span>
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.prenom} {user.nom}</p>
                <p className="text-xs text-gray-400">Locataire</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            </>
          )}
        </div>
      </div>

      <div className="mx-2.5 mt-1 mb-3.5">
        <button
          onClick={onLogout} title={collapsed ? 'Se déconnecter' : undefined}
          className={`w-full flex items-center gap-2 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition ${collapsed ? 'justify-center px-0' : 'px-3'}`}
        >
          <LogOut size={14} /> {!collapsed && 'Se déconnecter'}
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function LocataireDashboard() {
  const navigate = useNavigate()
  const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || '{}'), [])
  const initials = getInitials(currentUser.nom, currentUser.prenom)

  const [activeSection, setActiveSection] = useState('accueil')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('loc-sidebar-collapsed') === '1')
  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('loc-sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }, [])
  const [now] = useState(new Date())
  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  // ── Data state ────────────────────────────────────────────────────────────────
  const [monLogement, setMonLogement] = useState(null)
  const [logementLoading, setLogementLoading] = useState(true)
  const [logementError, setLogementError] = useState(null)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  const [tickets, setTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState(null)

  const [demandes, setDemandes] = useState([])
  const [demandesLoading, setDemandesLoading] = useState(true)
  const [demandesError, setDemandesError] = useState(null)

  const [mutations, setMutations] = useState([])
  const [mutationsLoading, setMutationsLoading] = useState(true)
  const [mutationsError, setMutationsError] = useState(null)

  const [paiements, setPaiements] = useState([])
  const [paiementsLoading, setPaiementsLoading] = useState(true)
  const [paiementsError, setPaiementsError] = useState(null)

  const [messagesNonLus, setMessagesNonLus] = useState(0)

  const [notifications, setNotifications] = useState([])
  const [nonLues, setNonLues] = useState(0)
  const [notifsLoading, setNotifsLoading] = useState(true)
  const [notifsError, setNotifsError] = useState(null)

  const [logements, setLogements] = useState([])
  const [logementsLoading, setLogementsLoading] = useState(true)
  const [logementsError, setLogementsError] = useState(null)

  const fetchLogement = useCallback(async () => {
    setLogementLoading(true); setLogementError(null)
    try {
      const { data } = await api.get('/locataire/mon-logement')
      setMonLogement(data)
    } catch (err) {
      setLogementError(err.response?.data?.message || 'Impossible de charger votre logement.')
    } finally {
      setLogementLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true); setStatsError(null)
    try {
      const { data } = await api.get('/locataire/stats')
      setStats(data)
    } catch (err) {
      setStatsError(err.response?.data?.message || 'Impossible de charger vos statistiques.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true); setTicketsError(null)
    try {
      const { data } = await api.get('/tickets')
      setTickets(data)
    } catch (err) {
      setTicketsError(err.response?.data?.message || 'Impossible de charger vos interventions.')
    } finally {
      setTicketsLoading(false)
    }
  }, [])

  const fetchDemandes = useCallback(async () => {
    setDemandesLoading(true); setDemandesError(null)
    try {
      const { data } = await api.get('/locataire/demandes')
      setDemandes(data)
    } catch (err) {
      setDemandesError(err.response?.data?.message || 'Impossible de charger vos demandes.')
    } finally {
      setDemandesLoading(false)
    }
  }, [])

  const fetchMutations = useCallback(async () => {
    setMutationsLoading(true); setMutationsError(null)
    try {
      const { data } = await api.get('/locataire/mutations')
      setMutations(data)
    } catch (err) {
      setMutationsError(err.response?.data?.message || 'Impossible de charger vos mutations.')
    } finally {
      setMutationsLoading(false)
    }
  }, [])

  const fetchPaiements = useCallback(async () => {
    setPaiementsLoading(true); setPaiementsError(null)
    try {
      const { data } = await api.get('/locataire/paiements')
      setPaiements(data)
    } catch (err) {
      setPaiementsError(err.response?.data?.message || 'Impossible de charger vos paiements.')
    } finally {
      setPaiementsLoading(false)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setNotifsLoading(true); setNotifsError(null)
    try {
      const { data } = await api.get('/locataire/notifications')
      setNotifications(data.notifications)
      setNonLues(data.nonLues)
    } catch (err) {
      setNotifsError(err.response?.data?.message || 'Impossible de charger vos notifications.')
    } finally {
      setNotifsLoading(false)
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

  const fetchLogements = useCallback(async () => {
    setLogementsLoading(true); setLogementsError(null)
    try {
      const { data } = await api.get('/logements')
      setLogements(data)
    } catch (err) {
      setLogementsError(err.response?.data?.message || 'Impossible de charger les logements disponibles.')
    } finally {
      setLogementsLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || u.role !== 'LOCATAIRE') { navigate('/login'); return }
    fetchLogement(); fetchStats(); fetchTickets(); fetchDemandes(); fetchMutations(); fetchPaiements(); fetchNotifications(); fetchLogements(); fetchMessagesNonLus()
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
  const [showDeclarer, setShowDeclarer] = useState(false)
  const [showDemandeLogement, setShowDemandeLogement] = useState(false)
  const [showMutation, setShowMutation] = useState(false)
  const [deleteDemandeTarget, setDeleteDemandeTarget] = useState(null)
  const [annulerDemandeTarget, setAnnulerDemandeTarget] = useState(null)
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [demandesTab, setDemandesTab] = useState('logement') // 'logement' | 'mutation'
  const [dossierDemandeId, setDossierDemandeId] = useState(null)

  const [demandeCibleeTarget, setDemandeCibleeTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [diaporamaTarget, setDiaporamaTarget] = useState(null)
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)
  const [alertingId, setAlertingId] = useState(null)

  const openDiaporama = useCallback((logement, index = 0) => {
    setLightboxInitialIndex(index)
    setDiaporamaTarget(logement)
  }, [])

  const openTicket = (id) => setSelectedTicketId(id)
  const closeTicket = () => setSelectedTicketId(null)

  const refreshAfterTicketAction = useCallback(async () => {
    await Promise.all([fetchTickets(), fetchStats()])
  }, [fetchTickets, fetchStats])

  const handleAlerter = useCallback(async (logement) => {
    setAlertingId(logement.id)
    try {
      await api.post('/locataire/demandes', { logementId: logement.id, alerteDisponibilite: true })
      fire('success', `Alerte activée pour ${logement.code}. Nous vous préviendrons dès qu'il sera disponible.`)
      await fetchDemandes()
    } catch (err) {
      fire('error', err.response?.data?.message || "Impossible d'activer l'alerte.")
    } finally {
      setAlertingId(null)
    }
  }, [fire, fetchDemandes])

  // ── Dérivés ───────────────────────────────────────────────────────────────────
  const ticketsOuverts = useMemo(() => tickets.filter(t => t.statut !== 'CLOTURE').length, [tickets])
  const demandesEnCoursCount = useMemo(() => (
    demandes.filter(d => !['APPROUVEE', 'REJETEE', 'REJETEE_DIRECTION'].includes(d.statut)).length +
    mutations.filter(m => !['APPROUVEE', 'REJETEE', 'REJETEE_DIRECTION'].includes(m.statut)).length
  ), [demandes, mutations])

  const badges = useMemo(() => ({
    demandes: demandesEnCoursCount || null,
    interventions: ticketsOuverts || null,
    notifications: nonLues || null,
    chat: messagesNonLus || null,
  }), [demandesEnCoursCount, ticketsOuverts, nonLues, messagesNonLus])

  // Les onglets liés à l'occupation (Mon logement, interventions, paiements)
  // n'ont d'intérêt que si un logement est effectivement attribué.
  const aUnLogement = !!monLogement?.logement

  // Si l'utilisateur se retrouve sur un onglet masqué (ex : navigation directe
  // via un state obsolète après la perte du logement), on le ramène à l'accueil.
  useEffect(() => {
    if (!aUnLogement && SECTIONS_REQUIERENT_LOGEMENT.includes(activeSection)) {
      setActiveSection('accueil')
    }
  }, [aUnLogement, activeSection])

  const ticketActif = useMemo(() => (
    tickets.filter(t => t.statut !== 'CLOTURE').sort((a, b) => new Date(b.dateDepot) - new Date(a.dateDepot))[0] || null
  ), [tickets])

  const dernierTickets = useMemo(() => tickets.slice(0, 3), [tickets])

  const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedTicketId) || null, [tickets, selectedTicketId])

  const meta = SECTION_META[activeSection]
  const typeLocataireLabel = currentUser.typeLocataire === 'FONCTIONNAIRE' ? 'Locataire fonctionnaire' : 'Locataire privé'

  const openContact = () => { setActiveSection('aide'); setMobileNavOpen(false) }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>

      {/* ══ Sidebar (desktop) ══════════════════════════════════════════════════ */}
      <aside className={`loc-desk fixed top-0 left-0 bottom-0 z-[100] bg-white border-r border-gray-200 flex-col shadow-sm transition-[width] duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent
          activeSection={activeSection} onNavigate={goTo} user={currentUser} initials={initials}
          badges={badges} onLogout={logout} onContact={openContact}
          collapsed={collapsed} onToggleCollapse={toggleCollapsed}
          aUnLogement={aUnLogement}
        />
      </aside>

      {/* ══ Mobile drawer ══════════════════════════════════════════════════════ */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[199] bg-black/35" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <aside
        className="fixed top-0 left-0 bottom-0 z-[200] w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 will-change-transform"
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
        <SidebarContent
          activeSection={activeSection} onNavigate={goTo} user={currentUser} initials={initials}
          badges={badges} onLogout={logout} onContact={openContact}
          aUnLogement={aUnLogement}
        />
      </aside>

      {/* ══ Main ═══════════════════════════════════════════════════════════════ */}
      <div className={`loc-main flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden transition-[margin] duration-200 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}>

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
                <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {activeSection === 'accueil' ? `Bonjour, ${currentUser.prenom || ''} ${currentUser.nom || ''}` : meta.title}
                </h1>
                <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">
                  {activeSection === 'accueil' ? 'Bienvenue dans votre espace locataire' : meta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => goTo('notifications')}
                aria-label="Notifications"
                className="relative p-2.5 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
              >
                <Bell size={19} />
                {nonLues > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[0.6rem] font-bold text-[#E8520A]">
                    {nonLues}
                  </span>
                )}
              </button>
              <div className="w-px h-6 bg-gray-200 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                  <span className="text-sm font-extrabold text-white">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{currentUser.prenom} {currentUser.nom}</p>
                  <p className="text-xs text-gray-400 truncate">{typeLocataireLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-7 pb-8">
          {activeSection === 'accueil' && (
            <AccueilSection
              monLogement={monLogement} logementLoading={logementLoading}
              stats={stats} statsLoading={statsLoading} statsError={statsError} onRetryStats={fetchStats}
              tickets={dernierTickets} ticketsLoading={ticketsLoading} ticketsError={ticketsError} onRetryTickets={fetchTickets}
              ticketActif={ticketActif}
              onDeclarer={() => setShowDeclarer(true)}
              onDemandeLogement={() => goTo('logements')}
              onOpenTicket={openTicket}
              onGoTo={goTo}
            />
          )}
          {activeSection === 'logement' && (
            <LogementSection
              monLogement={monLogement} loading={logementLoading} error={logementError} onRetry={fetchLogement}
              demandes={demandes} demandesLoading={demandesLoading}
              onDemandeLogement={() => setShowDemandeLogement(true)}
              onMutation={() => setShowMutation(true)}
            />
          )}
          {activeSection === 'logements' && (
            <LogementsSection
              logements={logements} loading={logementsLoading} error={logementsError} onRetry={fetchLogements}
              demandes={demandes} alertingId={alertingId}
              onDemander={setDemandeCibleeTarget}
              onAlerter={handleAlerter}
              onOpenDiaporama={openDiaporama}
              onVoirDetails={setDetailTarget}
            />
          )}
          {activeSection === 'visiter' && (
            <VisiterSection
              logements={logements} loading={logementsLoading} error={logementsError} onRetry={fetchLogements}
              demandes={demandes} alertingId={alertingId}
              onDemander={setDemandeCibleeTarget}
              onAlerter={handleAlerter}
              onOpenDiaporama={openDiaporama}
            />
          )}
          {activeSection === 'demandes' && (
            <DemandesSection
              tab={demandesTab} setTab={setDemandesTab}
              demandes={demandes} demandesLoading={demandesLoading} demandesError={demandesError} onRetryDemandes={fetchDemandes}
              mutations={mutations} mutationsLoading={mutationsLoading} mutationsError={mutationsError} onRetryMutations={fetchMutations}
              onConstituerDossier={(demandeId) => { setDossierDemandeId(demandeId); goTo('dossier') }}
              onDeleteDemande={setDeleteDemandeTarget}
              onAnnulerDemande={setAnnulerDemandeTarget}
              onGoTo={goTo}
            />
          )}
          {activeSection === 'dossier' && (
            <DossierSection
              demandes={demandes} demandesLoading={demandesLoading} demandesError={demandesError} onRetryDemandes={fetchDemandes}
              typeLocataire={currentUser.typeLocataire}
              initialDemandeId={dossierDemandeId}
              onGoTo={goTo}
              fire={fire}
            />
          )}
          {activeSection === 'suivi' && (
            <SuiviSection
              demandes={demandes} demandesLoading={demandesLoading} demandesError={demandesError} onRetryDemandes={fetchDemandes}
              monLogement={monLogement}
              onGoTo={goTo}
              onNouvelleDemande={() => setShowDemandeLogement(true)}
            />
          )}
          {activeSection === 'chat' && (
            <ChatSection
              currentUser={currentUser} fire={fire} onGoTo={goTo}
              onIncrementBadge={() => setMessagesNonLus(prev => (prev || 0) + 1)}
            />
          )}
          {activeSection === 'agenda' && <AgendaSection fire={fire} onGoTo={goTo} />}
          {activeSection === 'interventions' && (
            <InterventionsSection
              tickets={tickets} loading={ticketsLoading} error={ticketsError} onRetry={fetchTickets}
              onOpenTicket={openTicket} onDeclarer={() => setShowDeclarer(true)}
            />
          )}
          {activeSection === 'paiements' && (
            <PaiementsSection
              paiements={paiements} loading={paiementsLoading} error={paiementsError} onRetry={fetchPaiements}
              typeLocataire={currentUser.typeLocataire}
            />
          )}
          {activeSection === 'profil' && (
            <ProfilSection user={currentUser} />
          )}
          {activeSection === 'parametres' && (
            <ParametresSection fire={fire} />
          )}
          {activeSection === 'notifications' && (
            <NotificationsSection
              notifications={notifications} loading={notifsLoading} error={notifsError} onRetry={fetchNotifications}
              onMarkOne={async (id) => {
                try {
                  await api.patch(`/locataire/notifications/${id}/lue`)
                  fetchNotifications()
                } catch { fire('error', 'Impossible de marquer cette notification comme lue.') }
              }}
              onMarkAll={async () => {
                try {
                  await api.patch('/locataire/notifications/tout-lu')
                  fire('success', 'Toutes les notifications ont été marquées comme lues.')
                  fetchNotifications()
                } catch { fire('error', 'Une erreur est survenue.') }
              }}
              onMarkSelectedRead={async (ids) => {
                try {
                  await Promise.all(ids.map(id => api.patch(`/locataire/notifications/${id}/lue`)))
                  fetchNotifications()
                } catch { fire('error', 'Impossible de marquer ces notifications comme lues.') }
              }}
              onDeleteOne={async (id) => {
                try {
                  await api.delete(`/locataire/notifications/${id}`)
                  fetchNotifications()
                } catch { fire('error', 'Impossible de supprimer cette notification.') }
              }}
              onDeleteMany={async (payload) => {
                try {
                  const { data } = await api.delete('/locataire/notifications', { data: payload })
                  fire('success', `${data.deleted} notification${data.deleted > 1 ? 's' : ''} supprimée${data.deleted > 1 ? 's' : ''}.`)
                  fetchNotifications()
                } catch { fire('error', 'Impossible de supprimer ces notifications.') }
              }}
            />
          )}
          {activeSection === 'aide' && <AideSection user={currentUser} />}
        </main>
      </div>

      {/* ══════════════════════════════ MODALS ═══════════════════════════════ */}
      <AnimatePresence>
        {showDeclarer && (
          <DeclarerProblemeModal
            logement={monLogement?.logement}
            onClose={() => setShowDeclarer(false)}
            onSuccess={() => { setShowDeclarer(false); fire('success', 'Votre problème a été déclaré avec succès.'); refreshAfterTicketAction() }}
            onError={(msg) => fire('error', msg)}
          />
        )}

        {showDemandeLogement && (
          <DemandeLogementModal
            onClose={() => setShowDemandeLogement(false)}
            onSuccess={() => { setShowDemandeLogement(false); fire('success', 'Votre demande de logement a été soumise.'); fetchDemandes() }}
            onError={(msg) => fire('error', msg)}
          />
        )}

        {showMutation && (
          <MutationModal
            hasLogement={!!monLogement?.logement}
            onClose={() => setShowMutation(false)}
            onSuccess={() => { setShowMutation(false); fire('success', 'Votre demande de mutation a été soumise.'); fetchMutations() }}
            onError={(msg) => fire('error', msg)}
          />
        )}

        {demandeCibleeTarget && (
          <DemandeLogementCibleeModal
            logement={demandeCibleeTarget}
            onClose={() => setDemandeCibleeTarget(null)}
            onSuccess={() => { setDemandeCibleeTarget(null); fire('success', 'Votre demande a été envoyée avec succès !'); fetchDemandes() }}
            onError={(msg) => fire('error', msg)}
          />
        )}

        {detailTarget && (
          <LogementDetailModal
            logement={detailTarget}
            demandeExistante={demandes.find(d => d.logement?.id === detailTarget.id && !['REJETEE', 'REJETEE_DIRECTION'].includes(d.statut))}
            alerteActive={demandes.some(d => d.logement?.id === detailTarget.id && d.alerteDisponibilite)}
            alerting={alertingId === detailTarget.id}
            onClose={() => setDetailTarget(null)}
            onDemander={(l) => { setDetailTarget(null); setDemandeCibleeTarget(l) }}
            onAlerter={handleAlerter}
          />
        )}

        {diaporamaTarget && (
          <FullscreenDiaporamaModal logement={diaporamaTarget} initialIndex={lightboxInitialIndex} onClose={() => setDiaporamaTarget(null)} />
        )}

        {selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            onClose={closeTicket}
            fire={fire}
            onRefresh={refreshAfterTicketAction}
          />
        )}

        {deleteDemandeTarget && (
          <Modal onClose={() => setDeleteDemandeTarget(null)} width={400}>
            <DeleteDemandeConfirm
              target={deleteDemandeTarget}
              onClose={() => setDeleteDemandeTarget(null)}
              onSuccess={() => { setDeleteDemandeTarget(null); fire('success', 'Demande supprimée.'); fetchDemandes() }}
              onError={(msg) => fire('error', msg)}
            />
          </Modal>
        )}

        {annulerDemandeTarget && (
          <Modal onClose={() => setAnnulerDemandeTarget(null)} width={400}>
            <AnnulerDemandeConfirm
              target={annulerDemandeTarget}
              onClose={() => setAnnulerDemandeTarget(null)}
              onSuccess={() => { setAnnulerDemandeTarget(null); fire('success', 'Demande annulée.'); fetchDemandes() }}
              onError={(msg) => fire('error', msg)}
            />
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) {
          .loc-mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .loc-desk { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Accueil
// ═════════════════════════════════════════════════════════════════════════════
function AccueilSection({
  monLogement, logementLoading, stats, statsLoading, statsError, onRetryStats,
  tickets, ticketsLoading, ticketsError, onRetryTickets, ticketActif,
  onDeclarer, onDemandeLogement, onOpenTicket, onGoTo,
}) {
  const logement = monLogement?.logement

  return (
    <div>
      {/* 1 — Bannière hero */}
      <div className="relative bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 md:p-8 mb-5 flex flex-col lg:flex-row gap-6 items-stretch overflow-hidden">
        {/* Photo décorative : pleine largeur sur mobile (fondu uniforme pour garder le texte lisible),
            cantonnée à la moitié droite sur desktop (fondu latéral, photo bien visible). */}
        <div className="absolute inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[52%]">
          <img src="/salon.png" alt="" decoding="async" fetchPriority="high" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-orange-100/60 lg:bg-gradient-to-r lg:from-orange-100 lg:via-orange-100/25 lg:to-transparent" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            Un logement confortable, notre priorité
          </h2>
          <p className="text-sm text-gray-600 mb-5 max-w-md">
            Déclarez un problème, suivez son traitement et vivez sereinement.
          </p>
          <button
            onClick={onDeclarer}
            className="self-start flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm shadow-sm hover:shadow-md transition"
            style={{ background: O }}
          >
            <Plus size={16} /> Déclarer un problème
          </button>
        </div>

        <div className="relative z-10 lg:w-80 bg-white rounded-2xl p-5 border border-orange-100 shadow-sm flex flex-col justify-center">
          {logementLoading ? (
            <Skeleton className="h-24" />
          ) : logement ? (
            <>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                  <img src="/immeuble.png" alt="" width="44" height="44" decoding="async" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mon logement</p>
              </div>
              <p className="text-base font-bold text-gray-900 mb-0.5">{logement.code}</p>
              <p className="text-sm text-gray-500 mb-4 truncate">{logement.adresse}</p>
              <button onClick={() => onGoTo('logement')} className={`${ghostBtn} text-center`}>Voir les détails</button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                  <img src="/immeuble.png" alt="" width="44" height="44" decoding="async" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mon logement</p>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-4">Aucun logement attribué</p>
              <button onClick={onDemandeLogement} className="px-4 py-2.5 rounded-xl text-white font-bold text-sm text-center" style={{ background: O }}>
                Faire une demande de logement
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2 — KPI cards */}
      {statsError ? (
        <ErrorBanner message={statsError} onRetry={onRetryStats} />
      ) : statsLoading || !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          <KpiCard icon={Wrench} iconBg="#FFF4EF" iconColor={O} value={stats.ticketsEnCours} label="Interventions en cours" onClick={() => onGoTo('interventions')} />
          <KpiCard icon={CheckCircle} iconBg="#F0FDF4" iconColor={G} value={stats.ticketsTermines} label="Interventions terminées" onClick={() => onGoTo('interventions')} />
          <KpiCard icon={Clock} iconBg="#EFF6FF" iconColor="#3B82F6" value={stats.ticketsEnAttentePlanification} label="En attente de planification" onClick={() => onGoTo('interventions')} />
          <KpiCard
            icon={Calendar} iconBg="#FFFBEB" iconColor="#D97706"
            value={stats.prochainConstat ? formatDate(stats.prochainConstat) : 'Aucun prévu'}
            label="Prochain rendez-vous" small={!!stats.prochainConstat}
            onClick={() => onGoTo('interventions')}
          />
        </div>
      )}

      {/* 3 + 4 — Dernières demandes / Suivi intervention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Mes dernières demandes</h3>
            <button onClick={() => onGoTo('interventions')} className="text-xs font-semibold text-[#E8520A] hover:underline">Voir toutes →</button>
          </div>
          {ticketsError ? (
            <div className="px-5 pb-5"><ErrorBanner message={ticketsError} onRetry={onRetryTickets} /></div>
          ) : ticketsLoading ? (
            <div className="px-5 pb-5 flex flex-col gap-2.5">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState icon={Wrench} title="Aucune demande" subtitle="Vos signalements de maintenance apparaîtront ici." />
          ) : (
            <div className="px-2.5 pb-2.5">
              {tickets.map(t => {
                const thumb = t.photos?.find(p => p.typePhoto === 'SIGNALEMENT')
                const technicien = t.intervention?.technicien
                return (
                  <button
                    key={t.id} onClick={() => onOpenTicket(t.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition text-left"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: `${O}1A` }}>
                      {thumb ? (
                        <img src={cldThumb(thumb.urlPhoto, 100, 100)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <Wrench size={18} style={{ color: O }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 truncate">{t.titre}</p>
                        <StatutTicketBadge statut={t.statut} />
                      </div>
                      <p className="text-xs text-gray-400 mb-0.5">Demandé le {formatDate(t.dateDepot)}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-gray-500 truncate">{STATUT_TICKET_META[t.statut]?.texte}</p>
                        {technicien && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[0.55rem] font-bold text-white flex-shrink-0" style={{ background: O }}>
                              {getInitials(technicien.nom, technicien.prenom)}
                            </span>
                            {technicien.prenom}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Suivi de mon intervention</h3>
          {ticketsLoading ? (
            <Skeleton className="h-40" />
          ) : !ticketActif ? (
            <EmptyState icon={CheckCircle} title="Aucune intervention en cours ✓" />
          ) : (
            <>
              <div className="mb-4">
                <TicketStepper doneCount={getTicketDoneCount(ticketActif.statut)} />
              </div>
              {ticketActif.intervention?.technicien && (
                <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                    <span className="text-[0.65rem] font-extrabold text-white">
                      {getInitials(ticketActif.intervention.technicien.nom, ticketActif.intervention.technicien.prenom)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">Technicien en intervention</p>
                    <p className="text-xs text-gray-500 truncate">{ticketActif.intervention.technicien.prenom} {ticketActif.intervention.technicien.nom}</p>
                  </div>
                  {ticketActif.intervention.technicien.telephone && (
                    <a
                      href={`tel:${ticketActif.intervention.technicien.telephone}`} title="Appeler le technicien"
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 text-[#E8520A] hover:bg-orange-50 transition"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <p className="text-xs font-bold text-amber-800 mb-1">Que se passe-t-il ensuite ?</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {typeof NEXT_STEP_TEXT[ticketActif.statut] === 'function'
                    ? NEXT_STEP_TEXT[ticketActif.statut](ticketActif)
                    : (NEXT_STEP_TEXT[ticketActif.statut] || 'Votre demande est en cours de traitement.')}
                </p>
              </div>
              <button onClick={() => onOpenTicket(ticketActif.id)} className="w-full mt-3 text-xs font-semibold text-[#E8520A] hover:underline text-center">
                Voir le détail →
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5 — Actions rapides + conseils */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
          <ActionShortcut icon={Wrench} label="Déclarer un problème" onClick={onDeclarer} />
          <ActionShortcut icon={FileText} label="Suivre mes demandes" onClick={() => onGoTo('interventions')} />
          <ActionShortcut icon={CreditCard} label="Mes paiements" onClick={() => onGoTo('paiements')} />
          <ActionShortcut icon={Building2} label="Mon logement" onClick={() => onGoTo('logement')} />
        </div>

        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col overflow-hidden min-h-[168px]">
          <div className="relative z-10 pr-20">
            <h3 className="text-sm font-bold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Entretenez votre logement</h3>
            <p className="text-xs text-gray-500 mb-4">Quelques conseils pour maintenir votre logement en bon état et éviter les désagréments.</p>
            <button onClick={() => onGoTo('aide')} className="px-4 py-2.5 rounded-xl text-white font-bold text-xs text-center" style={{ background: O }}>
              Voir nos conseils
            </button>
          </div>
          <img src="/bricoleur.png" alt="" loading="lazy" decoding="async" width="128" height="128" className="absolute bottom-0 right-0 w-32 h-32 object-cover object-top rounded-tl-2xl" />
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, iconBg, iconColor, value, label, small, onClick }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3.5" style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <p className={`font-bold text-gray-900 mb-0.5 ${small ? 'text-base' : 'text-2xl'}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
      <button onClick={onClick} className="text-xs font-semibold text-[#E8520A] hover:underline">Voir détails →</button>
    </div>
  )
}

function ActionShortcut({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center text-center gap-2.5">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${O}1A` }}>
        <Icon size={20} style={{ color: O }} />
      </div>
      <p className="text-xs font-bold text-gray-700">{label}</p>
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Mon logement
// ═════════════════════════════════════════════════════════════════════════════
function LogementSection({ monLogement, loading, error, onRetry, demandes, demandesLoading, onDemandeLogement, onMutation }) {
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />
  if (loading || demandesLoading) return <Skeleton className="h-64" />

  const logement = monLogement?.logement

  if (!logement) {
    const demandeRecente = demandes?.[0]
    const rejetee = demandeRecente && ['REJETEE', 'REJETEE_DIRECTION'].includes(demandeRecente.statut)

    if (demandeRecente) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <p className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demande de logement #{demandeRecente.id}</p>
              <p className="text-xs text-gray-400">Soumise le {formatDate(demandeRecente.dateDepot)}</p>
            </div>
            <StatutDemandeBadge statut={demandeRecente.statut} />
          </div>

          <div className="mb-4"><DemandeMiniStepper statut={demandeRecente.statut} /></div>

          {demandeRecente.motif && <p className="text-sm text-gray-600 mb-3">{demandeRecente.motif}</p>}

          {demandeRecente.commentaireDirection && (
            <p className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-gray-600 mb-4">
              <span className="font-semibold">Commentaire Direction : </span>{demandeRecente.commentaireDirection}
            </p>
          )}

          {rejetee ? (
            <button onClick={onDemandeLogement} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
              Faire une nouvelle demande de logement
            </button>
          ) : (
            <p className="text-sm text-gray-500">Dès qu'un logement vous sera attribué, il apparaîtra ici.</p>
          )}
        </div>
      )
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState
          icon={Building2} title="Aucun logement attribué"
          subtitle="Vous n'occupez actuellement aucun logement SONAPIE."
          action={
            <button onClick={onDemandeLogement} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
              Faire une demande de logement
            </button>
          }
        />
      </div>
    )
  }

  const infos = [
    { icon: MapPin, label: 'Adresse', value: `${logement.adresse}, ${logement.ville}${logement.quartier ? ` (${logement.quartier})` : ''}` },
    { icon: Layers, label: 'Type', value: logement.type },
    { icon: Ruler, label: 'Superficie', value: logement.superficie ? `${logement.superficie} m²` : '—' },
    { icon: Home, label: 'Pièces', value: logement.nombrePieces ?? '—' },
    { icon: Building2, label: 'Étage', value: logement.etage },
    { icon: Calendar, label: "Date d'entrée", value: monLogement.dateEntree ? formatDate(monLogement.dateEntree) : '—' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${O}1A` }}>
            <Building2 size={22} style={{ color: O }} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>{logement.code}</p>
            <p className="text-xs text-gray-400">Logement occupé</p>
          </div>
        </div>
        <button onClick={onMutation} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
          <ArrowLeftRight size={14} /> Demander une mutation
        </button>
      </div>

      {logement.description && (
        <p className="text-sm text-gray-600 mb-5 bg-gray-50 border border-gray-100 rounded-xl p-3.5">{logement.description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {infos.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <Icon size={16} className="text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Card premium — logement du parc (section "Logements disponibles")
// ═════════════════════════════════════════════════════════════════════════════
function LogementPremiumCard({ logement, demandeExistante, alerteActive, alerting, onDemander, onAlerter, onOpenDiaporama, onVoirDetails }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const photos = logement.photos || []
  const statutMeta = STATUT_LOGEMENT_META[logement.statut] || STATUT_LOGEMENT_META.DISPONIBLE
  const commodites = COMMODITES_LOGEMENT_META.filter(c => logement[c.key])

  const prevPhoto = (e) => { e.stopPropagation(); setPhotoIdx(i => (i - 1 + photos.length) % photos.length) }
  const nextPhoto = (e) => { e.stopPropagation(); setPhotoIdx(i => (i + 1) % photos.length) }

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-[3px] transition-all">
      <div className="relative bg-slate-100" style={{ aspectRatio: '16/10' }}>
        {photos.length > 0 ? (
          <>
            <img src={cldThumb(photos[photoIdx]?.urlPhoto, 500, 310)} alt={logement.code} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <>
                <button onClick={prevPhoto} aria-label="Photo précédente" className="opacity-0 group-hover:opacity-100 transition absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextPhoto} aria-label="Photo suivante" className="opacity-0 group-hover:opacity-100 transition absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700">
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {photos.slice(0, 5).map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.45)' }} />
                  ))}
                </div>
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDiaporama(logement) }}
              className="opacity-0 group-hover:opacity-100 transition absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-xs font-semibold"
            >
              Visite complète 📸
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Building2 size={30} />
            <span className="text-xs font-semibold text-slate-400">Photos bientôt disponibles</span>
          </div>
        )}
        <span className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-xs font-bold ${statutMeta.cls}`}>
          {statutMeta.label}
        </span>
        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/40 text-white text-xs font-bold">
          {TYPE_LOGEMENT_LABEL[logement.type]}
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
        <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">{logement.adresse}</h3>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><MapPin size={12} /> {logement.ville}{logement.quartier ? ` · ${logement.quartier}` : ''}</span>
          {logement.superficie != null && <span className="flex items-center gap-1"><Ruler size={12} /> {logement.superficie} m²</span>}
          {logement.nombrePieces != null && <span className="flex items-center gap-1"><Layers size={12} /> {logement.nombrePieces} pièce{logement.nombrePieces > 1 ? 's' : ''}</span>}
        </div>

        {commodites.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-3.5">
            {commodites.map(({ key, label, icon: CIcon, color }) => (
              <span key={key} title={label} className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
                <CIcon size={13} />
              </span>
            ))}
          </div>
        )}

        {logement.descriptionCommerciale && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-4">{logement.descriptionCommerciale}</p>
        )}

        <div className="pt-1">
          {logement.statut === 'DISPONIBLE' ? (
            <>
              <button
                onClick={() => onDemander(logement)}
                disabled={!!demandeExistante}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-70 transition"
                style={{ background: demandeExistante ? '#9CA3AF' : O }}
              >
                {demandeExistante ? <><CheckCircle size={15} /> Demande en cours</> : 'Demander ce logement'}
              </button>
              <button onClick={() => onVoirDetails(logement)} className="w-full text-center text-xs font-semibold mt-2 hover:underline" style={{ color: O }}>
                Voir les détails →
              </button>
            </>
          ) : logement.statut === 'OCCUPE' ? (
            <button
              onClick={() => onAlerter(logement)}
              disabled={alerteActive || alerting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition disabled:opacity-70"
              style={alerteActive ? { borderColor: G, color: G, background: `${G}10` } : { borderColor: O, color: O }}
            >
              {alerting ? <Spinner size={14} /> : alerteActive ? <CheckCircle size={15} /> : <BellRing size={15} />}
              {alerteActive ? 'Alerte activée' : "M'alerter quand disponible"}
            </button>
          ) : (
            <p className="text-center text-xs text-gray-400 font-medium py-2.5">Indisponible actuellement</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Logements disponibles
// ═════════════════════════════════════════════════════════════════════════════
function LogementsSection({ logements, loading, error, onRetry, demandes, alertingId, onDemander, onAlerter, onOpenDiaporama, onVoirDetails }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')

  const demandeParLogement = useMemo(() => {
    const map = {}
    for (const d of demandes) {
      if (!d.logement?.id) continue
      if (!['REJETEE', 'REJETEE_DIRECTION'].includes(d.statut) && !map[d.logement.id]) map[d.logement.id] = d
    }
    return map
  }, [demandes])

  const alerteParLogement = useMemo(() => {
    const set = new Set()
    for (const d of demandes) {
      if (d.logement?.id && d.alerteDisponibilite) set.add(d.logement.id)
    }
    return set
  }, [demandes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logements.filter(l => {
      if (typeFilter && l.type !== typeFilter) return false
      if (statutFilter && l.statut !== statutFilter) return false
      if (q && !['code', 'ville', 'adresse', 'quartier'].some(f => l[f]?.toLowerCase().includes(q))) return false
      return true
    })
  }, [logements, search, typeFilter, statutFilter])

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par ville, code…" className={`${inp} pl-9`} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} md:w-40`}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LOGEMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className={`${sel} md:w-44`}>
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="OCCUPE">Occupé</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={onRetry} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={Building2}
            title="Aucun logement disponible pour le moment"
            subtitle="Revenez bientôt, de nouveaux logements sont régulièrement ajoutés."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(l => (
            <LogementPremiumCard
              key={l.id} logement={l}
              demandeExistante={demandeParLogement[l.id]}
              alerteActive={alerteParLogement.has(l.id)}
              alerting={alertingId === l.id}
              onDemander={onDemander} onAlerter={onAlerter}
              onOpenDiaporama={onOpenDiaporama} onVoirDetails={onVoirDetails}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Fiche complète d'un logement (« Voir les détails »)
// ═════════════════════════════════════════════════════════════════════════════
function LogementDetailModal({ logement, demandeExistante, alerteActive, alerting, onClose, onDemander, onAlerter }) {
  const [idx, setIdx] = useState(0)
  const photos = logement.photos || []
  const commodites = COMMODITES_LOGEMENT_META.filter(c => logement[c.key])
  const statutMeta = STATUT_LOGEMENT_META[logement.statut] || STATUT_LOGEMENT_META.DISPONIBLE

  return (
    <Modal onClose={onClose} width={560}>
      <div className="relative bg-slate-100" style={{ aspectRatio: '16/9' }}>
        {photos.length > 0 ? (
          <>
            <img src={cldThumb(photos[idx]?.urlPhoto, 700, 394)} alt={logement.code} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <>
                <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)} aria-label="Photo précédente" className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700"><ChevronLeft size={16} /></button>
                <button onClick={() => setIdx(i => (i + 1) % photos.length)} aria-label="Photo suivante" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-700"><ChevronRight size={16} /></button>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Building2 size={32} />
            <span className="text-sm font-semibold text-slate-400">Photos bientôt disponibles</span>
          </div>
        )}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${statutMeta.cls}`}>{statutMeta.label}</span>
        <button onClick={onClose} aria-label="Fermer" className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 text-gray-600"><X size={16} /></button>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-gray-400">{logement.code}</span>
          {logement.montantLoyer != null ? (
            <span className="font-bold text-sm" style={{ color: G }}>{formatMontant(logement.montantLoyer)}</span>
          ) : <span className="text-xs text-gray-400">Loyer sur demande</span>}
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{logement.adresse}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {logement.ville}{logement.quartier ? ` · ${logement.quartier}` : ''} · {TYPE_LOGEMENT_LABEL[logement.type]}
          {logement.superficie != null && ` · ${logement.superficie} m²`}
          {logement.nombrePieces != null && ` · ${logement.nombrePieces} pièces`}
        </p>

        {commodites.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {commodites.map(({ key, label, icon: CIcon, color }) => (
              <span key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${color}15`, color }}>
                <CIcon size={12} /> {label}
              </span>
            ))}
          </div>
        )}

        {logement.descriptionCommerciale && <p className="text-sm text-gray-600 leading-relaxed mb-2">{logement.descriptionCommerciale}</p>}
        {logement.description && <p className="text-xs text-gray-400 leading-relaxed mb-4">{logement.description}</p>}

        {logement.statut === 'DISPONIBLE' ? (
          <button
            onClick={() => onDemander(logement)} disabled={!!demandeExistante}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-70"
            style={{ background: demandeExistante ? '#9CA3AF' : O }}
          >
            {demandeExistante ? <><CheckCircle size={15} /> Demande en cours</> : 'Demander ce logement'}
          </button>
        ) : logement.statut === 'OCCUPE' ? (
          <button
            onClick={() => onAlerter(logement)} disabled={alerteActive || alerting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border disabled:opacity-70"
            style={alerteActive ? { borderColor: G, color: G, background: `${G}10` } : { borderColor: O, color: O }}
          >
            {alerting ? <Spinner size={14} /> : alerteActive ? <CheckCircle size={15} /> : <BellRing size={15} />}
            {alerteActive ? 'Alerte activée' : "M'alerter quand disponible"}
          </button>
        ) : (
          <p className="text-center text-xs text-gray-400 font-medium py-2.5">Indisponible actuellement</p>
        )}
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Card — "Visiter un logement" (vue liste)
// ═════════════════════════════════════════════════════════════════════════════
function VisiterCard({ logement, onVisiter }) {
  const photos = logement.photos || []
  const statutMeta = STATUT_LOGEMENT_META[logement.statut] || STATUT_LOGEMENT_META.DISPONIBLE
  const statutCls = logement.statut === 'OCCUPE' ? 'bg-red-500 text-white' : statutMeta.cls
  const commodites = COMMODITES_LOGEMENT_META.filter(c => logement[c.key])
  const commoditesVisibles = commodites.slice(0, 4)
  const commoditesRestantes = commodites.length - commoditesVisibles.length

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative bg-slate-100" style={{ height: 208 }}>
        {photos.length > 0 ? (
          <img src={cldThumb(photos[0].urlPhoto, 460, 416)} alt={logement.code} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Building2 size={28} />
            <span className="text-xs font-semibold text-slate-400">Photos bientôt disponibles</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <span className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-xs font-bold ${statutCls}`}>{statutMeta.label}</span>
        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/40 text-white text-xs font-bold">{TYPE_LOGEMENT_LABEL[logement.type]}</span>
        {photos.length > 0 && (
          <span className="absolute bottom-2.5 left-3 text-white text-xs font-semibold">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
        )}
        <button
          onClick={() => onVisiter(logement)}
          className="opacity-0 group-hover:opacity-100 transition absolute inset-0 m-auto w-fit h-fit px-4 py-2 rounded-full bg-white/90 text-[#1A1A1A] text-sm font-bold"
        >
          Visiter →
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{logement.titreCommercial || logement.code}</h3>
        <p className="text-xs text-gray-500 truncate mb-2">{logement.adresse}, {logement.ville}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2.5 flex-wrap">
          <span>{TYPE_LOGEMENT_LABEL[logement.type]}</span>
          {logement.superficie != null && <span>· {logement.superficie} m²</span>}
          {logement.nombrePieces != null && <span>· {logement.nombrePieces} pièce{logement.nombrePieces > 1 ? 's' : ''}</span>}
        </div>
        <p className="text-sm font-bold mb-2.5" style={{ color: logement.montantLoyer != null ? G : '#9CA3AF' }}>
          {logement.montantLoyer != null ? formatMontant(logement.montantLoyer) : 'Loyer sur demande'}
        </p>

        {commodites.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
            {commoditesVisibles.map(({ key, label, icon: CIcon, color }) => (
              <span key={key} title={label} className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
                <CIcon size={12} />
              </span>
            ))}
            {commoditesRestantes > 0 && <span className="text-[0.65rem] font-semibold text-gray-400">+{commoditesRestantes} autres</span>}
          </div>
        )}

        {logement.statut === 'DISPONIBLE' ? (
          <button onClick={() => onVisiter(logement)} className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition" style={{ background: O }}>
            Visiter ce logement →
          </button>
        ) : (
          <button onClick={() => onVisiter(logement)} className="w-full py-2.5 rounded-xl border text-sm font-semibold transition hover:bg-gray-50" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
            Voir quand même
          </button>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Vue détail immersive d'un logement (page pleine dans la section, pas un modal)
// ═════════════════════════════════════════════════════════════════════════════
function VisiterDetailView({ logement, demandeExistante, alerteActive, alerting, onBack, onDemander, onAlerter, onOpenDiaporama }) {
  const [activeRoom, setActiveRoom] = useState('TOUTES')
  const photos = logement.photos || []
  const statutMeta = STATUT_LOGEMENT_META[logement.statut] || STATUT_LOGEMENT_META.DISPONIBLE
  const statutCls = logement.statut === 'OCCUPE' ? 'bg-red-500 text-white' : statutMeta.cls

  const roomsWithPhotos = useMemo(() => {
    const seen = []
    for (const p of photos) {
      if (!seen.includes(p.typePiece)) seen.push(p.typePiece)
    }
    return seen
  }, [photos])

  const filteredPhotos = activeRoom === 'TOUTES' ? photos : photos.filter(p => p.typePiece === activeRoom)

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold mb-4 hover:underline" style={{ color: O }}>
        <ChevronLeft size={16} /> Retour aux logements
      </button>

      <div className="relative rounded-2xl overflow-hidden mb-6 bg-slate-100" style={{ height: 320 }}>
        {photos.length > 0 ? (
          <>
            <img src={cldThumb(photos[0].urlPhoto, 1000, 640)} alt={logement.code} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            <button
              onClick={() => onOpenDiaporama(logement, 0)}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/90 text-sm font-semibold text-gray-800 hover:bg-white transition"
            >
              <Eye size={14} /> Voir toutes les photos ({photos.length})
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Building2 size={36} />
            <span className="text-sm font-semibold text-slate-400">Photos bientôt disponibles</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>{logement.titreCommercial || logement.code}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statutCls}`}>{statutMeta.label}</span>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
            <MapPin size={14} style={{ color: O }} className="flex-shrink-0" />
            {logement.adresse}, {logement.ville}{logement.quartier ? ` · ${logement.quartier}` : ''}
          </p>

          {logement.descriptionCommerciale && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>À propos de ce logement</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{logement.descriptionCommerciale}</p>
            </div>
          )}

          {photos.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Photos par pièce</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
                <button
                  onClick={() => setActiveRoom('TOUTES')}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition"
                  style={activeRoom === 'TOUTES' ? { background: O, color: '#fff' } : { background: '#F3F4F6', color: '#4B5563' }}
                >
                  Toutes
                </button>
                {roomsWithPhotos.map(t => {
                  const meta = TYPE_PIECE_ICON[t]
                  const Icon = meta?.icon
                  const active = activeRoom === t
                  return (
                    <button
                      key={t} onClick={() => setActiveRoom(t)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition"
                      style={active ? { background: O, color: '#fff' } : { background: '#F3F4F6', color: '#4B5563' }}
                    >
                      {Icon && <Icon size={13} style={{ color: active ? '#fff' : meta.color }} />}
                      {TYPE_PIECE_LABEL[t] || t}
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredPhotos.map(photo => {
                  const globalIndex = photos.findIndex(p => p.id === photo.id)
                  return (
                    <button
                      key={photo.id} onClick={() => onOpenDiaporama(logement, globalIndex)}
                      className="relative rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition"
                      style={{ aspectRatio: '4/3' }}
                    >
                      <img src={cldThumb(photo.urlPhoto, 400, 300)} alt={photo.description || photo.typePiece} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite — card sticky */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm lg:sticky lg:top-6">
            {logement.montantLoyer != null ? (
              <>
                <p className="text-3xl font-bold" style={{ color: G, fontFamily: "'Syne', sans-serif" }}>{Number(logement.montantLoyer).toLocaleString('fr-FR')}</p>
                <p className="text-sm text-gray-400 mb-4">FCFA / mois</p>
              </>
            ) : (
              <p className="text-lg font-semibold text-gray-400 mb-4">Loyer sur demande</p>
            )}

            <div className="space-y-2 mb-5 text-sm border-t border-b border-gray-100 py-4">
              <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="font-semibold text-gray-800">{TYPE_LOGEMENT_LABEL[logement.type]}</span></div>
              {logement.superficie != null && (
                <div className="flex justify-between"><span className="text-gray-400">Superficie</span><span className="font-semibold text-gray-800">{logement.superficie} m²</span></div>
              )}
              {logement.nombrePieces != null && (
                <div className="flex justify-between"><span className="text-gray-400">Pièces</span><span className="font-semibold text-gray-800">{logement.nombrePieces}</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-400">Étage</span><span className="font-semibold text-gray-800">{logement.etage}</span></div>
            </div>

            <div className="space-y-1.5 mb-5">
              {COMMODITES_LOGEMENT_META.map(({ key, label, icon: CIcon }) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {logement[key] ? <Check size={14} className="text-green-500 flex-shrink-0" /> : <X size={14} className="text-gray-300 flex-shrink-0" />}
                  <CIcon size={13} className={logement[key] ? 'text-gray-500' : 'text-gray-300'} />
                  <span className={logement[key] ? 'text-gray-700' : 'text-gray-400 line-through'}>{label}</span>
                </div>
              ))}
            </div>

            {logement.statut === 'DISPONIBLE' ? (
              <>
                <button
                  onClick={() => onDemander(logement)} disabled={!!demandeExistante}
                  className="w-full py-4 rounded-xl text-white text-lg font-bold disabled:opacity-70 transition"
                  style={{ background: demandeExistante ? '#9CA3AF' : O }}
                >
                  {demandeExistante ? '✓ Demande envoyée' : 'Demander ce logement'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">Votre demande sera examinée par la Direction SONAPIE</p>
              </>
            ) : (
              <>
                <span className="block text-center mb-3 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold w-fit mx-auto">Logement occupé</span>
                <button
                  onClick={() => onAlerter(logement)} disabled={alerteActive || alerting}
                  className="w-full py-3 rounded-xl border text-sm font-bold disabled:opacity-70 transition flex items-center justify-center gap-2"
                  style={alerteActive ? { borderColor: G, color: G, background: `${G}10` } : { borderColor: O, color: O }}
                >
                  {alerting ? <Spinner size={14} /> : alerteActive ? <CheckCircle size={15} /> : <BellRing size={15} />}
                  {alerteActive ? 'Alerte activée' : "M'alerter quand disponible"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Visiter un logement
// ═════════════════════════════════════════════════════════════════════════════
function VisiterSection({ logements, loading, error, onRetry, demandes, alertingId, onDemander, onAlerter, onOpenDiaporama }) {
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [villeFilter, setVilleFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')

  const villes = useMemo(() => [...new Set(logements.map(l => l.ville).filter(Boolean))].sort(), [logements])

  const activeLogement = useMemo(() => logements.find(l => l.id === activeId) || null, [logements, activeId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logements.filter(l => {
      if (typeFilter && l.type !== typeFilter) return false
      if (villeFilter && l.ville !== villeFilter) return false
      if (statutFilter && l.statut !== statutFilter) return false
      if (q && !['code', 'ville', 'adresse', 'quartier', 'titreCommercial'].some(f => l[f]?.toLowerCase().includes(q))) return false
      return true
    })
  }, [logements, search, typeFilter, villeFilter, statutFilter])

  if (activeLogement) {
    return (
      <VisiterDetailView
        logement={activeLogement}
        demandeExistante={demandes.find(d => d.logement?.id === activeLogement.id && !['REJETEE', 'REJETEE_DIRECTION'].includes(d.statut))}
        alerteActive={demandes.some(d => d.logement?.id === activeLogement.id && d.alerteDisponibilite)}
        alerting={alertingId === activeLogement.id}
        onBack={() => setActiveId(null)}
        onDemander={onDemander}
        onAlerter={onAlerter}
        onOpenDiaporama={onOpenDiaporama}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className={`${inp} pl-9`} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} md:w-36`}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LOGEMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={villeFilter} onChange={e => setVilleFilter(e.target.value)} className={`${sel} md:w-40`}>
          <option value="">Toutes les villes</option>
          {villes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className={`${sel} md:w-40`}>
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="OCCUPE">Occupé</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={onRetry} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={Building2}
            title="Aucun logement disponible pour le moment"
            subtitle="Revenez bientôt, de nouveaux logements sont régulièrement ajoutés."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(l => (
            <VisiterCard key={l.id} logement={l} onVisiter={(logement) => setActiveId(logement.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal fullscreen — diaporama complet d'un logement (swipe mobile)
// ═════════════════════════════════════════════════════════════════════════════
function FullscreenDiaporamaModal({ logement, initialIndex = 0, onClose }) {
  const [idx, setIdx] = useState(initialIndex)
  const photos = logement.photos || []
  const touchStartX = useRef(null)

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + photos.length) % photos.length)
      else if (e.key === 'ArrowRight') setIdx(i => (i + 1) % photos.length)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, photos.length])

  if (photos.length === 0) return null
  const photo = photos[idx]

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 50) {
      setIdx(i => delta > 0 ? (i - 1 + photos.length) % photos.length : (i + 1) % photos.length)
    }
    touchStartX.current = null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1200] bg-black flex flex-col"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{logement.code} — {TYPE_PIECE_LABEL[photo.typePiece] || photo.typePiece}</p>
          <p className="text-xs text-white/60">{idx + 1} / {photos.length}</p>
        </div>
        <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 flex-shrink-0"><X size={20} /></button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {photos.length > 1 && (
          <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)} aria-label="Photo précédente" className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center">
            <ChevronLeft size={22} />
          </button>
        )}
        <img src={cldThumb(photo.urlPhoto, 1600)} alt={photo.description || photo.typePiece} className="max-w-full max-h-full object-contain" />
        {photos.length > 1 && (
          <button onClick={() => setIdx(i => (i + 1) % photos.length)} aria-label="Photo suivante" className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {photo.description && <p className="text-center text-white/70 text-xs px-4 pb-2">{photo.description}</p>}

      {photos.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-4 flex-shrink-0">
          {photos.map((p, i) => (
            <button
              key={p.id} onClick={() => setIdx(i)} aria-label={`Photo ${i + 1}`}
              className="flex-shrink-0 rounded-lg overflow-hidden border-2 transition"
              style={{ width: 64, height: 48, borderColor: i === idx ? '#E8520A' : 'transparent' }}
            >
              <img src={cldThumb(p.urlPhoto, 130, 100)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Demande de logement ciblée (depuis la section "Logements disponibles")
// ═════════════════════════════════════════════════════════════════════════════
function DemandeLogementCibleeModal({ logement, onClose, onSuccess, onError }) {
  const [motif, setMotif] = useState('')
  const [priorite, setPriorite] = useState('NORMALE')
  const [loading, setLoading] = useState(false)
  const photo = logement.photos?.[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!motif.trim()) return
    setLoading(true)
    try {
      await api.post('/locataire/demandes', { motif: motif.trim(), priorite, logementId: logement.id })
      onSuccess()
    } catch (err) {
      onError(err.response?.data?.message || 'Erreur lors de la soumission de la demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div className="p-6 pb-4 border-b border-gray-100 flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
          {photo ? <img src={cldThumb(photo.urlPhoto, 130, 130)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <ImageOff size={18} className="text-slate-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Demander {logement.code}</h2>
          <p className="text-xs text-slate-500 truncate">{logement.adresse}, {logement.ville}</p>
        </div>
        <button onClick={onClose} className="bg-slate-100 rounded-lg p-1.5 text-slate-500 flex-shrink-0"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Motif de la demande <span style={{ color: O }}>*</span></label>
          <textarea rows={4} className={`${inp} resize-none`} value={motif} onChange={e => setMotif(e.target.value)}
            placeholder="Expliquez pourquoi vous souhaitez ce logement…" required />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priorité</label>
          <select className={sel} value={priorite} onChange={e => setPriorite(e.target.value)}>
            <option value="BASSE">Basse</option>
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-3 mb-5">
          <AlertTriangle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-blue-800">Votre demande sera examinée par la Direction puis traitée par le Service Logement.</span>
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button type="submit" disabled={loading} className={primaryBtn} style={{ background: loading ? '#f0956a' : O }}>
            {loading ? <Spinner /> : 'Envoyer la demande'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Mes demandes (tabs)
// ═════════════════════════════════════════════════════════════════════════════
// Détermine, pour une demande de logement, quel design de dossier afficher —
// le statut du DOSSIER prime, avec le statut de la DEMANDE en secours (une
// demande peut être rejetée par la Direction indépendamment du dossier).
function getEtatDossierCard(demande, dossier) {
  const statut = demande.statut
  if (statut === 'ANNULEE') return 'ANNULE'
  if (dossier?.statut === 'REJETE' || ['REJETEE', 'REJETEE_DIRECTION'].includes(statut)) return 'REJETE'
  if (dossier?.statut === 'VALIDE' || ['EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(statut)) return 'VALIDE'
  if (dossier?.statut === 'SOUMIS' || dossier?.statut === 'EN_ETUDE') return 'SOUMIS'
  return 'INCOMPLET'
}

const STATUTS_ANNULABLES = ['SOUMISE', 'EN_VALIDATION_DIRECTION', 'REJETEE_DIRECTION']

function DemandesSection({
  tab, setTab, demandes, demandesLoading, demandesError, onRetryDemandes,
  mutations, mutationsLoading, mutationsError, onRetryMutations,
  onConstituerDossier, onDeleteDemande, onAnnulerDemande, onGoTo,
}) {
  const isLogement = tab === 'logement'
  const list = isLogement ? demandes : mutations
  const loading = isLogement ? demandesLoading : mutationsLoading
  const error = isLogement ? demandesError : mutationsError
  const onRetry = isLogement ? onRetryDemandes : onRetryMutations

  const [dossierParDemande, setDossierParDemande] = useState({})
  const demandeIdsKey = useMemo(() => demandes.map(d => d.id).join(','), [demandes])

  useEffect(() => {
    if (!isLogement || !demandeIdsKey) return
    let cancelled = false
    const chargerDossiers = async () => {
      const dossiers = {}
      await Promise.allSettled(
        demandes.map(async (d) => {
          try {
            const res = await api.get(`/dossiers/${d.id}`)
            dossiers[d.id] = res.data
          } catch {
            dossiers[d.id] = null
          }
        }),
      )
      if (!cancelled) setDossierParDemande(dossiers)
    }
    chargerDossiers()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogement, demandeIdsKey])

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setTab('logement')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${isLogement ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
            style={isLogement ? { background: O } : undefined}
          >
            Demandes de logement
          </button>
          <button
            onClick={() => setTab('mutation')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${!isLogement ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
            style={!isLogement ? { background: O } : undefined}
          >
            Mutations
          </button>
        </div>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="flex flex-col gap-2.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={FileText}
            title={isLogement ? 'Aucune demande de logement' : 'Aucune demande de mutation'}
            subtitle="Vos demandes apparaîtront ici une fois soumises."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map(d => {
            const etat = isLogement ? getEtatDossierCard(d, dossierParDemande[d.id]) : null
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900">
                    {isLogement
                      ? (d.logement ? `Logement ${d.logement.code}` : `Demande #${d.id}`)
                      : `Mutation #${d.id}`} — {formatDate(d.dateDepot)}
                  </p>
                  <StatutDemandeBadge statut={d.statut} />
                </div>
                <p className="text-sm text-gray-600 mb-3">{d.motif}</p>
                {!isLogement && (
                  <p className="text-xs text-gray-400 mb-3">
                    Logement actuel : <span className="font-semibold text-gray-600">{d.logementActuel?.code}</span>
                    {d.logementSouhaite && <> · Souhaité : <span className="font-semibold text-gray-600">{d.logementSouhaite.code}</span></>}
                  </p>
                )}
                {d.commentaireDirection && etat !== 'REJETE' && (
                  <p className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-gray-600 mb-3">
                    <span className="font-semibold">Commentaire Direction : </span>{d.commentaireDirection}
                  </p>
                )}
                <DemandeMiniStepper statut={d.statut} />

                {isLogement && etat === 'VALIDE' && (
                  <div className="mt-3.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-[#2E7D32]/30 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle size={28} className="flex-shrink-0" style={{ color: G }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-1">Demande validée</p>
                      <p className="text-xs text-gray-600 mb-3">
                        Votre dossier a été approuvé par la Direction SONAPIE. Le Service Logement va vous contacter prochainement.
                      </p>
                      <button
                        onClick={() => onGoTo('chat')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold"
                        style={{ background: G }}
                      >
                        <MessageCircle size={13} /> Ouvrir la conversation
                      </button>
                    </div>
                  </div>
                )}

                {isLogement && etat === 'REJETE' && (
                  <div className="mt-3.5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <XCircle size={28} className="flex-shrink-0 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-1">Demande rejetée</p>
                      <p className="text-xs text-gray-600 mb-3">
                        Motif : {d.commentaireDirection || dossierParDemande[d.id]?.commentaireDirection || 'Non précisé'}
                      </p>
                      <button
                        onClick={() => onGoTo('visiter')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold"
                        style={{ background: O }}
                      >
                        <RefreshCw size={13} /> Faire une nouvelle demande
                      </button>
                    </div>
                  </div>
                )}

                {isLogement && etat === 'ANNULE' && (
                  <div className="mt-3.5 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                    <XCircle size={28} className="flex-shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-1">Demande annulée</p>
                      <p className="text-xs text-gray-600 mb-3">Vous avez annulé cette demande.</p>
                      <button
                        onClick={() => onGoTo('visiter')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold"
                        style={{ background: O }}
                      >
                        <RefreshCw size={13} /> Faire une nouvelle demande
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 flex-wrap">
                  {isLogement && etat === 'SOUMIS' && (
                    <span className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-amber-100 text-amber-700">
                      <FolderCheck size={13} /> Dossier soumis — En attente d'examen
                    </span>
                  )}
                  {isLogement && etat === 'INCOMPLET' && !['REJETEE', 'REJETEE_DIRECTION', 'ANNULEE'].includes(d.statut) && (
                    <button
                      onClick={() => onConstituerDossier(d.id)}
                      className="mt-3.5 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white"
                      style={{ background: O }}
                    >
                      <FolderCheck size={13} /> Constituer mon dossier
                    </button>
                  )}
                  {isLogement && ['REJETEE', 'REJETEE_DIRECTION'].includes(d.statut) && (
                    <button
                      onClick={() => onDeleteDemande(d)}
                      className="mt-3.5 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 transition"
                    >
                      <Trash2 size={13} /> Supprimer cette demande
                    </button>
                  )}
                  {isLogement && STATUTS_ANNULABLES.includes(d.statut) && (
                    <button
                      onClick={() => onAnnulerDemande(d)}
                      className="mt-3.5 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                    >
                      <X size={13} /> Annuler cette demande
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Constitution du dossier
// ═════════════════════════════════════════════════════════════════════════════
const DEMANDES_ELIGIBLES_DOSSIER = (demandes) =>
  demandes.filter(d => !['REJETEE', 'REJETEE_DIRECTION', 'ANNULEE'].includes(d.statut))

function DossierSection({ demandes, demandesLoading, demandesError, onRetryDemandes, typeLocataire, initialDemandeId, onGoTo, fire }) {
  const eligibles = useMemo(() => DEMANDES_ELIGIBLES_DOSSIER(demandes), [demandes])
  const [selectedId, setSelectedId] = useState(initialDemandeId || eligibles[0]?.id || null)

  useEffect(() => {
    if (!selectedId && eligibles.length > 0) setSelectedId(eligibles[0].id)
  }, [eligibles, selectedId])

  if (demandesLoading) return <Skeleton className="h-96" />
  if (demandesError) return <ErrorBanner message={demandesError} onRetry={onRetryDemandes} />

  if (eligibles.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState
          icon={FolderCheck} title="Aucune demande en cours"
          subtitle="Vous devez d'abord choisir un logement dans le catalogue pour constituer un dossier."
          action={
            <button onClick={() => onGoTo('logements')} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
              Voir le catalogue
            </button>
          }
        />
      </div>
    )
  }

  const demande = eligibles.find(d => d.id === selectedId) || eligibles[0]

  return (
    <div>
      {eligibles.length > 1 && (
        <div className="mb-5 max-w-md">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Demande concernée</label>
          <select value={demande.id} onChange={e => setSelectedId(parseInt(e.target.value))} className={sel}>
            {eligibles.map(d => (
              <option key={d.id} value={d.id}>
                Demande #{d.id} — {formatDate(d.dateDepot)}{d.logement ? ` · ${d.logement.code}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <DossierStepperFlow key={demande.id} demande={demande} typeLocataire={typeLocataire} onGoTo={onGoTo} fire={fire} />
    </div>
  )
}

const STATUT_DOSSIER_LOCATAIRE_LABEL = {
  SOUMIS:   'En attente d\'étude',
  EN_ETUDE: 'En cours d\'étude par la Direction',
  VALIDE:   'Validé',
  REJETE:   'Rejeté',
}

function DossierStepper({ step, completedSteps, onStepClick }) {
  const steps = ['Informations personnelles', 'Situation professionnelle', 'Documents à fournir']
  return (
    <div className="flex items-start mb-6">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = completedSteps.includes(idx)
        const active = step === idx
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => onStepClick(idx)}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer"
              style={{ width: 96 }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition"
                style={{ background: done ? G : active ? O : '#E5E7EB', color: done || active ? '#fff' : '#9CA3AF' }}
              >
                {done ? <Check size={16} /> : idx}
              </div>
              <span
                className="text-[0.68rem] mt-1.5 font-semibold text-center leading-tight"
                style={{ color: done ? G : active ? O : '#9CA3AF' }}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="flex-1 h-[3px] rounded-full mb-5" style={{ background: done ? G : '#E5E7EB' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DossierStepperFlow({ demande, typeLocataire, onGoTo, fire }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingType, setUploadingType] = useState(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [dossier, setDossier] = useState(null)
  const [documents, setDocuments] = useState([])
  const [err1, setErr1] = useState('')
  const [err2, setErr2] = useState('')

  const [form, setForm] = useState({
    dateNaissance: '', lieuNaissance: '', nationalite: 'Ivoirienne', situationFamiliale: '', nombreEnfants: '',
    employeur: '', poste: '', anciennete: '', revenuMensuel: '',
    ministere: '', direction: '', grade: '', indice: '',
  })
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  // Reprend la constitution du dossier là où le locataire l'avait laissée,
  // au lieu de toujours redémarrer à l'étape 1 (une seule fois par montage).
  const autoResumeDone = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    autoResumeDone.current = false
    api.get(`/dossiers/${demande.id}`)
      .then(({ data }) => {
        if (cancelled) return
        setDossier(data)
        setDocuments(data.documents || [])
        setForm({
          dateNaissance: data.dateNaissance ? data.dateNaissance.slice(0, 10) : '',
          lieuNaissance: data.lieuNaissance || '',
          nationalite: data.nationalite || 'Ivoirienne',
          situationFamiliale: data.situationFamiliale || '',
          nombreEnfants: data.nombreEnfants ?? '',
          employeur: data.employeur || '',
          poste: data.poste || '',
          anciennete: data.anciennete ?? '',
          revenuMensuel: data.revenuMensuel ?? '',
          ministere: data.ministere || '',
          direction: data.direction || '',
          grade: data.grade || '',
          indice: data.indice || '',
        })
      })
      .catch(err => {
        if (cancelled) return
        if (err.response?.status !== 404) {
          fire('error', err.response?.data?.message || 'Impossible de charger votre dossier.')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demande.id])

  const handleSaveStep = async (nextStep) => {
    setSaving(true)
    try {
      const payload = {
        dateNaissance: form.dateNaissance || null,
        lieuNaissance: form.lieuNaissance.trim() || null,
        nationalite: form.nationalite.trim() || null,
        situationFamiliale: form.situationFamiliale || null,
        nombreEnfants: form.nombreEnfants !== '' ? form.nombreEnfants : null,
        employeur: form.employeur.trim() || null,
        poste: form.poste.trim() || null,
        anciennete: form.anciennete !== '' ? form.anciennete : null,
        revenuMensuel: form.revenuMensuel !== '' ? form.revenuMensuel : null,
        ministere: form.ministere.trim() || null,
        direction: form.direction.trim() || null,
        grade: form.grade.trim() || null,
        indice: form.indice.trim() || null,
      }
      await api.put(`/dossiers/${demande.id}`, payload)
      fire('success', 'Informations enregistrées.')
      setStep(nextStep)
    } catch (err) {
      fire('error', err.response?.data?.message || "Impossible d'enregistrer vos informations.")
    } finally {
      setSaving(false)
    }
  }

  const handleStep1Continue = () => {
    if (!form.dateNaissance || !form.lieuNaissance.trim() || !form.situationFamiliale) {
      setErr1('Veuillez remplir tous les champs obligatoires (*).')
      return
    }
    setErr1('')
    handleSaveStep(2)
  }

  const handleStep2Continue = () => {
    const champsRequis = typeLocataire === 'FONCTIONNAIRE'
      ? [form.ministere.trim(), form.direction.trim(), form.grade.trim(), form.revenuMensuel]
      : [form.employeur.trim(), form.poste.trim(), form.revenuMensuel]
    if (champsRequis.some(v => !v)) {
      setErr2('Veuillez remplir tous les champs obligatoires (*).')
      return
    }
    if (Number(form.revenuMensuel) > REVENU_MENSUEL_MAX) {
      setErr2(`Le revenu mensuel doit être inférieur à ${REVENU_MENSUEL_MAX.toLocaleString('fr-FR')} FCFA.`)
      return
    }
    setErr2('')
    handleSaveStep(3)
  }

  const handleUpload = async (type, file) => {
    if (!file) return
    setUploadingType(type)
    try {
      const fd = new FormData()
      fd.append('document', file)
      fd.append('type', type)
      const { data } = await api.post(`/dossiers/${demande.id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocuments(prev => [...prev, data])
      fire('success', 'Document ajouté avec succès.')
    } catch (err) {
      fire('error', err.response?.data?.message || "Impossible d'ajouter ce document.")
    } finally {
      setUploadingType(null)
    }
  }

  const handleDelete = async () => {
    const doc = confirmDeleteDoc
    if (!doc) return
    try {
      await api.delete(`/dossiers/documents/${doc.id}`)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      fire('success', 'Document supprimé.')
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de supprimer ce document.')
    } finally {
      setConfirmDeleteDoc(null)
    }
  }

  const handleSoumettre = async () => {
    setSaving(true)
    try {
      await api.post(`/dossiers/${demande.id}/soumettre`)
      setShowSuccess(true)
    } catch (err) {
      fire('error', err.response?.data?.message || 'Impossible de soumettre votre dossier.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!showSuccess) return
    const t = setTimeout(() => onGoTo('suivi'), 2200)
    return () => clearTimeout(t)
  }, [showSuccess, onGoTo])

  const step1Complete = !!(form.dateNaissance && form.lieuNaissance.trim() && form.situationFamiliale)
  const step2Complete = typeLocataire === 'FONCTIONNAIRE'
    ? !!(form.ministere.trim() && form.direction.trim() && form.grade.trim() && form.revenuMensuel)
    : !!(form.employeur.trim() && form.poste.trim() && form.revenuMensuel)
  const listeDocuments = typeLocataire === 'FONCTIONNAIRE' ? DOCUMENTS_FONCTIONNAIRE : DOCUMENTS_PRIVE
  const step3Complete = listeDocuments.filter(m => m.requis).every(m => documents.some(d => d.type === m.type))
  const completedSteps = [step1Complete && 1, step2Complete && 2, step3Complete && 3].filter(Boolean)

  // Reprend à la première étape incomplète (ou la dernière si tout est déjà
  // rempli) plutôt que de toujours revenir à l'étape 1 après un rechargement.
  useEffect(() => {
    if (loading || autoResumeDone.current) return
    autoResumeDone.current = true
    if (!step1Complete) setStep(1)
    else if (!step2Complete) setStep(2)
    else setStep(3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  if (loading) return <Skeleton className="h-96" />

  const montantLoyer = demande.logement?.montantLoyer != null ? Number(demande.logement.montantLoyer) : null
  const revenuMin = montantLoyer != null ? Math.round(montantLoyer / 0.3) : null
  const revenuOk = revenuMin != null && form.revenuMensuel !== '' && Number(form.revenuMensuel) >= revenuMin

  // Une fois pris en étude ou validé par la Direction, le dossier n'est plus
  // modifiable par le locataire (il reste modifiable si Incomplet, Soumis ou
  // Rejeté, pour permettre une correction avant une nouvelle soumission).
  const dossierLocked = dossier && ['EN_ETUDE', 'VALIDE'].includes(dossier.statut)

  return (
    <div className="relative">
      {dossier && dossier.statut !== 'INCOMPLET' && (
        <div className={`mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 border ${dossierLocked ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <FileText size={16} className={`flex-shrink-0 mt-0.5 ${dossierLocked ? 'text-amber-500' : 'text-blue-500'}`} />
          <span className={`text-sm ${dossierLocked ? 'text-amber-800' : 'text-blue-800'}`}>
            {dossier.statut === 'EN_ETUDE' ? (
              "Ce dossier est en cours d'étude par la Direction — vous ne pouvez plus le modifier pour le moment."
            ) : dossier.statut === 'VALIDE' ? (
              'Ce dossier a été validé par la Direction — vous ne pouvez plus le modifier.'
            ) : (
              <>
                Dossier {dossier.statut === 'REJETE' ? 'rejeté' : 'soumis'}{dossier.updatedAt ? ` le ${formatDate(dossier.updatedAt)}` : ''} — statut : <span className="font-semibold">{STATUT_DOSSIER_LOCATAIRE_LABEL[dossier.statut] || dossier.statut}</span>.
                Vous pouvez modifier vos informations ci-dessous et resoumettre si besoin.
              </>
            )}
          </span>
        </div>
      )}

      <DossierStepper step={step} completedSteps={completedSteps} onStepClick={setStep} />

      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Vos informations personnelles</h3>
          <p className="text-xs text-gray-400 mb-5">Ces informations nous permettent d'étudier votre dossier</p>

          <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl mb-5 border ${typeLocataire === 'FONCTIONNAIRE' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <span className={`flex-shrink-0 text-[0.68rem] font-bold px-2.5 py-1 rounded-full text-white ${typeLocataire === 'FONCTIONNAIRE' ? '' : ''}`} style={{ background: typeLocataire === 'FONCTIONNAIRE' ? G : O }}>
              {typeLocataire === 'FONCTIONNAIRE' ? "Fonctionnaire de l'État" : 'Locataire privé'}
            </span>
            <span className={`text-xs font-medium ${typeLocataire === 'FONCTIONNAIRE' ? 'text-green-700' : 'text-orange-700'}`}>
              {typeLocataire === 'FONCTIONNAIRE'
                ? 'Vos informations professionnelles seront vérifiées auprès des services compétents.'
                : 'Votre solvabilité sera étudiée sur la base de vos revenus.'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de naissance *</label>
              <input type="date" disabled={dossierLocked} className={inp} value={form.dateNaissance} onChange={e => set('dateNaissance', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lieu de naissance *</label>
              <input disabled={dossierLocked} className={inp} value={form.lieuNaissance} onChange={e => set('lieuNaissance', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nationalité</label>
              <input disabled={dossierLocked} className={inp} value={form.nationalite} onChange={e => set('nationalite', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Situation familiale *</label>
              <select disabled={dossierLocked} className={sel} value={form.situationFamiliale} onChange={e => set('situationFamiliale', e.target.value)}>
                <option value="">Sélectionner…</option>
                <option value="Célibataire">Célibataire</option>
                <option value="Marié(e)">Marié(e)</option>
                <option value="Divorcé(e)">Divorcé(e)</option>
                <option value="Veuf(ve)">Veuf(ve)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre d'enfants à charge</label>
              <input type="number" min="0" disabled={dossierLocked} className={inp} value={form.nombreEnfants} onChange={e => set('nombreEnfants', e.target.value)} />
            </div>
          </div>

          {err1 && <p className="text-xs text-red-500 mb-3">{err1}</p>}

          {dossierLocked ? (
            <button onClick={() => setStep(2)} className={`${ghostBtn} w-full flex items-center justify-center gap-1.5`}>
              Suivant <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleStep1Continue} disabled={saving} className={`${primaryBtn} w-full mt-3`} style={{ background: O }}>
              {saving && <Spinner />} Sauvegarder et continuer <ChevronRight size={15} />
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Votre situation professionnelle</h3>
          <p className="text-xs text-gray-400 mb-5">
            {typeLocataire === 'FONCTIONNAIRE' ? "Renseignez votre situation au sein de l'administration." : 'Renseignez votre situation professionnelle actuelle.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            {typeLocataire === 'FONCTIONNAIRE' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ministère de tutelle *</label>
                  <input disabled={dossierLocked} className={inp} value={form.ministere} onChange={e => set('ministere', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Direction / Service *</label>
                  <input disabled={dossierLocked} className={inp} value={form.direction} onChange={e => set('direction', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Grade *</label>
                  <input disabled={dossierLocked} className={inp} value={form.grade} onChange={e => set('grade', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Indice (optionnel)</label>
                  <input disabled={dossierLocked} className={inp} value={form.indice} onChange={e => set('indice', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ancienneté (années)</label>
                  <input type="number" min="0" disabled={dossierLocked} className={inp} value={form.anciennete} onChange={e => set('anciennete', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Revenu mensuel net (FCFA) *</label>
                  <input type="number" min="0" max={REVENU_MENSUEL_MAX} disabled={dossierLocked} className={inp} value={form.revenuMensuel} onChange={e => set('revenuMensuel', e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employeur / Entreprise *</label>
                  <input disabled={dossierLocked} className={inp} value={form.employeur} onChange={e => set('employeur', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Poste occupé *</label>
                  <input disabled={dossierLocked} className={inp} value={form.poste} onChange={e => set('poste', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ancienneté (années)</label>
                  <input type="number" min="0" disabled={dossierLocked} className={inp} value={form.anciennete} onChange={e => set('anciennete', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Revenu mensuel net (FCFA) *</label>
                  <input type="number" min="0" max={REVENU_MENSUEL_MAX} disabled={dossierLocked} className={inp} value={form.revenuMensuel} onChange={e => set('revenuMensuel', e.target.value)} />
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-3">Votre loyer ne devrait pas dépasser 30% de vos revenus mensuels.</p>

          {montantLoyer != null && form.revenuMensuel !== '' && (
            <div className={`rounded-xl p-3.5 mb-5 border ${revenuOk ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className={`text-sm font-semibold ${revenuOk ? 'text-green-700' : 'text-orange-700'}`}>
                Loyer demandé : {montantLoyer.toLocaleString('fr-FR')} FCFA
              </p>
              <p className={`text-xs ${revenuOk ? 'text-green-600' : 'text-orange-600'}`}>
                Revenus minimum recommandés : {revenuMin.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          )}

          {err2 && <p className="text-xs text-red-500 mb-3">{err2}</p>}

          <div className="flex gap-2.5 mt-3">
            <button onClick={() => setStep(1)} className={`${ghostBtn} flex items-center gap-1.5`}><ChevronLeft size={15} /> Retour</button>
            {dossierLocked ? (
              <button onClick={() => setStep(3)} className={`${ghostBtn} flex-1 flex items-center justify-center gap-1.5`}>
                Suivant <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={handleStep2Continue} disabled={saving} className={primaryBtn} style={{ background: O }}>
                {saving && <Spinner />} Sauvegarder et continuer <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-5">
            <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Documents requis</h3>
            <p className="text-xs text-gray-400 mb-5">
              {typeLocataire === 'FONCTIONNAIRE'
                ? 'En tant que fonctionnaire, voici les documents à fournir pour votre dossier.'
                : 'En tant que locataire privé, voici les documents à fournir pour votre dossier.'}
            </p>

            <div className="flex flex-col gap-2.5">
              {listeDocuments.map(meta => {
                const doc = documents.find(d => d.type === meta.type)
                return (
                  <DocumentCard
                    key={meta.type} meta={meta} doc={doc}
                    uploading={uploadingType === meta.type}
                    readOnly={dossierLocked}
                    onUpload={handleUpload}
                    onDelete={() => setConfirmDeleteDoc(doc)}
                  />
                )
              })}
            </div>

            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setStep(2)} className={`${ghostBtn} flex items-center gap-1.5`}><ChevronLeft size={15} /> Retour</button>
            </div>
          </div>

          {dossierLocked ? null : step3Complete ? (
            <button
              onClick={handleSoumettre} disabled={saving}
              className="w-full rounded-xl py-4 text-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: O }}
            >
              {saving && <Spinner />} Soumettre mon dossier
            </button>
          ) : (
            <div>
              <button disabled className="w-full rounded-xl py-4 text-lg font-bold text-gray-400 bg-gray-100 cursor-not-allowed">
                Soumettre mon dossier
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">Veuillez fournir tous les documents requis avant de soumettre</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {confirmDeleteDoc && (
          <Modal onClose={() => setConfirmDeleteDoc(null)} width={400}>
            <div className="p-6">
              <h3 className="text-base font-bold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Supprimer ce document ?</h3>
              <p className="text-sm text-gray-500 mb-5">Cette action est irréversible. Vous devrez le téléverser à nouveau si besoin.</p>
              <div className="flex gap-2.5">
                <button onClick={() => setConfirmDeleteDoc(null)} className={`${ghostBtn} flex-1`}>Annuler</button>
                <button onClick={handleDelete} className={primaryBtn} style={{ background: '#EF4444' }}>Supprimer</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-5"
            >
              <CheckCircle size={40} color="#fff" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 max-w-md" style={{ fontFamily: "'Syne', sans-serif" }}>
              Votre dossier a été soumis avec succès !
            </h2>
            <p className="text-sm text-gray-500 max-w-sm">
              La Direction va étudier votre dossier. Vous serez notifié de l'avancement.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DocumentCard({ meta, doc, onUpload, onDelete, uploading, readOnly }) {
  const Icon = meta.icon
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white" style={{ color: O }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-bold text-gray-900">{meta.label}</p>
          <span className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full ${meta.requis ? 'bg-red-50 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
            {meta.requis ? 'Requis' : 'Optionnel'}
          </span>
          {doc && (
            <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              <CheckCircle size={11} /> Fourni
            </span>
          )}
          {doc?.valide === true && (
            <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: G }}>✓ Validé</span>
          )}
          {doc?.valide === false && (
            <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              <XCircle size={11} /> À renouveler
            </span>
          )}
        </div>
        {doc ? (
          <>
            <p className="text-xs text-gray-400 truncate">{doc.nomOriginal || 'Document ajouté'}</p>
            {doc.valide === false && doc.commentaire && (
              <p className="text-xs text-red-500 mt-1">{doc.commentaire}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 flex items-center gap-1"><XCircle size={12} className="text-gray-300" /> Aucun fichier ajouté</p>
        )}
      </div>
      {readOnly ? null : doc ? (
        <button onClick={onDelete} title="Supprimer" className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-red-500 hover:bg-red-100 transition">
          <Trash2 size={16} />
        </button>
      ) : (
        <label className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 border-dashed border-gray-300 bg-white text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition">
          {uploading ? <Spinner size={13} /> : <Upload size={14} />}
          Ajouter ce document
          <input
            type="file" accept=".pdf,.jpg,.jpeg,.png" hidden disabled={uploading}
            onChange={e => { onUpload(meta.type, e.target.files?.[0]); e.target.value = '' }}
          />
        </label>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Suivi de ma demande
// ═════════════════════════════════════════════════════════════════════════════
function SuiviSection({ demandes, demandesLoading, demandesError, onRetryDemandes, monLogement, onGoTo, onNouvelleDemande }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [conversations, setConversations] = useState([])
  const [dossier, setDossier] = useState(null)
  const [dossierLoading, setDossierLoading] = useState(false)

  useEffect(() => {
    api.get('/conversations').then(({ data }) => setConversations(data)).catch(() => {})
  }, [])

  const demande = demandes[activeIdx]

  useEffect(() => {
    if (!demande) return
    let cancelled = false
    setDossierLoading(true)
    api.get(`/dossiers/${demande.id}`)
      .then(({ data }) => { if (!cancelled) setDossier(data) })
      .catch(() => { if (!cancelled) setDossier(null) })
      .finally(() => { if (!cancelled) setDossierLoading(false) })
    return () => { cancelled = true }
  }, [demande?.id])

  if (demandesLoading) return <Skeleton className="h-96" />
  if (demandesError) return <ErrorBanner message={demandesError} onRetry={onRetryDemandes} />

  if (demandes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState
          icon={Activity} title="Aucune demande à suivre"
          subtitle="Faites une demande de logement pour suivre son avancement ici."
          action={
            <button onClick={onNouvelleDemande} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
              Faire une demande de logement
            </button>
          }
        />
      </div>
    )
  }

  const conversation = conversations.find(c => c.demande?.id === demande.id)

  return (
    <div>
      {demandes.length > 1 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {demandes.map((d, i) => (
            <button
              key={d.id} onClick={() => setActiveIdx(i)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${i === activeIdx ? 'text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'}`}
              style={i === activeIdx ? { background: O } : undefined}
            >
              Demande #{d.id}
            </button>
          ))}
        </div>
      )}

      <SuiviTimeline
        demande={demande} dossier={dossier} dossierLoading={dossierLoading}
        conversation={conversation} monLogement={monLogement}
        onGoTo={onGoTo} onNouvelleDemande={onNouvelleDemande}
      />
    </div>
  )
}

function SuiviTimeline({ demande, dossier, dossierLoading, conversation, monLogement, onGoTo, onNouvelleDemande }) {
  const statut = demande.statut
  const dossierComplet = !!dossier && dossier.statut !== 'INCOMPLET'
  const conversationActive = conversation?.statut === 'ACTIVE'
  const logementAttribue = !!monLogement?.logement

  // Demande annulée : les étapes réellement franchies restent vertes, suivies
  // d'une seule étape terminale rouge — pas d'étapes futures hypothétiques.
  const steps = statut === 'ANNULEE' ? [
    {
      key: 'soumise', label: 'Demande soumise', state: 'done',
      date: demande.dateDepot, desc: 'Votre demande a bien été reçue',
    },
    {
      key: 'dossier', label: 'Dossier en cours de constitution',
      state: dossierComplet ? 'done' : 'attente',
      desc: dossierComplet ? 'Votre dossier est complet.' : null,
    },
    ...(demande.dateValidationDirection ? [{
      key: 'etude', label: 'Étude du dossier par la Direction', state: 'done',
      date: demande.dateValidationDirection,
    }] : []),
    {
      key: 'annulee', label: 'Demande annulée par le locataire', state: 'rejete',
    },
  ] : [
    {
      key: 'soumise', label: 'Demande soumise', state: 'done',
      date: demande.dateDepot, desc: 'Votre demande a bien été reçue',
    },
    {
      key: 'dossier', label: 'Dossier en cours de constitution',
      state: dossierLoading ? 'attente' : dossierComplet ? 'done' : 'attente',
      desc: dossierComplet ? 'Votre dossier est complet.' : 'Complétez votre dossier pour accélérer le traitement',
    },
    {
      key: 'etude', label: 'Étude du dossier par la Direction',
      state: ['VALIDEE_DIRECTION', 'EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(statut)
        ? 'done' : statut === 'EN_VALIDATION_DIRECTION' ? 'cours' : 'attente',
      date: demande.dateValidationDirection,
    },
    {
      key: 'decision', label: 'Dossier validé',
      // Vérifie le statut du DOSSIER en plus de celui de la demande : la demande
      // ne passe pas forcément par APPROUVEE au moment où le dossier est validé
      // (elle reste souvent EN_ETUDE_LOGEMENT jusqu'à l'attribution effective).
      state: (dossier?.statut === 'REJETE' || ['REJETEE_DIRECTION', 'REJETEE'].includes(statut))
        ? 'rejete'
        : (dossier?.statut === 'VALIDE' || ['EN_ETUDE_LOGEMENT', 'APPROUVEE'].includes(statut))
          ? 'done'
          : (dossier?.statut === 'EN_ETUDE' || dossier?.statut === 'SOUMIS')
            ? 'cours'
            : 'attente',
    },
    {
      key: 'contact', label: 'Contact Service Logement',
      state: conversationActive ? 'done' : 'attente',
      desc: 'Le Service Logement va vous contacter pour finaliser votre attribution',
    },
    {
      key: 'attribue', label: 'Logement attribué !', state: logementAttribue ? 'done' : 'attente',
      desc: logementAttribue ? `Logement ${monLogement.logement.code}` : null,
    },
  ]

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        {steps.map((s, i) => (
          <div key={s.key} className="flex gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08 }}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: s.state === 'done' ? G : s.state === 'cours' ? O : s.state === 'rejete' ? '#EF4444' : '#E5E7EB' }}
              >
                {s.state === 'done' && <Check size={16} color="#fff" />}
                {s.state === 'rejete' && <X size={16} color="#fff" />}
                {s.state === 'cours' && (
                  <motion.span
                    className="w-2.5 h-2.5 rounded-full bg-white"
                    animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                  />
                )}
              </motion.div>
              {i < steps.length - 1 && (
                <div
                  className={i < steps.length - 1 && s.state === 'cours' ? 'flex-1 my-1 border-l-2 border-dashed' : 'flex-1 w-0.5 my-1'}
                  style={{ minHeight: 30, background: s.state === 'done' ? G : s.state === 'cours' ? 'transparent' : '#E5E7EB', borderColor: O }}
                />
              )}
            </div>
            <div className={`min-w-0 flex-1 ${i === steps.length - 1 ? 'pb-0' : 'pb-6'}`}>
              <p className="text-sm font-bold text-gray-900">{s.label}</p>
              {s.date && <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.date)}</p>}
              {s.desc && <p className="text-xs text-gray-500 mt-1">{s.desc}</p>}
              {s.key === 'dossier' && !dossierComplet && !dossierLoading && (
                <button onClick={() => onGoTo('dossier')} className="mt-2 text-xs font-bold px-3.5 py-1.5 rounded-lg text-white" style={{ background: O }}>
                  Compléter mon dossier
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ContextCard demande={demande} conversation={conversation} onGoTo={onGoTo} onNouvelleDemande={onNouvelleDemande} />

      <DelaiEstime demande={demande} />
    </div>
  )
}

function ContextCard({ demande, conversation, onGoTo, onNouvelleDemande }) {
  const statut = demande.statut

  if (conversation?.statut === 'ACTIVE') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-3">
          <MessageCircle size={16} className="flex-shrink-0" /> Le Service Logement vous a contacté !
        </p>
        <button onClick={() => onGoTo('chat')} className="px-4 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
          Ouvrir la conversation
        </button>
      </div>
    )
  }
  if (statut === 'EN_VALIDATION_DIRECTION') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
        <p className="flex items-start gap-2 text-sm font-semibold text-amber-800">
          <Clock size={16} className="flex-shrink-0 mt-0.5" />
          Votre dossier est en cours d'étude par la Direction SONAPIE. Ce processus peut prendre quelques jours ouvrables.
        </p>
      </div>
    )
  }
  if (statut === 'APPROUVEE') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5">
        <p className="flex items-start gap-2 text-sm font-semibold text-green-800">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          Félicitations ! Votre demande a été approuvée. Le Service Logement va vous contacter très prochainement pour organiser la suite.
        </p>
      </div>
    )
  }
  if (['REJETEE', 'REJETEE_DIRECTION'].includes(statut)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-1">
          <XCircle size={16} className="flex-shrink-0" /> Votre demande a été rejetée.
        </p>
        {demande.commentaireDirection && (
          <p className="text-xs text-red-600 mb-3">Motif : {demande.commentaireDirection}</p>
        )}
        <button onClick={onNouvelleDemande} className="px-4 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
          Faire une nouvelle demande
        </button>
      </div>
    )
  }
  return null
}

function DelaiEstime({ demande }) {
  if (['APPROUVEE', 'REJETEE', 'REJETEE_DIRECTION', 'ANNULEE'].includes(demande.statut)) return null

  const joursEcoules = Math.max(0, Math.floor((Date.now() - new Date(demande.dateDepot).getTime()) / 86400000))
  const pct = Math.min(100, Math.round((joursEcoules / 10) * 100))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-2">Délai estimé : 5-10 jours ouvrables</p>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: pct >= 100 ? '#EF4444' : GRADIENT }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">{joursEcoules} jour{joursEcoules > 1 ? 's' : ''} écoulé{joursEcoules > 1 ? 's' : ''}</p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Chat (Locataire)
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

function ChatSection({ currentUser, fire, onGoTo, onIncrementBadge }) {
  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading] = useState(true)
  const [convError, setConvError] = useState(null)

  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [autreEcrit, setAutreEcrit] = useState(false)
  const [rdvsConfirmes, setRdvsConfirmes] = useState(new Set())

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
      setConvError(err.response?.data?.message || 'Impossible de charger vos conversations.')
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => { selectedConvIdRef.current = selectedConv?.id || null }, [selectedConv])

  // Connexion Socket.io — une seule fois pour la durée de vie de la section chat.
  useEffect(() => {
    const socket = connectSocket()

    const onNouveauMessage = (message) => {
      const estConversationOuverte = message.conversationId === selectedConvIdRef.current

      if (estConversationOuverte) {
        // Message dans la conversation actuellement ouverte : on l'ajoute au fil.
        setMessages(prev => {
          if (message.expediteurId === currentUser.id) {
            const idx = prev.findIndex(m => m._pending && m.contenu === message.contenu)
            if (idx !== -1) {
              const copy = [...prev]; copy[idx] = message; return copy
            }
          }
          return [...prev, message]
        })
        if (message.expediteurId !== currentUser.id) socket.emit('marquer_lu', message.conversationId)
      } else if (message.expediteurId !== currentUser.id) {
        // Message dans une autre conversation : on prévient sans l'ouvrir.
        fire('info', `Nouveau message de ${message.expediteur?.prenom || 'Service Logement'}`)
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

    const onConversationActive = ({ conversationId }) => {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, statut: 'ACTIVE' } : c))
      setSelectedConv(prev => (prev && prev.id === conversationId) ? { ...prev, statut: 'ACTIVE' } : prev)
    }

    const onConversationTerminee = ({ conversationId }) => {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, statut: 'TERMINEE' } : c))
      setSelectedConv(prev => (prev && prev.id === conversationId) ? { ...prev, statut: 'TERMINEE' } : prev)
    }

    // Rappel envoyé par le serveur quand l'heure d'un rendez-vous arrive.
    const onRappelRdv = (data) => {
      fire('warning', data.message)
    }

    socket.on('nouveau_message', onNouveauMessage)
    socket.on('utilisateur_ecrit', onUtilisateurEcrit)
    socket.on('messages_lus', onMessagesLus)
    socket.on('conversation_active', onConversationActive)
    socket.on('conversation_terminee', onConversationTerminee)
    socket.on('rappel_rdv', onRappelRdv)

    return () => {
      socket.off('nouveau_message', onNouveauMessage)
      socket.off('utilisateur_ecrit', onUtilisateurEcrit)
      socket.off('messages_lus', onMessagesLus)
      socket.off('conversation_active', onConversationActive)
      socket.off('conversation_terminee', onConversationTerminee)
      socket.off('rappel_rdv', onRappelRdv)
      clearTimeout(typingResetRef.current)
      disconnectSocket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rejoint la room de la conversation ouverte à chaque changement de sélection.
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

  const envoyerMessage = () => {
    const contenu = inputMessage.trim()
    if (!contenu || !selectedConv) return
    const socket = connectSocket()
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, contenu, expediteurId: currentUser.id, expediteur: currentUser,
      lu: false, createdAt: new Date().toISOString(), type: 'TEXTE', _pending: true,
    }])
    socket.emit('envoyer_message', { conversationId: selectedConv.id, contenu, type: 'TEXTE' })
    setInputMessage('')
  }

  const handleInputChange = (e) => {
    setInputMessage(e.target.value)
    if (!selectedConv || typingThrottleRef.current) return
    connectSocket().emit('en_train_decrire', selectedConv.id)
    typingThrottleRef.current = setTimeout(() => { typingThrottleRef.current = null }, 1000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      envoyerMessage()
    }
  }

  const handleAttemptFile = () => {
    fire('warning', 'Partage de fichiers bientôt disponible.')
  }

  const confirmerRendezVous = (rdv, messageId) => {
    if (!selectedConv || rdvsConfirmes.has(messageId)) return
    const contenu = `${CONFIRMATION_RDV_PREFIX} pour le ${formatDateRendezVous(rdv.dateRendezVous)} à ${rdv.lieuRendezVous}.`
    connectSocket().emit('envoyer_message', { conversationId: selectedConv.id, contenu, type: 'TEXTE' })
    setRdvsConfirmes(prev => new Set(prev).add(messageId))
  }

  const proposerAutreDate = (rdv) => {
    setInputMessage(`Je ne suis pas disponible le ${formatDateRendezVous(rdv.dateRendezVous)}, je vous propose...`)
  }

  // Après confirmation, le locataire peut encore demander à changer — dans ce
  // cas on prévient le Service Logement en temps réel (même si sa conversation
  // n'est pas ouverte), en plus de préremplir le message.
  const modifierRendezVousConfirme = (rdv, messageId) => {
    setInputMessage(`Je souhaite modifier notre rendez-vous du ${formatDateRendezVous(rdv.dateRendezVous)}. Je vous propose...`)
    if (!selectedConv) return
    connectSocket().emit('rdv_modifie', {
      conversationId: selectedConv.id,
      messageRdvId: messageId,
      ancienneDate: rdv.dateRendezVous,
    })
  }

  if (convLoading) return <Skeleton className="h-96" />
  if (convError) return <ErrorBanner message={convError} onRetry={fetchConversations} />

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState
          icon={MessageCircle} title="Aucune conversation pour le moment"
          subtitle="Une fois votre dossier validé par la Direction, le Service Logement vous contactera ici."
          action={
            <button onClick={() => onGoTo('suivi')} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
              Voir mon suivi
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex" style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}>
      {/* Colonne gauche — liste des conversations */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} md:w-[34%] w-full flex-col border-r border-gray-100`}>
        <div className="flex-1 overflow-y-auto p-3">
          {conversations.map(conv => {
            const active = selectedConv?.id === conv.id
            return (
              <button
                key={conv.id} onClick={() => openConversation(conv)}
                className={`w-full text-left rounded-xl p-4 mb-2 border transition ${active ? 'border-[#E8520A] bg-orange-50/30' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white" style={{ background: G }}>
                    SL
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-bold text-gray-900 truncate">Service Logement SONAPIE</p>
                      {conv.dernierMessage && (
                        <span className="text-[0.65rem] text-gray-400 flex-shrink-0">{timeAgo(conv.dernierMessage.createdAt)}</span>
                      )}
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
          })}
        </div>
      </div>

      {/* Colonne droite — zone de messages */}
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
            {/* Header */}
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:bg-gray-50 flex-shrink-0">
                  <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white" style={{ background: G }}>SL</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">Service Logement SONAPIE</p>
                    <ConversationBadgeStatut statut={selectedConv.statut} />
                  </div>
                  {selectedConv.demande?.logement && (
                    <p className="text-xs text-gray-400 truncate">{selectedConv.demande.logement.code} · {selectedConv.demande.logement.adresse}</p>
                  )}
                </div>
              </div>
              {selectedConv.statut === 'EN_ATTENTE' && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-amber-700">
                  En attente que le Service Logement prenne en charge votre dossier
                </div>
              )}
            </div>

            {/* Messages */}
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
                    // "Confirmé" doit survivre à un rechargement de page : on le
                    // déduit de l'historique (un message de confirmation existe
                    // plus tard dans la conversation), pas seulement d'un state
                    // local qui repart de zéro à chaque montage du composant.
                    const confirme = rdvsConfirmes.has(m.id) || messages.slice(i + 1).some(
                      later => later.type === 'TEXTE' && later.contenu.startsWith(CONFIRMATION_RDV_PREFIX),
                    )
                    return (
                      <div key={m.id}>
                        {showDateSeparator && (
                          <p className="text-center text-xs text-gray-400 my-2">{formatDateSeparateur(m.createdAt)}</p>
                        )}
                        <ChatMessageBubble
                          message={m} isMine={m.expediteurId === currentUser.id} mineColor={O}
                          onConfirmerRdv={confirmerRendezVous} onProposerAutre={proposerAutreDate}
                          onModifierRdv={modifierRendezVousConfirme} confirme={confirme}
                        />
                      </div>
                    )
                  })}
                  {autreEcrit && <TypingIndicator label="Service Logement est en train d'écrire..." />}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie — toujours disponible : le locataire peut toujours
                écrire au Service Logement, quel que soit le statut de la conversation. */}
            <div className="border-t border-gray-100 p-4 flex items-center gap-2.5">
              <button onClick={handleAttemptFile} className="p-2.5 rounded-full text-gray-400 hover:bg-gray-100 flex-shrink-0" title="Joindre un fichier">
                <Paperclip size={18} />
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
          </>
        )}
      </div>
    </div>
  )
}

function ChatMessageBubble({ message, isMine, mineColor, onConfirmerRdv, onProposerAutre, onModifierRdv, confirme }) {
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
            {!isMine && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onConfirmerRdv(rdv, message.id)} disabled={confirme}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition ${confirme ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-white'}`}
                  style={confirme ? undefined : { background: G }}
                >
                  {confirme ? '✓ Rendez-vous confirmé' : '✓ Confirmer'}
                </button>
                <button
                  onClick={() => confirme ? onModifierRdv(rdv, message.id) : onProposerAutre(rdv, message.id)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold"
                >
                  {confirme ? '✗ Modifier le rendez-vous' : '✗ Proposer une autre date'}
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 ${isMine
          ? `text-white rounded-2xl rounded-tr-none`
          : 'bg-white border border-gray-100 text-[#1A1A1A] rounded-2xl rounded-tl-none'}`}
        style={isMine ? { background: mineColor } : undefined}
      >
        {message.urlFichier ? (
          <div className="flex items-center gap-2">
            <Paperclip size={14} className={isMine ? 'text-white/80' : 'text-gray-400'} />
            <span className="text-sm truncate">{message.nomFichier || 'Document'}</span>
            <a href={message.urlFichier} target="_blank" rel="noreferrer" className={isMine ? 'text-white' : 'text-blue-600'}>
              <Download size={14} />
            </a>
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

// ═════════════════════════════════════════════════════════════════════════════
// Section — Agenda des rendez-vous
// ═════════════════════════════════════════════════════════════════════════════
const AGENDA_TABS = [
  { key: 'AVENIR', label: 'À venir' },
  { key: 'PASSES', label: 'Passés' },
]

function AgendaSection({ fire, onGoTo }) {
  const [rendezVous, setRendezVous] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('AVENIR')
  const [confirmesLocal, setConfirmesLocal] = useState(new Set())

  const fetchRendezVous = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/conversations/rendez-vous')
      setRendezVous(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger vos rendez-vous.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRendezVous() }, [fetchRendezVous])

  const maintenant = Date.now()
  const filtered = useMemo(() => (
    rendezVous.filter(rdv => {
      const futur = new Date(rdv.dateRendezVous).getTime() >= maintenant
      return activeTab === 'AVENIR' ? futur : !futur
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rendezVous, activeTab])

  const confirmerRendezVous = (rdv) => {
    connectSocket().emit('envoyer_message', {
      conversationId: rdv.conversationId,
      contenu: `${CONFIRMATION_RDV_PREFIX} pour le ${formatDateRendezVous(rdv.dateRendezVous)} à ${rdv.lieuRendezVous}.`,
      type: 'TEXTE',
    })
    setConfirmesLocal(prev => new Set(prev).add(rdv.id))
    fire('success', 'Rendez-vous confirmé.')
  }

  if (loading) return <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>
  if (error) return <ErrorBanner message={error} onRetry={fetchRendezVous} />

  return (
    <div>
      <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 mb-4">
        {AGENDA_TABS.map(t => (
          <button
            key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
            style={activeTab === t.key ? { background: O } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={Calendar} title="Aucun rendez-vous programmé"
            subtitle="Le Service Logement vous proposera un rendez-vous une fois votre dossier validé."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(rdv => {
            const estConfirme = rdv.confirme || confirmesLocal.has(rdv.id)
            const estPasse = new Date(rdv.dateRendezVous).getTime() < maintenant
            return (
              <div
                key={rdv.id}
                className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm border-l-4 ${estPasse ? 'border-l-gray-200 opacity-75' : 'border-l-[#E8520A]'}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-start gap-2.5">
                    <Calendar size={18} className="mt-0.5 flex-shrink-0" style={{ color: O }} />
                    <p className="text-sm font-bold text-gray-900">{formatDateRendezVous(rdv.dateRendezVous)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    estPasse ? 'bg-gray-100 text-gray-500' : estConfirme ? 'bg-green-100 text-[#2E7D32]' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {estPasse ? '✗ Passé' : estConfirme ? '✓ Confirmé' : '⏳ En attente'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 mb-2">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  <p className="text-sm text-gray-700">{rdv.lieuRendezVous}</p>
                </div>

                {rdv.logement && (
                  <div className="flex items-start gap-2.5 mb-2">
                    <Home size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
                    <p className="text-sm text-gray-700">Logement : {rdv.logement.code} — {rdv.logement.adresse}</p>
                  </div>
                )}

                {rdv.noteRendezVous && (
                  <div className="flex items-start gap-2.5 mb-3">
                    <ScrollText size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
                    <p className="text-sm text-gray-500">{rdv.noteRendezVous}</p>
                  </div>
                )}

                {!estPasse && (
                  estConfirme ? (
                    <button onClick={() => onGoTo('chat')} className="mt-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition">
                      Modifier
                    </button>
                  ) : (
                    <button
                      onClick={() => confirmerRendezVous(rdv)}
                      className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold"
                      style={{ background: G }}
                    >
                      ✓ Confirmer ce rendez-vous
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Mes interventions
// ═════════════════════════════════════════════════════════════════════════════
function InterventionsSection({ tickets, loading, error, onRetry, onOpenTicket, onDeclarer }) {
  const [filtre, setFiltre] = useState('TOUS')

  const filtered = useMemo(() => (
    filtre === 'TOUS' ? tickets : filtre === 'OUVERTS' ? tickets.filter(t => t.statut !== 'CLOTURE') : tickets.filter(t => t.statut === 'CLOTURE')
  ), [tickets, filtre])

  if (error) return <ErrorBanner message={error} onRetry={onRetry} />

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <select value={filtre} onChange={e => setFiltre(e.target.value)} className={`${sel} flex-none !w-auto min-w-[180px]`}>
          <option value="TOUS">Tous les statuts</option>
          <option value="OUVERTS">En cours</option>
          <option value="CLOTURE">Clôturés</option>
        </select>
        <button onClick={onDeclarer} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: O }}>
          <Plus size={15} /> Déclarer un problème
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState icon={Wrench} title="Aucune intervention" subtitle="Vos tickets de maintenance apparaîtront ici." />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(t => {
            const thumb = t.photos?.find(p => p.typePhoto === 'SIGNALEMENT')
            const technicien = t.intervention?.technicien
            return (
              <button
                key={t.id} onClick={() => onOpenTicket(t.id)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition text-left"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: `${O}1A` }}>
                  {thumb ? (
                    <img src={cldThumb(thumb.urlPhoto, 100, 100)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <Wrench size={18} style={{ color: O }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{t.titre}</p>
                    <StatutTicketBadge statut={t.statut} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-gray-400">Demandé le {formatDate(t.dateDepot)} · {t.logement?.code}</p>
                    {technicien && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[0.55rem] font-bold text-white flex-shrink-0" style={{ background: O }}>
                          {getInitials(technicien.nom, technicien.prenom)}
                        </span>
                        {technicien.prenom}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Mes paiements
// ═════════════════════════════════════════════════════════════════════════════
function PaiementsSection({ paiements, loading, error, onRetry, typeLocataire }) {
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />

  return (
    <div>
      {typeLocataire === 'FONCTIONNAIRE' && (
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
          <CreditCard size={16} className="text-blue-500 flex-shrink-0" />
          <span className="text-sm font-medium text-blue-800">Votre loyer est prélevé directement sur votre salaire.</span>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-64" />
      ) : paiements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState icon={CreditCard} title="Aucun paiement" subtitle="L'historique de vos paiements apparaîtra ici." />
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Période', 'Montant', 'Mode', 'Statut', 'Date de paiement'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paiements.map((p, idx) => (
                  <tr key={p.id} className={idx < paiements.length - 1 ? 'border-b border-gray-100' : ''}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">{MOIS_LABEL[p.periodeMois]} {p.periodeAnnee}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-700">{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{p.modePaiement.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUT_PAIEMENT_META[p.statut]?.cls}`}>
                        {STATUT_PAIEMENT_META[p.statut]?.label || p.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{p.datePaiement ? formatDate(p.datePaiement) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="block md:hidden flex flex-col gap-2.5">
            {paiements.map(p => (
              <div key={p.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">{MOIS_LABEL[p.periodeMois]} {p.periodeAnnee}</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUT_PAIEMENT_META[p.statut]?.cls}`}>
                    {STATUT_PAIEMENT_META[p.statut]?.label || p.statut}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1">{Number(p.montant).toLocaleString('fr-FR')} FCFA · {p.modePaiement.replaceAll('_', ' ')}</p>
                <p className="text-xs text-gray-400">{p.datePaiement ? `Payé le ${formatDate(p.datePaiement)}` : 'Non payé'}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Profil
// ═════════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════
// Section — Paramètres
// ═════════════════════════════════════════════════════════════════════════════
function ParametresSection({ fire }) {
  const [motDePasseActuel, setMotDePasseActuel] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errs, setErrs] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrs = {}
    if (!motDePasseActuel) nextErrs.actuel = 'Champ requis'
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 8) nextErrs.nouveau = 'Minimum 8 caractères'
    if (nouveauMotDePasse !== confirmMotDePasse) nextErrs.confirm = 'Les mots de passe ne correspondent pas'
    if (Object.keys(nextErrs).length) { setErrs(nextErrs); return }

    setLoading(true)
    try {
      await api.put('/locataire/mot-de-passe', { motDePasseActuel, nouveauMotDePasse })
      fire('success', 'Mot de passe modifié avec succès.')
      setMotDePasseActuel(''); setNouveauMotDePasse(''); setConfirmMotDePasse(''); setErrs({})
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du changement de mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
      <h3 className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Changer mon mot de passe</h3>
      <p className="text-xs text-gray-400 mb-5">Choisissez un mot de passe d'au moins 8 caractères.</p>
      <form onSubmit={handleSubmit}>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe actuel</label>
          <input type="password" className={inp} value={motDePasseActuel} onChange={e => setMotDePasseActuel(e.target.value)} />
          {errs.actuel && <p className="text-xs text-red-500 mt-1">{errs.actuel}</p>}
        </div>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nouveau mot de passe</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className={inp} style={{ paddingRight: 42 }}
              value={nouveauMotDePasse} onChange={e => setNouveauMotDePasse(e.target.value)} />
            <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errs.nouveau && <p className="text-xs text-red-500 mt-1">{errs.nouveau}</p>}
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmer le nouveau mot de passe</label>
          <input type="password" className={inp} value={confirmMotDePasse} onChange={e => setConfirmMotDePasse(e.target.value)} />
          {errs.confirm && <p className="text-xs text-red-500 mt-1">{errs.confirm}</p>}
        </div>
        <button type="submit" disabled={loading} className={`${primaryBtn} w-full`} style={{ background: loading ? '#f0956a' : O }}>
          {loading ? <Spinner /> : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  )
}

function ProfilSection({ user }) {
  const rows = [
    { label: 'Nom', value: user.nom },
    { label: 'Prénom', value: user.prenom },
    { label: 'Email', value: user.email },
    { label: 'Téléphone', value: user.telephone || '—' },
    { label: 'Type de locataire', value: user.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé' },
    { label: 'Matricule', value: user.numeroMatricule || '—' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
          <span className="text-base font-extrabold text-white">{getInitials(user.nom, user.prenom)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{user.prenom} {user.nom}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map(r => (
          <div key={r.label} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400">{r.label}</p>
            <p className="text-sm font-semibold text-gray-900">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Notifications
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

function NotificationsSection({
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
          <NotificationDetailModal notification={detailTarget} onClose={() => setDetailTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationDetailModal({ notification, onClose }) {
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
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Section — Aide & support
// ═════════════════════════════════════════════════════════════════════════════
function AideSection() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl p-6 md:p-8 text-white mb-5" style={{ background: GRADIENT }}>
        <Headphones size={28} className="mb-3" />
        <h2 className="text-lg font-bold mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>Notre équipe est là pour vous aider</h2>
        <p className="text-sm text-white/90 mb-5">
          Pour toute question concernant votre logement, vos démarches ou une urgence, contactez le service SONAPIE.
        </p>
        <a href="tel:+2250000000000" className="inline-flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 text-sm font-bold" style={{ color: O }}>
          Nous contacter
        </a>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} style={{ color: '#D97706' }} />
          <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Entretenez votre logement</h3>
        </div>
        <div className="flex flex-col gap-3 text-sm text-gray-600">
          <p><span className="font-semibold text-gray-800">Aération quotidienne :</span> aérez chaque pièce 10 à 15 minutes par jour pour limiter l'humidité et les moisissures.</p>
          <p><span className="font-semibold text-gray-800">Plomberie :</span> signalez toute fuite dès son apparition — un petit problème traité tôt évite une intervention plus lourde.</p>
          <p><span className="font-semibold text-gray-800">Installations électriques :</span> ne surchargez pas les prises multiples et signalez toute odeur de brûlé ou étincelle.</p>
          <p><span className="font-semibold text-gray-800">Parties communes :</span> respectez les espaces partagés et signalez tout défaut d'éclairage ou de propreté.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Questions fréquentes</h3>
        <div className="flex flex-col gap-3 text-sm text-gray-600">
          <p><span className="font-semibold text-gray-800">Comment déclarer un problème ?</span> Depuis l'accueil ou la section « Mes interventions », cliquez sur « Déclarer un problème ».</p>
          <p><span className="font-semibold text-gray-800">Comment suivre ma demande de logement ?</span> Rendez-vous dans la section « Mes demandes ».</p>
          <p><span className="font-semibold text-gray-800">Comment demander une mutation ?</span> Depuis « Mon logement », cliquez sur « Demander une mutation ».</p>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Déclarer un problème
// ═════════════════════════════════════════════════════════════════════════════
function DeclarerProblemeModal({ logement, onClose, onSuccess, onError }) {
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [priorite, setPriorite] = useState('NORMALE')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    setPhoto(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!titre.trim() || !description.trim()) return
    setLoading(true)
    try {
      const { data: ticket } = await api.post('/tickets', {
        logementId: logement.id, titre: titre.trim(), description: description.trim(), priorite,
      })
      if (photo) {
        const form = new FormData()
        form.append('photo', photo)
        form.append('typePhoto', 'SIGNALEMENT')
        await api.post(`/tickets/${ticket.id}/photos`, form).catch(() => {
          // Le ticket est créé même si l'upload de la photo échoue ; on informe sans bloquer.
          onError('Le ticket a été créé, mais la photo n\'a pas pu être envoyée.')
        })
      }
      onSuccess()
    } catch (err) {
      onError(err.response?.data?.message || 'Erreur lors de la déclaration du problème.')
    } finally {
      setLoading(false)
    }
  }

  if (!logement) {
    return (
      <Modal onClose={onClose} width={420}>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-[#E8520A]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Aucun logement occupé</h2>
          <p className="text-sm text-slate-500 mb-5">Vous devez occuper un logement pour déclarer un problème.</p>
          <button onClick={onClose} className={`${ghostBtn} w-full`}>Fermer</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} width={520}>
      <div className="p-6 pb-4 bg-gradient-to-br from-orange-50 to-white border-b border-orange-100 rounded-t-[22px] flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>Déclarer un problème</h2>
          <p className="text-xs text-slate-400">Logement : <span className="font-semibold" style={{ color: O }}>{logement.code}</span></p>
        </div>
        <button onClick={onClose} className="bg-slate-100 rounded-lg p-1.5 text-slate-500"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Titre <span style={{ color: O }}>*</span></label>
          <input className={inp} value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex : Fuite d'eau dans la cuisine" required />
        </div>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description <span style={{ color: O }}>*</span></label>
          <textarea rows={4} className={`${inp} resize-none`} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez le problème le plus précisément possible…" required />
        </div>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priorité</label>
          <select className={sel} value={priorite} onChange={e => setPriorite(e.target.value)}>
            <option value="BASSE">Basse</option>
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Photo (optionnel)</label>
          {preview ? (
            <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-200">
              <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
              <button type="button" onClick={removePhoto} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button" onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-[#E8520A] hover:text-[#E8520A] transition"
            >
              <Camera size={20} />
              <span className="text-[0.65rem] font-semibold">Ajouter</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button type="submit" disabled={loading} className={primaryBtn} style={{ background: loading ? '#f0956a' : O }}>
            {loading ? <Spinner /> : <>Déclarer le problème</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Demande de logement
// ═════════════════════════════════════════════════════════════════════════════
function DemandeLogementModal({ onClose, onSuccess, onError }) {
  const [motif, setMotif] = useState('')
  const [priorite, setPriorite] = useState('NORMALE')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!motif.trim()) return
    setLoading(true)
    try {
      await api.post('/locataire/demandes', { motif: motif.trim(), priorite })
      onSuccess()
    } catch (err) {
      onError(err.response?.data?.message || 'Erreur lors de la soumission de la demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
        <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demande de logement</h2>
        <button onClick={onClose} className="bg-slate-100 rounded-lg p-1.5 text-slate-500"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Motif de la demande <span style={{ color: O }}>*</span></label>
          <textarea rows={4} className={`${inp} resize-none`} value={motif} onChange={e => setMotif(e.target.value)}
            placeholder="Expliquez votre besoin en logement…" required />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priorité</label>
          <select className={sel} value={priorite} onChange={e => setPriorite(e.target.value)}>
            <option value="BASSE">Basse</option>
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button type="submit" disabled={loading} className={primaryBtn} style={{ background: loading ? '#f0956a' : O }}>
            {loading ? <Spinner /> : 'Soumettre la demande'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Demande de mutation
// ═════════════════════════════════════════════════════════════════════════════
function MutationModal({ hasLogement, onClose, onSuccess, onError }) {
  const [motif, setMotif] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!motif.trim()) return
    setLoading(true)
    try {
      await api.post('/locataire/mutations', { motif: motif.trim() })
      onSuccess()
    } catch (err) {
      onError(err.response?.data?.message || 'Erreur lors de la soumission de la mutation.')
    } finally {
      setLoading(false)
    }
  }

  if (!hasLogement) {
    return (
      <Modal onClose={onClose} width={420}>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-[#E8520A]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Aucun logement occupé</h2>
          <p className="text-sm text-slate-500 mb-5">Vous devez occuper un logement pour demander une mutation.</p>
          <button onClick={onClose} className={`${ghostBtn} w-full`}>Fermer</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
        <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Syne', sans-serif" }}>Demande de mutation</h2>
        <button onClick={onClose} className="bg-slate-100 rounded-lg p-1.5 text-slate-500"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Motif de la mutation <span style={{ color: O }}>*</span></label>
          <textarea rows={4} className={`${inp} resize-none`} value={motif} onChange={e => setMotif(e.target.value)}
            placeholder="Expliquez la raison de votre demande de mutation…" required />
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
          <button type="submit" disabled={loading} className={primaryBtn} style={{ background: loading ? '#f0956a' : O }}>
            {loading ? <Spinner /> : 'Soumettre la mutation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal — Détail d'un ticket de maintenance
// ═════════════════════════════════════════════════════════════════════════════
function TicketDetailModal({ ticket, onClose, fire, onRefresh }) {
  const [choixLoading, setChoixLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)

  const photos = ticket.photos || []
  const photosApresReparation = photos.filter(p => p.typePhoto === 'APRES_REPARATION')
  const photosParType = ['SIGNALEMENT', 'CONSTAT', 'AVANT_REPARATION', 'APRES_REPARATION']
    .map(type => ({ type, items: photos.filter(p => p.typePhoto === type) }))
    .filter(g => g.items.length > 0)

  const timeline = [
    { label: 'Signalé par vous', date: ticket.dateDepot, done: true },
    ticket.dateConstatPrevue && !ticket.dateConstat
      ? { label: 'Constat programmé', date: ticket.dateConstatPrevue, done: false, upcoming: true }
      : null,
    ticket.dateConstat
      ? { label: 'Constat effectué', date: ticket.dateConstat, done: true, detail: ticket.commentaireConstat }
      : null,
    ticket.dateConfirmationLocataire
      ? { label: 'Réparation confirmée par vous', date: ticket.dateConfirmationLocataire, done: true }
      : null,
    ticket.dateVerification
      ? { label: ticket.conformeApresVerif ? 'Vérifiée — conforme' : 'Vérifiée — non conforme', date: ticket.dateVerification, done: true }
      : null,
    ticket.dateCloture
      ? { label: 'Clôturé', date: ticket.dateCloture, done: true }
      : null,
  ].filter(Boolean)

  const handleChoix = async (modeReparation) => {
    setChoixLoading(true)
    try {
      await api.put(`/tickets/${ticket.id}/choix-reparation`, { modeReparation })
      fire('success', modeReparation === 'LOCATAIRE' ? 'Vous avez choisi de réparer vous-même.' : 'La réparation a été confiée à la SONAPIE.')
      onRefresh()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de l\'enregistrement de votre choix.')
    } finally {
      setChoixLoading(false)
    }
  }

  const handleUploadApresReparation = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      form.append('typePhoto', 'APRES_REPARATION')
      await api.post(`/tickets/${ticket.id}/photos`, form)
      fire('success', 'Photo ajoutée avec succès.')
      onRefresh()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de l\'envoi de la photo.')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmerReparation = async () => {
    setConfirmLoading(true)
    try {
      await api.put(`/tickets/${ticket.id}/confirmer-reparation`)
      fire('success', 'Réparation confirmée — en attente de vérification par la SONAPIE.')
      onRefresh()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la confirmation.')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} width={640}>
      <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Syne', sans-serif" }}>
              Ticket #{ticket.id} — {ticket.titre}
            </h2>
            <StatutTicketBadge statut={ticket.statut} />
          </div>
          <p className="text-xs text-slate-400">Déclaré le {formatDate(ticket.dateDepot)} · {ticket.logement?.code}</p>
        </div>
        <button onClick={onClose} className="bg-slate-100 rounded-lg p-1.5 text-slate-500 flex-shrink-0"><X size={16} /></button>
      </div>

      <div className="p-6">
        {ticket.statut !== 'CLOTURE' && (
          <div className="mb-5">
            <TicketStepper doneCount={getTicketDoneCount(ticket.statut)} />
          </div>
        )}

        <div className="mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
          <p className="text-sm text-slate-700 bg-gray-50 border border-gray-100 rounded-xl p-3.5">{ticket.description}</p>
        </div>

        {/* Timeline */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Suivi du dossier</p>
          <div className="flex flex-col gap-3">
            {timeline.map((ev, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: ev.upcoming ? '#D1D5DB' : O }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{ev.label}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(ev.date)}</p>
                  {ev.detail && <p className="text-xs text-slate-500 mt-0.5">{ev.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technicien */}
        {ticket.intervention?.technicien && (
          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
              <span className="text-[0.65rem] font-extrabold text-white">
                {getInitials(ticket.intervention.technicien.nom, ticket.intervention.technicien.prenom)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900">Technicien en intervention</p>
              <p className="text-xs text-gray-500">{ticket.intervention.technicien.prenom} {ticket.intervention.technicien.nom}</p>
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Photos</p>
          {photosParType.length === 0 ? (
            <p className="text-sm text-slate-400 flex items-center gap-2"><ImageIcon size={15} /> Aucune photo pour ce ticket.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {photosParType.map(g => (
                <div key={g.type}>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">{TYPE_PHOTO_LABEL[g.type]}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map(p => (
                      <a key={p.id} href={p.urlPhoto} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                        <img src={cldThumb(p.urlPhoto, 160, 160)} alt={TYPE_PHOTO_LABEL[g.type]} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions contextuelles */}
        {ticket.statut === 'CONSTAT_EFFECTUE' && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <p className="text-sm font-bold text-violet-800 mb-3">Comment souhaitez-vous procéder pour la réparation ?</p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => handleChoix('LOCATAIRE')} disabled={choixLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-violet-300 bg-white text-violet-700 font-bold text-sm hover:bg-violet-100 transition disabled:opacity-60"
              >
                {choixLoading ? <Spinner size={14} /> : 'Je répare moi-même'}
              </button>
              <button
                onClick={() => handleChoix('SONAPIE')} disabled={choixLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-60"
                style={{ background: choixLoading ? '#c4b5fd' : '#7C3AED' }}
              >
                {choixLoading ? <Spinner size={14} /> : 'Confier à la SONAPIE'}
              </button>
            </div>
          </div>
        )}

        {ticket.statut === 'PRISE_EN_CHARGE_LOCATAIRE' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm font-bold text-orange-800 mb-1">Vous avez choisi de réparer vous-même</p>
            <p className="text-xs text-orange-700 mb-3">Ajoutez une photo de la réparation terminée, puis confirmez.</p>

            {photosApresReparation.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photosApresReparation.map(p => (
                  <a key={p.id} href={p.urlPhoto} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-orange-200">
                    <img src={cldThumb(p.urlPhoto, 130, 130)} alt="Après réparation" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-orange-300 bg-white text-[#E8520A] font-bold text-sm hover:bg-orange-100 transition disabled:opacity-60"
              >
                {uploadingPhoto ? <Spinner size={14} /> : <><Camera size={15} /> Ajouter une photo</>}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUploadApresReparation} className="hidden" />
              <button
                onClick={handleConfirmerReparation} disabled={confirmLoading || photosApresReparation.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-60"
                style={{ background: (confirmLoading || photosApresReparation.length === 0) ? '#f0956a' : O }}
                title={photosApresReparation.length === 0 ? 'Ajoutez au moins une photo avant de confirmer' : undefined}
              >
                {confirmLoading ? <Spinner size={14} /> : "J'ai terminé la réparation"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function DeleteDemandeConfirm({ target, onClose, onSuccess, onError }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await api.delete(`/locataire/demandes/${target.id}`)
      onSuccess()
    } catch (err) {
      onError(err.response?.data?.message || 'Erreur lors de la suppression.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
        <Trash2 size={24} className="text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Supprimer cette demande ?</h2>
      <p className="text-sm text-slate-500 mb-5">Cette demande rejetée sera définitivement supprimée de votre fil.</p>
      <div className="flex gap-2.5">
        <button onClick={onClose} className={`${ghostBtn} flex-1`}>Annuler</button>
        <button onClick={handleDelete} disabled={loading} className={primaryBtn} style={{ background: loading ? '#FCA5A5' : '#EF4444' }}>
          {loading ? <Spinner /> : <><Trash2 size={14} /> Supprimer</>}
        </button>
      </div>
    </div>
  )
}

function AnnulerDemandeConfirm({ target, onClose, onSuccess, onError }) {
  const [loading, setLoading] = useState(false)

  const handleAnnuler = async () => {
    setLoading(true)
    try {
      await api.patch(`/locataire/demandes/${target.id}/annuler`)
      onSuccess()
    } catch (err) {
      onError(err.response?.data?.message || "Erreur lors de l'annulation.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
        <X size={24} className="text-gray-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Annuler cette demande ?</h2>
      <p className="text-sm text-slate-500 mb-5">Vous ne pourrez plus revenir en arrière. Vous pourrez soumettre une nouvelle demande à tout moment.</p>
      <div className="flex gap-2.5">
        <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
        <button onClick={handleAnnuler} disabled={loading} className={primaryBtn} style={{ background: loading ? '#D1D5DB' : '#4B5563' }}>
          {loading ? <Spinner /> : <><X size={14} /> Annuler la demande</>}
        </button>
      </div>
    </div>
  )
}

