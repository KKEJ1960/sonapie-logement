import { useEffect, useState } from 'react'
import { Activity, Home, ShieldCheck, Wrench } from 'lucide-react'
import { api } from '../services/api.js'

const stats = [
  { label: 'Logements', value: '0', icon: Home },
  { label: 'Demandes', value: '0', icon: Activity },
  { label: 'Tickets', value: '0', icon: Wrench },
  { label: 'Utilisateurs', value: '0', icon: ShieldCheck },
]

export default function Dashboard() {
  const [status, setStatus] = useState('Verification...')

  useEffect(() => {
    api
      .get('/health')
      .then((response) => setStatus(response.data.message))
      .catch(() => setStatus('API indisponible'))
  }, [])

  return (
    <div className="space-y-8">
      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-sonapie-green">
          Tableau de bord
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-sonapie-ink">
          Gestion des logements et demandes
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Base applicative prete pour connecter les modules logement, demandes,
          maintenance, mutations et notifications.
        </p>
        <div className="mt-5 inline-flex rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          API: {status}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon

          return (
            <article key={item.label} className="rounded border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">{item.label}</p>
                <Icon size={20} className="text-sonapie-gold" aria-hidden="true" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-sonapie-ink">{item.value}</p>
            </article>
          )
        })}
      </section>
    </div>
  )
}
