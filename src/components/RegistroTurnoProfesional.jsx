import { useEffect, useState } from 'react'
import api from '../api/axios'

function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function mostrarError(error, alternativa) {
  return error.response?.data?.error || error.response?.data?.mensaje || alternativa
}

function RegistroTurnoProfesional({ onTurnoRegistrado }) {
  const hoy = fechaLocal()
  const [dni, setDni] = useState('')
  const [paciente, setPaciente] = useState(null)
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [fecha, setFecha] = useState(hoy)
  const [horarios, setHorarios] = useState([])
  const [horarioSeleccionado, setHorarioSeleccionado] = useState('')
  const [versionDisponibilidad, setVersionDisponibilidad] = useState(0)
  const [cargandoHorarios, setCargandoHorarios] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    setHorarios([])
    setHorarioSeleccionado('')
    setCargandoHorarios(true)
    setError('')

    api.get('/profesionales/me/disponibilidad', { params: { fecha } })
      .then(({ data }) => {
        if (!cancelado) setHorarios(Array.isArray(data.turnosDisponibles) ? data.turnosDisponibles : [])
      })
      .catch((err) => {
        if (!cancelado) setError(mostrarError(err, 'No se pudo cargar la disponibilidad para esa fecha.'))
      })
      .finally(() => { if (!cancelado) setCargandoHorarios(false) })

    return () => { cancelado = true }
  }, [fecha, versionDisponibilidad])

  const buscarPaciente = async (event) => {
    event.preventDefault()
    setError('')
    setPaciente(null)
    if (!/^\d{7,8}$/.test(dni)) {
      setError('Ingresá un DNI válido de 7 u 8 números.')
      return
    }

    setBuscandoPaciente(true)
    try {
      const { data } = await api.get('/pacientes/buscar', { params: { dni } })
      setPaciente(data)
    } catch (err) {
      setError(mostrarError(err, 'No se encontró un paciente con ese DNI.'))
    } finally {
      setBuscandoPaciente(false)
    }
  }

  const confirmarTurno = async (event) => {
    event.preventDefault()
    if (!paciente?.idPaciente || !horarioSeleccionado) return

    setError('')
    setGuardando(true)
    try {
      const fechaHora = new Date(`${fecha}T${horarioSeleccionado}:00-03:00`).toISOString()
      await api.post('/profesionales/me/turnos', { idPaciente: paciente.idPaciente, fechaHora })
      onTurnoRegistrado?.(fecha)
    } catch (err) {
      setError(mostrarError(err, 'No se pudo registrar el turno. Actualizá la disponibilidad e intentá nuevamente.'))
    } finally {
      setGuardando(false)
    }
  }

  return <section className="agenda-card agenda-registration-card">
    <p className="agenda-overline">NUEVO TURNO</p>
    <h2>Registrar turno para un paciente</h2>
    <p className="agenda-description">Buscá al paciente por DNI, elegí una fecha y confirmá uno de los horarios disponibles de tu agenda.</p>

    {error && <p className="agenda-state agenda-state--error agenda-registration-message" role="alert">{error}</p>}

    <form className="agenda-patient-search" onSubmit={buscarPaciente}>
      <label htmlFor="registro-paciente-dni">DNI del paciente</label>
      <div className="agenda-patient-search-row">
        <input id="registro-paciente-dni" inputMode="numeric" autoComplete="off" maxLength={8} value={dni} onChange={(event) => { setDni(event.target.value.replace(/\D/g, '')); setPaciente(null); setError('') }} placeholder="Ej.: 30123456" />
        <button className="agenda-primary-button" type="submit" disabled={buscandoPaciente}>{buscandoPaciente ? 'Buscando…' : 'Buscar paciente'}</button>
      </div>
    </form>

    {paciente && <>
      <article className="agenda-found-patient" aria-live="polite">
        <div><span>Paciente</span><strong>{paciente.nombreCompleto}</strong></div>
        <div><span>DNI</span><strong>{paciente.dni}</strong></div>
        <div><span>Contacto</span><strong>{paciente.telefono || paciente.email || 'Sin datos de contacto'}</strong></div>
        <div><span>Obra social</span><strong>{paciente.planObraSocial || 'Particular'}</strong></div>
      </article>
      {!paciente.perfilCompleto && <p className="agenda-registration-warning" role="status">El paciente debe completar sus datos desde su cuenta antes de poder solicitar un turno.</p>}
      {paciente.estado && paciente.estado !== 'ACTIVO' && <p className="agenda-registration-warning" role="status">La cuenta del paciente no está activa y no puede recibir turnos.</p>}
    </>}

    <form className="agenda-booking-form" onSubmit={confirmarTurno}>
      <label htmlFor="registro-turno-fecha">Fecha del turno</label>
      <input id="registro-turno-fecha" type="date" min={hoy} value={fecha} onChange={(event) => setFecha(event.target.value || hoy)} />
      <fieldset className="agenda-available-times">
        <legend>Horarios disponibles</legend>
        <button className="agenda-availability-refresh" type="button" onClick={() => setVersionDisponibilidad((version) => version + 1)} disabled={cargandoHorarios}>Actualizar horarios</button>
        {cargandoHorarios ? <p className="agenda-description">Cargando horarios…</p> : horarios.length ? <div className="agenda-time-options">{horarios.map((hora) => <button key={hora} type="button" className={horarioSeleccionado === hora ? 'is-selected' : ''} aria-pressed={horarioSeleccionado === hora} onClick={() => setHorarioSeleccionado(hora)}>{hora}</button>)}</div> : <p className="agenda-description">No hay horarios disponibles para esta fecha.</p>}
      </fieldset>
      <button className="agenda-primary-button agenda-booking-submit" type="submit" disabled={!paciente?.perfilCompleto || paciente.estado && paciente.estado !== 'ACTIVO' || !horarioSeleccionado || guardando || cargandoHorarios}>{guardando ? 'Registrando…' : 'Confirmar turno'}</button>
    </form>
  </section>
}

export default RegistroTurnoProfesional
