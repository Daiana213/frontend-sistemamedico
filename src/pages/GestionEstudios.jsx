import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import '../styles/GestionEstudios.css'
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
  Plus,
  Sparkles,
  Edit3,
  RotateCw,
  Database,
  ArrowLeft,
  User,
  Activity,
} from 'lucide-react'

const PRESETS_ESTUDIOS = [
  'Radiografía de Tórax Frente y Perfil',
  'Resonancia Magnética (RMN) de Cerebro',
  'Tomografía Computada (TC) de Abdomen y Pelvis',
  'Ecografía Abdominal Completa',
  'Electrocardiograma (ECG) de Reposo',
  'Laboratorio Bioquímico y Hemograma Completo',
  'Ecocardiograma Doppler Color',
]

function esStudyInstanceUid(codigo) {
  if (!codigo) return false
  return /^\d+(\.\d+)+$/.test(codigo.trim())
}

function GestionEstudios() {
  const navigate = useNavigate()

  // Lista de estudios y estados de carga
  const [estudios, setEstudios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [alertaExito, setAlertaExito] = useState('')

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')

  // Modal: Registrar nuevo estudio
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacientesSugeridos, setPacientesSugeridos] = useState([])
  const [buscandoPacientes, setBuscandoPacientes] = useState(false)
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)
  const [nuevoEstudioForm, setNuevoEstudioForm] = useState({
    nombre: '',
    codigo: '',
    observacion: '',
  })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState('')

  // Modal: Editar estudio
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false)
  const [estudioAEditar, setEstudioAEditar] = useState(null)
  const [editarForm, setEditarForm] = useState({
    nombre: '',
    codigo: '',
    observacion: '',
    estado: 'ACTIVO',
  })
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [errorEdicion, setErrorEdicion] = useState('')

  // Modal: Visor de Informe PDF
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfCargando, setPdfCargando] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [estudioPdf, setEstudioPdf] = useState(null)

  // Modal: Estado PACS Orthanc
  const [modalPacsAbierto, setModalPacsAbierto] = useState(false)
  const [pacsEstado, setPacsEstado] = useState({
    cargando: false,
    error: '',
    resultado: null,
    estudio: null,
  })

  // Cargar lista completa de estudios médicos para admin
  const cargarEstudios = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true)
    else setCargando(true)
    setErrorLista('')
    try {
      const params = {}
      if (filtroEstado !== 'TODOS') params.estado = filtroEstado
      if (busqueda.trim()) params.q = busqueda.trim()

      const { data } = await api.get('/estudios/admin', { params })
      setEstudios(Array.isArray(data) ? data : [])
    } catch (err) {
      setErrorLista(
        err.response?.data?.error || 'No se pudieron cargar los estudios médicos. Intentá nuevamente.'
      )
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [filtroEstado, busqueda])

  useEffect(() => {
    cargarEstudios()
  }, [cargarEstudios])

  // Búsqueda de pacientes con debounce para el modal de nuevo estudio
  useEffect(() => {
    if (!modalCrearAbierto || !busquedaPaciente.trim() || pacienteSeleccionado) {
      setPacientesSugeridos([])
      return
    }

    const timer = setTimeout(async () => {
      setBuscandoPacientes(true)
      try {
        const { data } = await api.get('/estudios/pacientes-busqueda', {
          params: { q: busquedaPaciente.trim() },
        })
        setPacientesSugeridos(Array.isArray(data) ? data : [])
      } catch {
        setPacientesSugeridos([])
      } finally {
        setBuscandoPacientes(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [busquedaPaciente, modalCrearAbierto, pacienteSeleccionado])

  // Métricas rápidas
  const metricas = useMemo(() => {
    const total = estudios.length
    const activos = estudios.filter((e) => e.estado === 'ACTIVO').length
    const dicom = estudios.filter((e) => esStudyInstanceUid(e.codigo)).length
    const clinicos = total - dicom
    const pacientesUnicos = new Set(estudios.map((e) => e.idPaciente)).size
    return { total, activos, dicom, clinicos, pacientesUnicos }
  }, [estudios])

  // Generador de código automático
  const generarCodigoNuevo = () => {
    const fecha = new Date()
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    setNuevoEstudioForm((prev) => ({ ...prev, codigo: `EST-${anio}${mes}${dia}-${rand}` }))
  }

  // Guardar nuevo estudio
  const handleGuardarNuevoEstudio = async (e) => {
    e.preventDefault()
    if (!pacienteSeleccionado?.idPaciente) {
      setErrorNuevo('Debés seleccionar un paciente.')
      return
    }
    if (!nuevoEstudioForm.nombre.trim()) {
      setErrorNuevo('El nombre del estudio es obligatorio.')
      return
    }

    setGuardandoNuevo(true)
    setErrorNuevo('')
    try {
      await api.post('/estudios/admin', {
        idPaciente: pacienteSeleccionado.idPaciente,
        nombre: nuevoEstudioForm.nombre.trim(),
        codigo: nuevoEstudioForm.codigo.trim() || undefined,
        observacion: nuevoEstudioForm.observacion.trim() || undefined,
      })

      setAlertaExito('Estudio médico registrado y vinculado al paciente con éxito.')
      setModalCrearAbierto(false)
      setPacienteSeleccionado(null)
      setBusquedaPaciente('')
      setNuevoEstudioForm({ nombre: '', codigo: '', observacion: '' })
      cargarEstudios(true)
      setTimeout(() => setAlertaExito(''), 4000)
    } catch (err) {
      setErrorNuevo(err.response?.data?.error || 'No se pudo registrar el estudio médico.')
    } finally {
      setGuardandoNuevo(false)
    }
  }

  // Abrir modal de edición
  const handleAbrirEditar = (estudio) => {
    setEstudioAEditar(estudio)
    setEditarForm({
      nombre: estudio.nombre || '',
      codigo: estudio.codigo || '',
      observacion: estudio.observacion || '',
      estado: estudio.estado || 'ACTIVO',
    })
    setErrorEdicion('')
    setModalEditarAbierto(true)
  }

  // Guardar edición
  const handleGuardarEdicion = async (e) => {
    e.preventDefault()
    if (!editarForm.nombre.trim()) {
      setErrorEdicion('El nombre del estudio es obligatorio.')
      return
    }

    setGuardandoEdicion(true)
    setErrorEdicion('')
    try {
      await api.put(`/estudios/${estudioAEditar.idEstudio}`, {
        nombre: editarForm.nombre.trim(),
        codigo: editarForm.codigo.trim() || undefined,
        observacion: editarForm.observacion.trim() || undefined,
        estado: editarForm.estado,
      })

      setAlertaExito('Estudio médico actualizado correctamente.')
      setModalEditarAbierto(false)
      setEstudioAEditar(null)
      cargarEstudios(true)
      setTimeout(() => setAlertaExito(''), 4000)
    } catch (err) {
      setErrorEdicion(err.response?.data?.error || 'No se pudo actualizar el estudio médico.')
    } finally {
      setGuardandoEdicion(false)
    }
  }

  // Cambiar estado rápido (Activar / Inactivar)
  const handleCambiarEstado = async (estudio) => {
    const nuevoEstado = estudio.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
    const confirmacion = window.confirm(
      `¿Confirmás cambiar el estado del estudio "${estudio.nombre}" a ${nuevoEstado}?`
    )
    if (!confirmacion) return

    try {
      await api.patch(`/estudios/${estudio.idEstudio}/estado`, { estado: nuevoEstado })
      setAlertaExito(`Estudio marcado como ${nuevoEstado} exitosamente.`)
      cargarEstudios(true)
      setTimeout(() => setAlertaExito(''), 3500)
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo actualizar el estado del estudio.')
    }
  }

  // Visualizar informe PDF
  const handleVerInformePdf = async (estudio) => {
    setEstudioPdf(estudio)
    setPdfUrl('')
    setPdfError('')
    setPdfCargando(true)
    setModalPdfAbierto(true)

    try {
      const response = await api.get(`/estudios/${estudio.idEstudio}/informe`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      setPdfError(
        err.response?.data?.error ||
          'No pudimos generar el informe médico en PDF. Comprobá que el servicio esté operativo.'
      )
    } finally {
      setPdfCargando(false)
    }
  }

  // Inspeccionar estado PACS
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
        error: err.response?.data?.error || 'No se pudo verificar el estado en el servidor PACS.',
        resultado: null,
        estudio,
      })
    }
  }

  return (
    <div className="gestion-estudios-page">
      {/* Barra superior */}
      <header className="gestion-estudios-topbar">
        <div className="gestion-estudios-topbar-inner">
          <div className="gestion-estudios-brand">
            <Link to="/dashboard" className="gestion-estudios-back-link">
              <ArrowLeft size={16} /> Volver al Dashboard
            </Link>
            <span className="gestion-estudios-brand-divider">|</span>
            <img src="/logo-completo.png" alt="Sanatorio Antonia" className="gestion-estudios-logo" />
          </div>

          <div className="gestion-estudios-topbar-actions">
            <span className="gestion-estudios-role-badge">ADMINISTRACIÓN</span>
            <button
              type="button"
              className="gestion-estudios-btn-logout"
              onClick={() => {
                localStorage.clear()
                navigate('/')
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor principal */}
      <main className="gestion-estudios-container">
        {/* Encabezado y botón de acción */}
        <section className="gestion-estudios-heading">
          <div className="gestion-estudios-title-wrap">
            <span className="gestion-estudios-eyebrow">DIAGNÓSTICO Y SERVICIOS HOSPITALARIOS</span>
            <h1>Gestión de Estudios Médicos</h1>
            <p>
              Administrá los estudios clínicos, análisis de laboratorio e imágenes DICOM de los pacientes,
              con acceso inmediato a informes en PDF y conexión al servidor PACS Orthanc.
            </p>
          </div>

          <div className="gestion-estudios-actions-bar">
            <button
              type="button"
              className="gestion-estudios-btn-refresh"
              onClick={() => cargarEstudios(true)}
              disabled={actualizando || cargando}
              title="Recargar listado"
            >
              <RotateCw size={16} className={actualizando ? 'animate-spin' : ''} />
              <span>{actualizando ? 'Actualizando…' : 'Refrescar'}</span>
            </button>

            <button
              type="button"
              className="gestion-estudios-btn-primary"
              onClick={() => {
                setPacienteSeleccionado(null)
                setBusquedaPaciente('')
                setNuevoEstudioForm({ nombre: '', codigo: '', observacion: '' })
                setErrorNuevo('')
                setModalCrearAbierto(true)
              }}
            >
              <Plus size={16} /> Registrar nuevo estudio
            </button>
          </div>
        </section>

        {/* Alerta de éxito */}
        {alertaExito && (
          <div className="gestion-estudios-alert gestion-estudios-alert--success">
            <Check size={18} /> {alertaExito}
          </div>
        )}

        {/* Alerta de error */}
        {errorLista && (
          <div className="gestion-estudios-alert gestion-estudios-alert--error">
            <AlertTriangle size={18} /> {errorLista}
          </div>
        )}

        {/* Tarjetas de Métricas Rápidas */}
        <section className="gestion-estudios-metrics-grid">
          <div className="gestion-estudios-metric-card">
            <div className="gestion-estudios-metric-icon" style={{ background: '#E0E7FF', color: '#3730A3' }}>
              <FileText size={22} />
            </div>
            <div className="gestion-estudios-metric-data">
              <span className="gestion-estudios-metric-num">{metricas.total}</span>
              <span className="gestion-estudios-metric-label">Estudios registrados</span>
            </div>
          </div>

          <div className="gestion-estudios-metric-card">
            <div className="gestion-estudios-metric-icon" style={{ background: '#DCFCE7', color: '#166534' }}>
              <Activity size={22} />
            </div>
            <div className="gestion-estudios-metric-data">
              <span className="gestion-estudios-metric-num">{metricas.activos}</span>
              <span className="gestion-estudios-metric-label">Estudios activos</span>
            </div>
          </div>

          <div className="gestion-estudios-metric-card">
            <div className="gestion-estudios-metric-icon" style={{ background: '#EDE9FE', color: '#5B21B6' }}>
              <Database size={22} />
            </div>
            <div className="gestion-estudios-metric-data">
              <span className="gestion-estudios-metric-num">{metricas.dicom}</span>
              <span className="gestion-estudios-metric-label">Imágenes PACS / DICOM</span>
            </div>
          </div>

          <div className="gestion-estudios-metric-card">
            <div className="gestion-estudios-metric-icon" style={{ background: '#FEF3C7', color: '#92400E' }}>
              <User size={22} />
            </div>
            <div className="gestion-estudios-metric-data">
              <span className="gestion-estudios-metric-num">{metricas.pacientesUnicos}</span>
              <span className="gestion-estudios-metric-label">Pacientes vinculados</span>
            </div>
          </div>
        </section>

        {/* Barra de Filtros y Búsqueda */}
        <section className="gestion-estudios-toolbar">
          <div className="gestion-estudios-search-box">
            <Search size={18} className="gestion-estudios-search-icon" />
            <input
              type="text"
              placeholder="Buscar por paciente, DNI, nombre de estudio o código UID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="gestion-estudios-search-clear"
                onClick={() => setBusqueda('')}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="gestion-estudios-filter-group">
            <label htmlFor="filtro-estado">Estado:</label>
            <select
              id="filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos (Baja)</option>
            </select>
          </div>
        </section>

        {/* Tabla de Estudios Médicos */}
        <section className="gestion-estudios-table-card">
          {cargando ? (
            <div className="gestion-estudios-loading-state">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p>Cargando registros de estudios médicos…</p>
            </div>
          ) : estudios.length === 0 ? (
            <div className="gestion-estudios-empty-state">
              <FileText size={48} className="text-gray-300" />
              <h3>No se encontraron estudios médicos</h3>
              <p>
                {busqueda || filtroEstado !== 'TODOS'
                  ? 'No hay registros que coincidan con los filtros aplicados.'
                  : 'Aún no se han registrado estudios médicos en el sistema.'}
              </p>
              {(busqueda || filtroEstado !== 'TODOS') && (
                <button
                  type="button"
                  className="gestion-estudios-btn-secondary"
                  onClick={() => {
                    setBusqueda('')
                    setFiltroEstado('TODOS')
                  }}
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <div className="gestion-estudios-table-wrapper">
              <table className="gestion-estudios-table">
                <thead>
                  <tr>
                    <th>Código / Tipo</th>
                    <th>Paciente</th>
                    <th>Estudio Médico</th>
                    <th>Fecha de Carga</th>
                    <th>Observaciones</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {estudios.map((estudio) => {
                    const esDicom =
                      estudio.integracionPacs?.tipoIdentificador === 'DICOM_STUDY_INSTANCE_UID' ||
                      esStudyInstanceUid(estudio.codigo)
                    const visorUrl =
                      estudio.integracionPacs?.urlVisualizadorOhif ||
                      estudio.integracionPacs?.urlOrthancStoneViewer

                    return (
                      <tr key={estudio.idEstudio} className={estudio.estado === 'INACTIVO' ? 'row-inactiva' : ''}>
                        {/* Código y Badge de tipo */}
                        <td>
                          <div className="gestion-estudios-col-code">
                            <span
                              className={`gestion-estudios-type-badge ${
                                esDicom
                                  ? 'gestion-estudios-type-badge--dicom'
                                  : 'gestion-estudios-type-badge--clinico'
                              }`}
                            >
                              {esDicom ? 'PACS / DICOM' : 'Clínico'}
                            </span>
                            <span className="gestion-estudios-code-text" title={estudio.codigo}>
                              {estudio.codigo}
                            </span>
                          </div>
                        </td>

                        {/* Paciente */}
                        <td>
                          <div className="gestion-estudios-col-patient">
                            <strong>{estudio.paciente?.nombreCompleto || 'Paciente no identificado'}</strong>
                            <small>
                              DNI {estudio.paciente?.dni || '—'} · {estudio.paciente?.obraSocial || 'Particular'}
                            </small>
                          </div>
                        </td>

                        {/* Nombre del Estudio */}
                        <td>
                          <span className="gestion-estudios-study-name">{estudio.nombre}</span>
                        </td>

                        {/* Fecha */}
                        <td>
                          <span className="gestion-estudios-date">
                            {new Date(estudio.fechaCarga).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* Observación */}
                        <td>
                          <div className="gestion-estudios-col-obs" title={estudio.observacion || ''}>
                            {estudio.observacion ? estudio.observacion : <em className="text-gray-400">Sin observaciones</em>}
                          </div>
                        </td>

                        {/* Estado */}
                        <td>
                          <span
                            className={`gestion-estudios-status-badge ${
                              estudio.estado === 'ACTIVO'
                                ? 'gestion-estudios-status-badge--active'
                                : 'gestion-estudios-status-badge--inactive'
                            }`}
                          >
                            {estudio.estado}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td>
                          <div className="gestion-estudios-row-actions">
                            {/* Ver Informe PDF */}
                            <button
                              type="button"
                              className="gestion-estudios-btn-action gestion-estudios-btn-action--pdf"
                              onClick={() => handleVerInformePdf(estudio)}
                              title="Generar y visualizar Informe Oficial en PDF"
                            >
                              <FileText size={15} /> Informe PDF
                            </button>

                            {/* Visor PACS si es DICOM */}
                            {esDicom && visorUrl && (
                              <a
                                href={visorUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gestion-estudios-btn-action gestion-estudios-btn-action--pacs"
                                title="Abrir visor de imágenes médicas PACS"
                              >
                                <Eye size={15} /> Visor
                              </a>
                            )}

                            {/* Estado PACS si es DICOM */}
                            {esDicom && (
                              <button
                                type="button"
                                className="gestion-estudios-btn-action gestion-estudios-btn-action--pacs-check"
                                onClick={() => handleInspeccionarPacs(estudio)}
                                title="Verificar metadatos e instancias en el PACS Orthanc"
                              >
                                <Search size={15} /> PACS
                              </button>
                            )}

                            {/* Editar estudio */}
                            <button
                              type="button"
                              className="gestion-estudios-btn-action gestion-estudios-btn-action--edit"
                              onClick={() => handleAbrirEditar(estudio)}
                              title="Editar datos del estudio"
                            >
                              <Edit3 size={15} /> Editar
                            </button>

                            {/* Dar de baja / Activar */}
                            <button
                              type="button"
                              className={`gestion-estudios-btn-action ${
                                estudio.estado === 'ACTIVO'
                                  ? 'gestion-estudios-btn-action--toggle-off'
                                  : 'gestion-estudios-btn-action--toggle-on'
                              }`}
                              onClick={() => handleCambiarEstado(estudio)}
                              title={estudio.estado === 'ACTIVO' ? 'Dar de baja (Inactivar)' : 'Reactivar estudio'}
                            >
                              {estudio.estado === 'ACTIVO' ? 'Baja' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* =========================================================================
          MODAL: Registrar nuevo estudio médico (ADMIN)
         ========================================================================= */}
      {modalCrearAbierto && (
        <div
          className="misestudios-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-admin-crear-titulo"
        >
          <div className="misestudios-modal-card" style={{ maxWidth: '620px', width: '92%' }}>
            <div className="misestudios-modal-header">
              <div>
                <h3 id="modal-admin-crear-titulo" className="misestudios-modal-title">
                  Registrar estudio médico
                </h3>
                <p className="misestudios-modal-subtitle">
                  Asigná un estudio clínico o DICOM al historial médico del paciente.
                </p>
              </div>
              <button
                type="button"
                className="misestudios-modal-close"
                onClick={() => setModalCrearAbierto(false)}
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            {errorNuevo && (
              <div className="gestion-estudios-alert gestion-estudios-alert--error" style={{ margin: '14px 0' }}>
                <AlertTriangle size={18} /> {errorNuevo}
              </div>
            )}

            <form onSubmit={handleGuardarNuevoEstudio} className="gestion-estudios-form">
              {/* Selección de Paciente */}
              <div className="gestion-estudios-field-group">
                <label>
                  Paciente del Sanatorio <span style={{ color: '#DC2626' }}>*</span>
                </label>

                {pacienteSeleccionado ? (
                  <div className="gestion-estudios-selected-patient-card">
                    <div>
                      <strong>{pacienteSeleccionado.nombreCompleto}</strong>
                      <p>
                        DNI: {pacienteSeleccionado.dni} · Cobertura:{' '}
                        {pacienteSeleccionado.planObraSocial || 'Particular'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="gestion-estudios-btn-remove-patient"
                      onClick={() => {
                        setPacienteSeleccionado(null)
                        setBusquedaPaciente('')
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="gestion-estudios-patient-search-container">
                    <input
                      type="text"
                      placeholder="Escribí el DNI o apellido del paciente..."
                      value={busquedaPaciente}
                      onChange={(e) => setBusquedaPaciente(e.target.value)}
                      autoFocus
                    />
                    {buscandoPacientes && (
                      <span className="gestion-estudios-patient-search-spinner">
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                      </span>
                    )}

                    {pacientesSugeridos.length > 0 && (
                      <ul className="gestion-estudios-patient-suggestions-list">
                        {pacientesSugeridos.map((p) => (
                          <li
                            key={p.idPaciente}
                            onClick={() => {
                              setPacienteSeleccionado(p)
                              setPacientesSugeridos([])
                            }}
                          >
                            <strong>{p.nombreCompleto}</strong>
                            <span>DNI: {p.dni} · {p.planObraSocial || 'Particular'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Nombre del Estudio */}
              <div className="gestion-estudios-field-group">
                <label htmlFor="admin-estudio-nombre">
                  Nombre o Tipo del Estudio <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="admin-estudio-nombre"
                  type="text"
                  placeholder="Ej. Radiografía de Tórax Frente y Perfil"
                  value={nuevoEstudioForm.nombre}
                  onChange={(e) => setNuevoEstudioForm({ ...nuevoEstudioForm, nombre: e.target.value })}
                  required
                />
                <div className="gestion-estudios-preset-chips">
                  <span className="gestion-estudios-preset-caption">Sugerencias:</span>
                  {PRESETS_ESTUDIOS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="gestion-estudios-preset-chip"
                      onClick={() => setNuevoEstudioForm({ ...nuevoEstudioForm, nombre: preset })}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Código / StudyInstanceUID */}
              <div className="gestion-estudios-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="admin-estudio-codigo">
                    Código de Estudio o StudyInstanceUID <span style={{ color: '#6B7280', fontSize: '12px' }}>(Opcional)</span>
                  </label>
                  <button
                    type="button"
                    className="gestion-estudios-btn-link"
                    onClick={generarCodigoNuevo}
                  >
                    <Sparkles size={13} /> Generar código automático
                  </button>
                </div>
                <input
                  id="admin-estudio-codigo"
                  type="text"
                  placeholder="Ej. 1.2.840.113619... o EST-20261027-A8B9"
                  value={nuevoEstudioForm.codigo}
                  onChange={(e) => setNuevoEstudioForm({ ...nuevoEstudioForm, codigo: e.target.value })}
                />
                <small style={{ color: '#6B7280', fontSize: '12px', marginTop: '3px', display: 'block' }}>
                  Si el estudio proviene del equipo de rayos/resonancia (DICOM), colocá el StudyInstanceUID para visualización web.
                </small>
              </div>

              {/* Observaciones */}
              <div className="gestion-estudios-field-group">
                <label htmlFor="admin-estudio-obs">Observaciones / Conclusiones Médicas</label>
                <textarea
                  id="admin-estudio-obs"
                  rows={3}
                  placeholder="Observaciones clínicas, valores o protocolo realizado..."
                  value={nuevoEstudioForm.observacion}
                  onChange={(e) => setNuevoEstudioForm({ ...nuevoEstudioForm, observacion: e.target.value })}
                />
              </div>

              {/* Acciones */}
              <div className="misestudios-modal-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="misestudios-btn-secondary"
                  onClick={() => setModalCrearAbierto(false)}
                  disabled={guardandoNuevo}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="misestudios-btn-primary"
                  disabled={guardandoNuevo}
                >
                  {guardandoNuevo ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Registrando…
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Registrar estudio
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Editar estudio médico (ADMIN)
         ========================================================================= */}
      {modalEditarAbierto && estudioAEditar && (
        <div
          className="misestudios-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-admin-editar-titulo"
        >
          <div className="misestudios-modal-card" style={{ maxWidth: '580px', width: '92%' }}>
            <div className="misestudios-modal-header">
              <div>
                <h3 id="modal-admin-editar-titulo" className="misestudios-modal-title">
                  Editar estudio médico
                </h3>
                <p className="misestudios-modal-subtitle">
                  Paciente: {estudioAEditar.paciente?.nombreCompleto} · DNI: {estudioAEditar.paciente?.dni}
                </p>
              </div>
              <button
                type="button"
                className="misestudios-modal-close"
                onClick={() => setModalEditarAbierto(false)}
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            {errorEdicion && (
              <div className="gestion-estudios-alert gestion-estudios-alert--error" style={{ margin: '14px 0' }}>
                <AlertTriangle size={18} /> {errorEdicion}
              </div>
            )}

            <form onSubmit={handleGuardarEdicion} className="gestion-estudios-form">
              <div className="gestion-estudios-field-group">
                <label htmlFor="edit-estudio-nombre">
                  Nombre del Estudio <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="edit-estudio-nombre"
                  type="text"
                  value={editarForm.nombre}
                  onChange={(e) => setEditarForm({ ...editarForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="gestion-estudios-field-group">
                <label htmlFor="edit-estudio-codigo">Código / StudyInstanceUID</label>
                <input
                  id="edit-estudio-codigo"
                  type="text"
                  value={editarForm.codigo}
                  onChange={(e) => setEditarForm({ ...editarForm, codigo: e.target.value })}
                />
              </div>

              <div className="gestion-estudios-field-group">
                <label htmlFor="edit-estudio-estado">Estado del Estudio</label>
                <select
                  id="edit-estudio-estado"
                  value={editarForm.estado}
                  onChange={(e) => setEditarForm({ ...editarForm, estado: e.target.value })}
                >
                  <option value="ACTIVO">ACTIVO (Habilitado)</option>
                  <option value="INACTIVO">INACTIVO (Dado de baja)</option>
                </select>
              </div>

              <div className="gestion-estudios-field-group">
                <label htmlFor="edit-estudio-obs">Observaciones</label>
                <textarea
                  id="edit-estudio-obs"
                  rows={3}
                  value={editarForm.observacion}
                  onChange={(e) => setEditarForm({ ...editarForm, observacion: e.target.value })}
                />
              </div>

              <div className="misestudios-modal-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="misestudios-btn-secondary"
                  onClick={() => setModalEditarAbierto(false)}
                  disabled={guardandoEdicion}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="misestudios-btn-primary"
                  disabled={guardandoEdicion}
                >
                  {guardandoEdicion ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando…
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Visor de Informe Oficial en PDF
         ========================================================================= */}
      {modalPdfAbierto && estudioPdf && (
        <div
          className="misestudios-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-admin-pdf-titulo"
        >
          <div className="misestudios-pdf-modal-card">
            <div className="misestudios-pdf-modal-header">
              <div className="misestudios-pdf-modal-title-group">
                <h3 id="modal-admin-pdf-titulo">{estudioPdf.nombre}</h3>
                <p>
                  Paciente: {estudioPdf.paciente?.nombreCompleto} · DNI: {estudioPdf.paciente?.dni} · Código: {estudioPdf.codigo}
                </p>
              </div>

              <div className="misestudios-pdf-modal-actions">
                {pdfUrl && (
                  <>
                    <a
                      href={pdfUrl}
                      download={`Informe_${estudioPdf.idEstudio}_${estudioPdf.nombre.replace(/\s+/g, '_')}.pdf`}
                      className="misestudios-btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      <Download size={15} /> Descargar PDF
                    </a>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="misestudios-btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={15} /> Abrir
                    </a>
                  </>
                )}
                <button
                  type="button"
                  className="misestudios-modal-close"
                  onClick={() => {
                    setModalPdfAbierto(false)
                    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
                    setPdfUrl('')
                  }}
                  aria-label="Cerrar visor"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="misestudios-pdf-container">
              {pdfCargando ? (
                <div style={{ color: '#fff', textAlign: 'center', margin: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Loader2 size={24} className="animate-spin text-white" />
                    <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                      Generando informe oficial en PDF…
                    </p>
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
                  title={`Informe Oficial - ${estudioPdf.nombre}`}
                  className="misestudios-pdf-iframe"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Estado PACS Orthanc
         ========================================================================= */}
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
              Metadatos e instancias DICOM para <strong>"{pacsEstado.estudio.nombre}"</strong>.
            </p>

            {pacsEstado.cargando ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Loader2 size={24} className="animate-spin text-blue-600 mb-2" />
                <p>Consultando servidor PACS vía DICOMweb…</p>
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
                        className="gestion-estudios-btn-action gestion-estudios-btn-action--pdf"
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
                      <dd>{pacsEstado.resultado.metadatos.modalidades?.join(', ') || 'No informada'}</dd>
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
                      <div className="misestudios-pacs-detail-item" style={{ gridColumn: '1 / -1' }}>
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
    </div>
  )
}

export default GestionEstudios
