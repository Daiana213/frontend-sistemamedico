import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import '../styles/RestablecerPassword.css'

export default function RestablecerPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [form, setForm] = useState({ password: '', confirmarPassword: '' })
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!token) return setError('El enlace no contiene un token válido.')
    if (form.password !== form.confirmarPassword) return setError('Las contraseñas no coinciden.')
    setCargando(true)
    try {
      await api.post('/auth/restablecer-password', { token, ...form })
      setExito(true)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña. Solicitá un nuevo enlace.')
    } finally { setCargando(false) }
  }

  return (
    <main className="reset-page">
      <section className="reset-card">
        <Link to="/" className="reset-brand">
          <img src="/logo-completo.png" alt="Sanatorio Antonia" className="reset-brand-logo" />
        </Link>
        <h1>Restablecer contraseña</h1>
        {exito ? (
          <>
            <p className="reset-success">La contraseña se actualizó correctamente.</p>
            <Link className="reset-back-button reset-back-button--success" to="/">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="reset-back-icon"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Volver al inicio de sesión</span>
            </Link>
          </>
        ) : (
          <>
            <p>Elegí una contraseña nueva para tu cuenta.</p>
            <form onSubmit={handleSubmit}>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  minLength="8"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <small>Usá al menos 8 caracteres, una mayúscula, una minúscula y un número.</small>
              <label>
                Confirmar contraseña
                <input
                  type="password"
                  required
                  value={form.confirmarPassword}
                  onChange={(e) => setForm({ ...form, confirmarPassword: e.target.value })}
                />
              </label>
              {error && <p className="reset-error" role="alert">{error}</p>}
              <button className="reset-submit" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Guardar contraseña'}
              </button>
              <Link className="reset-back-button" to="/">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="reset-back-icon"
                  aria-hidden="true"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Volver al inicio de sesión</span>
              </Link>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
