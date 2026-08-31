import { useState, useEffect } from 'react'
import api from '../api/axios'
import { buttonClass, errorClass, inputClass } from '../utils/formStyles'
import { Link } from 'react-router-dom'

function AprobacionMenores() {
  const [menores, setMenores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(null) // idPaciente en curso
  const [motivos, setMotivos] = useState({}) // { [idPaciente]: texto }
  const [mostrarRechazo, setMostrarRechazo] = useState(null) // idPaciente con el form de rechazo abierto

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

  if (loading) {
    return <p className="p-6 text-[var(--text)]">Cargando registros pendientes...</p>
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <h2 className="text-2xl font-medium text-[var(--text-h)]">Menores pendientes de aprobación</h2>
      
      <Link to="/dashboard" className="text-sm text-[var(--accent)] underline">
        ← Volver al dashboard
      </Link>
      {error && <p className={errorClass}>{error}</p>}

      {menores.length === 0 && !error && (
        <p className="text-[var(--text)]">No hay registros pendientes por ahora.</p>
      )}

      <div className="flex flex-col gap-4">
        {menores.map((menor) => (
          <div
            key={menor.idPaciente}
            className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-4"
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium text-[var(--text-h)]">
                {menor.nombre} {menor.apellido} — DNI {menor.dni}
              </p>
              <p className="text-sm text-[var(--text)]">
                Registrado el {new Date(menor.fechaRegistro).toLocaleDateString('es-AR')}
              </p>
              {menor.responsable && (
                <p className="text-sm text-[var(--text)]">
                  Adulto responsable: {menor.responsable.nombre} {menor.responsable.apellido} (DNI{' '}
                  {menor.responsable.dni})
                </p>
              )}
              {menor.documento ? (
                <p className="text-sm text-[var(--text)]">
                  Documento: {menor.documento.tipoDocumento} — {menor.documento.nombreArchivo}
                  {menor.documento.intentos > 0 && ` (intento n.º ${menor.documento.intentos + 1})`}
                </p>
              ) : (
                <p className="text-sm text-[var(--text)]">Sin documento adjunto.</p>
              )}
            </div>

            {mostrarRechazo === menor.idPaciente ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className={inputClass}
                  placeholder="Motivo del rechazo"
                  value={motivos[menor.idPaciente] || ''}
                  onChange={(e) =>
                    setMotivos((prev) => ({ ...prev, [menor.idPaciente]: e.target.value }))
                  }
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    className={buttonClass}
                    disabled={procesando === menor.idPaciente}
                    onClick={() => handleRechazar(menor.idPaciente)}
                  >
                    Confirmar rechazo
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-4 py-2 text-[var(--text-h)]"
                    onClick={() => setMostrarRechazo(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  className={buttonClass}
                  disabled={procesando === menor.idPaciente}
                  onClick={() => handleAprobar(menor.idPaciente)}
                >
                  {procesando === menor.idPaciente ? 'Procesando...' : 'Aprobar'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-400/40 px-4 py-2 text-red-400"
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