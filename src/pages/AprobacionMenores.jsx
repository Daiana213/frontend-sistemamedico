import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/AprobacionMenores.css'

function AprobacionMenores() {
  const [menores, setMenores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(null)
  const [cargandoDocumento, setCargandoDocumento] = useState(null)
  const [motivos, setMotivos] = useState({})
  const [mostrarRechazo, setMostrarRechazo] = useState(null)

  const cargarMenores = () => {
    setLoading(true)
    setError('')
    api
      .get('/administrativos/menores-pendientes')
      .then(({ data }) => setMenores(data.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError('No tenés permisos para gestionar usuarios.')
        } else {
          setError('No se pudo cargar el listado. Intentá nuevamente.')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarMenores()
  }, [])

  const handleAprobar = async (idPaciente) => {
    setProcesando(idPaciente)
    setError('')
    try {
      await api.patch(`/administrativos/menores/${idPaciente}/aprobar`)
      setMenores((prev) => prev.filter((m) => m.idPaciente !== idPaciente))
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo aprobar el registro.')
    } finally {
      setProcesando(null)
    }
  }

  const handleRechazar = async (idPaciente) => {
    const motivo = (motivos[idPaciente] || '').trim()
    if (!motivo) {
      setError('Tenés que indicar un motivo de rechazo.')
      return
    }

    setProcesando(idPaciente)
    setError('')
    try {
      await api.patch(`/administrativos/menores/${idPaciente}/rechazar`, { motivo })
      setMenores((prev) => prev.filter((m) => m.idPaciente !== idPaciente))
      setMostrarRechazo(null)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo rechazar el registro.')
    } finally {
      setProcesando(null)
    }
  }

  const handleVerDocumento = async (idDocumento) => {
    setCargandoDocumento(idDocumento)
    setError('')
    try {
      const { data } = await api.get(`/documentos/${idDocumento}`)
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      const status = err.response?.status
      if (status === 401) {
        setError('No estás autenticado. Iniciá sesión nuevamente.')
      } else if (status === 403) {
        setError('No tenés permisos para ver este documento.')
      } else if (status === 404) {
        setError('El documento no fue encontrado.')
      } else {
        setError('No se pudo abrir el documento. Intentá nuevamente.')
      }
    } finally {
      setCargandoDocumento(null)
    }
  }

  if (loading) {
    return <p className="menores-loading">Cargando registros pendientes...</p>
  }

  return (

    <div className="menores-page">
      <Link to="/dashboard" className="menores-back-link">
        ← Volver al dashboard
      </Link>

      <h2 className="menores-title">Menores pendientes de aprobación</h2>

      {error && <p className="menores-error">{error}</p>}

      {menores.length === 0 && !error && (
        <p className="menores-empty">No hay registros pendientes por ahora.</p>
      )}

      <div className="menores-list">
        {menores.map((menor) => (
          <div
            key={menor.idPaciente}
            className="menor-card"
          >
            <div className="menor-info">
              <p className="menor-name">
                {menor.nombre} {menor.apellido} — DNI {menor.dni}
              </p>
              <p className="menor-detail">
                Registrado el {new Date(menor.fechaRegistro).toLocaleDateString('es-AR')}
              </p>
              {menor.responsable && (
                <p className="menor-detail">
                  Adulto responsable: {menor.responsable.nombre} {menor.responsable.apellido} (DNI{' '}
                  {menor.responsable.dni})
                </p>
              )}
              {menor.documento ? (
                <div className="menor-detail">
                  <span>
                    Documento: {menor.documento.tipoDocumento} — {menor.documento.nombreArchivo}
                    {menor.documento.intentos > 0 && ` (intento n.º ${menor.documento.intentos + 1})`}
                  </span>
                  <button
                    type="button"
                    className="menor-detail"
                    disabled={cargandoDocumento === menor.documento.idDocumento}
                    onClick={() => handleVerDocumento(menor.documento.idDocumento)}
                  >
                    {cargandoDocumento === menor.documento.idDocumento ? 'Abriendo...' : 'Ver documento'}
                  </button>
                </div>  )
               : (
                <p className="menor-detail">Sin documento adjunto.</p>
              )}
            </div>

            {mostrarRechazo === menor.idPaciente ? (
              <div className="menor-reject-form">
                <textarea
                  className="menor-textarea"
                  placeholder="Motivo del rechazo"
                  value={motivos[menor.idPaciente] || ''}
                  onChange={(e) =>
                    setMotivos((prev) => ({ ...prev, [menor.idPaciente]: e.target.value }))
                  }
                  rows={2}
                />
                <div className="menor-actions">
                  <button
                    className="menor-btn-primary"
                    disabled={procesando === menor.idPaciente}
                    onClick={() => handleRechazar(menor.idPaciente)}
                  >
                    Confirmar rechazo
                  </button>
                  <button
                    type="button"
                    className="menor-btn-cancel"
                    onClick={() => setMostrarRechazo(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="menor-actions">
                <button
                  className="menor-btn-primary"
                  disabled={procesando === menor.idPaciente}
                  onClick={() => handleAprobar(menor.idPaciente)}
                >
                  {procesando === menor.idPaciente ? 'Procesando...' : 'Aprobar'}
                </button>
                <button
                  type="button"
                  className="menor-btn-reject"
                  onClick={() => setMostrarRechazo(menor.idPaciente)}
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AprobacionMenores