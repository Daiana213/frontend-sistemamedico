import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import api from '../api/axios'
import { inputClass, labelClass, buttonClass, errorClass } from '../utils/formStyles'

function CambiarPassword() {
  const navigate = useNavigate()
  const token = localStorage.getItem('accessToken')

  if (!token) {
    return <Navigate to="/" replace />
  }

  const [form, setForm] = useState({
    passwordActual: '',
    nuevoPassword: '',
    confirmarPassword: '',
  })
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    if (form.nuevoPassword !== form.confirmarPassword) {
      setError('Las nuevas contraseñas no coinciden.')
      return
    }

    if (form.passwordActual === form.nuevoPassword) {
      setError('La nueva contraseña no puede ser igual a la actual.')
      return
    }

    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!regexPassword.test(form.nuevoPassword)) {
      setError(
        'La contraseña debe tener al menos 8 caracteres, incluyendo al menos una mayúscula, una minúscula y un número.'
      )
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/cambiar-password', {
        passwordActual: form.passwordActual,
        nuevoPassword: form.nuevoPassword,
        confirmarPassword: form.confirmarPassword,
      })

      setExito('¡Contraseña actualizada correctamente! Redirigiendo...')
      localStorage.removeItem('primerLogin')

      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }
      if (data.rolActivo) {
        localStorage.setItem('rolActivo', data.rolActivo)
      }

      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña. Verificá los datos ingresados.')
    } finally {
      setLoading(false)
    }
  }

  const handleCerrarSesion = () => {
    localStorage.clear()
    navigate('/')
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <h2 className="text-2xl font-medium text-[var(--text-h)]">Cambio obligatorio de contraseña</h2>
        <p className="mt-1 text-sm text-[var(--text)]">
          Por seguridad, al iniciar sesión por primera vez debés establecer una nueva contraseña personal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Contraseña actual
          <input
            type="password"
            name="passwordActual"
            placeholder="Ingresá la contraseña con la que iniciaste sesión"
            className={inputClass}
            value={form.passwordActual}
            onChange={handleChange}
            required
          />
        </label>

        <label className={labelClass}>
          Nueva contraseña
          <input
            type="password"
            name="nuevoPassword"
            placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
            className={inputClass}
            value={form.nuevoPassword}
            onChange={handleChange}
            required
          />
        </label>

        <label className={labelClass}>
          Confirmar nueva contraseña
          <input
            type="password"
            name="confirmarPassword"
            placeholder="Repetí la nueva contraseña"
            className={inputClass}
            value={form.confirmarPassword}
            onChange={handleChange}
            required
          />
        </label>

        {error && <p className={errorClass}>{error}</p>}
        {exito && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {exito}
          </p>
        )}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
        </button>
      </form>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCerrarSesion}
          className="text-sm text-[var(--text)] underline hover:text-[var(--text-h)]"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default CambiarPassword