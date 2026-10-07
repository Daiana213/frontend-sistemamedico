import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import '../styles/AgendaProfesional.css'

const ESTADOS = [
  { value: 'SOLICITADO', label: 'Solicitado' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'REPROGRAMADO', label: 'Reprogramado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'COMPLETADO', label: 'Completado' },
]

function fechaLocal(fecha = new Date()) {
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fechaLegible(fecha) {
  const valor = new Date(`${fecha}T12:00:00`)
  const texto = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(valor)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function horaLegible(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(fechaHora))
}

function textoEstado(estado) {
  return ESTADOS.find((opcion) => opcion.value === estado)?.label || estado
}

function AgendaProfesional() {
  const { idTurno } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const hoy = fechaLocal()
  const fechaAtencion = searchParams.get('fecha') || hoy
  const turnoDesdeNavegacion = location.state?.turno
  const [pestana, setPestana] = useState('agenda')
  const [pestanaAtencion, setPestanaAtencion] = useState('ficha')
  const [fecha, setFecha] = useState(hoy)
  const [estado, setEstado] = useState('')
  const [rango, setRango] = useState({ desde: hoy, hasta: hoy })
  const [rangoAplicado, setRangoAplicado] = useState({ desde: hoy, hasta: hoy })
  const [turnos, setTurnos] = useState([])
  const [profesional, setProfesional] = useState(null)
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [consultasPaciente, setConsultasPaciente] = useState([])
  const [consultaForm, setConsultaForm] = useState({ motivoConsulta: '', diagnostico: '', tratamiento: '', notasAdicionales: '' })
  const [guardandoConsulta, setGuardandoConsulta] = useState(false)
  const [mensajeConsulta, setMensajeConsulta] = useState('')
  const [errorConsulta, setErrorConsulta] = useState('')
  const [cargandoHistoria, setCargandoHistoria] = useState(false)
  const [turnoConsultaRegistrada, setTurnoConsultaRegistrada] = useState(null)

  const estaEnAtencion = Boolean(idTurno)
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    let cancelado = false
    const cargarTurnos = async () => {
      if (pestana === 'registrar') return
      setCargando(true)
      setError('')
      try {
        let params
        if (estaEnAtencion) {
          params = { fecha: fechaAtencion }
        } else if (pestana === 'historial') {
          params = { fechaInicio: rangoAplicado.desde, fechaFin: rangoAplicado.hasta }
          if (estado) params.estado = estado
        } else {
          params = { fecha }
          if (estado) params.estado = estado
        }
        const { data } = await api.get('/profesionales/me/turnos', { params })
        if (!cancelado) {
          setTurnos(Array.isArray(data.turnos) ? data.turnos : [])
          setProfesional(data.profesional || null)
          setTotal(Number(data.resumen?.totalTurnos ?? data.turnos?.length ?? 0))
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.response?.data?.error || 'No pudimos cargar la agenda. Intentá nuevamente.')
          setTurnos([])
          setTotal(0)
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargarTurnos()
    return () => { cancelado = true }
  }, [pestana, fecha, estado, rangoAplicado, estaEnAtencion, fechaAtencion])

  const turnoSeleccionado = turnoDesdeNavegacion || turnos.find((turno) => String(turno.idTurno) === idTurno)

  useEffect(() => {
    if (!estaEnAtencion || !turnoSeleccionado?.paciente?.idPaciente) return
    let cancelado = false
    setCargandoHistoria(true)
    api.get('/turnos')
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data : data.turnos || []
        const consultas = lista
          .filter((turno) => turno.paciente?.idPaciente === turnoSeleccionado.paciente.idPaciente && turno.consulta)
          .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
        if (!cancelado) setConsultasPaciente(consultas)
      })
      .catch(() => { if (!cancelado) setConsultasPaciente([]) })
      .finally(() => { if (!cancelado) setCargandoHistoria(false) })
    return () => { cancelado = true }
  }, [estaEnAtencion, turnoSeleccionado?.paciente?.idPaciente])

  const registrarConsulta = async (event) => {
    event.preventDefault()
    setGuardandoConsulta(true)
    setErrorConsulta('')
    setMensajeConsulta('')
    try {
      await api.post('/consultas', { idTurno: Number(idTurno), ...consultaForm })
      setTurnoConsultaRegistrada(String(idTurno))
      setMensajeConsulta('Consulta registrada con éxito.')
      setConsultaForm({ motivoConsulta: '', diagnostico: '', tratamiento: '', notasAdicionales: '' })
      try {
        const { data } = await api.get('/turnos')
        const lista = Array.isArray(data) ? data : data.turnos || []
        setConsultasPaciente(lista
          .filter((turno) => turno.paciente?.idPaciente === turnoSeleccionado.paciente.idPaciente && turno.consulta)
          .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora)))
      } catch {
        setErrorConsulta('La consulta quedó guardada, pero no se pudo actualizar la historia clínica. Recargá la página para verla.')
      }
    } catch (err) {
      setErrorConsulta(err.response?.data?.error || 'No se pudo registrar la consulta. Intentá nuevamente.')
    } finally {
      setGuardandoConsulta(false)
    }
  }

  const cambiarDia = (cantidad) => {
    const nuevoDia = new Date(`${fecha}T12:00:00`)
    nuevoDia.setDate(nuevoDia.getDate() + cantidad)
    setFecha(fechaLocal(nuevoDia))
  }

  const mostrarTurno = (turno) => {
    navigate(`/agenda/turnos/${turno.idTurno}?fecha=${fecha}`, { state: { turno } })
  }

  const aplicarRango = (event) => {
    event.preventDefault()
    setRangoAplicado(rango)
  }

  const cerrarSesion = () => {
    localStorage.clear()
    navigate('/')
  }

  const irAPestana = (nombre) => {
    navigate('/agenda')
    setPestana(nombre)
    setEstado('')
  }

  const nombreProfesional = profesional?.nombreCompleto || 'profesional'

  if (estaEnAtencion) {
    return (
      <main className="agenda-page">
        <header className="agenda-topbar"><Link className="agenda-brand" to="/agenda"><span className="agenda-brand-mark">+</span> Sanatorio Antonia</Link><button className="agenda-logout" onClick={cerrarSesion}>Cerrar sesión</button></header>
        <section className="agenda-content">
          <button className="agenda-back" onClick={() => { setPestana('agenda'); navigate('/agenda') }}>← Volver a la agenda</button>
          {cargando && !turnoSeleccionado ? <div className="agenda-state">Cargando turno…</div> : error ? <div className="agenda-state agenda-state--error">{error}</div> : !turnoSeleccionado ? <div className="agenda-state">No encontramos ese turno para la fecha seleccionada.</div> : <>
            <div className="agenda-page-heading agenda-detail-heading"><div><p className="agenda-overline">ATENCIÓN DEL PACIENTE</p><h1>{turnoSeleccionado.paciente.nombreCompleto}</h1><p>DNI {turnoSeleccionado.paciente.dni} · {fechaLegible(fechaAtencion)} · {horaLegible(turnoSeleccionado.fechaHora)}</p></div><span className={`agenda-status agenda-status--${turnoSeleccionado.estado.toLowerCase()}`}>{textoEstado(turnoSeleccionado.estado)}</span></div>
            <nav className="agenda-tabs agenda-detail-tabs" aria-label="Atención del turno">
              <button className={pestanaAtencion === 'ficha' ? 'is-active' : ''} onClick={() => setPestanaAtencion('ficha')}>Antecedentes e historia clínica</button>
              <button className={pestanaAtencion === 'consulta' ? 'is-active' : ''} onClick={() => setPestanaAtencion('consulta')}>Registrar consulta</button>
            </nav>
            {pestanaAtencion === 'ficha' ? <section className="agenda-card agenda-patient-card">
              <h2>Datos disponibles del paciente</h2>
              <dl className="agenda-patient-data"><div><dt>Documento</dt><dd>{turnoSeleccionado.paciente.dni}</dd></div><div><dt>Teléfono</dt><dd>{turnoSeleccionado.paciente.telefono || 'Sin teléfono informado'}</dd></div><div><dt>Obra social y plan</dt><dd>{turnoSeleccionado.paciente.planObraSocial}</dd></div><div><dt>Motivo de cancelación</dt><dd>{turnoSeleccionado.motivoCancelacion || '—'}</dd></div></dl>
              <h2>Consultas anteriores</h2>
              {cargandoHistoria ? <p className="agenda-description">Cargando historia clínica…</p> : consultasPaciente.length ? <div className="agenda-consult-history">{consultasPaciente.map((item) => <article key={item.idTurno} className="agenda-consult-entry"><p>{fechaLegible(fechaLocal(new Date(item.fechaHora)))} · {horaLegible(item.fechaHora)}</p><strong>{item.consulta.motivoConsulta}</strong><dl><div><dt>Diagnóstico</dt><dd>{item.consulta.diagnostico}</dd></div><div><dt>Tratamiento</dt><dd>{item.consulta.tratamiento}</dd></div>{item.consulta.notasAdicionales && <div><dt>Notas</dt><dd>{item.consulta.notasAdicionales}</dd></div>}</dl></article>)}</div> : <p className="agenda-description">No hay consultas previas registradas para este paciente. Los antecedentes y estudios aún no están disponibles en la API para la ficha profesional.</p>}
            </section> : <section className="agenda-card agenda-patient-card">
              <h2>Registrar consulta</h2><p className="agenda-description">Completá la evolución de esta atención. Al finalizar, el turno quedará marcado como completado.</p>
              {turnoConsultaRegistrada === String(idTurno) ? <p className="agenda-consult-success" role="status">Consulta registrada con éxito. Este turno quedó completado.</p> : turnoSeleccionado.estado === 'COMPLETADO' ? <div className="agenda-state">Este turno ya fue atendido.</div> : <form className="agenda-consult-form" onSubmit={registrarConsulta}>
                <label>Motivo de consulta<textarea required value={consultaForm.motivoConsulta} onChange={(event) => setConsultaForm({ ...consultaForm, motivoConsulta: event.target.value })} /></label>
                <label>Diagnóstico o posible diagnóstico<textarea required value={consultaForm.diagnostico} onChange={(event) => setConsultaForm({ ...consultaForm, diagnostico: event.target.value })} /></label>
                <label>Tratamiento y recomendaciones<textarea required value={consultaForm.tratamiento} onChange={(event) => setConsultaForm({ ...consultaForm, tratamiento: event.target.value })} /></label>
                <label>Notas adicionales (opcional)<textarea value={consultaForm.notasAdicionales} onChange={(event) => setConsultaForm({ ...consultaForm, notasAdicionales: event.target.value })} /></label>
                {errorConsulta && <p className="agenda-state agenda-state--error">{errorConsulta}</p>}{mensajeConsulta && <p className="agenda-consult-success" role="status">{mensajeConsulta}</p>}
                <button className="agenda-primary-button" disabled={guardandoConsulta}>{guardandoConsulta ? 'Guardando…' : 'Finalizar consulta'}</button>
              </form>}
            </section>}
          </>}
        </section>
      </main>
    )
  }

  return (
    <main className="agenda-page">
      <header className="agenda-topbar"><Link className="agenda-brand" to="/agenda"><span className="agenda-brand-mark">+</span> Sanatorio Antonia</Link><div className="agenda-topbar-actions"><div className="agenda-user-label">{profesional?.matricula ? `Matrícula ${profesional.matricula}` : 'Portal profesional'}</div><button className="agenda-logout" onClick={cerrarSesion}>Cerrar sesión</button></div></header>
      <section className="agenda-content">
        <div className="agenda-page-heading"><div><p className="agenda-overline">PORTAL PROFESIONAL</p><h1>{saludo}, {nombreProfesional}</h1><p>{fechaLegible(hoy)}</p></div><div className="agenda-heading-mark" aria-hidden="true">✚</div></div>

        <nav className="agenda-tabs" aria-label="Secciones de agenda">
          <button className={pestana === 'agenda' ? 'is-active' : ''} onClick={() => irAPestana('agenda')}>Agenda diaria</button>
          <button className={pestana === 'historial' ? 'is-active' : ''} onClick={() => irAPestana('historial')}>Historial de turnos</button>
          <button className={pestana === 'registrar' ? 'is-active' : ''} onClick={() => irAPestana('registrar')}>Registrar turno</button>
        </nav>

        {pestana === 'agenda' && <>
          <section className="agenda-toolbar"><div className="agenda-date-control"><button aria-label="Día anterior" onClick={() => cambiarDia(-1)}>‹</button><label htmlFor="agenda-fecha">Día<input id="agenda-fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></label><button aria-label="Día siguiente" onClick={() => cambiarDia(1)}>›</button><button className="agenda-today" onClick={() => setFecha(hoy)}>Hoy</button></div><label className="agenda-filter">Estado<select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="">Todos los estados</option>{ESTADOS.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</select></label></section>
          <div className="agenda-list-heading"><div><h2>{fecha === hoy ? 'Turnos de hoy' : fechaLegible(fecha)}</h2><p>{total} {total === 1 ? 'turno' : 'turnos'}{estado ? ` · ${textoEstado(estado).toLowerCase()}` : ''}</p></div></div>
          <TurnosList turnos={turnos} cargando={cargando} error={error} onSelect={mostrarTurno} />
        </>}

        {pestana === 'historial' && <>
          <section className="agenda-toolbar agenda-history-toolbar"><div><h2>Historial de turnos</h2><p>Consultá la agenda de un período y filtrá por estado.</p></div><form className="agenda-history-filter" onSubmit={aplicarRango}><label>Desde<input type="date" required value={rango.desde} onChange={(event) => setRango({ ...rango, desde: event.target.value })} /></label><label>Hasta<input type="date" required min={rango.desde} value={rango.hasta} onChange={(event) => setRango({ ...rango, hasta: event.target.value })} /></label><label>Estado<select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="">Todos</option>{ESTADOS.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</select></label><button className="agenda-primary-button">Buscar</button></form></section>
          <p className="agenda-range-caption">{fechaLegible(rangoAplicado.desde)} — {fechaLegible(rangoAplicado.hasta)} · {total} {total === 1 ? 'turno' : 'turnos'}</p>
          <TurnosList turnos={turnos} cargando={cargando} error={error} onSelect={(turno) => { setFecha(fechaLocal(new Date(turno.fechaHora))); navigate(`/agenda/turnos/${turno.idTurno}?fecha=${fechaLocal(new Date(turno.fechaHora))}`, { state: { turno } }) }} />
        </>}

        {pestana === 'registrar' && <section className="agenda-card agenda-registration-pending"><div className="agenda-pending-icon">↗</div><p className="agenda-overline">HU9 · REGISTRO DESDE EL PROFESIONAL</p><h2>Registrar turno para un paciente</h2><p>La opción queda separada como sección propia de la agenda. El endpoint actual de creación requiere el identificador interno del paciente; todavía no hay una operación para buscarlo por DNI ni para consultar los horarios disponibles.</p><p>Cuando backend publique esa búsqueda y disponibilidad, conectamos acá el formulario y la confirmación de turno.</p></section>}
      </section>
    </main>
  )
}

function TurnosList({ turnos, cargando, error, onSelect }) {
  if (cargando) return <div className="agenda-state">Cargando turnos…</div>
  if (error) return <div className="agenda-state agenda-state--error">{error}</div>
  if (!turnos.length) return <div className="agenda-state agenda-state--empty"><span>☼</span><strong>No hay turnos para mostrar</strong><p>Probá cambiar la fecha o el estado seleccionado.</p></div>

  return <section className="agenda-appointments" aria-label="Listado de turnos">
    {turnos.map((turno) => <button className="agenda-appointment" key={turno.idTurno} onClick={() => onSelect(turno)}>
      <span className="appointment-time">{horaLegible(turno.fechaHora)}</span>
      <span className="appointment-main"><strong>{turno.paciente.nombreCompleto}</strong><small>DNI {turno.paciente.dni} · {turno.paciente.planObraSocial}</small></span>
      <span className={`agenda-status agenda-status--${turno.estado.toLowerCase()}`}>{textoEstado(turno.estado)}</span>
      <span className="appointment-open">Ver atención <span aria-hidden="true">→</span></span>
    </button>)}
  </section>
}

export default AgendaProfesional
