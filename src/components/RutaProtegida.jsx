import { Navigate, Outlet } from 'react-router-dom'

function RutaProtegida() {
  const token = localStorage.getItem('accessToken')

  if (!token) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default RutaProtegida