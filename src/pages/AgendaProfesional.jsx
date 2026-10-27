import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import RegistroTurnoProfesional from '../components/RegistroTurnoProfesional'
import '../styles/AgendaProfesional.css'
import '../styles/MisEstudios.css'
import {
  FileText,
  Eye,
  Search,
  Download,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Info,
  CalendarX,
} from 'lucide-react'

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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(valor)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function horaLegible(fechaHora) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(fechaHora)
  )
}

function textoEstado(estado) {
  return ESTADOS.find((opcion) => opcion.value === estado)?.label || estado
}

function esStudyInstanceUid(codigo) {
  if (!codigo) return false
  return /^\d+(\.\d+)+$/.test(codigo.trim())
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
  const [historiaClinica, setHistoriaClinica] = useState(null)
  const [consultaForm, setConsultaForm] = useState({
    motivoConsulta: '',
    diagnostico: '',
    tratamiento: '',
    notasAdicionales: '',
  })
  const [guardandoConsulta, setGuardandoConsulta] = useState(false)
  const [mensajeConsulta, setMensajeConsulta] = useState('')
  const [errorConsulta, setErrorConsulta] = useState('')
  const [cargandoHistoria, setCargandoHistoria] = useState(false)
  const [turnoConsultaRegistrada, setTurnoConsultaRegistrada] = useState(null)
  const [mensajeRegistro, setMensajeRegistro] = useState('')

  // Modal para inspección PACS en atención profesional
  const [modalPacsAbierto, setModalPacsAbierto] = useState(false)
  const [pacsEstado, setPacsEstado] = useState({
    cargando: false,
    error: '',
    resultado: null,
    estudio: null,
  })

  // Estado para visor de Informe Médico en PDF
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfCargando, setPdfCargando] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [estudioPdf, setEstudioPdf] = useState(null)

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
    return () => {
      cancelado = true
    }
  }, [pestana, fecha, estado, rangoAplicado, estaEnAtencion, fechaAtencion])

  const turnoSeleccionado =
    turnoDesdeNavegacion || turnos.find((turno) => String(turno.idTurno) === idTurno)

  // Carga de Historia Clínica completa (datos, antecedentes, estudios y consultas)
  const cargarHistoriaClinica = async (idPaciente, canceladoRef = { current: false }) => {
    setCargandoHistoria(true)
    try {
      const { data } = await api.get(`/pacientes/${idPaciente}/historia-clinica`)
      if (!canceladoRef.current) {
        setHistoriaClinica(data)
        if (Array.isArray(data.consultas)) {
          setConsultasPaciente(
            data.consultas.map((c) => ({
              idTurno: c.idTurno,
              fechaHora: c.fechaTurno || c.fechaRealizacion,
              consulta: {
                motivoConsulta: c.motivoConsulta,
                diagnostico: c.diagnostico,
                tratamiento: c.tratamiento,
                notasAdicionales: c.notasAdicionales,
              },
            }))
          )
        }
      }
    } catch {
      // Fallback retroactivo si el endpoint de historia completa falla
      try {
        const [resTurnos, resEstudios] = await Promise.allSettled([
          api.get('/turnos'),
          api.get(`/estudios/paciente/${idPaciente}`),
        ])

        if (canceladoRef.current) return

        let consultas = []
        if (resTurnos.status === 'fulfilled') {
          const lista = Array.isArray(resTurnos.value.data)
            ? resTurnos.value.data
            : resTurnos.value.data.turnos || []
          consultas = lista
            .filter((turno) => turno.paciente?.idPaciente === idPaciente && turno.consulta)
            .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
          setConsultasPaciente(consultas)
        }

        let estudios = []
        if (resEstudios.status === 'fulfilled') {
          estudios = resEstudios.value.data.estudios || []
        }

        setHistoriaClinica({
          datosBasicos: null,
          antecedentes: null,
          consultas,
          estudios,
        })
      } catch {
        if (!canceladoRef.current) {
          setHistoriaClinica(null)
          setConsultasPaciente([])
        }
      }
    } finally {
      if (!canceladoRef.current) setCargandoHistoria(false)
    }
  }

  useEffect(() => {
    if (!estaEnAtencion || !turnoSeleccionado?.paciente?.idPaciente) return
    const canceladoRef = { current: false }
    cargarHistoriaClinica(turnoSeleccionado.paciente.idPaciente, canceladoRef)
    return () => {
      canceladoRef.current = true
    }
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
      setConsultaForm({
        motivoConsulta: '',
        diagnostico: '',
        tratamiento: '',
        notasAdicionales: '',
      })
      if (turnoSeleccionado?.paciente?.idPaciente) {
        cargarHistoriaClinica(turnoSeleccionado.paciente.idPaciente)
      }
    } catch (err) {
      setErrorConsulta(
        err.response?.data?.error || 'No se pudo registrar la consulta. Intentá nuevamente.'
      )
    } finally {
      setGuardandoConsulta(false)
    }
  }

  const handleInspeccionarPacs = async (estudio) => {
    setPacsEstado({
      cargando: true,
      error: '',
      resultado: null,
      estudio,
    })
    setModalPacsAbierto(true)

    try {
      const { data } = await api.get(`/estudios/${estudio.idEstudio}/pacs`)
      setPacsEstado({
        cargando: false,
        error: '',
        resultado: data.pacs,
        estudio,
      })
    } catch (err) {
      setPacsEstado({
        cargando: false,
        error: err.response?.data?.error || 'No se pudo consultar el servidor PACS.',
        resultado: null,
        estudio,
      })
    }
  }

  const cerrarModalPdf = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl('')
    }
    setModalPdfAbierto(false)
    setEstudioPdf(null)
    setPdfError('')
  }

  const handleVerInformePdf = async (estudio) => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl('')
    }
    setEstudioPdf(estudio)
    setPdfCargando(true)
    setPdfError('')
    setModalPdfAbierto(true)

    try {
      const respuesta = await api.get(`/estudios/${estudio.idEstudio}/informe`, {
        responseType: 'blob',
      })
      const blob = new Blob([respuesta.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      setPdfError(
        err.response?.data?.error ||
          'No se pudo generar o cargar el informe médico en PDF. Intentá nuevamente.'
      )
    } finally {
      setPdfCargando(false)
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
    const estudios = historiaClinica?.estudios || []
    const antecedentes = historiaClinica?.antecedentes
    const edad = historiaClinica?.datosBasicos?.edad

    return (
      <main className="agenda-page">
        <header className="agenda-topbar">
          <Link className="agenda-brand" to="/agenda">
            <img src="/logo-completo.png" alt="Sanatorio Antonia" className="agenda-brand-logo" />
          </Link>
          <button className="agenda-logout" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </header>

        <section className="agenda-content">
          <button
            className="agenda-back"
            onClick={() => {
              setPestana('agenda')
              navigate('/agenda')
            }}
          >
            ← Volver a la agenda
          </button>

          {cargando && !turnoSeleccionado ? (
            <div className="agenda-state">Cargando turno…</div>
          ) : error ? (
            <div className="agenda-state agenda-state--error">{error}</div>
          ) : !turnoSeleccionado ? (
            <div className="agenda-state">
              No encontramos ese turno para la fecha seleccionada.
            </div>
          ) : (
            <>
              <div className="agenda-page-heading agenda-detail-heading">
                <div>
                  <p className="agenda-overline">ATENCIÓN DEL PACIENTE</p>
                  <h1>{turnoSeleccionado.paciente.nombreCompleto}</h1>
                  <p>
                    DNI {turnoSeleccionado.paciente.dni}
                    {edad ? ` · ${edad} años` : ''} · {fechaLegible(fechaAtencion)} ·{' '}
                    {horaLegible(turnoSeleccionado.fechaHora)}
                  </p>
                </div>
                <span
                  className={`agenda-status agenda-status--${turnoSeleccionado.estado.toLowerCase()}`}
                >
                  {textoEstado(turnoSeleccionado.estado)}
                </span>
              </div>

              <nav className="agenda-tabs agenda-detail-tabs" aria-label="Atención del turno">
                <button
                  className={pestanaAtencion === 'ficha' ? 'is-active' : ''}
                  onClick={() => setPestanaAtencion('ficha')}
                >
                  Antecedentes e historia clínica
                </button>
                <button
                  className={pestanaAtencion === 'consulta' ? 'is-active' : ''}
                  onClick={() => setPestanaAtencion('consulta')}
                >
                  Registrar consulta
                </button>
              </nav>

              {pestanaAtencion === 'ficha' ? (
                <section className="agenda-card agenda-patient-card">
                  <h2>Datos disponibles del paciente</h2>
                  <dl className="agenda-patient-data">
                    <div>
                      <dt>Documento</dt>
                      <dd>{turnoSeleccionado.paciente.dni}</dd>
                    </div>
                    <div>
                      <dt>Teléfono</dt>
                      <dd>{turnoSeleccionado.paciente.telefono || 'Sin teléfono informado'}</dd>
                    </div>
                    <div>
                      <dt>Obra social y plan</dt>
                      <dd>{turnoSeleccionado.paciente.planObraSocial}</dd>
                    </div>
                    <div>
                      <dt>Motivo de cancelación</dt>
                      <dd>{turnoSeleccionado.motivoCancelacion || '—'}</dd>
                    </div>
                  </dl>

                  {/* Sección de Antecedentes Médicos (HU17 / HU8) */}
                  <h2>Antecedentes médicos</h2>
                  {cargandoHistoria ? (
                    <p className="agenda-description">Cargando antecedentes…</p>
                  ) : antecedentes ? (
                    <dl className="agenda-patient-data" style={{ margin: '14px 0 24px' }}>
                      <div>
                        <dt>Alergias</dt>
                        <dd>{antecedentes.alergias || 'Sin alergias conocidas'}</dd>
                      </div>
                      <div>
                        <dt>Enfermedades crónicas</dt>
                        <dd>{antecedentes.enfermedadesCronicas || 'Sin enfermedades crónicas'}</dd>
                      </div>
                      <div>
                        <dt>Grupo sanguíneo</dt>
                        <dd>{antecedentes.grupoSanguineo || 'Sin informar'}</dd>
                      </div>
                      <div>
                        <dt>Estado</dt>
                        <dd style={{ color: 'var(--ag-primary)' }}>Registrado por el paciente</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="agenda-description">
                      {historiaClinica?.mensajeAntecedentes ||
                        'El paciente no cargó antecedentes médicos todavía.'}
                    </p>
                  )}

                  {/* Sección de Estudios Médicos (HU21 / PDF / PACS) */}
                  <div className="agenda-studies-section">
                    <h2>Estudios médicos del paciente</h2>
                    <p className="agenda-description">
                      Estudios, informes y diagnósticos por imágenes cargados por el paciente (solo lectura).
                    </p>

                    {cargandoHistoria ? (
                      <p className="agenda-description">Cargando estudios…</p>
                    ) : estudios.length > 0 ? (
                      <div className="agenda-studies-list">
                        {estudios.map((estudio) => {
                          const esDicom =
                            estudio.integracionPacs?.tipoIdentificador ===
                              'DICOM_STUDY_INSTANCE_UID' || esStudyInstanceUid(estudio.codigo)
                          const visorUrl =
                            estudio.integracionPacs?.urlVisualizadorOhif ||
                            estudio.integracionPacs?.urlOrthancStoneViewer

                          return (
                            <article key={estudio.idEstudio} className="agenda-study-card">
                              <div className="agenda-study-header">
                                <div>
                                  <h3 className="agenda-study-title">{estudio.nombre}</h3>
                                  <p className="agenda-study-date">
                                    Cargado el{' '}
                                    {new Date(estudio.fechaCarga).toLocaleDateString('es-AR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                                <span
                                  className={`agenda-study-badge ${
                                    esDicom
                                      ? 'agenda-study-badge--dicom'
                                      : 'agenda-study-badge--code'
                                  }`}
                                >
                                  {esDicom ? 'PACS / DICOM' : 'Estudio Clínico'}
                                </span>
                              </div>

                              <div>
                                <span className="agenda-study-code" title="Código / StudyInstanceUID">
                                  {estudio.codigo}
                                </span>
                              </div>

                              {estudio.observacion && (
                                <p className="agenda-study-obs">
                                  <strong>Observaciones:</strong> {estudio.observacion}
                                </p>
                              )}

                              <div className="agenda-study-actions">
                                {/* BOTÓN DE INFORME EN PDF */}
                                <button
                                  type="button"
                                  className="agenda-btn-viewer"
                                  style={{ background: '#1F4FE0' }}
                                  onClick={() => handleVerInformePdf(estudio)}
                                >
                                  <FileText size={15} /> Ver Informe (PDF)
                                </button>

                                {esDicom && (
                                  <>
                                    {visorUrl && (
                                      <a
                                        href={visorUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="agenda-btn-pacs"
                                        title="Requiere tener iniciado el contenedor PACS en localhost:3005"
                                      >
                                        <Eye size={15} /> Visor PACS
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      className="agenda-btn-pacs"
                                      onClick={() => handleInspeccionarPacs(estudio)}
                                    >
                                      <Search size={15} /> Estado PACS
                                    </button>
                                  </>
                                )}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="agenda-description">
                        {historiaClinica?.mensajeEstudios ||
                          'El paciente no tiene estudios médicos registrados.'}
                      </p>
                    )}
                  </div>

                  {/* Sección de Consultas Anteriores */}
                  <h2 style={{ marginTop: '28px' }}>Consultas anteriores</h2>
                  {cargandoHistoria ? (
                    <p className="agenda-description">Cargando historia clínica…</p>
                  ) : consultasPaciente.length ? (
                    <div className="agenda-consult-history">
                      {consultasPaciente.map((item) => (
                        <article key={item.idTurno} className="agenda-consult-entry">
                          <p>
                            {fechaLegible(fechaLocal(new Date(item.fechaHora)))} ·{' '}
                            {horaLegible(item.fechaHora)}
                          </p>
                          <strong>{item.consulta.motivoConsulta}</strong>
                          <dl>
                            <div>
                              <dt>Diagnóstico</dt>
                              <dd>{item.consulta.diagnostico}</dd>
                            </div>
                            <div>
                              <dt>Tratamiento</dt>
                              <dd>{item.consulta.tratamiento}</dd>
                            </div>
                            {item.consulta.notasAdicionales && (
                              <div>
                                <dt>Notas</dt>
                                <dd>{item.consulta.notasAdicionales}</dd>
                              </div>
                            )}
                          </dl>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="agenda-description">
                      No hay consultas previas registradas para este paciente.
                    </p>
                  )}
                </section>
              ) : (
                <section className="agenda-card agenda-patient-card">
                  <h2>Registrar consulta</h2>
                  <p className="agenda-description">
                    Completá la evolución de esta atención. Al finalizar, el turno quedará marcado como completado.
                  </p>
                  {turnoConsultaRegistrada === String(idTurno) ? (
                    <p className="agenda-consult-success" role="status">
                      Consulta registrada con éxito. Este turno quedó completado.
                    </p>
                  ) : turnoSeleccionado.estado === 'COMPLETADO' ? (
                    <div className="agenda-state">Este turno ya fue atendido.</div>
                  ) : (
                    <form className="agenda-consult-form" onSubmit={registrarConsulta}>
                      <label>
                        Motivo de consulta
                        <textarea
                          required
                          value={consultaForm.motivoConsulta}
                          onChange={(event) =>
                            setConsultaForm({ ...consultaForm, motivoConsulta: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Diagnóstico o posible diagnóstico
                        <textarea
                          required
                          value={consultaForm.diagnostico}
                          onChange={(event) =>
                            setConsultaForm({ ...consultaForm, diagnostico: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Tratamiento y recomendaciones
                        <textarea
                          required
                          value={consultaForm.tratamiento}
                          onChange={(event) =>
                            setConsultaForm({ ...consultaForm, tratamiento: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Notas adicionales (opcional)
                        <textarea
                          value={consultaForm.notasAdicionales}
                          onChange={(event) =>
                            setConsultaForm({
                              ...consultaForm,
                              notasAdicionales: event.target.value,
                            })
                          }
                        />
                      </label>
                      {errorConsulta && (
                        <p className="agenda-state agenda-state--error">{errorConsulta}</p>
                      )}
                      {mensajeConsulta && (
                        <p className="agenda-consult-success" role="status">
                          {mensajeConsulta}
                        </p>
                      )}
                      <button className="agenda-primary-button" disabled={guardandoConsulta}>
                        {guardandoConsulta ? 'Guardando…' : 'Finalizar consulta'}
                      </button>
                    </form>
                  )}
                </section>
              )}
            </>
          )}
        </section>

        {/* Modal de Visualización de Informe Médico en PDF para el Profesional */}
        {modalPdfAbierto && estudioPdf && (
          <div className="misestudios-modal-backdrop" onClick={cerrarModalPdf}>
            <div
              className="misestudios-modal misestudios-modal--pdf"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="misestudios-pdf-modal-header">
                <h2 className="misestudios-pdf-modal-title">
                  <FileText size={20} className="text-blue-600" /> Informe Médico: {estudioPdf.nombre}
                </h2>

                <div className="misestudios-pdf-modal-actions">
                  {pdfUrl && (
                    <>
                      <a
                        href={pdfUrl}
                        download={`informe_${estudioPdf.idEstudio}_${estudioPdf.nombre.replace(/\s+/g, '_')}.pdf`}
                        className="misestudios-btn-pdf-action"
                      >
                        <Download size={15} /> Descargar PDF
                      </a>
                      <button
                        type="button"
                        className="misestudios-btn-pdf-action"
                        onClick={() => window.open(pdfUrl, '_blank')}
                      >
                        <ExternalLink size={15} /> Abrir en nueva pestaña
                      </button>
                    </>
                  )}
                  <button
                    className="misestudios-modal-close"
                    onClick={cerrarModalPdf}
                    aria-label="Cerrar visor"
                    style={{ position: 'static' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="misestudios-pdf-container">
                {pdfCargando ? (
                  <div style={{ color: '#fff', textAlign: 'center', margin: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Loader2 size={24} className="animate-spin text-white" />
                    <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Generando informe médico en PDF…</p>
                  </div>
                    <p style={{ opacity: 0.8 }}>Sanatorio Antonia - Departamento de Diagnóstico</p>
                  </div>
                ) : pdfError ? (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '24px', borderRadius: '10px', margin: 'auto', textAlign: 'center' }}>
                    <p style={{ fontWeight: 'bold' }}>{pdfError}</p>
                    <button
                      type="button"
                      className="misestudios-btn-primary"
                      onClick={() => handleVerInformePdf(estudioPdf)}
                      style={{ marginTop: '12px' }}
                    >
                      Reintentar
                    </button>
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    title={`Informe Médico - ${estudioPdf.nombre}`}
                    className="misestudios-pdf-iframe"
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Inspección PACS para el Profesional */}
        {modalPacsAbierto && pacsEstado.estudio && (
          <div
            className="misestudios-modal-backdrop"
            onClick={() => setModalPacsAbierto(false)}
          >
            <div
              className="misestudios-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                className="misestudios-modal-close"
                onClick={() => setModalPacsAbierto(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>

              <h2>Estado en Servidor PACS (Orthanc)</h2>
              <p className="misestudios-modal-desc">
                Disponibilidad de imágenes médicas para{' '}
                <strong>"{pacsEstado.estudio.nombre}"</strong>.
              </p>

              {pacsEstado.cargando ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p>Consultando el PACS vía DICOMweb…</p>
                </div>
              ) : pacsEstado.error ? (
                <div className="misestudios-alert misestudios-alert--error">
                  {pacsEstado.error}
                </div>
              ) : (
                <>
                  {pacsEstado.resultado?.servidorDesconectado ? (
                    <div className="misestudios-pacs-offline-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <AlertTriangle size={18} className="text-amber-500" />
                      <strong>Servidor PACS desconectado</strong>
                    </div>
                      <p>{pacsEstado.resultado?.mensaje}</p>
                      <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                        {pacsEstado.resultado?.ayuda}
                      </p>
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="agenda-btn-viewer"
                          style={{ background: '#1F4FE0' }}
                          onClick={() => {
                            setModalPacsAbierto(false)
                            handleVerInformePdf(pacsEstado.estudio)
                          }}
                        >
                          <FileText size={15} /> Ver Informe Médico en PDF
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`misestudios-pacs-status-banner ${
                        pacsEstado.resultado?.disponibleEnPacs
                          ? 'misestudios-pacs-status--available'
                          : 'misestudios-pacs-status--unavailable'
                      }`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {pacsEstado.resultado?.disponibleEnPacs ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <Info size={18} className="text-blue-500" />
                        )}
                      </span>
                      <span>{pacsEstado.resultado?.mensaje}</span>
                    </div>
                  )}

                  {pacsEstado.resultado?.metadatos && (
                    <dl className="misestudios-pacs-detail-grid">
                      <div className="misestudios-pacs-detail-item">
                        <dt>Modalidades</dt>
                        <dd>
                          {pacsEstado.resultado.metadatos.modalidades?.join(', ') || 'No informada'}
                        </dd>
                      </div>
                      <div className="misestudios-pacs-detail-item">
                        <dt>Fecha DICOM</dt>
                        <dd>{pacsEstado.resultado.metadatos.fechaEstudio || 'No informada'}</dd>
                      </div>
                      <div className="misestudios-pacs-detail-item">
                        <dt>Series</dt>
                        <dd>{pacsEstado.resultado.metadatos.cantidadSeries ?? '—'}</dd>
                      </div>
                      <div className="misestudios-pacs-detail-item">
                        <dt>Imágenes / Instancias</dt>
                        <dd>{pacsEstado.resultado.metadatos.cantidadImagenes ?? '—'}</dd>
                      </div>
                      {pacsEstado.resultado.metadatos.descripcion && (
                        <div
                          className="misestudios-pacs-detail-item"
                          style={{ gridColumn: '1 / -1' }}
                        >
                          <dt>Descripción del Estudio</dt>
                          <dd>{pacsEstado.resultado.metadatos.descripcion}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  <div className="misestudios-modal-actions">
                    <button
                      type="button"
                      className="misestudios-btn-primary"
                      onClick={() => {
                        setModalPacsAbierto(false)
                        handleVerInformePdf(pacsEstado.estudio)
                      }}
                    >
                      <FileText size={15} /> Ver Informe (PDF)
                    </button>
                    <button
                      type="button"
                      className="misestudios-btn-secondary"
                      onClick={() => setModalPacsAbierto(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="agenda-page">
      <header className="agenda-topbar">
        <Link className="agenda-brand" to="/agenda">
          <img src="/logo-completo.png" alt="Sanatorio Antonia" className="agenda-brand-logo" />
        </Link>
        <div className="agenda-topbar-actions">
          <div className="agenda-user-label">
            {profesional?.matricula
              ? `Matrícula ${profesional.matricula}`
              : 'Portal profesional'}
          </div>
          <button className="agenda-logout" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <section className="agenda-content">
        <div className="agenda-page-heading">
          <div>
            <p className="agenda-overline">PORTAL PROFESIONAL</p>
            <h1>
              {saludo}, {nombreProfesional}
            </h1>
            <p>{fechaLegible(hoy)}</p>
          </div>
          <div className="agenda-heading-mark" aria-hidden="true">
            <img src="/logo-simbolo.png" alt="" className="agenda-heading-logo" />
          </div>
        </div>

        <nav className="agenda-tabs" aria-label="Secciones de agenda">
          <button
            className={pestana === 'agenda' ? 'is-active' : ''}
            onClick={() => irAPestana('agenda')}
          >
            Agenda diaria
          </button>
          <button
            className={pestana === 'historial' ? 'is-active' : ''}
            onClick={() => irAPestana('historial')}
          >
            Historial de turnos
          </button>
          <button
            className={pestana === 'registrar' ? 'is-active' : ''}
            onClick={() => irAPestana('registrar')}
          >
            Registrar turno
          </button>
        </nav>

        {mensajeRegistro && pestana === 'agenda' && (
          <p className="agenda-consult-success" role="status">
            {mensajeRegistro}
          </p>
        )}

        {pestana === 'agenda' && (
          <>
            <section className="agenda-toolbar">
              <div className="agenda-date-control">
                <button aria-label="Día anterior" onClick={() => cambiarDia(-1)}>
                  ‹
                </button>
                <label htmlFor="agenda-fecha">
                  Día
                  <input
                    id="agenda-fecha"
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                  />
                </label>
                <button aria-label="Día siguiente" onClick={() => cambiarDia(1)}>
                  ›
                </button>
                <button className="agenda-today" onClick={() => setFecha(hoy)}>
                  Hoy
                </button>
              </div>
              <label className="agenda-filter">
                Estado
                <select value={estado} onChange={(event) => setEstado(event.target.value)}>
                  <option value="">Todos los estados</option>
                  {ESTADOS.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <div className="agenda-list-heading">
              <div>
                <h2>{fecha === hoy ? 'Turnos de hoy' : fechaLegible(fecha)}</h2>
                <p>
                  {total} {total === 1 ? 'turno' : 'turnos'}
                  {estado ? ` · ${textoEstado(estado).toLowerCase()}` : ''}
                </p>
              </div>
            </div>
            <TurnosList
              turnos={turnos}
              cargando={cargando}
              error={error}
              onSelect={mostrarTurno}
            />
          </>
        )}

        {pestana === 'historial' && (
          <>
            <section className="agenda-toolbar agenda-history-toolbar">
              <div>
                <h2>Historial de turnos</h2>
                <p>Consultá la agenda de un período y filtrá por estado.</p>
              </div>
              <form className="agenda-history-filter" onSubmit={aplicarRango}>
                <label>
                  Desde
                  <input
                    type="date"
                    required
                    value={rango.desde}
                    onChange={(event) => setRango({ ...rango, desde: event.target.value })}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="date"
                    required
                    min={rango.desde}
                    value={rango.hasta}
                    onChange={(event) => setRango({ ...rango, hasta: event.target.value })}
                  />
                </label>
                <label>
                  Estado
                  <select value={estado} onChange={(event) => setEstado(event.target.value)}>
                    <option value="">Todos</option>
                    {ESTADOS.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="agenda-primary-button">Buscar</button>
              </form>
            </section>
            <p className="agenda-range-caption">
              {fechaLegible(rangoAplicado.desde)} — {fechaLegible(rangoAplicado.hasta)} · {total}{' '}
              {total === 1 ? 'turno' : 'turnos'}
            </p>
            <TurnosList
              turnos={turnos}
              cargando={cargando}
              error={error}
              onSelect={(turno) => {
                setFecha(fechaLocal(new Date(turno.fechaHora)))
                navigate(
                  `/agenda/turnos/${turno.idTurno}?fecha=${fechaLocal(
                    new Date(turno.fechaHora)
                  )}`,
                  { state: { turno } }
                )
              }}
            />
          </>
        )}

        {pestana === 'registrar' && (
          <RegistroTurnoProfesional
            onTurnoRegistrado={(fechaTurno) => {
              setFecha(fechaTurno)
              setEstado('')
              setMensajeRegistro('Turno registrado con éxito. Quedó agregado a tu agenda.')
              setPestana('agenda')
              navigate('/agenda')
            }}
          />
        )}
      </section>
    </main>
  )
}

function TurnosList({ turnos, cargando, error, onSelect }) {
  if (cargando) return <div className="agenda-state">Cargando turnos…</div>
  if (error) return <div className="agenda-state agenda-state--error">{error}</div>
  if (!turnos.length)
    return (
      <div className="agenda-state agenda-state--empty">
        <CalendarX size={36} className="text-slate-400 mb-2" />
        <strong>No hay turnos para mostrar</strong>
        <p>Probá cambiar la fecha o el estado seleccionado.</p>
      </div>
    )

  return (
    <section className="agenda-appointments" aria-label="Listado de turnos">
      {turnos.map((turno) => (
        <button
          className="agenda-appointment"
          key={turno.idTurno}
          onClick={() => onSelect(turno)}
        >
          <span className="appointment-time">{horaLegible(turno.fechaHora)}</span>
          <span className="appointment-main">
            <strong>{turno.paciente.nombreCompleto}</strong>
            <small>
              DNI {turno.paciente.dni} · {turno.paciente.planObraSocial}
            </small>
          </span>
          <span className={`agenda-status agenda-status--${turno.estado.toLowerCase()}`}>
            {textoEstado(turno.estado)}
          </span>
          <span className="appointment-open">
            Ver atención <span aria-hidden="true">→</span>
          </span>
        </button>
      ))}
    </section>
  )
}

export default AgendaProfesional
