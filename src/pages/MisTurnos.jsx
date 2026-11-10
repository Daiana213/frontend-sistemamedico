import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
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
const CLAVE_REPROGRAMACIONES = 'misTurnosReprogramados'

function leerRelacionesReprogramacion() {
  try {
    const relaciones = JSON.parse(localStorage.getItem(CLAVE_REPROGRAMACIONES) || '{}')
    return relaciones && typeof relaciones === 'object' ? relaciones : {}
  } catch {
    return {}
  }
}

function actualizarRelacionesReprogramacion(idAnterior, idNuevo) {
  const relaciones = leerRelacionesReprogramacion()
  Object.keys(relaciones).forEach((id) => {
    if (String(relaciones[id]) === String(idAnterior)) relaciones[id] = idNuevo
  })
  relaciones[idAnterior] = idNuevo
  localStorage.setItem(CLAVE_REPROGRAMACIONES, JSON.stringify(relaciones))
}

function unificarTurnosReprogramados(lista) {
  const relaciones = leerRelacionesReprogramacion()
  const idsAnteriores = new Set(Object.keys(relaciones).map(String))
  const idsReprogramados = new Set(Object.values(relaciones).map(String))
  return lista
    .filter((turno) => !idsAnteriores.has(String(turno.idTurno)))
    .map((turno) => idsReprogramados.has(String(turno.idTurno))
      ? { ...turno, estadoVisual: 'REPROGRAMADO' }
      : turno)
}

function formatoFecha(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(fechaHora))
}

function formatoHora(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(fechaHora))
}

function mensajeErrorTurno(error, fallback = 'No se pudo completar la operación. Intentá nuevamente.') {
  const mensaje = error.response?.data?.error || error.response?.data?.message
  if (mensaje && /dos turnos activos con este profesional/i.test(mensaje)) {
    return 'Ya tenés 2 turnos activos con este profesional. Cancelá uno o elegí otro profesional para solicitar un nuevo turno.'
  }
  return mensaje || fallback
}

