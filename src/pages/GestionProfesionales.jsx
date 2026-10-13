import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { nombreValido } from '../utils/sesion'
import '../styles/GestionProfesionales.css'

const PROFESIONAL_VACIO = {
  nombre: '', apellido: '', telefono: '', email: '', telefonoAlternativo: '', emailAlternativo: '', estado: 'ACTIVO',
}
const ESPECIALIDAD_VACIA = { nombre: '', descripcion: '' }

function mensajeError(err, fallback) {
  return err.response?.data?.error || err.response?.data?.message || fallback
}

function fechaHoraLegible(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fechaHora))
}

export default function GestionProfesionales() {
  const [pestana, setPestana] = useState('profesionales')
  const [profesionales, setProfesionales] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorPagina, setErrorPagina] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [modal, setModal] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [profesionalId, setProfesionalId] = useState(null)
  const [profesionalForm, setProfesionalForm] = useState(PROFESIONAL_VACIO)
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState([])
  const [profesionalActual, setProfesionalActual] = useState(null)
  const [especialidadId, setEspecialidadId] = useState(null)
  const [especialidadForm, setEspecialidadForm] = useState(ESPECIALIDAD_VACIA)
  const [objetivoBaja, setObjetivoBaja] = useState(null)
  const [bloqueoBaja, setBloqueoBaja] = useState(null)

  const cargarDatos = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true)
    setErrorPagina('')
    try {
      const [respuestaProfesionales, respuestaEspecialidades] = await Promise.all([
        api.get('/profesionales', { params: { incluirInactivos: true } }),
        api.get('/especialidades', { params: { incluirInactivas: true } }),
      ])
      setProfesionales(Array.isArray(respuestaProfesionales.data) ? respuestaProfesionales.data : [])
      setEspecialidades(Array.isArray(respuestaEspecialidades.data) ? respuestaEspecialidades.data : [])
    } catch (err) {
      setErrorPagina(mensajeError(err, 'No se pudieron cargar los profesionales y especialidades.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const especialidadesActivas = useMemo(() => especialidades.filter((item) => item.estado === 'ACTIVO'), [especialidades])

  const profesionalesVisibles = useMemo(() => profesionales.filter((item) => {
    const consulta = busqueda.trim().toLocaleLowerCase('es')
    const coincideBusqueda = !consulta || `${item.nombreCompleto} ${item.matricula}`.toLocaleLowerCase('es').includes(consulta)
    return coincideBusqueda && (mostrarInactivos || item.estado === 'ACTIVO')
  }), [profesionales, busqueda, mostrarInactivos])

  const especialidadesVisibles = useMemo(() => especialidades.filter((item) => {
    const consulta = busqueda.trim().toLocaleLowerCase('es')
    return (!consulta || `${item.nombre} ${item.descripcion || ''}`.toLocaleLowerCase('es').includes(consulta)) && (mostrarInactivos || item.estado === 'ACTIVO')
  }), [especialidades, busqueda, mostrarInactivos])

  const abrirEdicionProfesional = async (id) => {
    setModal('editar-profesional')
    setProfesionalId(id)
    setProfesionalForm(PROFESIONAL_VACIO)
    setEspecialidadesSeleccionadas([])
    setProfesionalActual(null)
    setError('')
    try {
      const { data } = await api.get(`/profesionales/${id}`)
      setProfesionalActual(data)
      setProfesionalForm({
        nombre: data.usuario.nombre || '',
        apellido: data.usuario.apellido || '',
        telefono: data.usuario.telefono || '',
        email: data.usuario.email || '',
        telefonoAlternativo: data.telefonoAlternativo || '',
        emailAlternativo: data.emailAlternativo || '',
        estado: data.estado || 'ACTIVO',
      })
      setEspecialidadesSeleccionadas((data.especialidades || []).map((item) => item.idEspecialidad))
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar los datos del profesional.'))
    }
  }

  const guardarProfesional = async (event) => {
    event.preventDefault()
    if (!profesionalId) return
    if (!nombreValido(profesionalForm.nombre) || !nombreValido(profesionalForm.apellido)) {
      setError('El nombre y el apellido solo pueden contener letras y espacios.')
      return
    }
    if (!especialidadesSeleccionadas.length) {
      setError('Asigná al menos una especialidad.')
      return
    }
    setGuardando(true)
    setError('')
    setBloqueoBaja(null)
    try {
      const { estado, ...datosPersonales } = profesionalForm
      const requiereBaja = estado === 'INACTIVO' && profesionalActual?.estado !== 'INACTIVO'
      const payload = {
        ...datosPersonales,
        telefonoAlternativo: datosPersonales.telefonoAlternativo.trim() || null,
        emailAlternativo: datosPersonales.emailAlternativo.trim() || null,
        especialidades: especialidadesSeleccionadas,
        // Las bajas siempre pasan por DELETE para que el backend aplique el bloqueo por turnos y la auditoría.
        estado: requiereBaja ? 'ACTIVO' : estado,
      }
      const { data } = await api.put(`/profesionales/${profesionalId}`, payload)
      if (requiereBaja) {
        await api.delete(`/profesionales/${profesionalId}`)
        setMensaje('El profesional ha sido dado de baja correctamente.')
      } else {
        setMensaje(data.mensaje || 'Profesional actualizado correctamente.')
      }
      setModal('')
      await cargarDatos(false)
    } catch (err) {
      const detalles = err.response?.data?.details?.turnosPendientes
      if (err.response?.status === 409 && Array.isArray(detalles)) setBloqueoBaja(detalles)
      const prefijo = profesionalForm.estado === 'INACTIVO' && profesionalActual?.estado !== 'INACTIVO'
        ? 'Los datos se guardaron, pero no se pudo dar de baja: '
        : ''
      setError(`${prefijo}${mensajeError(err, 'No se pudieron guardar los cambios.')}`)
      await cargarDatos(false)
    } finally {
      setGuardando(false)
    }
  }

  const solicitarBajaProfesional = async () => {
    if (!objetivoBaja) return
    setGuardando(true)
    setError('')
    setBloqueoBaja(null)
    try {
      const { data } = await api.delete(`/profesionales/${objetivoBaja.idProfesional}`)
      setMensaje(data.mensaje || 'El profesional ha sido dado de baja correctamente.')
      setObjetivoBaja(null)
      await cargarDatos(false)
    } catch (err) {
      const detalles = err.response?.data?.details?.turnosPendientes
      if (err.response?.status === 409 && Array.isArray(detalles)) setBloqueoBaja(detalles)
      setError(mensajeError(err, 'No se pudo dar de baja al profesional.'))
    } finally {
      setGuardando(false)
    }
  }

  const abrirNuevaEspecialidad = () => {
    setEspecialidadId(null)
    setEspecialidadForm(ESPECIALIDAD_VACIA)
    setError('')
    setModal('especialidad')
  }

  const abrirEdicionEspecialidad = (item) => {
    setEspecialidadId(item.idEspecialidad)
    setEspecialidadForm({ nombre: item.nombre, descripcion: item.descripcion || '' })
    setError('')
    setModal('especialidad')
  }

  const guardarEspecialidad = async (event) => {
    event.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const payload = { nombre: especialidadForm.nombre.trim(), descripcion: especialidadForm.descripcion.trim() || null }
      const { data } = especialidadId
        ? await api.put(`/especialidades/${especialidadId}`, payload)
        : await api.post('/especialidades', payload)
      setMensaje(data.mensaje || (especialidadId ? 'Especialidad actualizada correctamente.' : 'Especialidad agregada correctamente.'))
      setModal('')
      await cargarDatos(false)
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la especialidad.'))
    } finally {
      setGuardando(false)
    }
  }

  const solicitarBajaEspecialidad = async () => {
    if (!objetivoBaja) return
    setGuardando(true)
    setError('')
    setBloqueoBaja(null)
    try {
      const { data } = await api.delete(`/especialidades/${objetivoBaja.idEspecialidad}`)
      setMensaje(data.mensaje || 'La especialidad ha sido dada de baja correctamente.')
      setObjetivoBaja(null)
      await cargarDatos(false)
    } catch (err) {
      const detalles = err.response?.data?.details?.profesionalesAsignados
      if (err.response?.status === 409 && Array.isArray(detalles)) setBloqueoBaja(detalles)
      setError(mensajeError(err, 'No se pudo dar de baja la especialidad.'))
    } finally {
      setGuardando(false)
    }
  }

  const cambiarPestana = (nombre) => {
    setPestana(nombre)
    setBusqueda('')
    setMostrarInactivos(false)
    setMensaje('')
    setErrorPagina('')
  }

  const cerrarModal = () => {
    if (guardando) return
    setModal('')
    setError('')
  }

  return <main className="hu14-page">
    <header className="hu14-header"><Link to="/dashboard">← Volver al panel</Link><span>Sanatorio Antonia</span></header>
    <section className="hu14-content">
      <div className="hu14-heading"><p className="hu14-eyebrow">ADMINISTRACIÓN</p><h1>Profesionales y especialidades</h1><p>Mantené actualizados los datos del equipo médico y el catálogo de atención.</p></div>
      <nav className="hu14-tabs" aria-label="Secciones de gestión"><button type="button" className={pestana === 'profesionales' ? 'is-active' : ''} onClick={() => cambiarPestana('profesionales')}>Profesionales</button><button type="button" className={pestana === 'especialidades' ? 'is-active' : ''} onClick={() => cambiarPestana('especialidades')}>Especialidades</button></nav>
      {mensaje && <p className="hu14-message hu14-message--success" role="status">{mensaje}</p>}
      {errorPagina && <p className="hu14-message hu14-message--error" role="alert">{errorPagina}</p>}

      <div className="hu14-toolbar">
        <label className="hu14-search">{pestana === 'profesionales' ? 'Buscar profesional' : 'Buscar especialidad'}<input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder={pestana === 'profesionales' ? 'Nombre o matrícula' : 'Nombre o descripción'} /></label>
        <label className="hu14-inactive-toggle"><input type="checkbox" checked={mostrarInactivos} onChange={(event) => setMostrarInactivos(event.target.checked)} /> Mostrar inactivos</label>
        {pestana === 'profesionales' ? <Link to="/registro-profesional" className="hu14-primary-link">+ Registrar profesional</Link> : <button type="button" className="hu14-primary-button" onClick={abrirNuevaEspecialidad}>+ Agregar especialidad</button>}
      </div>

      {cargando ? <div className="hu14-empty">Cargando…</div> : pestana === 'profesionales' ? profesionalesVisibles.length ? <div className="hu14-list">
        {profesionalesVisibles.map((item) => <article className="hu14-card" key={item.idProfesional}>
          <div className="hu14-card-main"><div className="hu14-avatar" aria-hidden="true">{item.nombreCompleto?.charAt(0)?.toLocaleUpperCase('es') || 'P'}</div><div className="hu14-card-info"><h2>{item.nombreCompleto}</h2><p>Matrícula {item.matricula}</p><div className="hu14-tags">{(item.especialidades || []).map((nombre) => <span key={nombre}>{nombre}</span>)}</div></div><span className={`hu14-status hu14-status--${String(item.estado).toLowerCase()}`}>{item.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></div>
          <div className="hu14-actions"><button type="button" onClick={() => abrirEdicionProfesional(item.idProfesional)}>Editar</button>{item.estado === 'ACTIVO' && <button type="button" className="hu14-danger-outline" onClick={() => { setObjetivoBaja(item); setBloqueoBaja(null); setError('') }}>Dar de baja</button>}</div>
        </article>)}
      </div> : <div className="hu14-empty"><strong>No hay profesionales que coincidan</strong><p>Probá otra búsqueda o registrá un profesional.</p></div> : especialidadesVisibles.length ? <div className="hu14-list">
        {especialidadesVisibles.map((item) => <article className="hu14-card" key={item.idEspecialidad}><div className="hu14-card-main hu14-specialty-main"><div className="hu14-avatar hu14-avatar--specialty">✚</div><div className="hu14-card-info"><h2>{item.nombre}</h2><p>{item.descripcion || 'Sin descripción'}</p></div><span className={`hu14-status hu14-status--${String(item.estado).toLowerCase()}`}>{item.estado === 'ACTIVO' ? 'Activa' : 'Inactiva'}</span></div><div className="hu14-actions"><button type="button" onClick={() => abrirEdicionEspecialidad(item)}>Editar</button>{item.estado === 'ACTIVO' && <button type="button" className="hu14-danger-outline" onClick={() => { setObjetivoBaja(item); setBloqueoBaja(null); setError('') }}>Dar de baja</button>}</div></article>)}
      </div> : <div className="hu14-empty"><strong>No hay especialidades que coincidan</strong><p>Probá otra búsqueda o agregá una especialidad.</p></div>}
    </section>

    {modal && <div className="hu14-backdrop" role="presentation"><section className="hu14-modal" role="dialog" aria-modal="true" aria-labelledby="hu14-modal-title"><button type="button" className="hu14-close" aria-label="Cerrar" onClick={cerrarModal} disabled={guardando}>×</button>
      {modal === 'editar-profesional' && <form onSubmit={guardarProfesional}>
        <p className="hu14-eyebrow">FICHA PROFESIONAL</p><h2 id="hu14-modal-title">Editar profesional</h2>{profesionalActual && <p className="hu14-immutable">DNI {profesionalActual.usuario.dni} · Matrícula {profesionalActual.matricula}</p>}
        {error && <p className="hu14-message hu14-message--error" role="alert">{error}</p>}
        {bloqueoBaja && <div className="hu14-blocked-summary"><strong>Turnos pendientes que impiden la baja</strong><ul>{bloqueoBaja.map((turno) => <li key={turno.idTurno}>{fechaHoraLegible(turno.fechaHora)} · {turno.paciente} · DNI {turno.dniPaciente} · {turno.estado}</li>)}</ul></div>}
        <div className="hu14-form-grid"><label>Nombre<input required value={profesionalForm.nombre} onChange={(event) => setProfesionalForm((actual) => ({ ...actual, nombre: event.target.value }))} /></label><label>Apellido<input required value={profesionalForm.apellido} onChange={(event) => setProfesionalForm((actual) => ({ ...actual, apellido: event.target.value }))} /></label><label>Teléfono<input required inputMode="numeric" pattern="[0-9]{8,15}" title="Ingresá entre 8 y 15 números." value={profesionalForm.telefono} onChange={(event) => setProfesionalForm((actual) => ({ ...actual, telefono: event.target.value.replace(/\D/g, '') }))} /></label><label>Email<input required type="email" value={profesionalForm.email} onChange={(event) => setProfesionalForm((actual) => ({ ...actual, email: event.target.value }))} /></label><label>Teléfono alternativo (opcional)<input inputMode="numeric" pattern="[0-9]{8,15}" title="Ingresá entre 8 y 15 números." value={profesionalForm.telefonoAlternativo} onChange={(event) => setProfesionalForm((actual) => ({ ...actual, telefonoAlternativo: event.target.value.replace(/\D/g, '') }))} /></label><label>Email alternativo (opcional)<input type="email" value={profesionalForm.emailAlternativo} onChange={(event) => setProfesionalForm((actual) => ({ ...actual, emailAlternativo: event.target.value }))} /></label><label>Estado<select value={profesionalForm.estado} onChange={(event) => setProfesionalForm((actual) => ({ ...actual, estado: event.target.value }))}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo (dar de baja)</option></select></label></div>
        <fieldset className="hu14-specialty-options"><legend>Especialidades asignadas</legend>{especialidadesActivas.map((item) => <label key={item.idEspecialidad}><input type="checkbox" checked={especialidadesSeleccionadas.includes(item.idEspecialidad)} onChange={() => setEspecialidadesSeleccionadas((actuales) => actuales.includes(item.idEspecialidad) ? actuales.filter((id) => id !== item.idEspecialidad) : [...actuales, item.idEspecialidad])} />{item.nombre}</label>)}</fieldset>
        <div className="hu14-modal-actions"><button type="button" className="hu14-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="submit" className="hu14-primary-button" disabled={guardando || !profesionalActual}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>}

      {modal === 'especialidad' && <form onSubmit={guardarEspecialidad}><p className="hu14-eyebrow">CATÁLOGO</p><h2 id="hu14-modal-title">{especialidadId ? 'Editar especialidad' : 'Agregar especialidad'}</h2>{error && <p className="hu14-message hu14-message--error" role="alert">{error}</p>}<div className="hu14-form-grid hu14-form-grid--single"><label>Nombre<input required minLength={2} maxLength={100} value={especialidadForm.nombre} onChange={(event) => setEspecialidadForm((actual) => ({ ...actual, nombre: event.target.value }))} /></label><label>Descripción breve (opcional)<textarea maxLength={255} rows={4} value={especialidadForm.descripcion} onChange={(event) => setEspecialidadForm((actual) => ({ ...actual, descripcion: event.target.value }))} /></label></div><div className="hu14-modal-actions"><button type="button" className="hu14-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="submit" className="hu14-primary-button" disabled={guardando}>{guardando ? 'Guardando…' : especialidadId ? 'Guardar cambios' : 'Agregar especialidad'}</button></div></form>}
    </section></div>}

    {objetivoBaja && <div className="hu14-backdrop" role="presentation"><section className="hu14-modal hu14-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="hu14-confirm-title"><button type="button" className="hu14-close" aria-label="Cerrar" onClick={() => { setObjetivoBaja(null); setError(''); setBloqueoBaja(null) }} disabled={guardando}>×</button>
      <p className="hu14-eyebrow">BAJA LÓGICA</p><h2 id="hu14-confirm-title">{pestana === 'profesionales' ? '¿Dar de baja a este profesional?' : '¿Dar de baja esta especialidad?'}</h2>
      <p>{pestana === 'profesionales' ? `Se dará de baja a ${objetivoBaja.nombreCompleto}. El historial se conservará.` : `Se dará de baja a ${objetivoBaja.nombre}. La especialidad dejará de aparecer en el catálogo.`}</p>
      {error && <p className="hu14-message hu14-message--error" role="alert">{error}</p>}
      {bloqueoBaja && <div className="hu14-blocked-summary"><strong>{pestana === 'profesionales' ? 'Turnos pendientes' : 'Profesionales activos asignados'}</strong><ul>{bloqueoBaja.map((item, index) => <li key={item.idTurno || item.idProfesional}>{pestana === 'profesionales' ? `${fechaHoraLegible(item.fechaHora)} · ${item.paciente} · DNI ${item.dniPaciente} · ${item.estado}` : `${item.nombreCompleto}${item.matricula ? ` · Matrícula ${item.matricula}` : ''}`}</li>)}</ul></div>}
      <div className="hu14-modal-actions"><button type="button" className="hu14-secondary" onClick={() => { setObjetivoBaja(null); setError(''); setBloqueoBaja(null) }} disabled={guardando}>Volver</button><button type="button" className="hu14-danger-button" onClick={pestana === 'profesionales' ? solicitarBajaProfesional : solicitarBajaEspecialidad} disabled={guardando}>{guardando ? 'Procesando…' : 'Confirmar baja'}</button></div>
    </section></div>}
  </main>
}
