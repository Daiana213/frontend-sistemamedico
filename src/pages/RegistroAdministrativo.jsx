import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/RegistroAdministrativo.css'

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
  <div className="regadmin-split">
    <div className="regadmin-visual">
      <div className="regadmin-visual-content">
        <h3>Equipo administrativo</h3>
        <p>Gestioná altas de personal y accesos del sanatorio de forma centralizada.</p>
      </div>
    </div>

    <div className="regadmin-page">
      <h2 className="regadmin-title">Registro de administrativo</h2>

      <form onSubmit={handleSubmit} className="regadmin-form">
        <div className="regadmin-row">
          <label className="regadmin-label">
            Nombre
            <input name="nombre" className="regadmin-input" value={form.nombre} onChange={handleChange} required />
          </label>
          <label className="regadmin-label">
            Apellido
            <input name="apellido" className="regadmin-input" value={form.apellido} onChange={handleChange} required />
          </label>
        </div>

        <label className="regadmin-label">
          DNI
          <input name="dni" className="regadmin-input" value={form.dni} onChange={handleChange} required />
        </label>

        <label className="regadmin-label">
          Puesto
          <input
            name="puesto"
            placeholder="Ej: recepción, facturación"
            className="regadmin-input"
            value={form.puesto}
            onChange={handleChange}
            required
          />
        </label>

        <label className="regadmin-label">
          Teléfono
          <input name="telefono" className="regadmin-input" value={form.telefono} onChange={handleChange} required />
        </label>

        <label className="regadmin-label">
          Email
          <input
            name="email"
            type="email"
            className="regadmin-input"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <div className="regadmin-row">
          <label className="regadmin-label">
            Contraseña
            <input
              name="password"
              type="password"
              className="regadmin-input"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          <label className="regadmin-label">
            Confirmar contraseña
            <input
              name="confirmarPassword"
              type="password"
              className="regadmin-input"
              value={form.confirmarPassword}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <label className="regadmin-checkbox">
          <input
            type="checkbox"
            name="permisoGestionUsuarios"
            checked={form.permisoGestionUsuarios}
            onChange={handleChange}
          />
          Puede gestionar usuarios (dar de alta otros administrativos/profesionales)
        </label>

        {error && <p className="regadmin-error">{error}</p>}
        {exito && <p className="regadmin-success">{exito}</p>}

        <button type="submit" disabled={loading} className="regadmin-button">
          {loading ? 'Registrando...' : 'Registrar administrativo'}
        </button>

        <Link to="/dashboard" className="regadmin-link">
          Volver al dashboard
        </Link>
      </form>
    </div>
  </div>
)
}

export default RegistroAdministrativo