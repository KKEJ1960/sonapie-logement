import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useWakeUpServer } from './hooks/useWakeUpServer.js'

const LandingPage         = lazy(() => import('./pages/LandingPage.jsx'))
const LoginPage           = lazy(() => import('./pages/LoginPage.jsx'))
const RegisterPage        = lazy(() => import('./pages/RegisterPage.jsx'))
const Dashboard           = lazy(() => import('./pages/Dashboard.jsx'))
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const GestionUtilisateurs = lazy(() => import('./pages/admin/GestionUtilisateurs.jsx'))
const LogementsAdmin      = lazy(() => import('./pages/admin/LogementsAdmin.jsx'))
const DemandesAdmin       = lazy(() => import('./pages/admin/DemandesAdmin.jsx'))
const ConversationAdmin   = lazy(() => import('./pages/admin/ConversationAdmin.jsx'))
const MutationsAdmin      = lazy(() => import('./pages/admin/MutationsAdmin.jsx'))
const MaintenanceAdmin    = lazy(() => import('./pages/admin/MaintenanceAdmin.jsx'))
const RapportsAdmin       = lazy(() => import('./pages/admin/RapportsAdmin.jsx'))
const ParametresAdmin     = lazy(() => import('./pages/admin/ParametresAdmin.jsx'))
const AideAdmin           = lazy(() => import('./pages/admin/AideAdmin.jsx'))
const NotificationsAdmin  = lazy(() => import('./pages/admin/NotificationsAdmin.jsx'))
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard.jsx'))
const DirectionDashboard  = lazy(() => import('./pages/direction/DirectionDashboard.jsx'))
const MutationsDirection  = lazy(() => import('./pages/direction/MutationsDirection.jsx'))
const JournalDirection    = lazy(() => import('./pages/direction/JournalDirection.jsx'))
const RapportsDirection   = lazy(() => import('./pages/direction/RapportsDirection.jsx'))
const DossiersDirection   = lazy(() => import('./pages/direction/DossiersDirection.jsx'))
const NotificationsDirection = lazy(() => import('./pages/direction/NotificationsDirection.jsx'))
const HistoriqueDossiers  = lazy(() => import('./pages/direction/HistoriqueDossiers.jsx'))
const LocataireDashboard  = lazy(() => import('./pages/locataire/LocataireDashboard.jsx'))
const ServiceLogementDashboard = lazy(() => import('./pages/service-logement/ServiceLogementDashboard.jsx'))

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '4px solid #E8520A', borderTopColor: 'transparent',
      animation: 'spin .7s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export default function App() {
  // Réveille le backend (Render) dès le chargement de l'app, avant même que
  // l'utilisateur atteigne l'écran de connexion.
  useWakeUpServer()

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* ── Routes publiques ── */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Dashboard legacy (agents, responsables, techniciens) ── */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['LOCATAIRE', 'RESPONSABLE', 'TECHNICIEN']}>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* ── Espace admin : chaque page gère sa propre sidebar (AdminSidebar) ── */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/utilisateurs" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <GestionUtilisateurs />
          </ProtectedRoute>
        } />
        <Route path="/admin/logements" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <LogementsAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/demandes" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <DemandesAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/conversations/:id" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <ConversationAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/mutations" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <MutationsAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/maintenance" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <MaintenanceAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/rapports" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <RapportsAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/parametres" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <ParametresAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/aide" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AideAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/notifications" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <NotificationsAdmin />
          </ProtectedRoute>
        } />

        {/* ── Espace super-admin ── */}
        <Route path="/super-admin/dashboard" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        } />

        {/* ── Espace direction ── */}
        <Route path="/direction/dashboard" element={
          <ProtectedRoute allowedRoles={['DIRECTION', 'SUPER_ADMIN']}>
            <DirectionDashboard />
          </ProtectedRoute>
        } />
        <Route path="/direction/mutations" element={
          <ProtectedRoute allowedRoles={['DIRECTION', 'SUPER_ADMIN']}>
            <MutationsDirection />
          </ProtectedRoute>
        } />
        <Route path="/direction/journal" element={
          <ProtectedRoute allowedRoles={['DIRECTION', 'SUPER_ADMIN']}>
            <JournalDirection />
          </ProtectedRoute>
        } />
        <Route path="/direction/rapports" element={
          <ProtectedRoute allowedRoles={['DIRECTION', 'SUPER_ADMIN']}>
            <RapportsDirection />
          </ProtectedRoute>
        } />
        <Route path="/direction/dossiers" element={
          <ProtectedRoute allowedRoles={['DIRECTION', 'SUPER_ADMIN']}>
            <DossiersDirection />
          </ProtectedRoute>
        } />
        <Route path="/direction/notifications" element={
          <ProtectedRoute allowedRoles={['DIRECTION', 'SUPER_ADMIN']}>
            <NotificationsDirection />
          </ProtectedRoute>
        } />
        <Route path="/direction/historique" element={
          <ProtectedRoute allowedRoles={['DIRECTION', 'SUPER_ADMIN']}>
            <HistoriqueDossiers />
          </ProtectedRoute>
        } />

        {/* ── Espace locataire ── */}
        <Route path="/locataire/dashboard" element={
          <ProtectedRoute allowedRoles={['LOCATAIRE']}>
            <LocataireDashboard />
          </ProtectedRoute>
        } />

        {/* ── Espace service logement ── */}
        <Route path="/service-logement/dashboard" element={
          <ProtectedRoute allowedRoles={['SERVICE_LOGEMENT']}>
            <ServiceLogementDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  )
}
