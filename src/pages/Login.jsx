import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { inputClass, labelClass, buttonClass, errorClass } from '../utils/formStyles'

function Login() {
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [roles, setRoles] = useState(null)
  const [preSessionToken, setPreSessionToken] = useState('')
  const navigate = useNavigate()

  const guardarSesionYRedirigir = (accessToken, refreshToken, rolActivo) => {
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('rolActivo', rolActivo)
    navigate('/dashboard')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/login', { dni, password })

      if (data.requiereSeleccionRol) {
        setRoles(data.rolesDisponibles)
        setPreSessionToken(data.preSessionToken)
        return
      }

      guardarSesionYRedirigir(data.accessToken, data.refreshToken, data.rolActivo)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    }
  }

  const handleSeleccionRol = async (rol) => {
    setError('')
    try {
      const { data } = await api.post('/auth/seleccionar-rol', { preSessionToken, rol })
      guardarSesionYRedirigir(data.accessToken, data.refreshToken, data.rolActivo)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al seleccionar rol')
    }
  }

  if (roles) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
        <h2 className="text-2xl font-medium text-[var(--text-h)]">¿Con qué rol querés ingresar?</h2>
        <div className="flex flex-col gap-3">
          {roles.map((rol) => (
            <button key={rol} onClick={() => handleSeleccionRol(rol)} className={buttonClass}>
              {rol}
            </button>
          ))}
        </div>
        {error && <p className={errorClass}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
      <h2 className="text-2xl font-medium text-[var(--text-h)]">Iniciar sesión</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={labelClass}>
          DNI
          <input
            type="text"
            className={inputClass}
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            required
          />
        </label>

        <label className={labelClass}>
          Contraseña
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className={errorClass}>{error}</p>}

        <button type="submit" className={buttonClass}>
          Ingresar
        </button>

        <p className="text-sm text-[var(--text)]">
          ¿No tenés cuenta?{' '}
          <Link to="/registro-paciente" className="text-[var(--accent)] underline">
            Registrate
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Login