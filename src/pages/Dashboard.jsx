import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../api/axios'
import CompletarPerfil from '../components/CompletarPerfil'
import { tienePermiso } from '../utils/sesion'
import { CalendarPlus, Calendar, HeartPulse, Users, FileText } from 'lucide-react'
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
        <div className="dashboard-banner-content">
          <img
            src="/logo-blanco.png"
            alt="Sanatorio Antonia"
            className="dashboard-banner-logo"
          />
          <div className="dashboard-banner-text">
            <h1 className="dashboard-banner-title">Bienvenido</h1>
            <p className="dashboard-banner-subtitle">Rol activo: {rolActivo}</p>
          </div>
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
          <Link to="/admin/estudios" className="dashboard-chip dashboard-chip--teal">
            Gestión de estudios médicos
          </Link>
          {puedeGestionarUsuarios && (
            <>
              <Link to="/registro-administrativo" className="dashboard-chip dashboard-chip--green">
                Registrar administrativo
              </Link>
              <Link to="/registro-profesional" className="dashboard-chip dashboard-chip--red">
                Registrar profesional
              </Link>
              <Link to="/admin/agendas" className="dashboard-chip dashboard-chip--purple">
                Configurar agendas profesionales
              </Link>
              <Link to="/admin/turnos" className="dashboard-chip dashboard-chip--orange">
                Gestión de turnos
              </Link>
              <Link to="/admin/profesionales" className="dashboard-chip dashboard-chip--blue">
                Gestionar profesionales y especialidades
              </Link>
            </>
          )}
        </div>
      )}

      {rolActivo === 'PACIENTE' && (
        <>
          <section className="dashboard-patient-cta" aria-label="Solicitar turno médico">
            <div className="dashboard-patient-cta-content">
              <div className="dashboard-patient-cta-text">
                <h2>¿Necesitás una consulta médica?</h2>
                <p>Elegí una especialidad, un profesional y reservá tu horario en simples pasos.</p>
              </div>
              <Link
                to="/mis-turnos?solicitar=true"
                state={{ abrirSolicitud: true }}
                className="dashboard-patient-cta-button"
              >
                <CalendarPlus size={22} />
                <span>Sacar turno</span>
              </Link>
            </div>
          </section>

          <div className="dashboard-chips">
            <Link
              to="/mis-turnos?solicitar=true"
              state={{ abrirSolicitud: true }}
              className="dashboard-chip dashboard-chip--primary-action"
            >
              <div className="dashboard-chip-text">
                <span className="dashboard-chip-title">Sacar turno</span>
                <span className="dashboard-chip-sub">Reservar una nueva consulta</span>
              </div>
              <div className="dashboard-chip-icon">
                <CalendarPlus size={24} />
              </div>
            </Link>
            <Link to="/mis-turnos" className="dashboard-chip dashboard-chip--blue">
              <div className="dashboard-chip-text">
                <span className="dashboard-chip-title">Mis turnos</span>
                <span className="dashboard-chip-sub">Consultar y gestionar mis citas</span>
              </div>
              <div className="dashboard-chip-icon">
                <Calendar size={24} />
              </div>
            </Link>
            <Link to="/mis-antecedentes" className="dashboard-chip dashboard-chip--green">
              <div className="dashboard-chip-text">
                <span className="dashboard-chip-title">Mis antecedentes médicos</span>
                <span className="dashboard-chip-sub">Alergias, patologías y grupo</span>
              </div>
              <div className="dashboard-chip-icon">
                <HeartPulse size={24} />
              </div>
            </Link>
            <Link to="/mis-menores" className="dashboard-chip dashboard-chip--purple">
              <div className="dashboard-chip-text">
                <span className="dashboard-chip-title">Menores a cargo</span>
                <span className="dashboard-chip-sub">Gestionar grupo familiar</span>
              </div>
              <div className="dashboard-chip-icon">
                <Users size={24} />
              </div>
            </Link>
            <Link to="/mis-estudios" className="dashboard-chip dashboard-chip--orange">
              <div className="dashboard-chip-text">
                <span className="dashboard-chip-title">Mis estudios médicos</span>
                <span className="dashboard-chip-sub">Informes PDF e imágenes PACS</span>
              </div>
              <div className="dashboard-chip-icon">
                <FileText size={24} />
              </div>
            </Link>
          </div>
        </>
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
