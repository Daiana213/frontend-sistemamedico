import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { Check } from 'lucide-react'
import '../styles/MisMenores.css'

// Opciones oficiales de documentación admitidas por el sistema
const TIPOS_DOCUMENTO = [
  { valor: 'PARTIDA_NACIMIENTO', etiqueta: 'Partida de nacimiento' },
  { valor: 'LIBRETA_MATRIMONIO', etiqueta: 'Libreta de matrimonio' },
  { valor: 'SENTENCIA_ADOPCION', etiqueta: 'Sentencia de adopción' },
]

function formatearTipoDocumento(tipo) {
  if (!tipo) return 'Documento respaldatorio'
  switch (tipo) {
    case 'PARTIDA_NACIMIENTO':
      return 'Partida de nacimiento'
    case 'LIBRETA_MATRIMONIO':
      return 'Libreta de matrimonio'
    case 'SENTENCIA_ADOPCION':
      return 'Sentencia de adopción'
    default:
      return tipo
  }
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const cumple = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - cumple.getFullYear()
  const m = hoy.getMonth() - cumple.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
    edad--
  }
  return edad
}

function formatearFecha(fechaString) {
  if (!fechaString) return '-'
  try {
    const fecha = new Date(fechaString)
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return fechaString
  }
}

export default function MisMenores() {
  const [menores, setMenores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  // Estado para el modal de reenvío
  const [modalAbierto, setModalAbierto] = useState(false)
  const [menorActivo, setMenorActivo] = useState(null)
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0].valor)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [errorModal, setErrorModal] = useState('')
  const [cargandoDocumentoId, setCargandoDocumentoId] = useState(null)

  const fileInputRef = useRef(null)

  const cargarMenores = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/pacientes/mis-menores')
      setMenores(data.data || [])
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'No se pudo obtener el listado de tus menores a cargo. Intentá nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarMenores()
  }, [])

  const abrirModalReenvio = (menor) => {
    setMenorActivo(menor)
    const docTipo = menor.documento?.tipoDocumento
    const tipoValido = TIPOS_DOCUMENTO.some((t) => t.valor === docTipo)
      ? docTipo
      : TIPOS_DOCUMENTO[0].valor
    setTipoDocumento(tipoValido)
    setArchivoSeleccionado(null)
    setErrorModal('')
    setModalAbierto(true)
  }

  const cerrarModalReenvio = () => {
    if (subiendo) return
    setModalAbierto(false)
    setMenorActivo(null)
    setArchivoSeleccionado(null)
    setErrorModal('')
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (!ext || !extensionesPermitidas.includes(ext)) {
      setErrorModal('El archivo seleccionado no tiene un formato permitido (PDF, JPG, PNG o WEBP).')
      setArchivoSeleccionado(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorModal('El archivo supera el tamaño máximo permitido de 5 MB.')
      setArchivoSeleccionado(null)
      return
    }

    setErrorModal('')
    setArchivoSeleccionado(file)
  }

  const handleSubmitReenvio = async (e) => {
    e.preventDefault()
    if (!menorActivo) return

    if (!archivoSeleccionado) {
      setErrorModal('Por favor, seleccioná el archivo con la documentación requerida.')
      return
    }

    if (!tipoDocumento.trim()) {
      setErrorModal('El tipo de documento es obligatorio.')
      return
    }

    setSubiendo(true)
    setErrorModal('')
    try {
      const formData = new FormData()
      formData.append('documento', archivoSeleccionado)
      formData.append('tipoDocumento', tipoDocumento.trim())

      await api.patch(
        `/pacientes/menores/${menorActivo.idPaciente}/reenviar-documentacion`,
        formData
      )

      setMensajeExito(
        `Documentación para ${menorActivo.nombre} ${menorActivo.apellido} reenviada con éxito. El registro vuelve a estar pendiente de validación.`
      )
      cerrarModalReenvio()
      await cargarMenores()
    } catch (err) {
      setErrorModal(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Ocurrió un error al reenviar la documentación. Intentá nuevamente.'
      )
    } finally {
      setSubiendo(false)
    }
  }

  const handleVerDocumento = async (idDocumento) => {
    if (!idDocumento) return
    setCargandoDocumentoId(idDocumento)
    setError('')
    try {
      const res = await api.get(`/documentos/${idDocumento}`, {
        responseType: 'blob',
      })

      if (res.data.type === 'application/json') {
        const text = await res.data.text()
        const json = JSON.parse(text)
        if (json.url) {
          window.open(json.url, '_blank', 'noopener,noreferrer')
          return
        }
      }

      const blobUrl = window.URL.createObjectURL(res.data)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError('No se pudo visualizar el documento. Intentá nuevamente.')
    } finally {
      setCargandoDocumentoId(null)
    }
  }

  return (
    <main className="mismenores-page">
      <header className="mismenores-header">
        <Link to="/dashboard">← Volver al panel</Link>
        <img src="/logo-completo.png" alt="Sanatorio Antonia" className="mismenores-logo" />
      </header>

      <section className="mismenores-content">
        <div className="mismenores-title-section">
          <div>
            <p className="mismenores-eyebrow">PANEL DEL PACIENTE</p>
            <h1>Menores a cargo</h1>
            <p>Consultá el estado y gestioná la documentación de tus menores a cargo.</p>
          </div>
          <div>
            <button
              type="button"
              className="mismenores-refresh-btn"
              onClick={cargarMenores}
              disabled={loading}
            >
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        {mensajeExito && (
          <p className="mismenores-success" role="status">
            <span>{mensajeExito}</span>
            <button
              type="button"
              className="mismenores-close-alert"
              onClick={() => setMensajeExito('')}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </p>
        )}

        {error && (
          <div className="mismenores-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="mismenores-close-alert"
              onClick={() => setError('')}
              aria-label="Cerrar error"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="mismenores-empty">Cargando tus menores a cargo…</div>
        ) : menores.length === 0 ? (
          <div className="mismenores-empty">
            <strong>Todavía no tenés menores a tu cargo</strong>
            <p>
              Cuando registres a un menor de edad e ingreses tu DNI como adulto responsable, aparecerá en esta sección para que puedas seguir su estado.
            </p>
          </div>
        ) : (
          <div className="mismenores-list">
            {menores.map((menor) => {
              const edad = calcularEdad(menor.fechaNacimiento)
              const esRechazado = menor.estado === 'RECHAZADO'
              const esActivo = menor.estado === 'ACTIVO'

              return (
                <article className="mismenores-card" key={menor.idPaciente}>
                  <div className="mismenores-card-main">
                    <div className="mismenores-date-col">
                      <strong>{edad !== null ? `${edad} años` : 'Menor'}</strong>
                      <span>Nac. {formatearFecha(menor.fechaNacimiento)}</span>
                    </div>

                    <div className="mismenores-info-col">
                      <h2>
                        {menor.nombre} {menor.apellido}
                      </h2>
                      <p>
                        DNI: {menor.dni} · Vínculo: {menor.parentesco || 'Adulto Responsable'}
                      </p>

                      {menor.documento && (
                        <div className="mismenores-doc-tag">
                          <span>
                            <strong>Documento:</strong> {formatearTipoDocumento(menor.documento.tipoDocumento)} —{' '}
                            {menor.documento.nombreArchivo || 'Archivo adjunto'}
                            {menor.documento.intentos > 0 && ` (intento n.º ${menor.documento.intentos + 1})`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      {esActivo && (
                        <span className="mismenores-status mismenores-status--activo">
                          Activo / Aprobado
                        </span>
                      )}
                      {!esActivo && !esRechazado && (
                        <span className="mismenores-status mismenores-status--pendiente">
                          Pendiente de validación
                        </span>
                      )}
                      {esRechazado && (
                        <span className="mismenores-status mismenores-status--rechazado">
                          Observado / Rechazado
                        </span>
                      )}
                    </div>
                  </div>

                  {esRechazado && (
                    <div className="mismenores-rejection-callout">
                      <p className="mismenores-rejection-callout-title">
                        Observación del personal administrativo
                      </p>
                      <p className="mismenores-rejection-callout-reason">
                        <strong>Motivo: </strong>
                        {menor.documento?.observaciones ||
                          'La documentación adjuntada presenta inconsistencias o no es legible.'}
                      </p>
                      <p className="mismenores-rejection-callout-tip">
                        Podés volver a cargar la documentación respaldatoria corregida para que administración vuelva a evaluar la solicitud.
                      </p>
                    </div>
                  )}

                  <div className="mismenores-card-actions">
                    {menor.documento && (
                      <button
                        type="button"
                        className="mismenores-btn-secondary"
                        onClick={() => handleVerDocumento(menor.documento.idDocumento)}
                        disabled={cargandoDocumentoId === menor.documento.idDocumento}
                      >
                        {cargandoDocumentoId === menor.documento.idDocumento
                          ? 'Abriendo…'
                          : 'Ver documento'}
                      </button>
                    )}

                    {esRechazado && (
                      <button
                        type="button"
                        className="mismenores-btn-danger"
                        onClick={() => abrirModalReenvio(menor)}
                      >
                        Reenviar documentación
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modalAbierto && menorActivo && (
        <div className="mismenores-modal-backdrop" role="presentation" onClick={cerrarModalReenvio}>
          <section
            className="mismenores-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="mismenores-modal-close"
              aria-label="Cerrar"
              onClick={cerrarModalReenvio}
              disabled={subiendo}
            >
              ×
            </button>
            <p className="mismenores-eyebrow">PANEL DEL PACIENTE</p>
            <h2 id="modal-heading">Reenviar documentación</h2>
            <p>
              Subí la documentación respaldatoria corregida para <strong>{menorActivo.nombre} {menorActivo.apellido}</strong>.
            </p>

            {errorModal && (
              <div className="mismenores-error" role="alert" style={{ margin: '8px 0 0' }}>
                <span>{errorModal}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReenvio}>
              <div className="mismenores-form-group">
                <label htmlFor="tipo-doc-select" className="mismenores-form-label">
                  Tipo de documento admitido
                </label>
                <select
                  id="tipo-doc-select"
                  className="mismenores-form-select"
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  disabled={subiendo}
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mismenores-form-group" style={{ marginTop: '14px' }}>
                <span className="mismenores-form-label">Archivo respaldatorio (PDF, JPG o PNG)</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  disabled={subiendo}
                />

                <div
                  className="mismenores-file-box"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mismenores-file-prompt">
                    {archivoSeleccionado
                      ? 'Hacé clic para cambiar el archivo seleccionado'
                      : 'Hacé clic acá para seleccionar el archivo'}
                  </div>
                  <div className="mismenores-file-info">
                    Formatos admitidos: PDF, JPG, PNG o WEBP (hasta 5 MB)
                  </div>
                  {archivoSeleccionado && (
                    <div className="mismenores-file-preview">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Check size={16} className="text-green-600" /> {archivoSeleccionado.name}</span> ({(archivoSeleccionado.size / 1024).toFixed(0)} KB)
                    </div>
                  )}
                </div>
              </div>

              <div className="mismenores-modal-actions">
                <button
                  type="button"
                  onClick={cerrarModalReenvio}
                  disabled={subiendo}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={subiendo || !archivoSeleccionado}
                >
                  {subiendo ? 'Enviando…' : 'Confirmar reenvío'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
