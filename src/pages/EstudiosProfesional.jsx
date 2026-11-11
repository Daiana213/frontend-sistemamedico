import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Loader2, Pencil, Plus, Search, X } from 'lucide-react'
import api from '../api/axios'
import '../styles/EstudiosProfesional.css'

const FORM_VACIO = { nombre: '', codigo: '', observacion: '' }

function fechaHoraLegible(valor) {
  if (!valor) return 'Fecha sin informar'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor))
}

export default function EstudiosProfesional() {
  const [pacientes, setPacientes] = useState([])
  const [idPaciente, setIdPaciente] = useState('')
  const [profesionalPuedeGestionar, setProfesionalPuedeGestionar] = useState(null)
  const [estudios, setEstudios] = useState([])
  const [cargandoPacientes, setCargandoPacientes] = useState(true)
  const [cargandoEstudios, setCargandoEstudios] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState(FORM_VACIO)
  const [estudioEditando, setEstudioEditando] = useState(null)
  const [formEdicion, setFormEdicion] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const solicitudEstudiosActual = useRef(0)

  const cargarEstudios = useCallback(async (pacienteId) => {
    const solicitudId = ++solicitudEstudiosActual.current
    if (!pacienteId) {
      setEstudios([])
      return
    }
    setCargandoEstudios(true)
    setError('')
    try {
      const { data } = await api.get(`/estudios/paciente/${pacienteId}`)
      if (solicitudId === solicitudEstudiosActual.current) setEstudios(Array.isArray(data.estudios) ? data.estudios : [])
    } catch (err) {
      if (solicitudId === solicitudEstudiosActual.current) {
        setError(err.response?.data?.error || 'No se pudieron cargar los estudios de este paciente.')
        setEstudios([])
      }
    } finally {
      if (solicitudId === solicitudEstudiosActual.current) setCargandoEstudios(false)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    const cargarPacientes = async () => {
      setCargandoPacientes(true)
      setError('')
      try {
        // Sin filtros, el backend devuelve los pacientes con turnos vinculados a este profesional.
        const { data } = await api.get('/profesionales/me/turnos')
        if (cancelado) return
        setProfesionalPuedeGestionar(Boolean(data.profesional?.puedeCargarEstudios))
        const unicos = new Map()
        for (const turno of data.turnos || []) {
          const paciente = turno.paciente
          if (paciente?.idPaciente != null && !unicos.has(String(paciente.idPaciente))) {
            unicos.set(String(paciente.idPaciente), paciente)
          }
        }
        const lista = [...unicos.values()].sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || '', 'es'))
        setPacientes(lista)
        if (lista.length) setIdPaciente(String(lista[0].idPaciente))
      } catch (err) {
        if (!cancelado) setError(err.response?.data?.error || 'No se pudieron cargar los pacientes de tu agenda.')
      } finally {
        if (!cancelado) setCargandoPacientes(false)
      }
    }
    cargarPacientes()
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (profesionalPuedeGestionar === false) {
      solicitudEstudiosActual.current += 1
      setEstudios([])
      setCargandoEstudios(false)
      return
    }
    cargarEstudios(idPaciente)
  }, [idPaciente, profesionalPuedeGestionar, cargarEstudios])

  const pacientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es')
    if (!termino) return pacientes
    return pacientes.filter((paciente) => `${paciente.nombreCompleto || ''} ${paciente.dni || ''}`.toLocaleLowerCase('es').includes(termino))
  }, [busqueda, pacientes])

  const pacienteActual = pacientes.find((paciente) => String(paciente.idPaciente) === idPaciente)

  const guardarNuevo = async (event) => {
    event.preventDefault()
    if (!idPaciente || !form.nombre.trim()) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await api.post(`/estudios/paciente/${idPaciente}`, {
        nombre: form.nombre.trim(),
        codigo: form.codigo.trim() || undefined,
        observacion: form.observacion.trim() || undefined,
      })
      setForm(FORM_VACIO)
      setMensaje('Estudio cargado y asociado a la historia clínica.')
      await cargarEstudios(idPaciente)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el estudio médico.')
    } finally {
      setGuardando(false)
    }
  }

  const abrirEdicion = (estudio) => {
    setEstudioEditando(estudio)
    setFormEdicion({ nombre: estudio.nombre || '', codigo: estudio.codigo || '', observacion: estudio.observacion || '' })
    setError('')
    setMensaje('')
  }

  const guardarEdicion = async (event) => {
    event.preventDefault()
    if (!estudioEditando || !formEdicion.nombre.trim()) return
    setGuardando(true)
    setError('')
    try {
      await api.put(`/estudios/${estudioEditando.idEstudio}`, {
        nombre: formEdicion.nombre.trim(),
        codigo: formEdicion.codigo.trim() || undefined,
        observacion: formEdicion.observacion.trim() || undefined,
      })
      setEstudioEditando(null)
      setMensaje('Los datos del estudio se actualizaron.')
      await cargarEstudios(idPaciente)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el estudio médico.')
    } finally {
      setGuardando(false)
    }
  }

  return <main className="professional-studies-page">
    <header className="professional-studies-header"><Link to="/dashboard"><ArrowLeft size={16} /> Volver al panel</Link><img src="/logo-completo.png" alt="Sanatorio Antonia" /></header>
    <section className="professional-studies-content">
      <div className="professional-studies-heading"><div><span>PORTAL PROFESIONAL</span><h1>Estudios de pacientes</h1><p>Consultá, cargá y actualizá estudios de pacientes vinculados a tus turnos.</p></div><FileText size={34} aria-hidden="true" /></div>
      {error && <div className="professional-studies-alert professional-studies-alert--error" role="alert">{error}</div>}
      {mensaje && <div className="professional-studies-alert professional-studies-alert--success" role="status">{mensaje}</div>}
      {profesionalPuedeGestionar === false ? <div className="professional-studies-empty">Tu perfil no tiene habilitada la gestión de estudios médicos. Consultá con administración.</div> : <>
        <section className="professional-studies-patient-picker">
          <div><label htmlFor="professional-study-search">Paciente</label><div className="professional-study-search"><Search size={17} /><input id="professional-study-search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o DNI" /></div></div>
          <div><label htmlFor="professional-study-patient">Pacientes de tu agenda</label><select id="professional-study-patient" value={idPaciente} onChange={(event) => setIdPaciente(event.target.value)} disabled={cargandoPacientes || pacientesFiltrados.length === 0}><option value="">{cargandoPacientes ? 'Cargando pacientes…' : pacientesFiltrados.length ? 'Seleccionar paciente' : 'No se encontraron pacientes'}</option>{pacientesFiltrados.map((paciente) => <option key={paciente.idPaciente} value={paciente.idPaciente}>{paciente.nombreCompleto} · DNI {paciente.dni}</option>)}</select></div>
        </section>
        {cargandoPacientes ? <div className="professional-studies-empty"><Loader2 size={18} className="professional-studies-spin" /> Cargando pacientes…</div> : pacientes.length === 0 ? <div className="professional-studies-empty">Todavía no tenés pacientes vinculados a tus turnos.</div> : <>
          {pacienteActual && <section className="professional-studies-patient-card"><span>PACIENTE SELECCIONADO</span><strong>{pacienteActual.nombreCompleto}</strong><small>DNI {pacienteActual.dni}</small></section>}
          <section className="professional-study-layout">
            <form className="professional-study-form" onSubmit={guardarNuevo}>
              <div><span>ALTA DE ESTUDIO</span><h2>Cargar estudio médico</h2><p>El estudio quedará vinculado al historial del paciente seleccionado.</p></div>
              <label>Nombre o tipo de estudio *<input required minLength={2} maxLength={150} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Ej. Radiografía de tórax" /></label>
              <label>Código o StudyInstanceUID (opcional)<input maxLength={150} value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} placeholder="Pegá el UID o dejalo vacío para generar un código" /></label>
              <label>Observaciones / informe<textarea rows={4} maxLength={1000} value={form.observacion} onChange={(event) => setForm({ ...form, observacion: event.target.value })} placeholder="Resultados, conclusiones o valores destacados" /></label>
              <button type="submit" disabled={!idPaciente || guardando || profesionalPuedeGestionar === null}>{guardando ? <><Loader2 size={16} className="professional-studies-spin" /> Guardando…</> : <><Plus size={16} /> Guardar estudio</>}</button>
            </form>
            <section className="professional-study-list-section">
              <div className="professional-study-list-heading"><div><span>HISTORIA CLÍNICA</span><h2>Estudios registrados</h2></div><span>{estudios.length}</span></div>
              {cargandoEstudios ? <div className="professional-studies-empty"><Loader2 size={18} className="professional-studies-spin" /> Cargando estudios…</div> : estudios.length ? <div className="professional-study-list">{estudios.map((estudio) => <article key={estudio.idEstudio}>
                <div className="professional-study-item-heading"><div><strong>{estudio.nombre}</strong><small>{fechaHoraLegible(estudio.fechaCarga)}</small></div><button type="button" onClick={() => abrirEdicion(estudio)} aria-label={`Editar ${estudio.nombre}`} title="Editar estudio"><Pencil size={16} /></button></div>
                {estudio.codigo && <code>{estudio.codigo}</code>}
                <p>{estudio.observacion || 'Sin observaciones registradas.'}</p>
              </article>)}</div> : <div className="professional-studies-empty">Este paciente todavía no tiene estudios médicos cargados.</div>}
            </section>
          </section>
        </>}
      </>}
    </section>
    {estudioEditando && <div className="professional-study-modal-backdrop" role="presentation"><form className="professional-study-modal" role="dialog" aria-modal="true" aria-labelledby="professional-study-edit-title" onSubmit={guardarEdicion}>
      <button type="button" className="professional-study-modal-close" onClick={() => setEstudioEditando(null)} aria-label="Cerrar" disabled={guardando}><X size={19} /></button>
      <span>HISTORIA CLÍNICA</span><h2 id="professional-study-edit-title">Editar estudio médico</h2><label>Nombre o tipo de estudio *<input required minLength={2} maxLength={150} value={formEdicion.nombre} onChange={(event) => setFormEdicion({ ...formEdicion, nombre: event.target.value })} /></label><label>Código / StudyInstanceUID<input maxLength={150} value={formEdicion.codigo} onChange={(event) => setFormEdicion({ ...formEdicion, codigo: event.target.value })} /></label><label>Observaciones / informe<textarea rows={4} maxLength={1000} value={formEdicion.observacion} onChange={(event) => setFormEdicion({ ...formEdicion, observacion: event.target.value })} /></label><div><button type="button" onClick={() => setEstudioEditando(null)} disabled={guardando}>Cancelar</button><button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form></div>}
  </main>
}
