import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { inputClass, labelClass, buttonClass, errorClass } from '../utils/formStyles'

function RegistroAdministrativo() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    puesto: '',
    telefono: '',
    email: '',
    password: '',
    confirmarPassword: '',
    permisoGestionUsuarios: false,
  })
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    const { confirmarPassword, ...payload } = form

    setLoading(true)
    try {
      await api.post('/administrativos/registro', payload)
      setExito('Administrativo registrado correctamente.')
      setForm({
        nombre: '',
        apellido: '',
        dni: '',
        puesto: '',
        telefono: '',
        email: '',
        password: '',
        confirmarPassword: '',
        permisoGestionUsuarios: false,
      })
    } catch (err) {
      const mensaje = err.response?.data?.error
      if (err.response?.status === 409) {
        setError(`${mensaje} Ese DNI ya pertenece a un administrativo existente.`)
      } else {
        setError(mensaje || 'Error al registrar. Intentá nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <h2 className="text-2xl font-medium text-[var(--text-h)]">Registro de administrativo</h2>

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
          Puesto
          <input
            name="puesto"
            placeholder="Ej: recepción, facturación"
            className={inputClass}
            value={form.puesto}
            onChange={handleChange}
            required
          />
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

        <label className="flex items-center gap-2 text-sm text-[var(--text-h)]">
          <input
            type="checkbox"
            name="permisoGestionUsuarios"
            checked={form.permisoGestionUsuarios}
            onChange={handleChange}
          />
          Puede gestionar usuarios (dar de alta otros administrativos/profesionales)
        </label>

        {error && <p className={errorClass}>{error}</p>}
        {exito && (
          <p className="rounded-md border border-green-400/40 bg-green-400/10 px-3 py-2 text-sm text-green-400">
            {exito}
          </p>
        )}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Registrando...' : 'Registrar administrativo'}
        </button>

        <Link to="/dashboard" className="text-sm text-[var(--accent)] underline">
          Volver al dashboard
        </Link>
      </form>
    </div>
  )
}

export default RegistroAdministrativo