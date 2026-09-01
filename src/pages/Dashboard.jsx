import { Link } from 'react-router-dom'
import '../styles/Dashboard.css'

function Dashboard() {
  const rolActivo = localStorage.getItem('rolActivo')

  return (
    <div className="dashboard-container">
      <p className="dashboard-placeholder">Dashboard (placeholder)</p>

      {rolActivo === 'ADMINISTRATIVO' && (
        <div className="dashboard-links">
          <Link to="/menores-pendientes" className="dashboard-logout">
            Ver menores pendientes de aprobación
          </Link>
          <Link to="/registro-administrativo" className="dashboard-logout">
            Registrar administrativo
          </Link>
        </div>
      )}

      <button
        className="w-fit rounded-md border border-[var(--border)] px-4 py-2 text-[var(--text-h)]"
        onClick={() => {
          localStorage.clear()
          window.location.href = '/'
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}

export default Dashboard