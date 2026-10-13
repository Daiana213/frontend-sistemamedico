import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import '../styles/MisTurnos.css'

function fechaLocal(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function inicioDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

function CalendarioTurnos({ idProfesional, agendaProfesional = [], turnosOcupados = [], seleccionado, onSeleccionar }) {
  const [mesVisible, setMesVisible] = useState(() => inicioDia(new Date()))
  const [disponibilidadApi, setDisponibilidadApi] = useState(null)
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false)
  const [errorDisponibilidad, setErrorDisponibilidad] = useState('')
  const turnosCalculados = useMemo(() => {
    const agrupados = new Map()
    const ocupados = new Set(turnosOcupados
      .filter((turno) => ['SOLICITADO', 'CONFIRMADO'].includes(String(turno.estado).toUpperCase()))
      .map((turno) => new Date(turno.fechaHora).getTime()))
    const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate()

    for (let numeroDia = 1; numeroDia <= diasEnMes; numeroDia += 1) {
      const dia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numeroDia)
      const fecha = fechaLocal(dia)
      const agendaDelDia = agendaProfesional.filter((franja) => Number(franja.diaSemana) === dia.getDay())
      for (const franja of agendaDelDia) {
        const [horaInicio, minutoInicio] = franja.horaInicio.split(':').map(Number)
        const [horaFin, minutoFin] = franja.horaFin.split(':').map(Number)
        const duracion = Number(franja.duracionTurnoMinutos) || 30
        const desde = horaInicio * 60 + minutoInicio
        const hasta = horaFin * 60 + minutoFin
        for (let minutos = desde; minutos + duracion <= hasta; minutos += duracion) {
          const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
          const fechaHora = new Date(`${fecha}T${hora}:00-03:00`).toISOString()
          if (new Date(fechaHora).getTime() <= Date.now() || ocupados.has(new Date(fechaHora).getTime())) continue
          agrupados.set(fecha, [...(agrupados.get(fecha) || []), { fechaHora }])
        }
      }
    }
    for (const [fecha, opciones] of agrupados) {
      agrupados.set(fecha, opciones.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora)))
    }
    return agrupados
  }, [agendaProfesional, turnosOcupados, mesVisible])

  useEffect(() => {
    if (!idProfesional) {
      setDisponibilidadApi(null)
      setErrorDisponibilidad('')
      return undefined
    }
    let cancelado = false
    const cargarDisponibilidadDelMes = async () => {
      setCargandoDisponibilidad(true)
      setErrorDisponibilidad('')
      setDisponibilidadApi(new Map())
      const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate()
      const fechas = Array.from({ length: diasEnMes }, (_, indice) => fechaLocal(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), indice + 1)))
      const resultados = await Promise.allSettled(fechas.map((fecha) => api.get(`/profesionales/${idProfesional}/disponibilidad`, { params: { fecha } })))
      if (cancelado) return
      const turnosPorDia = new Map()
      resultados.forEach((resultado, indice) => {
        if (resultado.status !== 'fulfilled') return
        const horarios = resultado.value.data.turnosDisponibles || []
        if (!horarios.length) return
        turnosPorDia.set(fechas[indice], horarios.map((hora) => ({ fechaHora: new Date(`${fechas[indice]}T${hora}:00-03:00`).toISOString() })))
      })
      if (resultados.every((resultado) => resultado.status === 'rejected')) {
        setErrorDisponibilidad('No pudimos cargar la disponibilidad del profesional.')
      }
      setDisponibilidadApi(turnosPorDia)
      setCargandoDisponibilidad(false)
    }
    cargarDisponibilidadDelMes().catch(() => {
      if (!cancelado) {
        setErrorDisponibilidad('No pudimos cargar la disponibilidad del profesional.')
        setDisponibilidadApi(new Map())
        setCargandoDisponibilidad(false)
      }
    })
    return () => { cancelado = true }
  }, [idProfesional, mesVisible])

  const turnosPorDia = idProfesional ? (disponibilidadApi || new Map()) : turnosCalculados

  const primerDia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1)
  const cantidadDias = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate()
  const desplazamiento = (primerDia.getDay() + 6) % 7
  const celdas = [...Array(desplazamiento).fill(null), ...Array.from({ length: cantidadDias }, (_, indice) => indice + 1)]
  while (celdas.length % 7) celdas.push(null)
  const fechaSeleccionada = seleccionado ? fechaLocal(new Date(seleccionado)) : ''
  const horarios = turnosPorDia.get(fechaSeleccionada) || []

  const moverMes = (cantidad) => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + cantidad, 1))
  const mesLabel = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(mesVisible)

  return <section className="booking-calendar" aria-label="Calendario de turnos disponibles">
    <div className="booking-calendar-heading"><button type="button" aria-label="Mes anterior" onClick={() => moverMes(-1)}>‹</button><h2>{mesLabel}</h2><button type="button" aria-label="Mes siguiente" onClick={() => moverMes(1)}>›</button></div>
    <div className="booking-calendar-grid" role="grid">
      {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((dia) => <span className="booking-calendar-weekday" key={dia}>{dia}</span>)}
      {celdas.map((dia, indice) => {
        if (!dia) return <span className="booking-calendar-empty" key={`vacio-${indice}`} />
        const fecha = fechaLocal(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia))
        const opciones = turnosPorDia.get(fecha) || []
        const activo = fechaSeleccionada === fecha
        return <button type="button" role="gridcell" key={fecha} className={`booking-calendar-day${opciones.length ? ' has-slots' : ''}${activo ? ' is-selected' : ''}`} disabled={!opciones.length} onClick={() => onSeleccionar?.(opciones[0].fechaHora)} aria-label={`${dia}, ${opciones.length} horarios disponibles`} aria-pressed={activo}>{dia}{Boolean(opciones.length) && <i aria-hidden="true" />}</button>
      })}
    </div>
    <div className="booking-calendar-times"><h3>{fechaSeleccionada ? new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${fechaSeleccionada}T12:00:00`)) : 'Elegí un día disponible'}</h3>{cargandoDisponibilidad ? <p>Cargando disponibilidad…</p> : errorDisponibilidad ? <p role="alert">{errorDisponibilidad}</p> : horarios.length ? <div className="booking-time-options">{horarios.map((opcion) => <button type="button" key={opcion.fechaHora} className={seleccionado === opcion.fechaHora ? 'is-selected' : ''} onClick={() => onSeleccionar?.(opcion.fechaHora)}>{new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(opcion.fechaHora))}</button>)}</div> : <p>No hay horarios para mostrar en esta fecha.</p>}</div>
  </section>
}

export default CalendarioTurnos
