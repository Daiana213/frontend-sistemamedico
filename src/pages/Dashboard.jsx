import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../api/axios'
import CompletarPerfil from '../components/CompletarPerfil'
import { tienePermiso } from '../utils/sesion'
import '../styles/Dashboard.css'

function Dashboard() {
  const rolActivo = localStorage.getItem('rolActivo')
  const location = useLocation()
  const [perfilIncompleto, setPerfilIncompleto] = useState(false)
  const puedeGestionarUsuarios = tienePermiso('gestion_usuarios')

  useEffect(() => {
    if (rolActivo !== 'PACIENTE') return

    api
      .get('/pacientes/perfil')
      .then(({ data }) => setPerfilIncompleto(!data.perfilCompleto))
      .catch(() => setPerfilIncompleto(false))
  }, [rolActivo])

  return (
    <div className="dashboard-page">
      <header className="dashboard-banner">
        <div className="dashboard-banner-text">
          <h1 className="dashboard-banner-title">Bienvenido</h1>
          <p className="dashboard-banner-subtitle">Rol activo: {rolActivo}</p>
        </div>

        <button
          className="dashboard-logout"
          onClick={() => {
            localStorage.clear()
            window.location.href = '/'
          }}
        >
          Cerrar sesión
        </button>
      </header>

      {location.state?.antecedentesGuardados && (
        <p className="dashboard-success" role="status">Antecedentes guardados correctamente.</p>
      )}

      {rolActivo === 'ADMINISTRATIVO' && (
        <div className="dashboard-chips">
          <Link to="/menores-pendientes" className="dashboard-chip dashboard-chip--blue">
            Ver menores pendientes de aprobación
          </Link>
          {puedeGestionarUsuarios && (
            <>
              <Link to="/registro-administrativo" className="dashboard-chip dashboard-chip--green">
                Registrar administrativo
              </Link>
              <Link to="/registro-profesional" className="dashboard-chip dashboard-chip--red">
                Registrar profesional
              </Link>
            </>
          )}
        </div>
      )}

      {rolActivo === 'PACIENTE' && (
        <div className="dashboard-chips">
          <Link to="/mis-antecedentes" className="dashboard-chip dashboard-chip--green">Mis antecedentes médicos</Link>
        </div>
      )}

      {rolActivo === 'PROFESIONAL' && (
        <div className="dashboard-chips">
          <Link to="/agenda" className="dashboard-chip dashboard-chip--green">Agenda e historia clínica</Link>
        </div>
      )}

      <CompletarPerfil
        abierto={perfilIncompleto}
        alCompletar={() => setPerfilIncompleto(false)}
      />
    </div>
  )
}

export default Dashboard
