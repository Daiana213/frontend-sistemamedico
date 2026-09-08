import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/RegistroPaciente.css'

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mesDiff = hoy.getMonth() - nacimiento.getMonth()
  const diaDiff = hoy.getDate() - nacimiento.getDate()
  if (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0)) edad--
  return edad
}

function RegistroPaciente() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    idObraSocial: '',
    idPlan: '',
    fechaNacimiento: '',
    sexo: '',
    email: '',
    password: '',
    confirmarPassword: '',
    dniResponsable: '',
    parentesco: '',
    tipoDocumento: '',
  })
  const [documento, setDocumento] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [obrasSociales, setObrasSociales] = useState([])
  const [planes, setPlanes] = useState([])

  const edad = calcularEdad(form.fechaNacimiento)
  const esMenor = edad !== null && edad < 18

  // Carga las obras sociales una sola vez, al montar el componente
  useEffect(() => {
    api
      .get('/obras-sociales')
      .then(({ data }) => setObrasSociales(data))
      .catch(() => setError('No se pudieron cargar las obras sociales. Recargá la página.'))
  }, [])

  // Cada vez que cambia la obra social elegida, trae sus planes
  useEffect(() => {
    if (!form.idObraSocial) {
      setPlanes([])
      return
    }
    api
      .get(`/obras-sociales/${form.idObraSocial}/planes`)
      .then(({ data }) => setPlanes(data))
      .catch(() => setError('No se pudieron cargar los planes de esa obra social.'))
  }, [form.idObraSocial])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'idObraSocial' ? { idPlan: '' } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (esMenor && !documento) {
      setError('Debe adjuntar el documento del adulto responsable.')
      return
    }

    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'confirmarPassword') return
      if (value !== '') formData.append(key, value)
    })
    if (documento) formData.append('documento', documento)

    setLoading(true)
    try {
      await api.post('/pacientes/registro', formData)
      navigate('/', { state: { registroExitoso: true } })
    } catch (err) {
      const mensaje = err.response?.data?.error
      if (err.response?.status === 409) {
        setError(`${mensaje} Si ya tenés una cuenta, iniciá sesión en lugar de registrarte.`)
      } else {
        setError(mensaje || 'Error al registrar. Intentá nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registro-split">
    <div className="registro-visual">
      <div className="registro-visual-content">
        <h3>Unite a nosotros</h3>
        <p>Creá tu cuenta y empezá a gestionar tu salud en un solo lugar.</p>
      </div>
    </div>
    <div className="registro-page">
      <h2 className="registro-title">Registro de paciente</h2>

      <form onSubmit={handleSubmit} className="registro-form">
        <div className="registro-row">
          <label className="registro-label">
            Nombre
            <input name="nombre" placeholder="Ej: Ana" className="registro-input" value={form.nombre} onChange={handleChange} required />
          </label>
          <label className="registro-label">
            Apellido
            <input name="apellido" placeholder="Ej: González" className="registro-input" value={form.apellido} onChange={handleChange} required />
          </label>
        </div>

        <label className="registro-label">
          DNI
          <input name="dni" placeholder="Ej: 30123456" className="registro-input" value={form.dni} onChange={handleChange} required />
        </label>

        <label className="registro-label">
          Teléfono
          <input name="telefono" placeholder="Ej: 3564123456" className="registro-input" value={form.telefono} onChange={handleChange} required />
        </label>

        <label className="registro-label">
          Email
          <input
            name="email"
            type="email"
            placeholder="Ej: ana@gmail.com"
            className="registro-input"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <div className="registro-row">
          <label className="registro-label">
            Contraseña
            <input
              name="password"
              type="password"
              placeholder="Mín. 8 caracteres"
              className="registro-input"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          <label className="registro-label">
            Confirmar contraseña
            <input
              name="confirmarPassword"
              type="password"
              placeholder="Repetir contraseña"
              className="registro-input"
              value={form.confirmarPassword}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <p className="registro-password-hint">
          Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
        </p>

        <label className="registro-label">
          Fecha de nacimiento
          <input
            name="fechaNacimiento"
            type="date"
            className="registro-input"
            value={form.fechaNacimiento}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </label>

        <label className="registro-label">
          Sexo
          <select name="sexo" className="registro-input" value={form.sexo} onChange={handleChange} required>
            <option value="">Seleccionar</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
            <option value="OTRO">Otro</option>
          </select>
        </label>

        <div className="registro-row">
          <label className="registro-label">
            Obra social
            <select
              name="idObraSocial"
              className="registro-input"
              value={form.idObraSocial}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar</option>
              {obrasSociales.map((o) => (
                <option key={o.idObraSocial} value={o.idObraSocial}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="registro-label">
            Plan
            <select
              name="idPlan"
              className="registro-input"
              value={form.idPlan}
              onChange={handleChange}
              required
              disabled={!form.idObraSocial}
            >
              <option value="">Seleccionar</option>
              {planes.map((p) => (
                <option key={p.idPlan} value={p.idPlan}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {esMenor && (
          <fieldset className="registro-fieldset">
            <legend className="registro-legend">
              Datos del adulto responsable (paciente menor de edad)
            </legend>

            <label className="registro-label">
              DNI del responsable
              <input
                name="dniResponsable"
                placeholder="Ej: 25987654"
                className="registro-input"
                value={form.dniResponsable}
                onChange={handleChange}
                required
              />
            </label>

            <label className="registro-label">
              Parentesco
              <input
                name="parentesco"
                placeholder="Ej: madre, padre, tutor"
                className="registro-input"
                value={form.parentesco}
                onChange={handleChange}
                required
              />
            </label>

            <label className="registro-label">
              Tipo de documento
              <select
                name="tipoDocumento"
                className="registro-input"
                value={form.tipoDocumento}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar</option>
                <option value="PARTIDA_NACIMIENTO">Partida de nacimiento</option>
                <option value="LIBRETA_MATRIMONIO">Libreta de matrimonio</option>
                <option value="SENTENCIA_ADOPCION">Sentencia de adopción</option>
              </select>
            </label>

            <label className="registro-label">
              Documento adjunto (PDF, JPG o PNG)
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="registro-input"
                onChange={(e) => setDocumento(e.target.files[0])}
                required
              />
            </label>
          </fieldset>
        )}

        {error && <p className="registro-error">{error}</p>}

        <button type="submit" disabled={loading} className="registro-button">
          {loading ? 'Registrando...' : 'Registrarme'}
        </button>

        <p className="registro-footer">
          ¿Ya tenés cuenta?{' '}
          <Link to="/">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
    </div>
  )
}

export default RegistroPaciente