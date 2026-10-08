import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import CalendarioTurnos from '../components/CalendarioTurnos'
import CompletarPerfil from '../components/CompletarPerfil'
import '../styles/MisTurnos.css'

const ESTADOS = {
  SOLICITADO: 'Solicitado',
  CONFIRMADO: 'Confirmado',
  REPROGRAMADO: 'Reprogramado',
  CANCELADO: 'Cancelado',
  COMPLETADO: 'Atendido',
}
const ACTIVOS = new Set(['SOLICITADO', 'CONFIRMADO'])
const PLAZO_CAMBIOS_MS = 24 * 60 * 60 * 1000

function formatoFecha(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(fechaHora))
}

function formatoHora(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(fechaHora))
}

export default function MisTurnos() {
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [perfilIncompleto, setPerfilIncompleto] = useState(false)
  const [turnoAReprogramar, setTurnoAReprogramar] = useState(null)
  const [nuevoHorario, setNuevoHorario] = useState('')
  const [solicitudAbierta, setSolicitudAbierta] = useState(false)
  const [especialidades, setEspecialidades] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [idEspecialidad, setIdEspecialidad] = useState('')
  const [idProfesionalNuevo, setIdProfesionalNuevo] = useState('')
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const [procesando, setProcesando] = useState(false)

  const cargarTurnos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/turnos')
      setTurnos(Array.isArray(data) ? data : data.turnos || [])
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar tus turnos. Intentá nuevamente.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarTurnos() }, [cargarTurnos])

  useEffect(() => {
    api.get('/pacientes/perfil')
      .then(({ data }) => setPerfilIncompleto(!data.perfilCompleto))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!solicitudAbierta || !idEspecialidad) {
      setProfesionales([])
      setIdProfesionalNuevo('')
      setNuevoHorario('')
      return
    }
    let cancelado = false
    setCargandoCatalogo(true)
    setError('')
    api.get('/profesionales', { params: { especialidad: idEspecialidad } })
      .then(({ data }) => { if (!cancelado) setProfesionales(Array.isArray(data) ? data : []) })
      .catch((err) => { if (!cancelado) setError(err.response?.data?.error || 'No se pudieron cargar los profesionales.') })
      .finally(() => { if (!cancelado) setCargandoCatalogo(false) })
    return () => { cancelado = true }
  }, [solicitudAbierta, idEspecialidad])

  const manejarError = (err) => {
    if (err.response?.data?.details?.requiereCompletarPerfil) {
      setPerfilIncompleto(true)
      setTurnoAReprogramar(null)
      setSolicitudAbierta(false)
      return
    }
    setError(err.response?.data?.error || 'No se pudo completar la operación. Intentá nuevamente.')
  }

  const abrirSolicitud = async () => {
    setError('')
    setMensaje('')
    if (perfilIncompleto) {
      setPerfilIncompleto(true)
      return
    }
    setSolicitudAbierta(true)
    setIdEspecialidad('')
    setIdProfesionalNuevo('')
    setNuevoHorario('')
    setCargandoCatalogo(true)
    try {
      const { data } = await api.get('/especialidades')
      setEspecialidades(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar las especialidades.')
    } finally {
      setCargandoCatalogo(false)
    }
  }

  const confirmarSolicitud = async () => {
    if (!idProfesionalNuevo || !nuevoHorario) return
    setError('')
    setMensaje('')
    setProcesando(true)
    try {
      const { data } = await api.post('/turnos', {
        idProfesional: Number(idProfesionalNuevo),
        fechaHora: nuevoHorario,
      })
      setMensaje(data.mensaje || 'Tu turno fue registrado correctamente.')
      setSolicitudAbierta(false)
      setIdEspecialidad('')
      setIdProfesionalNuevo('')
      setNuevoHorario('')
      await cargarTurnos()
    } catch (err) {
      manejarError(err)
    } finally {
      setProcesando(false)
    }
  }

  const cancelarTurno = async (turno) => {
    const confirmar = window.confirm(`¿Querés cancelar el turno del ${formatoFecha(turno.fechaHora)} a las ${formatoHora(turno.fechaHora)}?`)
    if (!confirmar) return
    setError('')
    setMensaje('')
    setProcesando(true)
    try {
      const { data } = await api.post(`/turnos/${turno.idTurno}/cancelar`)
      setMensaje(data.mensaje || 'Tu turno fue cancelado correctamente.')
      await cargarTurnos()
    } catch (err) {
      manejarError(err)
    } finally {
      setProcesando(false)
    }
  }

  const confirmarReprogramacion = async () => {
    if (!turnoAReprogramar || !nuevoHorario) return
    setError('')
    setMensaje('')
    setProcesando(true)
    try {
      const { data } = await api.post(`/turnos/${turnoAReprogramar.idTurno}/reprogramar`, { fechaHora: nuevoHorario })
      setMensaje(data.mensaje || 'Tu turno fue reprogramado correctamente.')
      setTurnoAReprogramar(null)
      setNuevoHorario('')
      await cargarTurnos()
    } catch (err) {
      manejarError(err)
    } finally {
      setProcesando(false)
    }
  }

  return <main className="my-appointments-page">
    <header className="my-appointments-header"><Link to="/dashboard">← Volver al panel</Link><span>Sanatorio Antonia</span></header>
    <section className="my-appointments-content">
      <div className="my-appointments-title"><div><p className="my-appointments-eyebrow">PANEL DEL PACIENTE</p><h1>Mis turnos</h1><p>Consultá el estado y gestioná tus turnos médicos.</p></div><div className="my-appointments-title-actions"><button type="button" className="my-appointments-refresh" onClick={cargarTurnos} disabled={cargando}>Actualizar</button><button type="button" className="request-appointment-button" onClick={abrirSolicitud}>Solicitar turno</button></div></div>
      {mensaje && <p className="my-appointments-success" role="status">{mensaje}</p>}
      {error && <div className="my-appointments-error" role="alert">{error}</div>}
      {cargando ? <div className="my-appointments-empty">Cargando tus turnos…</div> : !turnos.length ? <div className="my-appointments-empty"><strong>Todavía no tenés turnos</strong><p>Cuando solicites uno, vas a poder consultarlo desde acá.</p><button type="button" className="request-appointment-button" onClick={abrirSolicitud}>Solicitar mi primer turno</button></div> : <div className="my-appointments-list">{turnos.map((turno) => {
        const estado = String(turno.estado || '').toUpperCase()
        const horasRestantes = new Date(turno.fechaHora).getTime() - Date.now()
        const activo = ACTIVOS.has(estado)
        const puedeGestionar = activo && horasRestantes >= PLAZO_CAMBIOS_MS
        const plazoVencido = activo && !puedeGestionar
        const profesional = turno.profesional?.usuario
        return <article className="my-appointment-card" key={turno.idTurno}>
          <div className="my-appointment-card-main">
            <div className="my-appointment-date"><strong>{formatoFecha(turno.fechaHora)}</strong><span>{formatoHora(turno.fechaHora)}</span></div>
            <div className="my-appointment-info"><h2>{profesional ? `Dr./Dra. ${profesional.nombre} ${profesional.apellido}` : `Turno #${turno.idTurno}`}</h2><p>Consulta médica</p>{turno.motivoCancelacion && <p className="my-appointment-cancel-reason">Motivo: {turno.motivoCancelacion}</p>}</div>
            <span className={`my-appointment-status my-appointment-status--${estado.toLowerCase()}`}>{ESTADOS[estado] || estado}</span>
          </div>
          {puedeGestionar && <div className="my-appointment-actions"><button type="button" onClick={() => cancelarTurno(turno)} disabled={procesando}>Cancelar</button><button type="button" onClick={() => { setError(''); setNuevoHorario(''); setTurnoAReprogramar(turno) }} disabled={procesando}>Reprogramar</button></div>}
          {plazoVencido && <p className="my-appointment-deadline">El plazo para cancelar o reprogramar este turno venció. Se requieren al menos 24 horas de anticipación.</p>}
        </article>
      })}</div>}
    </section>
    {solicitudAbierta && <div className="my-appointments-backdrop" role="presentation"><section className="rebook-modal" role="dialog" aria-modal="true" aria-labelledby="request-heading"><button type="button" className="rebook-close" aria-label="Cerrar" onClick={() => setSolicitudAbierta(false)}>×</button><p className="my-appointments-eyebrow">NUEVO TURNO</p><h2 id="request-heading">Solicitar un turno</h2><p>Elegí una especialidad, un profesional y un horario disponible.</p>{error && <p className="booking-form-error" role="alert">{error}</p>}<div className="booking-selectors"><label>Especialidad<select value={idEspecialidad} onChange={(event) => setIdEspecialidad(event.target.value)} disabled={cargandoCatalogo}><option value="">{cargandoCatalogo ? 'Cargando…' : 'Seleccionar especialidad'}</option>{especialidades.map((especialidad) => <option key={especialidad.idEspecialidad} value={especialidad.idEspecialidad}>{especialidad.nombre}</option>)}</select></label><label>Profesional<select value={idProfesionalNuevo} onChange={(event) => { setIdProfesionalNuevo(event.target.value); setNuevoHorario('') }} disabled={!idEspecialidad || cargandoCatalogo}><option value="">{cargandoCatalogo && idEspecialidad ? 'Cargando…' : profesionales.length ? 'Seleccionar profesional' : idEspecialidad ? 'No hay profesionales disponibles' : 'Seleccioná una especialidad primero'}</option>{profesionales.map((profesional) => <option key={profesional.idProfesional} value={profesional.idProfesional}>{profesional.nombreCompleto}{profesional.matricula ? ` · Matrícula ${profesional.matricula}` : ''}</option>)}</select></label></div>{idProfesionalNuevo && <CalendarioTurnos idProfesional={Number(idProfesionalNuevo)} seleccionado={nuevoHorario} onSeleccionar={setNuevoHorario} />}<div className="rebook-actions"><button type="button" className="rebook-cancel" onClick={() => setSolicitudAbierta(false)} disabled={procesando}>Volver</button><button type="button" onClick={confirmarSolicitud} disabled={!idProfesionalNuevo || !nuevoHorario || procesando}>{procesando ? 'Solicitando…' : 'Confirmar turno'}</button></div></section></div>}
    {turnoAReprogramar && <div className="my-appointments-backdrop" role="presentation"><section className="rebook-modal" role="dialog" aria-modal="true" aria-labelledby="rebook-heading"><button type="button" className="rebook-close" aria-label="Cerrar" onClick={() => setTurnoAReprogramar(null)}>×</button><p className="my-appointments-eyebrow">REPROGRAMAR TURNO</p><h2 id="rebook-heading">Elegí una nueva fecha y hora</h2><p>Turno actual: {formatoFecha(turnoAReprogramar.fechaHora)} a las {formatoHora(turnoAReprogramar.fechaHora)}</p>{error && <p className="booking-form-error" role="alert">{error}</p>}<CalendarioTurnos idProfesional={turnoAReprogramar.idProfesional} seleccionado={nuevoHorario} onSeleccionar={setNuevoHorario} /><div className="rebook-actions"><button type="button" className="rebook-cancel" onClick={() => setTurnoAReprogramar(null)} disabled={procesando}>Volver</button><button type="button" onClick={confirmarReprogramacion} disabled={!nuevoHorario || procesando}>{procesando ? 'Guardando…' : 'Confirmar reprogramación'}</button></div></section></div>}
    <CompletarPerfil abierto={perfilIncompleto} alCompletar={() => { setPerfilIncompleto(false); cargarTurnos() }} />
  </main>
}
