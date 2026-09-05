import { Link } from 'react-router-dom'
import '../styles/Dashboard.css'

function Dashboard() {
  const rolActivo = localStorage.getItem('rolActivo')

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

      {rolActivo === 'ADMINISTRATIVO' && (
        <div className="dashboard-chips">
          <Link to="/menores-pendientes" className="dashboard-chip dashboard-chip--blue">
            Ver menores pendientes de aprobación
          </Link>
          <Link to="/registro-administrativo" className="dashboard-chip dashboard-chip--green">
            Registrar administrativo
          </Link>
        </div>
      )}
    </div>
  )
}

export default Dashboard