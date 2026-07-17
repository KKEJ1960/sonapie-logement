import { Outlet } from 'react-router-dom'
import { Building2 } from 'lucide-react'

export default function MainLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="grid size-10 place-items-center rounded bg-sonapie-green text-white">
            <Building2 size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-sonapie-green">Plateforme logement</p>
            <h1 className="text-xl font-semibold text-sonapie-ink">SONAPIE</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
