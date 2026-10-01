import { useEffect, useState } from 'react'
import api from '../api/axios'
import '../styles/CompletarPerfil.css'

const perfilInicial = {
  email: '',
  sexo: '',
  idObraSocial: '',
  idPlan: '',
}

function CompletarPerfil({ abierto, alCompletar }) {
  const [perfil, setPerfil] = useState(perfilInicial)
  const [obrasSociales, setObrasSociales] = useState([])
  const [planes, setPlanes] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const cargarDatos = async () => {
      setError('')
      try {
        const [{ data: datosPerfil }, { data: datosObrasSociales }] = await Promise.all([
          api.get('/pacientes/perfil'),
          api.get('/obras-sociales'),
        ])
        const { paciente } = datosPerfil
        setPerfil({
          email: paciente.usuario.email || '',
          sexo: paciente.sexo || '',
          idObraSocial: paciente.plan?.idObraSocial?.toString() || '',
          idPlan: paciente.idPlan?.toString() || '',
        })
        setObrasSociales(datosObrasSociales)
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar tu perfil. Recargá la página.')
      }
    }

    cargarDatos()
  }, [abierto])

  useEffect(() => {
    if (!perfil.idObraSocial) {
      setPlanes([])
      return
    }

    api
      .get(`/obras-sociales/${perfil.idObraSocial}/planes`)
      .then(({ data }) => setPlanes(data))
      .catch(() => setError('No se pudieron cargar los planes de esa obra social.'))
  }, [perfil.idObraSocial])

  const handleChange = ({ target: { name, value } }) => {
    setError('')
    setPerfil((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'idObraSocial' ? { idPlan: '' } : {}),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setCargando(true)
    setError('')
    try {
      const { data } = await api.put('/pacientes/perfil', {
        ...perfil,
        idObraSocial: Number(perfil.idObraSocial),
        idPlan: Number(perfil.idPlan),
      })
      if (!data.perfilCompleto) {
        setError('Completá todos los datos requeridos para continuar.')
        return
      }
      alCompletar?.(data.paciente)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar tu perfil. Intentá nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null

  return (
    <div className="perfil-modal-backdrop" role="presentation">
      <section className="perfil-modal" role="dialog" aria-modal="true" aria-labelledby="completar-perfil-titulo">
        <h2 id="completar-perfil-titulo">Completá tu perfil</h2>
        <p>Necesitamos estos datos para que puedas solicitar un turno.</p>

        <form className="perfil-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" type="email" value={perfil.email} onChange={handleChange} required />
          </label>

          <label>
            Sexo
            <select name="sexo" value={perfil.sexo} onChange={handleChange} required>
              <option value="">Seleccionar</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro</option>
            </select>
          </label>

          <label>
            Obra social
            <select name="idObraSocial" value={perfil.idObraSocial} onChange={handleChange} required>
              <option value="">Seleccionar</option>
              {obrasSociales.map((obraSocial) => (
                <option key={obraSocial.idObraSocial} value={obraSocial.idObraSocial}>
                  {obraSocial.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Plan
            <select
              name="idPlan"
              value={perfil.idPlan}
              onChange={handleChange}
              disabled={!perfil.idObraSocial}
              required
            >
              <option value="">Seleccionar</option>
              {planes.map((plan) => (
                <option key={plan.idPlan} value={plan.idPlan}>
                  {plan.nombre}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="perfil-error">{error}</p>}

          <button type="submit" disabled={cargando}>
            {cargando ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default CompletarPerfil
