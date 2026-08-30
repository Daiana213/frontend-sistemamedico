import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

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
      <div>
        <h2>¿Con qué rol querés ingresar?</h2>
        {roles.map((rol) => (
          <button key={rol} onClick={() => handleSeleccionRol(rol)}>
            {rol}
          </button>
        ))}
        {error && <p>{error}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Iniciar sesión</h2>
      <input
        type="text"
        placeholder="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p>{error}</p>}
      <button type="submit">Ingresar</button>
    </form>
  )
}

export default Login