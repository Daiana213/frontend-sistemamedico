import { Navigate } from 'react-router-dom'
import { tienePermiso } from '../utils/sesion'

function RutaProtegida({ rolesPermitidos, permisosRequeridos = [], children }) {
  const token = localStorage.getItem('accessToken')
  const rolActivo = localStorage.getItem('rolActivo')

  if (!token) {
    return <Navigate to="/" replace />
  }

  const primerLogin = localStorage.getItem('primerLogin') === 'true'
  if (primerLogin) {
    return <Navigate to="/cambiar-password" replace />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(rolActivo)) {
    return <Navigate to="/dashboard" replace />
  }

  if (!rolesPermitidos && rolActivo === 'PROFESIONAL') {
    return <Navigate to="/agenda" replace />
  }

  if (!permisosRequeridos.every(tienePermiso)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default RutaProtegida
