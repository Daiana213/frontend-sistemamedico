import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { inputClass, labelClass, buttonClass, errorClass } from '../utils/formStyles'

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
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <h2 className="text-2xl font-medium text-[var(--text-h)]">Registro de paciente</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Nombre
            <input name="nombre" className={inputClass} value={form.nombre} onChange={handleChange} required />
          </label>
          <label className={labelClass}>
            Apellido
            <input name="apellido" className={inputClass} value={form.apellido} onChange={handleChange} required />
          </label>
        </div>

        <label className={labelClass}>
          DNI
          <input name="dni" className={inputClass} value={form.dni} onChange={handleChange} required />
        </label>

        <label className={labelClass}>
          Teléfono
          <input name="telefono" className={inputClass} value={form.telefono} onChange={handleChange} required />
        </label>

        <label className={labelClass}>
          Email
          <input
            name="email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Contraseña
            <input
              name="password"
              type="password"
              className={inputClass}
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          <label className={labelClass}>
            Confirmar contraseña
            <input
              name="confirmarPassword"
              type="password"
              className={inputClass}
              value={form.confirmarPassword}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <label className={labelClass}>
          Fecha de nacimiento
          <input
            name="fechaNacimiento"
            type="date"
            className={inputClass}
            value={form.fechaNacimiento}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </label>

        <label className={labelClass}>
          Sexo
          <select name="sexo" className={inputClass} value={form.sexo} onChange={handleChange} required>
            <option value="">Seleccionar</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
            <option value="OTRO">Otro</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Obra social
            <select
              name="idObraSocial"
              className={inputClass}
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
          <label className={labelClass}>
            Plan
            <select
              name="idPlan"
              className={inputClass}
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
          <fieldset className="flex flex-col gap-4 rounded-md border border-[var(--border)] p-4">
            <legend className="px-1 text-sm text-[var(--text)]">
              Datos del adulto responsable (paciente menor de edad)
            </legend>

            <label className={labelClass}>
              DNI del responsable
              <input
                name="dniResponsable"
                className={inputClass}
                value={form.dniResponsable}
                onChange={handleChange}
                required
              />
            </label>

            <label className={labelClass}>
              Parentesco
              <input
                name="parentesco"
                placeholder="Ej: madre, padre, tutor"
                className={inputClass}
                value={form.parentesco}
                onChange={handleChange}
                required
              />
            </label>

            <label className={labelClass}>
              Tipo de documento
              <select
                name="tipoDocumento"
                className={inputClass}
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

            <label className={labelClass}>
              Documento adjunto (PDF, JPG o PNG)
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className={inputClass}
                onChange={(e) => setDocumento(e.target.files[0])}
                required
              />
            </label>
          </fieldset>
        )}

        {error && <p className={errorClass}>{error}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Registrando...' : 'Registrarme'}
        </button>

        <p className="text-sm text-[var(--text)]">
          ¿Ya tenés cuenta?{' '}
          <Link to="/" className="text-[var(--accent)] underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  )
}

export default RegistroPaciente