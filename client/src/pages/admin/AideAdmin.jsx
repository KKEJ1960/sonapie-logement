import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, Mail, Phone, ChevronDown, Menu } from 'lucide-react'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

const O = '#E8520A'

const FAQ = [
  {
    q: 'Comment créer un nouveau compte utilisateur ?',
    a: 'Depuis "Utilisateurs" dans le menu, cliquez sur "Nouvel utilisateur" et renseignez les informations requises, dont le rôle à attribuer.',
  },
  {
    q: 'Qui peut créer ou modifier un logement ?',
    a: 'La création, la modification et la suppression des logements sont réservées au rôle Service Logement. L\'espace Admin les affiche en lecture seule.',
  },
  {
    q: 'Comment attribuer un logement à une demande validée ?',
    a: 'Cette fonctionnalité est en cours de développement. En attendant, contactez le Service Logement pour finaliser une attribution.',
  },
  {
    q: 'Comment suivre un ticket de maintenance ?',
    a: 'Rendez-vous dans "Maintenance" pour voir tous les tickets, filtrés par statut (à programmer, en cours, à vérifier, clôturés) et agir dessus selon votre rôle.',
  },
  {
    q: 'Je ne vois pas la section Mutations, pourquoi ?',
    a: 'La consultation des mutations est réservée au rôle Direction (ou Super Admin). Contactez un administrateur système si vous pensez avoir besoin de cet accès.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition">
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-3.5 text-sm text-gray-500">{a}</div>}
    </div>
  )
}

export default function AideAdmin() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) navigate('/login')
  }, [navigate])

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Aide</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Questions fréquentes et support</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle size={18} style={{ color: O }} />
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Questions fréquentes</h3>
            </div>
            <div className="space-y-2.5">
              {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Contacter le support</h3>
            <div className="space-y-3">
              <a href="mailto:support@sonapie.ci" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${O}15` }}>
                  <Mail size={16} style={{ color: O }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Email</p>
                  <p className="text-xs text-gray-400">support@sonapie.ci</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${O}15` }}>
                  <Phone size={16} style={{ color: O }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Téléphone</p>
                  <p className="text-xs text-gray-400">Disponible auprès de votre administrateur système</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
