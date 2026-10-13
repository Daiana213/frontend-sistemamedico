import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import CalendarioTurnos from '../components/CalendarioTurnos'
import '../styles/GestionTurnos.css'

const ESTADOS = {
  SOLICITADO: 'Reservado',
  CONFIRMADO: 'Confirmado',
  REPROGRAMADO: 'Reprogramado',
  CANCELADO: 'Cancelado',
  COMPLETADO: 'Atendido',
}
const ESTADOS_ACTIVOS = new Set(['SOLICITADO', 'CONFIRMADO'])

function fechaLegible(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(fechaHora))
}

function horaLegible(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(fechaHora))
}

function fechaClaveLocal(fechaHora) {
  const fecha = new Date(fechaHora)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function obtenerLista(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.turnos) ? data.turnos : []
}

function GestionTurnos() {
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [modal, setModal] = useState('')
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [filtros, setFiltros] = useState({ paciente: '', profesional: '', fecha: '' })

  const [dni, setDni] = useState('')
  const [paciente, setPaciente] = useState(null)
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [especialidades, setEspecialidades] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [idEspecialidad, setIdEspecialidad] = useState('')
  const [idProfesional, setIdProfesional] = useState('')
  const [horario, setHorario] = useState('')
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(false)
  const [cargandoProfesionales, setCargandoProfesionales] = useState(false)

  const cargarTurnos = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true)
    else setCargando(true)
    setErrorLista('')
    try {
      const { data } = await api.get('/turnos')
      setTurnos(obtenerLista(data))
    } catch (err) {
      setErrorLista(err.response?.data?.error || 'No se pudieron cargar los turnos. Intentá nuevamente.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [])

  useEffect(() => { cargarTurnos() }, [cargarTurnos])

  useEffect(() => {
    if (modal !== 'crear') return undefined
    let cancelado = false
    setCargandoEspecialidades(true)
    api.get('/especialidades')
      .then(({ data }) => { if (!cancelado) setEspecialidades(Array.isArray(data) ? data : []) })
      .catch((err) => { if (!cancelado) setError(err.response?.data?.error || 'No se pudieron cargar las especialidades.') })
      .finally(() => { if (!cancelado) setCargandoEspecialidades(false) })
    return () => { cancelado = true }
  }, [modal])

  useEffect(() => {
    if (modal !== 'crear' || !idEspecialidad) {
      setProfesionales([])
      setIdProfesional('')
      setHorario('')
      return undefined
    }
    let cancelado = false
    setCargandoProfesionales(true)
    api.get('/profesionales', { params: { especialidad: idEspecialidad } })
      .then(({ data }) => { if (!cancelado) setProfesionales(Array.isArray(data) ? data : []) })
      .catch((err) => { if (!cancelado) setError(err.response?.data?.error || 'No se pudieron cargar los profesionales.') })
      .finally(() => { if (!cancelado) setCargandoProfesionales(false) })
    return () => { cancelado = true }
  }, [modal, idEspecialidad])

  const abrirCreacion = () => {
    setError('')
    setMensaje('')
    setDni('')
    setPaciente(null)
    setIdEspecialidad('')
    setIdProfesional('')
    setHorario('')
    setModal('crear')
  }

  const buscarPaciente = async (event) => {
    event.preventDefault()
    setError('')
    setPaciente(null)
    const dniLimpio = dni.trim()
    if (!/^\d{7,8}$/.test(dniLimpio)) {
      setError('Ingresá un DNI válido de 7 u 8 números.')
      return
    }
    setBuscandoPaciente(true)
    try {
      const { data } = await api.get('/pacientes/buscar', { params: { dni: dniLimpio } })
      if (!data.perfilCompleto) {
        setError('El paciente tiene datos incompletos y debe actualizar su perfil antes de reservar un turno.')
        return
      }
      setPaciente(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se encontró un paciente registrado con ese DNI.')
    } finally {
      setBuscandoPaciente(false)
    }
  }

  const completarOperacion = async (respuesta) => {
    setMensaje(respuesta?.mensaje || 'La operación se completó correctamente.')
    setError('')
    setModal('')
    setTurnoSeleccionado(null)
    setMotivoCancelacion('')
    setHorario('')
    await cargarTurnos(true)
  }

  const registrarTurno = async (event) => {
    event?.preventDefault()
    if (!paciente || !idProfesional || !horario) {
      setError('Completá el DNI del paciente, el profesional y un horario disponible.')
      return
    }
    setError('')
    setProcesando(true)
    try {
      const { data } = await api.post('/turnos', {
        dniPaciente: paciente.dni,
        idProfesional: Number(idProfesional),
        fechaHora: horario,
      })
      setMensaje('Turno reservado correctamente. Se solicitó el envío de la notificación de confirmación al paciente.')
      setModal('')
      setPaciente(null)
      setDni('')
      setIdEspecialidad('')
      setIdProfesional('')
      setHorario('')
      await cargarTurnos(true)
      if (data?.mensaje) setMensaje(`Turno reservado correctamente. ${data.mensaje}`)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar el turno. Verificá los datos e intentá nuevamente.')
    } finally {
      setProcesando(false)
    }
  }

  const reprogramarTurno = async (event) => {
    event.preventDefault()
    if (!turnoSeleccionado || !horario) return
    setError('')
    setProcesando(true)
    try {
      const { data } = await api.patch(`/turnos/${turnoSeleccionado.idTurno}/reprogramar-admin`, { nuevaFechaHora: horario })
      await completarOperacion(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo reprogramar el turno. Intentá nuevamente.')
    } finally {
      setProcesando(false)
    }
  }

  const cancelarTurno = async (event) => {
    event.preventDefault()
    if (!turnoSeleccionado) return
    setError('')
    setProcesando(true)
    try {
      const { data } = await api.delete(`/turnos/${turnoSeleccionado.idTurno}`, {
        data: motivoCancelacion.trim() ? { motivoCancelacion: motivoCancelacion.trim() } : {},
      })
      await completarOperacion(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cancelar el turno. Intentá nuevamente.')
    } finally {
      setProcesando(false)
    }
  }

  const abrirReprogramacion = (turno) => {
    setTurnoSeleccionado(turno)
    setHorario('')
    setError('')
    setMensaje('')
    setModal('reprogramar')
  }

  const abrirCancelacion = (turno) => {
    setTurnoSeleccionado(turno)
    setMotivoCancelacion('')
    setError('')
    setMensaje('')
    setModal('cancelar')
  }

  const cerrarModal = () => {
    if (procesando) return
    setModal('')
    setTurnoSeleccionado(null)
    setError('')
  }

  const opcionesProfesionales = [...new Map(turnos
    .filter((turno) => turno.profesional)
    .map((turno) => [String(turno.idProfesional), {
      id: String(turno.idProfesional),
      nombre: `${turno.profesional.usuario?.nombre || ''} ${turno.profesional.usuario?.apellido || ''}`.trim(),
    }])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const turnosFiltrados = turnos.filter((turno) => {
    const pacienteTurno = turno.paciente?.usuario
    const nombrePaciente = `${pacienteTurno?.nombre || ''} ${pacienteTurno?.apellido || ''}`.trim().toLocaleLowerCase('es')
    const dniPaciente = String(pacienteTurno?.dni || '')
    const busquedaPaciente = filtros.paciente.trim().toLocaleLowerCase('es')
    const profesionalCoincide = !filtros.profesional || String(turno.idProfesional) === filtros.profesional
    const pacienteCoincide = !busquedaPaciente || nombrePaciente.includes(busquedaPaciente) || dniPaciente.includes(busquedaPaciente)
    const fechaCoincide = !filtros.fecha || fechaClaveLocal(turno.fechaHora) === filtros.fecha
    return profesionalCoincide && pacienteCoincide && fechaCoincide
  })

  const turnosOrdenados = [...turnosFiltrados].sort((a, b) => {
    const aActivo = ESTADOS_ACTIVOS.has(String(a.estado || '').toUpperCase())
    const bActivo = ESTADOS_ACTIVOS.has(String(b.estado || '').toUpperCase())
    if (aActivo !== bActivo) return aActivo ? -1 : 1
    const diferencia = new Date(a.fechaHora) - new Date(b.fechaHora)
    return aActivo ? diferencia : -diferencia
  })

  const gruposPorDia = new Map()
  turnosOrdenados.forEach((turno) => {
    const dia = fechaClaveLocal(turno.fechaHora)
    gruposPorDia.set(dia, [...(gruposPorDia.get(dia) || []), turno])
  })

  return <main className="admin-appointments-page">
    <header className="admin-appointments-header"><Link to="/dashboard">← Volver al panel</Link><span>Sanatorio Antonia</span></header>
    <section className="admin-appointments-content">
      <div className="admin-appointments-title">
        <div><p className="admin-appointments-eyebrow">PANEL ADMINISTRATIVO</p><h1>Gestión de turnos</h1><p>Registrá turnos presenciales y administrá reprogramaciones y cancelaciones.</p></div>
        <div className="admin-appointments-title-actions"><button type="button" className="admin-appointments-refresh" onClick={() => cargarTurnos(true)} disabled={actualizando}>{actualizando ? 'Actualizando…' : 'Actualizar'}</button><button type="button" className="admin-appointments-primary" onClick={abrirCreacion}>+ Registrar turno</button></div>
      </div>
      {mensaje && <p className="admin-appointments-success" role="status">{mensaje}</p>}
      {errorLista && <div className="admin-appointments-error" role="alert">{errorLista}<button type="button" onClick={() => cargarTurnos(true)}>Reintentar</button></div>}
      <section className="admin-appointments-filters" aria-label="Filtros de turnos">
        <label>Paciente<input type="search" value={filtros.paciente} onChange={(event) => setFiltros((actual) => ({ ...actual, paciente: event.target.value }))} placeholder="Nombre, apellido o DNI" /></label>
        <label>Profesional<select value={filtros.profesional} onChange={(event) => setFiltros((actual) => ({ ...actual, profesional: event.target.value }))}><option value="">Todos los profesionales</option>{opcionesProfesionales.map((profesional) => <option key={profesional.id} value={profesional.id}>{profesional.nombre}</option>)}</select></label>
        <label>Día<input type="date" value={filtros.fecha} onChange={(event) => setFiltros((actual) => ({ ...actual, fecha: event.target.value }))} /></label>
        {(filtros.paciente || filtros.profesional || filtros.fecha) && <button type="button" className="admin-appointments-clear-filters" onClick={() => setFiltros({ paciente: '', profesional: '', fecha: '' })}>Limpiar filtros</button>}
      </section>
      <div className="admin-appointments-list-heading"><h2>Turnos registrados</h2><span>{turnosFiltrados.length} de {turnos.length} {turnosFiltrados.length === 1 ? 'turno' : 'turnos'}</span></div>
      {cargando ? <div className="admin-appointments-empty">Cargando turnos…</div> : !turnosFiltrados.length ? <div className="admin-appointments-empty"><strong>{turnos.length ? 'No hay turnos que coincidan con esos filtros' : 'No hay turnos para mostrar'}</strong><p>{turnos.length ? 'Probá cambiar o limpiar los filtros.' : 'Cuando registres un turno, aparecerá en esta lista.'}</p></div> : <div className="admin-appointments-day-groups">
        {[...gruposPorDia.entries()].map(([dia, turnosDelDia]) => <section className="admin-appointments-day-group" key={dia}>
          <div className="admin-appointments-day-heading"><h2>{fechaLegible(`${dia}T12:00:00`)}</h2><span>{turnosDelDia.length} {turnosDelDia.length === 1 ? 'turno' : 'turnos'}</span></div>
          <div className="admin-appointments-list">{turnosDelDia.map((turno) => {
          const estado = String(turno.estado || '').toUpperCase()
          const activo = ESTADOS_ACTIVOS.has(estado)
          const pacienteTurno = turno.paciente?.usuario
          const profesional = turno.profesional?.usuario
          return <article className="admin-appointment-card" key={turno.idTurno}>
            <div className="admin-appointment-card-main">
              <div className="admin-appointment-date"><strong>{fechaLegible(turno.fechaHora)}</strong><span>{horaLegible(turno.fechaHora)}</span></div>
              <div className="admin-appointment-info"><h3>{pacienteTurno ? `${pacienteTurno.nombre} ${pacienteTurno.apellido}` : `Paciente #${turno.idPaciente}`}</h3><p>DNI {pacienteTurno?.dni || 'No disponible'}{profesional ? ` · Dr./Dra. ${profesional.nombre} ${profesional.apellido}` : ''}</p>{turno.motivoCancelacion && <p className="admin-appointment-reason">Motivo: {turno.motivoCancelacion}</p>}</div>
              <span className={`admin-appointment-status admin-appointment-status--${estado.toLowerCase()}`}>{ESTADOS[estado] || estado}</span>
            </div>
            {activo && <div className="admin-appointment-actions"><button type="button" onClick={() => abrirReprogramacion(turno)}>Reprogramar turno</button><button type="button" className="admin-appointment-delete" onClick={() => abrirCancelacion(turno)}>Eliminar turno</button></div>}
          </article>
          })}</div>
        </section>)}
      </div>}
    </section>

    {modal && <div className="admin-appointments-backdrop" role="presentation"><section className="admin-appointments-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-heading">
      <button type="button" className="admin-appointments-close" aria-label="Cerrar" onClick={cerrarModal} disabled={procesando}>×</button>
      {modal === 'crear' && <div>
        <p className="admin-appointments-eyebrow">NUEVO TURNO</p><h2 id="admin-modal-heading">Registrar turno</h2><p>Buscá al paciente por DNI y elegí un horario disponible.</p>
        {error && <p className="admin-appointments-form-error" role="alert">{error}</p>}
        <form className="admin-appointments-dni-search" onSubmit={buscarPaciente}><label htmlFor="dni-paciente-turno">DNI del paciente</label><div><input id="dni-paciente-turno" inputMode="numeric" maxLength="8" value={dni} onChange={(event) => { setDni(event.target.value.replace(/\D/g, '')); setPaciente(null) }} placeholder="Ej. 30123456" required /><button type="submit" disabled={buscandoPaciente}>{buscandoPaciente ? 'Buscando…' : 'Buscar paciente'}</button></div></form>
        {paciente && <div className="admin-appointments-patient"><strong>{paciente.nombreCompleto}</strong><span>DNI {paciente.dni} · {paciente.planObraSocial || 'Sin cobertura informada'}</span></div>}
        <div className="admin-appointments-selectors"><label>Especialidad<select value={idEspecialidad} onChange={(event) => { setIdEspecialidad(event.target.value); setError('') }} disabled={!paciente || cargandoEspecialidades}><option value="">{cargandoEspecialidades ? 'Cargando…' : 'Seleccionar especialidad'}</option>{especialidades.map((item) => <option value={item.idEspecialidad} key={item.idEspecialidad}>{item.nombre}</option>)}</select></label><label>Profesional<select value={idProfesional} onChange={(event) => { setIdProfesional(event.target.value); setHorario('') }} disabled={!idEspecialidad || cargandoProfesionales}><option value="">{cargandoProfesionales ? 'Cargando…' : profesionales.length ? 'Seleccionar profesional' : idEspecialidad ? 'No hay profesionales disponibles' : 'Seleccioná una especialidad'}</option>{profesionales.map((item) => <option value={item.idProfesional} key={item.idProfesional}>{item.nombreCompleto}{item.matricula ? ` · Matrícula ${item.matricula}` : ''}</option>)}</select></label></div>
        {idProfesional && <CalendarioTurnos key={`nuevo-${idProfesional}`} idProfesional={Number(idProfesional)} seleccionado={horario} onSeleccionar={setHorario} />}
        <div className="admin-appointments-modal-actions"><button type="button" className="admin-appointments-secondary" onClick={cerrarModal} disabled={procesando}>Cancelar</button><button type="button" onClick={() => registrarTurno()} disabled={!paciente || !idProfesional || !horario || procesando}>{procesando ? 'Registrando…' : 'Confirmar turno'}</button></div>
      </div>}

      {modal === 'reprogramar' && turnoSeleccionado && <form onSubmit={reprogramarTurno}>
        <p className="admin-appointments-eyebrow">REPROGRAMAR TURNO</p><h2 id="admin-modal-heading">Elegí un nuevo horario</h2><p>Paciente: {turnoSeleccionado.paciente?.usuario?.nombre} {turnoSeleccionado.paciente?.usuario?.apellido}</p><p>Horario actual: {fechaLegible(turnoSeleccionado.fechaHora)} a las {horaLegible(turnoSeleccionado.fechaHora)}</p>
        {error && <p className="admin-appointments-form-error" role="alert">{error}</p>}
        <CalendarioTurnos key={`reprogramar-${turnoSeleccionado.idTurno}`} idProfesional={turnoSeleccionado.idProfesional} seleccionado={horario} onSeleccionar={setHorario} />
        <div className="admin-appointments-modal-actions"><button type="button" className="admin-appointments-secondary" onClick={cerrarModal} disabled={procesando}>Volver</button><button type="submit" disabled={!horario || procesando}>{procesando ? 'Reprogramando…' : 'Confirmar reprogramación'}</button></div>
      </form>}

      {modal === 'cancelar' && turnoSeleccionado && <form onSubmit={cancelarTurno}>
        <p className="admin-appointments-eyebrow">CANCELAR TURNO</p><h2 id="admin-modal-heading">¿Eliminar este turno?</h2><p>Se cancelará el turno de {turnoSeleccionado.paciente?.usuario?.nombre} {turnoSeleccionado.paciente?.usuario?.apellido} del {fechaLegible(turnoSeleccionado.fechaHora)} a las {horaLegible(turnoSeleccionado.fechaHora)}.</p>
        {error && <p className="admin-appointments-form-error" role="alert">{error}</p>}
        <label className="admin-appointments-reason-label">Motivo (opcional)<textarea value={motivoCancelacion} onChange={(event) => setMotivoCancelacion(event.target.value)} maxLength={500} rows={3} placeholder="Ingresá el motivo de cancelación" /></label>
        <div className="admin-appointments-modal-actions"><button type="button" className="admin-appointments-secondary" onClick={cerrarModal} disabled={procesando}>Volver</button><button type="submit" className="admin-appointments-danger" disabled={procesando}>{procesando ? 'Cancelando…' : 'Sí, eliminar turno'}</button></div>
      </form>}
    </section></div>}
  </main>
}

export default GestionTurnos
