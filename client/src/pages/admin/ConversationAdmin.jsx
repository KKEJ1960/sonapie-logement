import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Menu, AlertTriangle, RefreshCw, MessageCircle } from 'lucide-react'
import api from '../../services/api.js'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const formatHeure = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function Skeleton({ className }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
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

// ═════════════════════════════════════════════════════════════════════════════
// Consultation en lecture seule d'une conversation (accès Admin/Super Admin)
// ═════════════════════════════════════════════════════════════════════════════
export default function ConversationAdmin() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: conversations }, { data: msgs }] = await Promise.all([
        api.get('/conversations'),
        api.get(`/conversations/${id}/messages`),
      ])
      setConversation(conversations.find(c => String(c.id) === String(id)) || null)
      setMessages(msgs)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger cette conversation.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['ADMIN', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
            <button onClick={() => navigate('/admin/demandes')} className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-50 flex-shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                Conversation {conversation ? `— ${conversation.locataire?.prenom} ${conversation.locataire?.nom}` : ''}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                Consultation en lecture seule — le suivi appartient au Service Logement
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchData} />
          ) : loading ? (
            <div className="space-y-3 max-w-2xl">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 px-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={28} className="text-slate-300" />
              </div>
              <p className="text-base font-bold text-slate-700" style={{ fontFamily: "'Syne', sans-serif" }}>Aucun message échangé</p>
              <p className="text-sm text-slate-400">Cette conversation n'a pas encore de messages.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-2xl space-y-3">
              {messages.map(m => {
                const isLocataire = m.expediteur?.role === 'LOCATAIRE'
                return (
                  <div key={m.id} className={`flex ${isLocataire ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%]">
                      <p className={`text-[0.65rem] font-semibold mb-0.5 ${isLocataire ? 'text-gray-400' : ''}`} style={!isLocataire ? { color: G } : undefined}>
                        {m.expediteur?.prenom} {m.expediteur?.nom}
                      </p>
                      <div
                        className="px-3.5 py-2 rounded-2xl text-sm"
                        style={isLocataire
                          ? { background: '#F1F5F9', color: '#334155' }
                          : { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
                      >
                        {m.contenu}
                      </div>
                      <p className="text-[0.6rem] text-gray-400 mt-0.5">{formatHeure(m.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
