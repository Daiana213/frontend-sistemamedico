import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../api/axios'
import '../styles/MisEstudios.css'
import {
  ArrowLeft,
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
  FolderOpen,
  Activity,
  Plus,
} from 'lucide-react'

const FORM_INICIAL = {
  nombre: '',
  codigo: '',
  observacion: '',
}

function esStudyInstanceUid(codigo) {
  if (!codigo) return false
  return /^\d+(\.\d+)+$/.test(codigo.trim())
}

function formatearFecha(fechaString) {
  if (!fechaString) return '—'
  try {
    const fecha = new Date(fechaString)
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fechaString
  }
}

export default function MisEstudios() {
  const [estudios, setEstudios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  // Estado para modal de formulario (Alta / Edición)
  const [modalFormAbierto, setModalFormAbierto] = useState(false)
  const [estudioEditando, setEstudioEditando] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [formErrores, setFormErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  // Estado para modal de confirmación de eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [estudioAEliminar, setEstudioAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  // Estado para modal de inspección PACS
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

  // Feedback al copiar código
  const [copiadoId, setCopiadoId] = useState(null)

  const location = useLocation()
  const volverA =
    location.state?.from ||
    (new URLSearchParams(location.search).get('from') === 'antecedentes'
      ? '/mis-antecedentes'
      : '/dashboard')
  const textoVolver = volverA === '/mis-antecedentes' ? 'Volver a antecedentes' : 'Volver al panel'

  const cargarEstudios = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/estudios')
      setEstudios(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar tus estudios médicos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarEstudios()
  }, [cargarEstudios])

  // Limpieza de URLs Blob al desmontar o cerrar PDF
  const cerrarModalPdf = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl('')
    }
    setModalPdfAbierto(false)
    setEstudioPdf(null)
    setPdfError('')
  }

  // Ver Informe Médico Oficial en PDF
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

  // Abrir modal de creación
  const handleAbrirCrear = () => {
    setEstudioEditando(null)
    setForm(FORM_INICIAL)
    setFormErrores({})
    setModalFormAbierto(true)
  }

  // Abrir modal de edición
  const handleAbrirEditar = (estudio) => {
    setEstudioEditando(estudio)
    setForm({
      nombre: estudio.nombre || '',
      codigo: estudio.codigo || '',
      observacion: estudio.observacion || '',
    })
    setFormErrores({})
    setModalFormAbierto(true)
  }

  // Validación de formulario
  const validarFormulario = () => {
    const errores = {}
    const nombreLimpio = form.nombre.trim()
    const codigoLimpio = form.codigo.trim()

    if (!nombreLimpio) {
      errores.nombre = 'El nombre del estudio es obligatorio.'
    } else if (nombreLimpio.length < 2) {
      errores.nombre = 'El nombre debe contener al menos 2 caracteres.'
    } else if (nombreLimpio.length > 150) {
      errores.nombre = 'El nombre no puede superar los 150 caracteres.'
    }

    if (!codigoLimpio) {
      errores.codigo = 'El código o StudyInstanceUID del estudio es obligatorio.'
    } else if (codigoLimpio.length > 150) {
      errores.codigo = 'El código no puede superar los 150 caracteres.'
    }

    if (form.observacion && form.observacion.length > 1000) {
      errores.observacion = 'Las observaciones no pueden superar los 1000 caracteres.'
    }

    setFormErrores(errores)
    return Object.keys(errores).length === 0
  }

  // Guardar (Alta o Edición)
  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!validarFormulario()) return

    setGuardando(true)
    setError('')
    try {
      const payload = {
        nombre: form.nombre.trim(),
        codigo: form.codigo.trim(),
        observacion: form.observacion.trim() || null,
      }

      if (estudioEditando) {
        await api.put(`/estudios/${estudioEditando.idEstudio}`, payload)
        setMensajeExito('Estudio médico actualizado correctamente.')
      } else {
        await api.post('/estudios', payload)
        setMensajeExito('Estudio médico registrado correctamente.')
      }

      setModalFormAbierto(false)
      cargarEstudios()
    } catch (err) {
      const mensajeServidor = err.response?.data?.error || 'Ocurrió un error al guardar el estudio.'
      setFormErrores((prev) => ({ ...prev, general: mensajeServidor }))
    } finally {
      setGuardando(false)
    }
  }

  // Abrir confirmación de eliminación
  const handleAbrirEliminar = (estudio) => {
    setEstudioAEliminar(estudio)
    setModalEliminarAbierto(true)
  }

  // Confirmar eliminación
  const handleConfirmarEliminar = async () => {
    if (!estudioAEliminar) return
    setEliminando(true)
    setError('')
    try {
      await api.delete(`/estudios/${estudioAEliminar.idEstudio}`)
      setMensajeExito(`El estudio "${estudioAEliminar.nombre}" fue eliminado correctamente.`)
      setModalEliminarAbierto(false)
      setEstudioAEliminar(null)
      cargarEstudios()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el estudio médico.')
    } finally {
      setEliminando(false)
    }
  }

  // Inspeccionar PACS
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

  // Copiar código al portapapeles
  const handleCopiarCodigo = (codigo, idEstudio) => {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiadoId(idEstudio)
      setTimeout(() => setCopiadoId(null), 2000)
    })
  }

  return (
    <main className="misestudios-page">
      <header className="misestudios-header">
        <Link to={volverA} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} />
          {textoVolver}
        </Link>
        <img
          src="/logo-completo.png"
          alt="Sanatorio Antonia"
          className="misestudios-header-logo"
        />
      </header>

      <div className="misestudios-container">
        {/* Banner superior */}
        <section className="misestudios-banner">
          <div>
            <p className="misestudios-eyebrow">MI HISTORIA CLÍNICA</p>
            <h1 className="misestudios-title">Mis Estudios Médicos</h1>
            <p className="misestudios-subtitle">
              Gestioná tus estudios, informes y códigos de diagnóstico por imágenes. Podés previsualizar
              y descargar el informe médico en PDF de cada estudio en cualquier momento.
            </p>
          </div>

        </section>

        {/* Alerta de éxito */}
        {mensajeExito && (
          <div className="misestudios-alert misestudios-alert--success" role="status">
            <span>{mensajeExito}</span>
            <button
              className="misestudios-alert-close"
              onClick={() => setMensajeExito('')}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        )}

        {/* Alerta de error general */}
        {error && (
          <div className="misestudios-alert misestudios-alert--error" role="alert">
            <span>{error}</span>
            <button
              className="misestudios-alert-close"
              onClick={() => setError('')}
              aria-label="Cerrar error"
            >
              ×
            </button>
          </div>
        )}

        {/* Contenido / Listado */}
        {cargando ? (
          <div className="misestudios-empty">
            <div className="misestudios-empty-icon"><Loader2 size={44} className="animate-spin text-blue-600" /></div>
            <h2>Cargando tus estudios médicos…</h2>
            <p>Aguardá un momento mientras obtenemos tu historial de estudios.</p>
          </div>
        ) : estudios.length === 0 ? (
          <div className="misestudios-empty">
            <div className="misestudios-empty-icon"><FolderOpen size={48} className="text-slate-400" /></div>
            <h2>Aún no tenés estudios médicos registrados</h2>
            <p>
              Tus estudios médicos, informes clínicos y estudios por imágenes son cargados directamente por los servicios de diagnóstico y laboratorio del sanatorio.
            </p>
          </div>
        ) : (
          <div className="misestudios-grid">
            {estudios.map((estudio) => {
              const esDicom =
                estudio.integracionPacs?.tipoIdentificador === 'DICOM_STUDY_INSTANCE_UID' ||
                esStudyInstanceUid(estudio.codigo)
              const visorUrl =
                estudio.integracionPacs?.urlVisualizadorOhif ||
                estudio.integracionPacs?.urlOrthancStoneViewer

              return (
                <article key={estudio.idEstudio} className="misestudios-card">
                  <div className="misestudios-card-top">
                    <div className="misestudios-card-header">
                      <h2 className="misestudios-card-title">{estudio.nombre}</h2>
                      <span
                        className={`misestudios-badge ${
                          esDicom ? 'misestudios-badge--dicom' : 'misestudios-badge--code'
                        }`}
                      >
                        {esDicom ? 'PACS / DICOM' : 'Estudio Clínico'}
                      </span>
                    </div>

                    <div className="misestudios-card-date">
                      <span>Cargado el {formatearFecha(estudio.fechaCarga)}</span>
                    </div>

                    {/* BOTÓN PRINCIPAL: VER INFORME EN PDF */}
                    <button
                      type="button"
                      className="misestudios-btn-pdf"
                      onClick={() => handleVerInformePdf(estudio)}
                    >
                      <FileText size={16} /> Ver Informe Médico (PDF)
                    </button>

                    <div className="misestudios-code-box">
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <p className="misestudios-code-label">
                          {esDicom ? 'StudyInstanceUID DICOM' : 'Código de referencia'}
                        </p>
                        <p className="misestudios-code-val" title={estudio.codigo}>
                          {estudio.codigo}
                        </p>
                      </div>
                      <button
                        className={`misestudios-btn-copy ${
                          copiadoId === estudio.idEstudio ? 'copied' : ''
                        }`}
                        onClick={() => handleCopiarCodigo(estudio.codigo, estudio.idEstudio)}
                        type="button"
                        title="Copiar código al portapapeles"
                      >
                        {copiadoId === estudio.idEstudio ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>

                    {estudio.observacion && (
                      <div className="misestudios-obs-box">
                        <p className="misestudios-obs-title">Observaciones / Indicaciones</p>
                        <p className="misestudios-obs-text">{estudio.observacion}</p>
                      </div>
                    )}

                    {esDicom && (
                      <div className="misestudios-pacs-box">
                        <div className="misestudios-pacs-info">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Activity size={16} /> Imágenes de diagnóstico médico DICOM</span>
                        </div>
                        <div className="misestudios-pacs-actions">
                          {visorUrl && (
                            <a
                              href={visorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="misestudios-btn-viewer"
                              title="Requiere tener iniciado el contenedor PACS en localhost:3005"
                            >
                              <Eye size={15} /> Visor PACS
                            </a>
                          )}
                          <button
                            type="button"
                            className="misestudios-btn-pacs-check"
                            onClick={() => handleInspeccionarPacs(estudio)}
                          >
                            <Search size={15} /> Estado PACS
                          </button>
                        </div>
                      </div>
                    )}
                  </div>


                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Alta / Edición de Estudio */}
      {modalFormAbierto && (
        <div
          className="misestudios-modal-backdrop"
          onClick={() => !guardando && setModalFormAbierto(false)}
        >
          <div
            className="misestudios-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="misestudios-modal-close"
              onClick={() => setModalFormAbierto(false)}
              disabled={guardando}
              aria-label="Cerrar modal"
            >
              ×
            </button>

            <h2>{estudioEditando ? 'Editar estudio médico' : 'Registrar nuevo estudio'}</h2>
            <p className="misestudios-modal-desc">
              Completá los datos del estudio. Podrás consultar el informe oficial en PDF inmediatamente
              después de guardarlo.
            </p>

            {formErrores.general && (
              <p className="misestudios-field-error" role="alert">
                {formErrores.general}
              </p>
            )}

            <form onSubmit={handleGuardar} className="misestudios-form">
              <div className="misestudios-form-group">
                <label className="misestudios-form-label" htmlFor="estudio-nombre">
                  Nombre del estudio *
                </label>
                <input
                  id="estudio-nombre"
                  type="text"
                  required
                  placeholder="Ej. Resonancia Magnética de Columna Lumbar"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={`misestudios-input ${formErrores.nombre ? 'has-error' : ''}`}
                  maxLength={150}
                  disabled={guardando}
                />
                {formErrores.nombre ? (
                  <p className="misestudios-field-error">{formErrores.nombre}</p>
                ) : (
                  <p className="misestudios-field-hint">Entre 2 y 150 caracteres.</p>
                )}
              </div>

              <div className="misestudios-form-group">
                <label className="misestudios-form-label" htmlFor="estudio-codigo">
                  Código o StudyInstanceUID DICOM *
                </label>
                <input
                  id="estudio-codigo"
                  type="text"
                  required
                  placeholder="Ej. 1.2.840.113619.2.55.3.60468842 o COD-12345"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className={`misestudios-input ${formErrores.codigo ? 'has-error' : ''}`}
                  maxLength={150}
                  disabled={guardando}
                />
                {formErrores.codigo ? (
                  <p className="misestudios-field-error">{formErrores.codigo}</p>
                ) : (
                  <p className="misestudios-field-hint">
                    Código de laboratorio, orden médica o StudyInstanceUID DICOM.
                  </p>
                )}
              </div>

              <div className="misestudios-form-group">
                <label className="misestudios-form-label" htmlFor="estudio-observacion">
                  <span>Observaciones / Indicaciones (opcional)</span>
                  <span className="misestudios-char-counter">
                    {form.observacion.length} / 1000
                  </span>
                </label>
                <textarea
                  id="estudio-observacion"
                  placeholder="Indicá detalles relevantes, indicaciones del médico o motivo del estudio…"
                  value={form.observacion}
                  onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  className={`misestudios-textarea ${
                    formErrores.observacion ? 'has-error' : ''
                  }`}
                  maxLength={1000}
                  disabled={guardando}
                />
                {formErrores.observacion && (
                  <p className="misestudios-field-error">{formErrores.observacion}</p>
                )}
              </div>

              <div className="misestudios-modal-actions">
                <button
                  type="button"
                  className="misestudios-btn-secondary"
                  onClick={() => setModalFormAbierto(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="misestudios-btn-primary"
                  disabled={guardando}
                >
                  {guardando
                    ? 'Guardando…'
                    : estudioEditando
                    ? 'Guardar cambios'
                    : 'Registrar estudio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualización de Informe Médico en PDF */}
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
                <FileText size={20} className="text-blue-600" /> Informe Médico Oficial: {estudioPdf.nombre}
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

      {/* Modal de Confirmación de Eliminación */}
      {modalEliminarAbierto && estudioAEliminar && (
        <div
          className="misestudios-modal-backdrop"
          onClick={() => !eliminando && setModalEliminarAbierto(false)}
        >
          <div
            className="misestudios-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="misestudios-modal-close"
              onClick={() => setModalEliminarAbierto(false)}
              disabled={eliminando}
              aria-label="Cerrar modal"
            >
              ×
            </button>

            <h2>¿Eliminar estudio médico?</h2>
            <p className="misestudios-modal-desc">
              Estás por eliminar el estudio <strong>"{estudioAEliminar.nombre}"</strong>. Esta acción
              dará de baja el estudio y dejará de estar visible en tu historia clínica.
            </p>

            <div className="misestudios-modal-actions">
              <button
                type="button"
                className="misestudios-btn-secondary"
                onClick={() => setModalEliminarAbierto(false)}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="misestudios-btn-danger"
                onClick={handleConfirmarEliminar}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando…' : 'Sí, eliminar estudio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inspección PACS */}
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
              ×
            </button>

            <h2>Estado en Servidor PACS (Orthanc)</h2>
            <p className="misestudios-modal-desc">
              Inspección de disponibilidad de imágenes para{' '}
              <strong>"{pacsEstado.estudio.nombre}"</strong>.
            </p>

            {pacsEstado.cargando ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p>Consultando el servidor Orthanc vía DICOMweb…</p>
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
                        className="misestudios-btn-pdf"
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
