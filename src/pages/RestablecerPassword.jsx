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

  return <main className="reset-page"><section className="reset-card"><Link to="/" className="reset-brand"><span>+</span> Sanatorio Antonia</Link><h1>Restablecer contraseña</h1>{exito ? <><p className="reset-success">La contraseña se actualizó correctamente.</p><Link className="reset-submit" to="/">Volver al inicio de sesión</Link></> : <><p>Elegí una contraseña nueva para tu cuenta.</p><form onSubmit={handleSubmit}><label>Nueva contraseña<input type="password" minLength="8" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><small>Usá al menos 8 caracteres, una mayúscula, una minúscula y un número.</small><label>Confirmar contraseña<input type="password" required value={form.confirmarPassword} onChange={(e) => setForm({ ...form, confirmarPassword: e.target.value })} /></label>{error && <p className="reset-error" role="alert">{error}</p>}<button className="reset-submit" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar contraseña'}</button></form></>}</section></main>
}
