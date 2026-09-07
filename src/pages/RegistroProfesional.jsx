import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { inputClass, labelClass, buttonClass, errorClass } from '../utils/formStyles'

const FORM_INICIAL = {
  matricula: '',
  nombre: '',
  apellido: '',
  dni: '',
  telefono: '',
  email: '',
  password: '',
  confirmarPassword: '',
  telefonoAlternativo: '',
  emailAlternativo: '',
}

function RegistroProfesional() {
  const [form, setForm] = useState(FORM_INICIAL)
  const [especialidades, setEspecialidades] = useState([])
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState([])
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [loading, setLoading] = useState(false)
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(true)

  useEffect(() => {
    api
      .get('/especialidades')
      .then((res) => setEspecialidades(res.data))
      .catch(() => setError('No se pudieron cargar las especialidades. Recargá la página.'))
      .finally(() => setCargandoEspecialidades(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleEspecialidad = (id) => {
    setEspecialidadesSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (especialidadesSeleccionadas.length === 0) {
      setError('Seleccioná al menos una especialidad.')
      return
    }

    const payload = {
      matricula: form.matricula,
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      telefono: form.telefono,
      email: form.email,
      password: form.password,
      especialidades: especialidadesSeleccionadas,
      ...(form.telefonoAlternativo && { telefonoAlternativo: form.telefonoAlternativo }),
      ...(form.emailAlternativo && { emailAlternativo: form.emailAlternativo }),
    }

    setLoading(true)
    try {
      const res = await api.post('/profesionales/registro', payload)
      setExito(res.data.mensaje || 'Profesional registrado correctamente en el sistema.')
      setForm(FORM_INICIAL)
      setEspecialidadesSeleccionadas([])
    } catch (err) {
      const mensaje = err.response?.data?.error || err.response?.data?.message
      if (err.response?.status === 409) {
        setError(mensaje || 'Ya existe un profesional con ese DNI o matrícula.')
      } else if (err.response?.status === 400) {
        setError(mensaje || 'Error de validación. Revisá los datos ingresados.')
      } else {
        setError(mensaje || 'Error al registrar. Intentá nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <h2 className="text-2xl font-medium text-[var(--text-h)]">Registro de profesional</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Matrícula
          <input
            name="matricula"
            placeholder="Ej: MN-12345"
            className={inputClass}
            value={form.matricula}
            onChange={handleChange}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Nombre
            <input
              name="nombre"
              className={inputClass}
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </label>
          <label className={labelClass}>
            Apellido
            <input
              name="apellido"
              className={inputClass}
              value={form.apellido}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <label className={labelClass}>
          DNI
          <input
            name="dni"
            className={inputClass}
            value={form.dni}
            onChange={handleChange}
            required
          />
        </label>

        <label className={labelClass}>
          Teléfono
          <input
            name="telefono"
            className={inputClass}
            value={form.telefono}
            onChange={handleChange}
            required
          />
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

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-[var(--text)]">
            Especialidades <span className="text-red-400">*</span>
          </legend>
          {cargandoEspecialidades ? (
            <p className="text-sm text-[var(--text)]">Cargando especialidades...</p>
          ) : especialidades.length === 0 && !error ? (
            <p className="text-sm text-[var(--text)]">No hay especialidades disponibles.</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-md border border-[var(--border)] px-3 py-2">
              {especialidades.map((esp) => (
                <label
                  key={esp.idEspecialidad}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-h)]"
                >
                  <input
                    type="checkbox"
                    checked={especialidadesSeleccionadas.includes(esp.idEspecialidad)}
                    onChange={() => toggleEspecialidad(esp.idEspecialidad)}
                  />
                  {esp.nombre}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <details>
          <summary className="cursor-pointer select-none text-sm text-[var(--text)]">
            Datos opcionales (teléfono y email alternativos)
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <label className={labelClass}>
              Teléfono alternativo
              <input
                name="telefonoAlternativo"
                className={inputClass}
                value={form.telefonoAlternativo}
                onChange={handleChange}
              />
            </label>
            <label className={labelClass}>
              Email alternativo
              <input
                name="emailAlternativo"
                type="email"
                className={inputClass}
                value={form.emailAlternativo}
                onChange={handleChange}
              />
            </label>
          </div>
        </details>

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

        {error && <p className={errorClass}>{error}</p>}
        {exito && (
          <p className="rounded-md border border-green-400/40 bg-green-400/10 px-3 py-2 text-sm text-green-400">
            {exito}
          </p>
        )}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Registrando...' : 'Registrar Profesional'}
        </button>

        <Link to="/dashboard" className="text-sm text-[var(--accent)] underline">
          Volver al dashboard
        </Link>
      </form>
    </div>
  )
}

export default RegistroProfesional
