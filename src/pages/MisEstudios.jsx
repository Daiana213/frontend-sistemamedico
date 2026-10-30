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
} from 'lucide-react'

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
            <p className="misestudios-eyebrow">MI HISTORIA CLÍNICA · SOLO LECTURA</p>
            <h1 className="misestudios-title">Mis Estudios Médicos</h1>
            <p className="misestudios-subtitle">
              Consultá tus estudios e informes médicos. Podés abrir las imágenes en el visor PACS y
              descargar el informe oficial en PDF.
            </p>
          </div>

        </section>

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
