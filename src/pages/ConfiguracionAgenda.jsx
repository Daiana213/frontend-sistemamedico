import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/ConfiguracionAgenda.css'

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const NUEVA_FRANJA = () => ({ diaSemana: 1, horaInicio: '09:00', horaFin: '17:00', duracionTurnoMinutos: 30 })

function validarFranjas(franjas) {
  if (!franjas.length) return 'Agregá al menos una franja horaria.'
  for (const [index, franja] of franjas.entries()) {
    if (!franja.horaInicio || !franja.horaFin || !franja.duracionTurnoMinutos) return `Completá todos los campos de la franja ${index + 1}.`
    if (franja.horaFin <= franja.horaInicio) return `La hora de fin debe ser posterior al inicio en la franja ${index + 1}.`
    const minutos = Number(franja.duracionTurnoMinutos)
    if (!Number.isInteger(minutos) || minutos < 1) return `La duración de la franja ${index + 1} debe ser mayor a cero.`
  }
  const ordenadas = [...franjas].sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio))
  for (let i = 1; i < ordenadas.length; i += 1) {
    if (ordenadas[i].diaSemana === ordenadas[i - 1].diaSemana && ordenadas[i].horaInicio < ordenadas[i - 1].horaFin) {
      const dia = DIAS.find((item) => item.value === ordenadas[i].diaSemana)?.label
      return `Las franjas del ${dia} se superponen.`
    }
  }
  return ''
}

function mensajeError(error, fallback) {
  const turnos = error.response?.data?.details?.turnosAfectados
  if (error.response?.status === 409 && Array.isArray(turnos)) {
    return `No se pudo guardar porque ${turnos.length} ${turnos.length === 1 ? 'turno activo se ve afectado' : 'turnos activos se ven afectados'} por este cambio. Ajustá la agenda para conservar sus horarios.`
  }
  return error.response?.data?.error || error.response?.data?.message || fallback
}

