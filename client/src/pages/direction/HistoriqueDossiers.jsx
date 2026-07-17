import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  Search, Menu, AlertTriangle, RefreshCw, Eye, Download, Archive, FileText,
} from 'lucide-react'
import api from '../../services/api.js'
import DirectionSidebar from '../../components/direction/DirectionSidebar.jsx'
import { DossierDetailModal } from './DossiersDirection.jsx'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const O = '#E8520A'
const G = '#2E7D32'

const STATUT_DOSSIER_META = {
  SOUMIS:    { label: 'À étudier',        cls: 'bg-blue-100 text-blue-700' },
  EN_ETUDE:  { label: "En cours d'étude", cls: 'bg-amber-100 text-amber-700' },
  VALIDE:    { label: 'Validé',           cls: 'bg-green-100 text-[#2E7D32]' },
  REJETE:    { label: 'Rejeté',           cls: 'bg-red-100 text-red-600' },
  INCOMPLET: { label: 'Incomplet',        cls: 'bg-gray-100 text-gray-500' },
}

const getInitials = (nom, prenom) => `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?'
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-900 outline-none focus:border-[#E8520A] focus:bg-white focus:ring-[3px] focus:ring-[#E8520A]/10 transition'
const sel = `${inp} cursor-pointer`

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
function EmptyState({ icon: Icon = Archive, title, subtitle }) {
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
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl border shadow-lg text-sm font-semibold min-w-[260px] max-w-[360px] ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
      {toast.message}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Page principale
// ═════════════════════════════════════════════════════════════════════════════
export default function HistoriqueDossiers() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const [examenTarget, setExamenTarget] = useState(null)
  const [exportingId, setExportingId] = useState(null)
  const [toast, setToast] = useState(null)
  const fire = useCallback((type, message) => setToast({ type, message }), [])

  const fetchDossiers = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/dossiers/historique')
      setDossiers(data)
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger l'historique des dossiers.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!u || !['DIRECTION', 'SUPER_ADMIN'].includes(u.role)) { navigate('/login'); return }
    fetchDossiers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exporterPDF = async (demandeId, nomClient) => {
    setExportingId(demandeId)
    try {
      const response = await api.get(`/dossiers/${demandeId}/export-pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `dossier-${nomClient}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      fire('error', 'Erreur lors de la génération du PDF.')
    } finally {
      setExportingId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const debut = dateDebut ? new Date(dateDebut) : null
    const fin = dateFin ? new Date(dateFin) : null
    if (fin) fin.setHours(23, 59, 59, 999)
    return dossiers.filter(d => {
      if (statutFilter && d.statut !== statutFilter) return false
      if (typeFilter && d.locataire?.typeLocataire !== typeFilter) return false
      if (debut && new Date(d.updatedAt) < debut) return false
      if (fin && new Date(d.updatedAt) > fin) return false
      if (q) {
        const full = `${d.locataire?.prenom || ''} ${d.locataire?.nom || ''} ${d.locataire?.email || ''}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [dossiers, search, statutFilter, typeFilter, dateDebut, dateFin])

  return (
    <div className="flex h-screen" style={{ background: '#F4F6F9', fontFamily: "'Inter', sans-serif" }}>
      <DirectionSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu de navigation" aria-expanded={mobileNavOpen}
              className="dir-hamburger md:hidden p-3 -ml-3 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>Historique des dossiers</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Tous les dossiers clients, quel que soit leur statut</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {error ? (
            <ErrorBanner message={error} onRetry={fetchDossiers} />
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher nom/email…" className={`${inp} pl-9`} />
                </div>
                <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className={`${sel} md:w-48`}>
                  <option value="">Tous les statuts</option>
                  {Object.entries(STATUT_DOSSIER_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${sel} md:w-48`}>
                  <option value="">Tous les types</option>
                  <option value="FONCTIONNAIRE">Fonctionnaire</option>
                  <option value="PRIVE">Privé</option>
                </select>
                <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={`${inp} md:w-44`} title="Date de début" />
                <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={`${inp} md:w-44`} title="Date de fin" />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[1100px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Client', 'Type', 'Logement demandé', 'Logement attribué', 'Statut dossier', 'Documents', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={7} className="p-10 text-center text-gray-400 text-sm">Chargement de l'historique…</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={7}><EmptyState title="Aucun dossier trouvé" subtitle="Aucun dossier ne correspond à ces filtres." /></td></tr>
                      ) : (
                        filtered.map(d => {
                          const meta = STATUT_DOSSIER_META[d.statut] || { label: d.statut, cls: 'bg-gray-100 text-gray-500' }
                          const logement = d.demande?.logement
                          const attribue = d.occupationActive?.logement
                          const nomClient = `${d.locataire?.prenom || ''}-${d.locataire?.nom || ''}`.trim() || `dossier-${d.demandeId}`
                          return (
                            <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white"
                                    style={{ background: d.locataire?.typeLocataire === 'FONCTIONNAIRE' ? G : O }}
                                  >
                                    {getInitials(d.locataire?.nom, d.locataire?.prenom)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{d.locataire?.prenom} {d.locataire?.nom}</p>
                                    <p className="text-xs text-gray-400 truncate">{d.locataire?.email}</p>
                                    <p className="text-xs text-gray-400 truncate">{d.locataire?.telephone || 'Non renseigné'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${d.locataire?.typeLocataire === 'FONCTIONNAIRE' ? 'bg-[#2E7D32]/10 text-[#2E7D32]' : 'bg-[#E8520A]/10 text-[#E8520A]'}`}>
                                  {d.locataire?.typeLocataire === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Privé'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {logement ? <>{logement.code} <span className="text-gray-400">· {logement.adresse}</span></> : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {attribue ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-[#2E7D32]">
                                    {attribue.code} · Attribué
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="relative group inline-block">
                                  <span className="text-sm text-gray-600 cursor-default">{d.documents.length} document{d.documents.length > 1 ? 's' : ''}</span>
                                  {d.documents.length > 0 && (
                                    <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 z-20 w-56">
                                      {d.documents.map(doc => (
                                        <a key={doc.id} href={doc.urlFichier} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline py-1 truncate">
                                          <FileText size={11} className="flex-shrink-0" /> {doc.type.replace(/_/g, ' ')}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => setExamenTarget(d)} title="Voir le dossier" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold whitespace-nowrap">
                                    <Eye size={12} /> Voir
                                  </button>
                                  <button
                                    onClick={() => exporterPDF(d.demandeId, nomClient)} disabled={exportingId === d.demandeId}
                                    title="Exporter en PDF"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                                  >
                                    <Download size={12} /> {exportingId === d.demandeId ? '…' : 'PDF'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
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
        {examenTarget && (
          <DossierDetailModal
            dossier={examenTarget}
            onClose={() => setExamenTarget(null)}
            fire={fire}
            onUpdated={() => { setExamenTarget(null); fetchDossiers() }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
