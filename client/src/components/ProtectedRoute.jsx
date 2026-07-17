import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRoles }) {
  const token   = sessionStorage.getItem('token')
  const userStr = sessionStorage.getItem('user')

  if (!token || !userStr) {
    return <Navigate to="/login" replace />
  }

  try {
    const user = JSON.parse(userStr)

    // SUPER_ADMIN a accès à toutes les routes protégées
    if (user.role === 'SUPER_ADMIN') {
      return children
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />
    }
    return children
  } catch {
    return <Navigate to="/login" replace />
  }
}
