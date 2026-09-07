import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import api from '../api/axios'
import '../styles/CambiarPassword.css'

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
  <div className="cambiarpass-split">
    <div className="cambiarpass-visual">
      <div className="cambiarpass-visual-content">
        <h3>Tu seguridad primero</h3>
        <p>Antes de continuar, definí una contraseña personal y segura para tu cuenta.</p>
      </div>
    </div>

    <div className="cambiarpass-page">
      <div className="cambiarpass-header">
        <h2 className="cambiarpass-title">Cambio obligatorio de contraseña</h2>
        <p className="cambiarpass-description">
          Por seguridad, al iniciar sesión por primera vez debés establecer una nueva contraseña personal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="cambiarpass-form">
        <label className="cambiarpass-label">
          Contraseña actual
          <input
            type="password"
            name="passwordActual"
            placeholder="Ingresá la contraseña con la que iniciaste sesión"
            className="cambiarpass-input"
            value={form.passwordActual}
            onChange={handleChange}
            required
          />
        </label>

        <label className="cambiarpass-label">
          Nueva contraseña
          <input
            type="password"
            name="nuevoPassword"
            placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
            className="cambiarpass-input"
            value={form.nuevoPassword}
            onChange={handleChange}
            required
          />
        </label>

        <label className="cambiarpass-label">
          Confirmar nueva contraseña
          <input
            type="password"
            name="confirmarPassword"
            placeholder="Repetí la nueva contraseña"
            className="cambiarpass-input"
            value={form.confirmarPassword}
            onChange={handleChange}
            required
          />
        </label>

        {error && <p className="cambiarpass-error">{error}</p>}
        {exito && <p className="cambiarpass-success">{exito}</p>}

        <button type="submit" disabled={loading} className="cambiarpass-button">
          {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
        </button>
      </form>

      <div className="cambiarpass-footer">
        <button type="button" onClick={handleCerrarSesion} className="cambiarpass-logout-link">
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
)
}

export default CambiarPassword