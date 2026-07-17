import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Info, Menu, AlertTriangle, CheckCircle2, Mail, Phone } from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

const O = '#E8520A'
const G = '#2E7D32'

const ROLE_LABEL = {
  SUPER_ADMIN: 'Super Administrateur', ADMIN: 'Administrateur',
}

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const cardClass = 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100'

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'

export default function ParametresAdmin() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || '{}'), [])
  const initials = getInitials(currentUser.nom, currentUser.prenom)

  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) navigate('/login')
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback(null)
    if (!ancien || !nouveau) {
      setFeedback({ type: 'error', message: 'Ancien et nouveau mot de passe sont requis.' })
      return
    }
    if (nouveau.length < 8) {
      setFeedback({ type: 'error', message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
      return
    }
    if (nouveau !== confirmation) {
      setFeedback({ type: 'error', message: 'Les mots de passe ne correspondent pas.' })
      return
    }
    setSaving(true)
    try {
      await api.put('/auth/mot-de-passe', { ancienMotDePasse: ancien, nouveauMotDePasse: nouveau })
      setFeedback({ type: 'success', message: 'Mot de passe mis à jour avec succès.' })
      setAncien(''); setNouveau(''); setConfirmation('')
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Impossible de mettre à jour le mot de passe.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
              className="ad-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Paramètres</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Gérez votre compte et vos préférences</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
          {/* Mon profil */}
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-5">
              <User size={18} style={{ color: O }} />
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Mon profil</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: O }}>
                <span className="text-lg font-extrabold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900">{currentUser.prenom} {currentUser.nom}</p>
                <p className="text-sm text-gray-400 flex items-center gap-1.5"><Mail size={13} /> {currentUser.email}</p>
                {currentUser.telephone && <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5"><Phone size={13} /> {currentUser.telephone}</p>}
              </div>
              <span className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-[#E8520A]/10 text-[#E8520A] border border-[#E8520A]/30 flex-shrink-0">
                {ROLE_LABEL[currentUser.role] || currentUser.role}
              </span>
            </div>
          </div>

          {/* Changer mot de passe */}
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-5">
              <Lock size={18} style={{ color: G }} />
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Changer mon mot de passe</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Ancien mot de passe</label>
                <input type="password" value={ancien} onChange={e => setAncien(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nouveau mot de passe</label>
                <input type="password" value={nouveau} onChange={e => setNouveau(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Confirmer le nouveau mot de passe</label>
                <input type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className={inp} />
              </div>

              {feedback && (
                <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 border ${feedback.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {feedback.type === 'success'
                    ? <CheckCircle2 size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />}
                  <span className={`text-xs font-semibold ${feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {feedback.message}
                  </span>
                </div>
              )}

              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: G }}>
                {saving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </div>

          {/* À propos */}
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} style={{ color: '#3B82F6' }} />
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>À propos</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Application</span><span className="font-semibold text-gray-900">SONAPIE — Gestion des logements</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="font-semibold text-gray-900">1.0.0</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Support</span><span className="font-semibold text-gray-900">support@sonapie.ci</span></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