export default function MisTurnos() {
  const location = useLocation()
  const navigate = useNavigate()
  const esPaginaSolicitud = location.pathname === '/solicitar-turno'
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [resumenSolicitud, setResumenSolicitud] = useState(null)
  const [perfilIncompleto, setPerfilIncompleto] = useState(false)
  const [turnoAReprogramar, setTurnoAReprogramar] = useState(null)
  const [nuevoHorario, setNuevoHorario] = useState('')
  const [solicitudAbierta, setSolicitudAbierta] = useState(false)
  const [especialidades, setEspecialidades] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [idObraSocialPaciente, setIdObraSocialPaciente] = useState(null)
  const [soloProfesionalesConConvenio, setSoloProfesionalesConConvenio] = useState(false)
  const [idEspecialidad, setIdEspecialidad] = useState('')
  const [idProfesionalNuevo, setIdProfesionalNuevo] = useState('')
  const [simulacionCobertura, setSimulacionCobertura] = useState(null)
  const [cargandoSimulacion, setCargandoSimulacion] = useState(false)
  const [aceptaAvisoCobertura, setAceptaAvisoCobertura] = useState(false)
  const [requisitosAbiertos, setRequisitosAbiertos] = useState({})
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [turnoACancelar, setTurnoACancelar] = useState(null)

  const cargarTurnos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/turnos')
      setTurnos(unificarTurnosReprogramados(Array.isArray(data) ? data : data.turnos || []))
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar tus turnos. Intentá nuevamente.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarTurnos() }, [cargarTurnos])

  useEffect(() => {
    api.get('/pacientes/perfil')
      .then(({ data }) => {
        setPerfilIncompleto(!data.perfilCompleto)
        setIdObraSocialPaciente(data.paciente?.plan?.idObraSocial || null)
      })
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

  useEffect(() => {
    if (!solicitudAbierta || !idProfesionalNuevo) {
      setSimulacionCobertura(null)
      setCargandoSimulacion(false)
      setAceptaAvisoCobertura(false)
      return undefined
    }

    let cancelado = false
    setSimulacionCobertura(null)
    setAceptaAvisoCobertura(false)
    setError('')
    setCargandoSimulacion(true)
    api.get('/turnos/simular-cobertura', {
      params: { idProfesional: Number(idProfesionalNuevo) },
    })
      .then(({ data }) => {
        if (!cancelado) setSimulacionCobertura(data)
      })
      .catch((err) => {
        if (!cancelado) {
          setError(err.response?.data?.message || err.response?.data?.error || 'No se pudo verificar la cobertura para este profesional.')
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoSimulacion(false)
      })

    return () => { cancelado = true }
  }, [solicitudAbierta, idProfesionalNuevo])

  const manejarError = (err) => {
    if (err.response?.data?.details?.requiereCompletarPerfil) {
      setPerfilIncompleto(true)
      setTurnoAReprogramar(null)
      setSolicitudAbierta(false)
      return
    }
    setError(mensajeErrorTurno(err))
  }

  const cambiarFiltroConvenio = (event) => {
    const activar = event.target.checked
    setSoloProfesionalesConConvenio(activar)
    if (activar) {
      const seleccionado = profesionales.find((profesional) => String(profesional.idProfesional) === String(idProfesionalNuevo))
      const atiendeObraSocial = seleccionado?.obrasSocialesDetalle?.some(
        (obraSocial) => Number(obraSocial.idObraSocial) === Number(idObraSocialPaciente)
      )
      if (!atiendeObraSocial) setIdProfesionalNuevo('')
    }
  }

  const abrirSolicitud = async () => {
    setError('')
    setMensaje('')
    setResumenSolicitud(null)
    if (perfilIncompleto) {
      setPerfilIncompleto(true)
      return
    }
    if (!esPaginaSolicitud) navigate('/solicitar-turno', { replace: true })
    setSolicitudAbierta(true)
    setIdEspecialidad('')
    setIdProfesionalNuevo('')
    setNuevoHorario('')
    setCargandoCatalogo(true)
    try {
      const { data } = await api.get('/especialidades')
      setEspecialidades(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(mensajeErrorTurno(err, 'No se pudieron cargar las especialidades.'))
    } finally {
      setCargandoCatalogo(false)
    }
  }

  useEffect(() => {
    if (esPaginaSolicitud && !solicitudAbierta && !perfilIncompleto) abrirSolicitud()
  }, [esPaginaSolicitud, solicitudAbierta, perfilIncompleto])

  const cerrarSolicitud = () => {
    setSolicitudAbierta(false)
    if (esPaginaSolicitud) navigate('/dashboard')
  }

  const confirmarSolicitud = async () => {
    if (!idProfesionalNuevo || !nuevoHorario) return
    const requiereConfirmacionCobertura = simulacionCobertura && (
      !simulacionCobertura.atiendeObraSocial || simulacionCobertura.requiereAviso
    )
    if (requiereConfirmacionCobertura && !aceptaAvisoCobertura) return
    setError('')
    setMensaje('')
    setProcesando(true)
    try {
      const { data } = await api.post('/turnos', {
        idProfesional: Number(idProfesionalNuevo),
        fechaHora: nuevoHorario,
      })
      setMensaje(data.mensaje || 'Tu turno fue registrado correctamente.')
      const cobertura = data.coberturaSimulada || data.turno?.coberturaSimulada || simulacionCobertura
      setResumenSolicitud({
        modalidadAtencion: data.modalidadAtencion || cobertura?.modalidadAtencion,
        aviso: data.avisoCobertura || cobertura?.aviso,
        requisitosConsulta: data.requisitosConsulta || cobertura?.requisitosConsulta || [],
      })
      if (esPaginaSolicitud) navigate('/mis-turnos')
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
    setError('')
    setTurnoACancelar(turno)
  }

  const confirmarCancelacion = async () => {
    if (!turnoACancelar) return
    setError('')
    setMensaje('')
    setResumenSolicitud(null)
    setProcesando(true)
    try {
      const { data } = await api.post(`/turnos/${turnoACancelar.idTurno}/cancelar`)
      setMensaje(data.mensaje || 'Tu turno fue cancelado correctamente.')
      setTurnoACancelar(null)
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
    setResumenSolicitud(null)
    setProcesando(true)
    try {
      const { data } = await api.post(`/turnos/${turnoAReprogramar.idTurno}/reprogramar`, { fechaHora: nuevoHorario })
      const idNuevo = data.turno?.idTurno || data.nuevoTurno?.idTurno
      if (idNuevo) actualizarRelacionesReprogramacion(turnoAReprogramar.idTurno, idNuevo)
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

  const profesionalesVisibles = soloProfesionalesConConvenio
    ? profesionales.filter((profesional) => profesional.obrasSocialesDetalle?.some(
      (obraSocial) => Number(obraSocial.idObraSocial) === Number(idObraSocialPaciente)
    ))
    : profesionales
  const cantidadTurnosProfesionalSeleccionado = turnos.filter((turno) =>
    Number(turno.idProfesional) === Number(idProfesionalNuevo) && ACTIVOS.has(String(turno.estado || '').toUpperCase())
  ).length
  const alcanzoLimiteProfesional = cantidadTurnosProfesionalSeleccionado >= 2

  return <main className={`my-appointments-page ${esPaginaSolicitud ? 'my-appointments-page--booking' : ''}`}>
    <header className="my-appointments-header"><Link to="/dashboard">← Volver al panel</Link><img src="/logo-completo.png" alt="Sanatorio Antonia" className="my-appointments-logo" /></header>
    {!esPaginaSolicitud && <section className="my-appointments-content">
      <div className="my-appointments-title"><div><p className="my-appointments-eyebrow">PANEL DEL PACIENTE</p><h1>Mis turnos</h1><p>Consultá el estado y gestioná tus turnos médicos.</p></div><div className="my-appointments-title-actions"><button type="button" className="my-appointments-refresh" onClick={cargarTurnos} disabled={cargando}>Actualizar</button><button type="button" className="request-appointment-button" onClick={abrirSolicitud}>Solicitar turno</button></div></div>
      {mensaje && <div className="my-appointments-success" role="status"><p>{mensaje}</p>{resumenSolicitud?.requisitosConsulta?.length > 0 && <div className="appointment-requirements-summary"><strong>Recordá llevar el día de tu consulta:</strong><ul>{resumenSolicitud.requisitosConsulta.map((requisito, index) => <li key={`${index}-${requisito}`}>{requisito}</li>)}</ul></div>}</div>}
      {error && !solicitudAbierta && !turnoAReprogramar && !turnoACancelar && <div className="my-appointments-error" role="alert"><strong>No se pudo completar la operación</strong><span>{error}</span></div>}
      {cargando ? <div className="my-appointments-empty">Cargando tus turnos…</div> : !turnos.length ? <div className="my-appointments-empty"><strong>Todavía no tenés turnos</strong><p>Cuando solicites uno, vas a poder consultarlo desde acá.</p><button type="button" className="request-appointment-button" onClick={abrirSolicitud}>Solicitar mi primer turno</button></div> : <div className="my-appointments-list">{turnos.map((turno) => {
        const estado = String(turno.estado || '').toUpperCase()
        const estadoVisual = turno.estadoVisual || estado
        const horasRestantes = new Date(turno.fechaHora).getTime() - Date.now()
        const activo = ACTIVOS.has(estado)
        const puedeGestionar = activo && horasRestantes >= PLAZO_CAMBIOS_MS
        const plazoVencido = activo && !puedeGestionar
        const profesional = turno.profesional?.usuario
        const cobertura = turno.coberturaSimulada
        const requisitos = cobertura?.requisitosConsulta || []
        return <article className="my-appointment-card" key={turno.idTurno}>
          <div className="my-appointment-card-main">
            <div className="my-appointment-date"><strong>{formatoFecha(turno.fechaHora)}</strong><span>{formatoHora(turno.fechaHora)}</span></div>
            <div className="my-appointment-info"><h2>{profesional ? `Dr./Dra. ${profesional.nombre} ${profesional.apellido}` : `Turno #${turno.idTurno}`}</h2><p>Consulta médica</p>{turno.motivoCancelacion && <p className="my-appointment-cancel-reason">Motivo: {turno.motivoCancelacion}</p>}</div>
            <span className={`my-appointment-status my-appointment-status--${estadoVisual.toLowerCase()}`}>{ESTADOS[estadoVisual] || estadoVisual}</span>
          </div>
          {activo && cobertura && <div className="appointment-coverage">
            <span className={`appointment-coverage-badge ${cobertura.atiendeObraSocial ? 'appointment-coverage-badge--covered' : 'appointment-coverage-badge--private'}`}>
              {cobertura.atiendeObraSocial ? 'Con cobertura' : 'Atención particular (sin convenio)'}
            </span>
            {cobertura.detalleRequisitos?.copago?.requiere && <span className="appointment-copay">Copago: {cobertura.detalleRequisitos.copago.monto != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cobertura.detalleRequisitos.copago.monto) : 'a confirmar'}</span>}
            {requisitos.length > 0 && <>
              <button type="button" className="appointment-requirements-toggle" aria-expanded={Boolean(requisitosAbiertos[turno.idTurno])} onClick={() => setRequisitosAbiertos((prev) => ({ ...prev, [turno.idTurno]: !prev[turno.idTurno] }))}>
                {requisitosAbiertos[turno.idTurno] ? 'Ocultar requisitos' : 'Ver qué llevar a la consulta'}
              </button>
              {requisitosAbiertos[turno.idTurno] && <ul className="appointment-requirements-list">{requisitos.map((requisito, index) => <li key={`${index}-${requisito}`}>{requisito}</li>)}</ul>}
            </>}
          </div>}
          {activo && horasRestantes > 0 && <p className="my-appointment-reminder" role="status">
            {horasRestantes >= PLAZO_CAMBIOS_MS
              ? 'Te enviaremos un recordatorio por email 24 horas antes de tu turno.'
              : 'Como faltan menos de 24 horas para el turno, no se enviará un recordatorio adicional.'}
          </p>}
          {puedeGestionar && <div className="my-appointment-actions"><button type="button" onClick={() => cancelarTurno(turno)} disabled={procesando}>Cancelar</button><button type="button" onClick={() => { setError(''); setNuevoHorario(''); setTurnoAReprogramar(turno) }} disabled={procesando}>Reprogramar</button></div>}
          {plazoVencido && <p className="my-appointment-deadline">El plazo para cancelar o reprogramar este turno venció. Se requieren al menos 24 horas de anticipación.</p>}
        </article>
      })}</div>}
    </section>}
    {turnoACancelar && <div className="my-appointments-backdrop" role="presentation"><section className="rebook-modal cancel-appointment-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-heading"><p className="my-appointments-eyebrow">CANCELAR TURNO</p><h2 id="cancel-heading">¿Querés cancelar este turno?</h2><p>El turno del {formatoFecha(turnoACancelar.fechaHora)} a las {formatoHora(turnoACancelar.fechaHora)} se cancelará.</p>{error && <div className="booking-form-error" role="alert"><strong>No se pudo cancelar el turno</strong><span>{error}</span></div>}<div className="rebook-actions"><button type="button" className="rebook-cancel" onClick={() => setTurnoACancelar(null)} disabled={procesando}>Volver</button><button type="button" className="cancel-confirm-button" onClick={confirmarCancelacion} disabled={procesando}>{procesando ? 'Cancelando…' : 'Sí, cancelar turno'}</button></div></section></div>}
    {solicitudAbierta && <div className="my-appointments-backdrop" role="presentation"><section className="rebook-modal" role="dialog" aria-modal="true" aria-labelledby="request-heading"><button type="button" className="rebook-close" aria-label="Cerrar" onClick={cerrarSolicitud}><X size={18} /></button><p className="my-appointments-eyebrow">NUEVO TURNO</p><h2 id="request-heading">Solicitar un turno</h2><p>Elegí una especialidad, un profesional y un horario disponible.</p>{error && <div className="booking-form-error" role="alert"><strong>No se pudo solicitar el turno</strong><span>{error}</span></div>}<div className="booking-selectors"><label>Especialidad<select value={idEspecialidad} onChange={(event) => setIdEspecialidad(event.target.value)} disabled={cargandoCatalogo}><option value="">{cargandoCatalogo ? 'Cargando…' : 'Seleccionar especialidad'}</option>{especialidades.map((especialidad) => <option key={especialidad.idEspecialidad} value={especialidad.idEspecialidad}>{especialidad.nombre}</option>)}</select></label><label>Profesional<select value={idProfesionalNuevo} onChange={(event) => { setIdProfesionalNuevo(event.target.value); setNuevoHorario('') }} disabled={!idEspecialidad || cargandoCatalogo}><option value="">{cargandoCatalogo && idEspecialidad ? 'Cargando…' : profesionalesVisibles.length ? 'Seleccionar profesional' : soloProfesionalesConConvenio ? 'No hay profesionales con convenio' : idEspecialidad ? 'No hay profesionales disponibles' : 'Seleccioná una especialidad primero'}</option>{profesionalesVisibles.map((profesional) => <option key={profesional.idProfesional} value={profesional.idProfesional}>{profesional.nombreCompleto}{profesional.matricula ? ` · Matrícula ${profesional.matricula}` : ''}</option>)}</select></label></div><label className="coverage-filter"><input type="checkbox" checked={soloProfesionalesConConvenio} onChange={cambiarFiltroConvenio} disabled={!idObraSocialPaciente || !idEspecialidad || cargandoCatalogo} /><span>Mostrar solo profesionales que atienden mi obra social</span></label>{!idObraSocialPaciente && <p className="coverage-filter-note">No tenés una obra social asociada al perfil. Podés elegir cualquier profesional.</p>}{soloProfesionalesConConvenio && profesionalesVisibles.length === 0 && <p className="coverage-filter-note" role="status">No encontramos profesionales con convenio para esta especialidad.</p>}{idProfesionalNuevo && alcanzoLimiteProfesional && <div className="booking-form-error" role="alert"><strong>Ya alcanzaste el límite de turnos</strong><span>Tenés 2 turnos activos con este profesional. Cancelá uno o elegí otro profesional para solicitar un nuevo turno.</span></div>}{idProfesionalNuevo && (cargandoSimulacion ? <div className="coverage-loading" role="status">Consultando cobertura y requisitos…</div> : simulacionCobertura && <section className={`coverage-simulation ${simulacionCobertura.requiereAviso || !simulacionCobertura.atiendeObraSocial ? 'coverage-simulation--warning' : 'coverage-simulation--confirmed'}`} aria-live="polite"><p className="coverage-simulation-message">{simulacionCobertura.aviso}</p>{simulacionCobertura.profesional?.obrasSocialesAtendidas?.length > 0 && <p className="coverage-professional-list"><strong>Obras sociales que atiende:</strong> {simulacionCobertura.profesional.obrasSocialesAtendidas.map((obra) => obra.nombre || obra).join(', ')}</p>}<strong>¿Qué debo llevar a la consulta?</strong><ul>{(simulacionCobertura.requisitosConsulta || []).map((requisito, index) => <li key={`${index}-${requisito}`}>{requisito}</li>)}</ul>{(!simulacionCobertura.atiendeObraSocial || simulacionCobertura.requiereAviso) && <label className="coverage-acceptance"><input type="checkbox" checked={aceptaAvisoCobertura} onChange={(event) => setAceptaAvisoCobertura(event.target.checked)} />{simulacionCobertura.modalidadAtencion === 'PARTICULAR_SIN_CONVENIO' ? 'Entiendo que el turno se solicitará como atención particular.' : 'Leí el aviso de cobertura y deseo continuar con la solicitud.'}</label>}</section>)}{idProfesionalNuevo && !cargandoSimulacion && !simulacionCobertura && <p className="booking-form-error" role="alert">No pudimos verificar la cobertura. Revisá tu conexión e intentá seleccionar nuevamente al profesional.</p>}{idProfesionalNuevo && <CalendarioTurnos idProfesional={Number(idProfesionalNuevo)} seleccionado={nuevoHorario} onSeleccionar={setNuevoHorario} />}{alcanzoLimiteProfesional && <p className="coverage-filter-note" role="status">Podés continuar con otro profesional o cancelar uno de los turnos actuales.</p>}<div className="rebook-actions"><button type="button" className="rebook-cancel" onClick={cerrarSolicitud} disabled={procesando}>Volver</button><button type="button" onClick={confirmarSolicitud} disabled={!idProfesionalNuevo || !nuevoHorario || procesando || cargandoSimulacion || !simulacionCobertura || alcanzoLimiteProfesional || ((!simulacionCobertura.atiendeObraSocial || simulacionCobertura.requiereAviso) && !aceptaAvisoCobertura)}>{procesando ? 'Solicitando…' : 'Confirmar turno'}</button></div></section></div>}
    {turnoAReprogramar && <div className="my-appointments-backdrop" role="presentation"><section className="rebook-modal" role="dialog" aria-modal="true" aria-labelledby="rebook-heading"><button type="button" className="rebook-close" aria-label="Cerrar" onClick={() => setTurnoAReprogramar(null)}><X size={18} /></button><p className="my-appointments-eyebrow">REPROGRAMAR TURNO</p><h2 id="rebook-heading">Elegí una nueva fecha y hora</h2><p>Turno actual: {formatoFecha(turnoAReprogramar.fechaHora)} a las {formatoHora(turnoAReprogramar.fechaHora)}</p>{error && <div className="booking-form-error" role="alert"><strong>No se pudo reprogramar el turno</strong><span>{error}</span></div>}<CalendarioTurnos idProfesional={turnoAReprogramar.idProfesional} seleccionado={nuevoHorario} onSeleccionar={setNuevoHorario} /><div className="rebook-actions"><button type="button" className="rebook-cancel" onClick={() => setTurnoAReprogramar(null)} disabled={procesando}>Volver</button><button type="button" onClick={confirmarReprogramacion} disabled={!nuevoHorario || procesando}>{procesando ? 'Guardando…' : 'Confirmar reprogramación'}</button></div></section></div>}
    <CompletarPerfil abierto={perfilIncompleto} alCompletar={(paciente) => { setPerfilIncompleto(false); setIdObraSocialPaciente(paciente?.plan?.idObraSocial || null); cargarTurnos() }} />
  </main>
}
