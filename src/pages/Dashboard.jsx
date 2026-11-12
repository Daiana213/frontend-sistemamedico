import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../api/axios'
import CompletarPerfil from '../components/CompletarPerfil'
import { tienePermiso } from '../utils/sesion'
import { CalendarPlus, Calendar, HeartPulse, Users, FileText } from 'lucide-react'
import '../styles/Dashboard.css'

function Dashboard() {
  const rolActivo = localStorage.getItem('rolActivo')
  const nombreUsuario = localStorage.getItem('nombreUsuario')
  const location = useLocation()
  const [perfilIncompleto, setPerfilIncompleto] = useState(false)
  const [proximosTurnos, setProximosTurnos] = useState([])
  const [puedeGestionarEstudios, setPuedeGestionarEstudios] = useState(false)
  const puedeGestionarUsuarios = tienePermiso('gestion_usuarios')

  useEffect(() => {
    if (rolActivo !== 'PACIENTE') return

    Promise.allSettled([api.get('/pacientes/perfil'), api.get('/turnos')]).then(([perfil, turnos]) => {
      if (perfil.status === 'fulfilled') setPerfilIncompleto(!perfil.value.data.perfilCompleto)
      if (turnos.status === 'fulfilled') {
        const lista = Array.isArray(turnos.value.data) ? turnos.value.data : turnos.value.data.turnos || []
        const proximos = lista
          .filter((turno) => ['SOLICITADO', 'CONFIRMADO', 'REPROGRAMADO'].includes(String(turno.estado || '').toUpperCase()) && new Date(turno.fechaHora) >= new Date())
          .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
          .slice(0, 3)
        setProximosTurnos(proximos)
      }
    })
  }, [rolActivo])

  useEffect(() => {
    if (rolActivo !== 'PROFESIONAL') return
    const ahora = new Date()
    const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
    api.get('/profesionales/me/turnos', { params: { fecha } })
      .then(({ data }) => setPuedeGestionarEstudios(Boolean(data.profesional?.puedeCargarEstudios)))
      .catch(() => setPuedeGestionarEstudios(false))
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
            <h1 className="dashboard-banner-title">{nombreUsuario ? `Bienvenido, ${nombreUsuario}` : 'Bienvenido'}</h1>
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
        <div className="dashboard-admin-categories">
          <section><h2>Atención y estudios</h2><div className="dashboard-chips">
            <Link to="/registro-paciente" state={{ returnTo: '/dashboard' }} className="dashboard-chip dashboard-chip--green">Registrar paciente</Link>
            <Link to="/menores-pendientes" className="dashboard-chip dashboard-chip--blue">Ver menores pendientes de aprobación</Link>
            <Link to="/admin/estudios" className="dashboard-chip dashboard-chip--teal">Gestión de estudios médicos</Link>
            {puedeGestionarUsuarios && <><Link to="/admin/turnos" className="dashboard-chip dashboard-chip--orange">Gestión de turnos</Link><Link to="/admin/reportes" className="dashboard-chip dashboard-chip--teal">Reportes y métricas</Link></>}
          </div></section>
          {puedeGestionarUsuarios && (
            <><section><h2>Personal y accesos</h2><div className="dashboard-chips">
              <Link to="/admin/administrativos" className="dashboard-chip dashboard-chip--green">Gestión de administrativos</Link>
              <Link to="/admin/profesionales" className="dashboard-chip dashboard-chip--blue">Gestionar profesionales y especialidades</Link>
              <Link to="/admin/agendas" className="dashboard-chip dashboard-chip--purple">Configurar agendas profesionales</Link>
            </div></section><section><h2>Convenios</h2><div className="dashboard-chips">
              <Link to="/admin/obras-sociales" className="dashboard-chip dashboard-chip--green">Gestionar obras sociales y planes</Link>
            </div></section></>
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
                to="/solicitar-turno"
                className="dashboard-patient-cta-button"
              >
                <CalendarPlus size={22} />
                <span>Sacar turno</span>
              </Link>
            </div>
          </section>

          <section className="dashboard-upcoming" aria-label="Próximos turnos">
            <div className="dashboard-upcoming-heading"><div><span>AGENDA</span><h2>Tus próximos turnos</h2></div><Link to="/mis-turnos">Ver todos</Link></div>
            {proximosTurnos.length ? <div className="dashboard-upcoming-list">{proximosTurnos.map((turno) => <article key={turno.idTurno}><Calendar size={19} /><div><strong>{new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(turno.fechaHora))} · {new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(turno.fechaHora))}</strong><span>{turno.profesional?.usuario ? `Dr./Dra. ${turno.profesional.usuario.nombre} ${turno.profesional.usuario.apellido}` : 'Consulta médica'} · {turno.especialidad?.nombre || 'Turno médico'}</span></div><span className={`dashboard-upcoming-status dashboard-upcoming-status--${String(turno.estado).toLowerCase()}`}>{String(turno.estado).toLowerCase() === 'solicitado' ? 'Solicitado' : 'Confirmado'}</span></article>)}</div> : <p className="dashboard-upcoming-empty">Todavía no tenés turnos próximos. Cuando solicites uno, va a aparecer acá.</p>}
          </section>

          <div className="dashboard-chips">
            <Link
              to="/solicitar-turno"
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
          <Link to="/agenda" className="dashboard-chip dashboard-chip--green"><div className="dashboard-chip-text"><span className="dashboard-chip-title">Agenda e historia clínica</span><span className="dashboard-chip-sub">Consultas, pacientes y estudios médicos</span></div><div className="dashboard-chip-icon"><Calendar size={24} /></div></Link>
          <Link to="/agenda/estudios" className="dashboard-chip dashboard-chip--blue"><div className="dashboard-chip-text"><span className="dashboard-chip-title">Gestión de estudios médicos</span><span className="dashboard-chip-sub">{puedeGestionarEstudios ? 'Cargar y actualizar estudios de tus pacientes' : 'Disponible para perfiles profesionales habilitados'}</span></div><div className="dashboard-chip-icon"><FileText size={24} /></div></Link>
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
