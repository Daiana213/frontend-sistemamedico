import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/MisTurnos.css'

const ESTADOS = {
  SOLICITADO: 'Solicitado',
  CONFIRMADO: 'Confirmado',
  REPROGRAMADO: 'Reprogramado',
  CANCELADO: 'Cancelado',
  COMPLETADO: 'Atendido',
}
const ACTIVOS = new Set(['SOLICITADO', 'CONFIRMADO'])

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

  return <main className="my-appointments-page"><header className="my-appointments-header"><Link to="/dashboard">← Volver al panel</Link><span>Sanatorio Antonia</span></header><section className="my-appointments-content"><div className="my-appointments-title"><div><p className="my-appointments-eyebrow">PANEL DEL PACIENTE</p><h1>Mis turnos</h1><p>Consultá el estado y el detalle de tus turnos médicos.</p></div><button type="button" className="my-appointments-refresh" onClick={cargarTurnos} disabled={cargando}>Actualizar</button></div>{error && <div className="my-appointments-error" role="alert">{error}</div>}{cargando ? <div className="my-appointments-empty">Cargando tus turnos…</div> : !turnos.length ? <div className="my-appointments-empty"><strong>Todavía no tenés turnos</strong><p>Cuando solicites uno, vas a poder consultarlo desde acá.</p></div> : <div className="my-appointments-list">{turnos.map((turno) => {
    const estado = String(turno.estado || '').toUpperCase()
    const puedeGestionar = ACTIVOS.has(estado) && new Date(turno.fechaHora) > new Date()
    const profesional = turno.profesional?.usuario
    return <article className="my-appointment-card" key={turno.idTurno}><div className="my-appointment-card-main"><div className="my-appointment-date"><strong>{formatoFecha(turno.fechaHora)}</strong><span>{formatoHora(turno.fechaHora)}</span></div><div className="my-appointment-info"><h2>{profesional ? `Dr./Dra. ${profesional.nombre} ${profesional.apellido}` : `Turno #${turno.idTurno}`}</h2><p>{turno.profesional?.especialidades?.map((item) => item.especialidad?.nombre || item.nombre).filter(Boolean).join(', ') || 'Consulta médica'}</p>{turno.motivoCancelacion && <p className="my-appointment-cancel-reason">Motivo: {turno.motivoCancelacion}</p>}</div><span className={`my-appointment-status my-appointment-status--${estado.toLowerCase()}`}>{ESTADOS[estado] || estado}</span></div>{puedeGestionar && <div className="my-appointment-actions"><button type="button" disabled title="La API de cancelación todavía no está disponible">Cancelar</button><button type="button" disabled title="La API de reprogramación y disponibilidad todavía no está disponible">Reprogramar</button></div>}</article>
  })}</div>}<aside className="my-appointments-note">Podés cancelar o reprogramar turnos activos cuando la operación esté habilitada en el servicio.</aside></section></main>
}
