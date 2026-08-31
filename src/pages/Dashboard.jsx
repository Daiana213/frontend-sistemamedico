import { Link } from 'react-router-dom'

function Dashboard() {
  const rolActivo = localStorage.getItem('rolActivo')

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <p className="text-[var(--text-h)]">Dashboard (placeholder)</p>

      {rolActivo === 'ADMINISTRATIVO' && (
        <div className="flex flex-col gap-2">
          <Link to="/menores-pendientes" className="text-[var(--accent)] underline">
            Ver menores pendientes de aprobación
          </Link>
          <Link to="/registro-administrativo" className="text-[var(--accent)] underline">
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