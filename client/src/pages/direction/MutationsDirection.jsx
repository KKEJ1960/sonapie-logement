import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, Search, Menu, X, AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import api from '../../services/api.js'
import DirectionSidebar from '../../components/direction/DirectionSidebar.jsx'

const O = '#E8520A'
const G = '#2E7D32'

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const ghostBtn = 'px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition'

function Spinner() { return <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="inline-block animate-spin" /> }
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
function EmptyState({ icon: Icon = ArrowLeftRight, title, subtitle }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-slate-300" />
      </div>
      <p className="text-base font-bold text-slate-700 mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</p>
      {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
    </div>
  )
}
function Modal({ onClose, width = 460, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])
  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        style={{ maxWidth: width }} className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-h-[85vh] overflow-y-auto">
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

// ─── Modal : valider / rejeter une mutation ─────────────────────────────────────
function ValiderModal({ mutation, onClose, fire, onDone }) {
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await api.put(`/direction/mutations/${mutation.id}/valider`, { commentaire: commentaire.trim() || undefined })
      fire('success', `Mutation #${mutation.id} validée.`)
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors de la validation.')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          Valider la mutation — {mutation.demandeur?.prenom} {mutation.demandeur?.nom}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Logement actuel : <strong>{mutation.logementActuel?.code}</strong> → Logement souhaité : <strong>{mutation.logementSouhaite?.code || 'non spécifié'}</strong>
        </p>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Commentaire (optionnel)</label>
        <textarea rows={2} value={commentaire} onChange={e => setCommentaire(e.target.value)} className={inp} placeholder="Précisions sur la validation…" />
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
          <button onClick={handleConfirm} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: G }}>
            {saving && <Spinner />} <CheckCircle size={14} /> Valider
          </button>
        </div>
      </div>
    </Modal>
  )
}
function RejeterModal({ mutation, onClose, fire, onDone }) {
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReject = async () => {
    if (!motif.trim()) return
    setSaving(true)
    try {
      await api.put(`/direction/mutations/${mutation.id}/rejeter`, { motifRejet: motif.trim() })
      fire('success', `Mutation #${mutation.id} rejetée.`)
      onDone()
    } catch (err) {
      fire('error', err.response?.data?.message || 'Erreur lors du rejet.')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div className="p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          Rejeter la mutation — {mutation.demandeur?.prenom} {mutation.demandeur?.nom}
        </h2>
        <p className="text-sm text-gray-500 mb-4">Le motif du rejet sera communiqué au demandeur.</p>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Motif du rejet <span style={{ color: O }}>*</span></label>
        <textarea rows={3} value={motif} onChange={e => setMotif(e.target.value)} className={inp} placeholder="Expliquez le motif du rejet…" />
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className={`${ghostBtn} flex-1`}>Fermer</button>
          <button onClick={handleReject} disabled={!motif.trim() || saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50" style={{ background: '#EF4444' }}>
            {saving && <Spinner />} <XCircle size={14} /> Confirmer le rejet
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function MutationsDirection() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [mutations, setMutations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const [validerTarget, setValiderTarget] = useState(null)
  const [rejeterTarget, setRejeterTarget] = useState(null)

  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  const fetchMutations = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/direction/mutations', { params: { statut: 'EN_VALIDATION_DIRECTION' } })
      setMutations(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les mutations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['DIRECTION', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchMutations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDone = useCallback(() => {
    setValiderTarget(null); setRejeterTarget(null)
    fetchMutations()
  }, [fetchMutations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return mutations
    return mutations.filter(m => `${m.demandeur?.prenom || ''} ${m.demandeur?.nom || ''} ${m.demandeur?.email || ''}`.toLowerCase().includes(q))
  }, [mutations, search])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <DirectionSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
              className="dir-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Mutations</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Mutations en attente de validation Direction</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchMutations} />
          ) : (
            <>
              <div className="relative mb-5 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un demandeur…" className={`${inp} pl-9`} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Demandeur', 'Logement actuel', 'Logement souhaité', 'Motif', 'Date', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-sm">Chargement des mutations…</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={6}><EmptyState title="Aucune mutation en attente" subtitle="Les nouvelles demandes de mutation apparaîtront ici." /></td></tr>
                      ) : (
                        filtered.map(m => (
                          <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100">
                                  <span className="text-[0.65rem] font-bold text-slate-600">{getInitials(m.demandeur?.nom, m.demandeur?.prenom)}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{m.demandeur?.prenom} {m.demandeur?.nom}</p>
                                  <p className="text-xs text-gray-400 truncate">{m.demandeur?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{m.logementActuel?.code || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{m.logementSouhaite?.code || 'Non spécifié'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-[220px] truncate">{m.motif}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(m.dateDepot)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setValiderTarget(m)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap" style={{ background: G }}>
                                  <CheckCircle size={12} /> Valider
                                </button>
                                <button onClick={() => setRejeterTarget(m)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold whitespace-nowrap">
                                  <XCircle size={12} /> Rejeter
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {validerTarget && <ValiderModal mutation={validerTarget} onClose={() => setValiderTarget(null)} fire={fire} onDone={handleDone} />}
        {rejeterTarget && <RejeterModal mutation={rejeterTarget} onClose={() => setRejeterTarget(null)} fire={fire} onDone={handleDone} />}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