export default function ConfiguracionAgenda() {
  const [profesionales, setProfesionales] = useState([])
  const [idProfesional, setIdProfesional] = useState('')
  const [profesionalActual, setProfesionalActual] = useState(null)
  const [franjas, setFranjas] = useState([])
  const [cargandoProfesionales, setCargandoProfesionales] = useState(true)
  const [cargandoAgenda, setCargandoAgenda] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [tieneAgenda, setTieneAgenda] = useState(false)

  useEffect(() => {
    let cancelado = false
    api.get('/profesionales')
      .then(({ data }) => { if (!cancelado) setProfesionales(Array.isArray(data) ? data : []) })
      .catch((err) => { if (!cancelado) setError(mensajeError(err, 'No se pudieron cargar los profesionales.')) })
      .finally(() => { if (!cancelado) setCargandoProfesionales(false) })
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (!idProfesional) {
      setFranjas([])
      setProfesionalActual(null)
      setTieneAgenda(false)
      return undefined
    }
    let cancelado = false
    setCargandoAgenda(true)
    setError('')
    setExito('')
    api.get(`/profesionales/${idProfesional}/agenda`)
      .then(({ data }) => {
        if (cancelado) return
        setProfesionalActual(data.profesional || null)
        setTieneAgenda(Boolean(data.tieneAgendaConfigurada))
        setFranjas((data.agendas || []).map(({ diaSemana, horaInicio, horaFin, duracionTurnoMinutos }) => ({
          diaSemana,
          horaInicio: horaInicio.slice(0, 5),
          horaFin: horaFin.slice(0, 5),
          duracionTurnoMinutos,
        })))
      })
      .catch((err) => { if (!cancelado) setError(mensajeError(err, 'No se pudo cargar la agenda del profesional.')) })
      .finally(() => { if (!cancelado) setCargandoAgenda(false) })
    return () => { cancelado = true }
  }, [idProfesional])

  const errorFormulario = useMemo(() => validarFranjas(franjas), [franjas])

  const actualizarFranja = (index, campo, valor) => {
    setFranjas((actuales) => actuales.map((franja, i) => i === index ? { ...franja, [campo]: campo === 'diaSemana' || campo === 'duracionTurnoMinutos' ? Number(valor) : valor } : franja))
    setError('')
    setExito('')
  }

  const guardar = async (event) => {
    event.preventDefault()
    setError('')
    setExito('')
    if (!idProfesional) {
      setError('Seleccioná un profesional.')
      return
    }
    if (errorFormulario) {
      setError(errorFormulario)
      return
    }
    setGuardando(true)
    try {
      const { data } = await api.put(`/profesionales/${idProfesional}/agenda`, {
        agendas: franjas.map((franja) => ({ ...franja, duracionTurnoMinutos: Number(franja.duracionTurnoMinutos) })),
      })
      setTieneAgenda(true)
      setExito(data.message || data.mensaje || 'Agenda configurada correctamente.')
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la agenda. Intentá nuevamente.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="agenda-config-page">
      <header className="agenda-config-header">
        <Link to="/dashboard" className="agenda-config-back">← Volver al panel</Link>
        <span>Sanatorio Antonia</span>
      </header>
      <section className="agenda-config-content">
        <div className="agenda-config-heading">
          <p className="agenda-config-eyebrow">ADMINISTRACIÓN</p>
          <h1>Configuración de agendas</h1>
          <p>Definí los días y horarios de atención para generar los turnos disponibles de cada profesional.</p>
        </div>

        <section className="agenda-config-card">
          <label className="agenda-config-professional-label" htmlFor="profesional-agenda">Profesional</label>
          <select id="profesional-agenda" value={idProfesional} onChange={(event) => { setIdProfesional(event.target.value); setError(''); setExito('') }} disabled={cargandoProfesionales || guardando}>
            <option value="">{cargandoProfesionales ? 'Cargando profesionales…' : 'Seleccioná un profesional'}</option>
            {profesionales.map((profesional) => <option key={profesional.idProfesional} value={profesional.idProfesional}>{profesional.nombreCompleto}{profesional.matricula ? ` · Matrícula ${profesional.matricula}` : ''}</option>)}
          </select>
          {profesionales.length === 0 && !cargandoProfesionales && !error && <p className="agenda-config-muted">No hay profesionales activos para configurar.</p>}
        </section>

        {error && <p className="agenda-config-alert agenda-config-alert--error" role="alert">{error}</p>}
        {exito && <p className="agenda-config-alert agenda-config-alert--success" role="status">{exito}</p>}

        {idProfesional && (cargandoAgenda ? <div className="agenda-config-card agenda-config-loading">Cargando agenda…</div> : <form className="agenda-config-card" onSubmit={guardar}>
          <div className="agenda-config-section-title">
            <div>
              <h2>{profesionalActual?.nombreCompleto || 'Agenda profesional'}</h2>
              <p>{tieneAgenda ? 'Editá las franjas existentes o agregá nuevos horarios.' : 'Este profesional todavía no tiene una agenda configurada.'}</p>
            </div>
            <button type="button" className="agenda-config-add" onClick={() => { setFranjas((actuales) => [...actuales, NUEVA_FRANJA()]); setError(''); setExito('') }} disabled={guardando}>+ Agregar franja</button>
          </div>

          {franjas.length === 0 ? <div className="agenda-config-empty"><strong>Sin franjas horarias</strong><span>Agregá al menos una franja para habilitar la reserva de turnos.</span></div> : <div className="agenda-config-slots">
            {franjas.map((franja, index) => <fieldset className="agenda-config-slot" key={`${index}-${franja.diaSemana}`}>
              <legend>Franja {index + 1}</legend>
              <label>Día de atención<select value={franja.diaSemana} onChange={(event) => actualizarFranja(index, 'diaSemana', event.target.value)} disabled={guardando}>{DIAS.map((dia) => <option key={dia.value} value={dia.value}>{dia.label}</option>)}</select></label>
              <label>Hora de inicio<input type="time" value={franja.horaInicio} onChange={(event) => actualizarFranja(index, 'horaInicio', event.target.value)} required disabled={guardando} /></label>
              <label>Hora de fin<input type="time" value={franja.horaFin} onChange={(event) => actualizarFranja(index, 'horaFin', event.target.value)} required disabled={guardando} /></label>
              <label>Duración del turno<select value={franja.duracionTurnoMinutos} onChange={(event) => actualizarFranja(index, 'duracionTurnoMinutos', event.target.value)} disabled={guardando}>{[15, 20, 30, 40, 45, 60, 90, 120].map((minutos) => <option key={minutos} value={minutos}>{minutos} minutos</option>)}</select></label>
              <button type="button" className="agenda-config-remove" onClick={() => { setFranjas((actuales) => actuales.filter((_, i) => i !== index)); setError(''); setExito('') }} disabled={guardando} aria-label={`Eliminar franja ${index + 1}`}>Eliminar</button>
            </fieldset>)}
          </div>}

          <div className="agenda-config-footer">
            <p>Las franjas superpuestas y los cambios que afecten turnos activos serán rechazados.</p>
            <button type="submit" className="agenda-config-save" disabled={guardando || cargandoAgenda || !idProfesional}>{guardando ? 'Guardando…' : 'Guardar agenda'}</button>
          </div>
        </form>)}
      </section>
    </main>
  )
}
