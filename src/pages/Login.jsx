import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/Login.css'

function Login() {
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [roles, setRoles] = useState(null)
  const [preSessionToken, setPreSessionToken] = useState('')
  const [recuperar, setRecuperar] = useState(false)
  const [emailRecuperacion, setEmailRecuperacion] = useState('')
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false)
  const [enlaceRecuperacion, setEnlaceRecuperacion] = useState('')
  const navigate = useNavigate()

  const guardarSesionYRedirigir = (accessToken, refreshToken, rolActivo, primerLogin) => {
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('rolActivo', rolActivo)
    if (primerLogin) {
      localStorage.setItem('primerLogin', 'true')
      navigate('/cambiar-password')
    } else {
      localStorage.removeItem('primerLogin')
      navigate(rolActivo === 'PROFESIONAL' ? '/agenda' : '/dashboard')
    }
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
      guardarSesionYRedirigir(data.accessToken, data.refreshToken, data.rolActivo, data.primerLogin)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    }
  }

  const handleSeleccionRol = async (rol) => {
    setError('')
    try {
      const { data } = await api.post('/auth/seleccionar-rol', { preSessionToken, rol })
      guardarSesionYRedirigir(data.accessToken, data.refreshToken, data.rolActivo, data.primerLogin)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al seleccionar rol')
    }
  }

  const handleRecuperacion = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/solicitar-recuperacion', { dni, email: emailRecuperacion })
      setRecuperacionEnviada(true)
      if (data._debugToken) setEnlaceRecuperacion(`/reset-password?token=${encodeURIComponent(data._debugToken)}`)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar la solicitud. Verificá los datos e intentá nuevamente.')
    }
  }

  return (
    <div className="login-split">
      <div className="login-form-side">
        <div className="login-brand">
          <div className="mark">+</div>
          <span className="name">Sanatorio Antonia</span>
        </div>

        <div className="login-content">
          {recuperar ? (
            <>
              <h2 className="login-title">Recuperar contraseña</h2>
              {!recuperacionEnviada ? <>
                <p className="login-subtitle">Ingresá el DNI y el correo registrado en tu cuenta.</p>
                <form onSubmit={handleRecuperacion} className="login-form">
                  <label><span className="login-label">DNI</span><input className="login-input" value={dni} onChange={(e) => setDni(e.target.value)} required inputMode="numeric" /></label>
                  <label><span className="login-label">Correo electrónico</span><input className="login-input" type="email" value={emailRecuperacion} onChange={(e) => setEmailRecuperacion(e.target.value)} required /></label>
                  {error && <p className="login-error">{error}</p>}
                  <button type="submit" className="login-button">Solicitar enlace</button>
                  <button type="button" className="login-link-button" onClick={() => { setRecuperar(false); setError('') }}>Volver al inicio de sesión</button>
                </form>
              </> : <div className="login-recovery-result"><p>Si los datos corresponden a una cuenta activa, recibirás un enlace para restablecer la contraseña.</p>{enlaceRecuperacion && <Link className="login-button login-recovery-link" to={enlaceRecuperacion}>Abrir enlace de restablecimiento</Link>}<button type="button" className="login-link-button" onClick={() => { setRecuperar(false); setRecuperacionEnviada(false); setEnlaceRecuperacion('') }}>Volver al inicio de sesión</button></div>}
            </>
          ) : roles ? (
            <>
              <h2 className="login-title">Elegí tu rol</h2>
              <p className="login-subtitle">Tu cuenta tiene más de un perfil asociado.</p>
              <div className="role-list">
                {roles.map((rol) => (
                  <button key={rol} onClick={() => handleSeleccionRol(rol)} className="role-button">
                    {rol}
                  </button>
                ))}
              </div>
              {error && <p className="login-error">{error}</p>}
            </>
          ) : (
            <>
              <h2 className="login-title">Bienvenido</h2>
              <p className="login-subtitle">Ingresá con tu DNI y contraseña para continuar.</p>

              <form onSubmit={handleSubmit} className="login-form">
                <label>
                  <span className="login-label">DNI</span>
                  <input
                    type="text"
                    className="login-input"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    required
                  />
                </label>

                <button type="button" className="login-link-button" onClick={() => { setRecuperar(true); setError('') }}>¿Olvidaste tu contraseña?</button>

                <label>
                  <span className="login-label">Contraseña</span>
                  <input
                    type="password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>

                {error && <p className="login-error">{error}</p>}

                <button type="submit" className="login-button">
                  Ingresar
                </button>

                <p className="login-footer">
                  ¿No tenés cuenta? <Link to="/registro-paciente">Registrate</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="login-visual">
        <div className="login-visual-content">
          <h3>Tu turno, tu ficha y tu historial en un solo lugar.</h3>
          <p>Gestioná tus consultas médicas de forma simple, segura y sin esperas.</p>
        </div>
      </div>
    </div>
  )
}

export default Login
