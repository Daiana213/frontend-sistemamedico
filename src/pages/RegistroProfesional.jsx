import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import api from "../api/axios"
import "../styles/RegistroProfesional.css"
import { nombreValido } from "../utils/sesion"

const FORM_INICIAL = {
  matricula: "",
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  password: "",
  confirmarPassword: "",
  telefonoAlternativo: "",
  emailAlternativo: "",
}

function RegistroProfesional() {
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [especialidades, setEspecialidades] = useState([])
  const [obrasSociales, setObrasSociales] = useState([])
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState([])
  const [obrasSocialesSeleccionadas, setObrasSocialesSeleccionadas] = useState([])
  const [error, setError] = useState("")
  const [exito, setExito] = useState("")
  const [loading, setLoading] = useState(false)
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(true)

  useEffect(() => {
    Promise.all([api.get("/especialidades"), api.get("/obras-sociales")])
      .then(([resEspecialidades, resObrasSociales]) => {
        setEspecialidades(resEspecialidades.data)
        setObrasSociales(resObrasSociales.data)
      })
      .catch(() => setError("No se pudieron cargar las especialidades y obras sociales. Recargá la página."))
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

  const toggleObraSocial = (id) => {
    setObrasSocialesSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((obraId) => obraId !== id) : [...prev, id],
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setExito("")

    if (!nombreValido(form.nombre) || !nombreValido(form.apellido)) {
      setError("El nombre y el apellido solo pueden contener letras y espacios.")
      return
    }

    if (form.password !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    if (especialidadesSeleccionadas.length === 0) {
      setError("Seleccioná al menos una especialidad.")
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
      obrasSociales: obrasSocialesSeleccionadas,
      ...(form.telefonoAlternativo && { telefonoAlternativo: form.telefonoAlternativo }),
      ...(form.emailAlternativo && { emailAlternativo: form.emailAlternativo }),
    }

    setLoading(true)
    try {
      const res = await api.post("/profesionales/registro", payload)
      setExito(res.data.mensaje || "Profesional registrado correctamente en el sistema.")
      setForm(FORM_INICIAL)
      setEspecialidadesSeleccionadas([])
      setObrasSocialesSeleccionadas([])
    } catch (err) {
      const mensaje = err.response?.data?.error || err.response?.data?.message
      if (err.response?.status === 409) {
        setError(mensaje || "Ya existe un profesional con ese DNI o matrícula.")
      } else if (err.response?.status === 400) {
        setError(mensaje || "Error de validación. Revisa los datos ingresados.")
      } else {
        setError(mensaje || "Error al registrar. Intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="regpro-split">
      {/* Panel decorativo izquierdo */}
      <div className="regpro-visual">
        <div className="regpro-visual-content">
          <img src="/logo-simbolo-blanco.png" alt="Sanatorio Antonia" className="regpro-visual-logo" />
          <h3>Cuerpo médico</h3>
          <p>Registra profesionales de la salud y asignales sus especialidades de forma centralizada.</p>
        </div>
      </div>

      {/* Columna del formulario */}
      <div className="regpro-page">
        <div className="regpro-brand">
          <Link to="/dashboard">
            <img src="/logo-completo.png" alt="Sanatorio Antonia" className="regpro-brand-logo" />
          </Link>
        </div>
        <Link to="/dashboard" className="auth-back-link"><ArrowLeft size={17} /> Volver al panel</Link>
        <h2 className="regpro-title">Registro de profesional</h2>

        <form onSubmit={handleSubmit} className="regpro-form">

          {/* Matrícula */}
          <label className="regpro-label">
            Matrícula
            <input
              name="matricula"
              placeholder="Ej: MN-12345"
              className="regpro-input"
              value={form.matricula}
              onChange={handleChange}
              required
            />
          </label>

          {/* Nombre y Apellido */}
          <div className="regpro-row">
            <label className="regpro-label">
              Nombre
              <input
                name="nombre"
                placeholder="Ej: Maria"
                className="regpro-input"
                value={form.nombre}
                onChange={handleChange}
                required
                pattern="[\p{L}\p{M} ]+"
                title="Ingresá solo letras y espacios."
              />
            </label>
            <label className="regpro-label">
              Apellido
              <input
                name="apellido"
                placeholder="Ej: Lopez"
                className="regpro-input"
                value={form.apellido}
                onChange={handleChange}
                required
                pattern="[\p{L}\p{M} ]+"
                title="Ingresá solo letras y espacios."
              />
            </label>
          </div>

          {/* DNI */}
          <label className="regpro-label">
            DNI
            <input
              name="dni"
              placeholder="Ej: 30123456"
              className="regpro-input"
              value={form.dni}
              onChange={handleChange}
              required
            />
          </label>

          {/* Telefono */}
          <label className="regpro-label">
            Teléfono
            <input
              name="telefono"
              placeholder="Ej: 3564123456"
              className="regpro-input"
              value={form.telefono}
              onChange={handleChange}
              required
            />
          </label>

          {/* Email */}
          <label className="regpro-label">
            Email
            <input
              name="email"
              type="email"
              placeholder="Ej: medico@sanatorio.com"
              className="regpro-input"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          {/* Especialidades */}
          <fieldset className="regpro-fieldset">
            <legend>
              Especialidades <span style={{ color: "#DC2626" }}>*</span>
            </legend>
            {cargandoEspecialidades ? (
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Cargando especialidades...</p>
            ) : especialidades.length === 0 && !error ? (
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>No hay especialidades disponibles.</p>
            ) : (
              <div className="regpro-especialidades">
                {especialidades.map((esp) => (
                  <label key={esp.idEspecialidad}>
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

          <fieldset className="regpro-fieldset">
            <legend>Obras sociales que atiende</legend>
            {cargandoEspecialidades ? (
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Cargando obras sociales...</p>
            ) : obrasSociales.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>No hay obras sociales activas para asignar.</p>
            ) : (
              <div className="regpro-especialidades">
                {obrasSociales.map((obra) => (
                  <label key={obra.idObraSocial}>
                    <input
                      type="checkbox"
                      checked={obrasSocialesSeleccionadas.includes(obra.idObraSocial)}
                      onChange={() => toggleObraSocial(obra.idObraSocial)}
                    />
                    {obra.nombre}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* Datos opcionales */}
          <details className="regpro-details">
            <summary>Datos opcionales (teléfono y email alternativos)</summary>
            <div className="regpro-details-body">
              <label className="regpro-label">
                Teléfono alternativo
                <input
                  name="telefonoAlternativo"
                  placeholder="Ej: 3564123456"
                  className="regpro-input"
                  value={form.telefonoAlternativo}
                  onChange={handleChange}
                />
              </label>
              <label className="regpro-label">
                Email alternativo
                <input
                  name="emailAlternativo"
                  type="email"
                  placeholder="Ej: contacto@gmail.com"
                  className="regpro-input"
                  value={form.emailAlternativo}
                  onChange={handleChange}
                />
              </label>
            </div>
          </details>

          {/* Contraseña */}
          <div className="regpro-row">
            <label className="regpro-label">
              Contraseña
              <div className="password-field-wrap"><input
                name="password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Min. 8 carácteres"
                className="regpro-input"
                value={form.password}
                onChange={handleChange}
                required
              /><button type="button" className="password-toggle-button" onClick={() => setMostrarPassword((visible) => !visible)} aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{mostrarPassword ? <Eye size={18} /> : <EyeOff size={18} />}</button></div>
            </label>
            <label className="regpro-label">
              Confirmar contraseña
              <div className="password-field-wrap"><input
                name="confirmarPassword"
                type={mostrarConfirmacion ? 'text' : 'password'}
                placeholder="Repetir contraseña"
                className="regpro-input"
                value={form.confirmarPassword}
                onChange={handleChange}
                required
              /><button type="button" className="password-toggle-button" onClick={() => setMostrarConfirmacion((visible) => !visible)} aria-label={mostrarConfirmacion ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{mostrarConfirmacion ? <Eye size={18} /> : <EyeOff size={18} />}</button></div>
            </label>
          </div>
          <p className="regpro-password-hint">
            Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
          </p>

          {error && <p className="regpro-error">{error}</p>}
          {exito && <p className="regpro-success">{exito}</p>}

          <button type="submit" disabled={loading} className="regpro-button">
            {loading ? "Registrando..." : "Registrar Profesional"}
          </button>

          <Link to="/dashboard" className="regpro-link">
            Volver al dashboard
          </Link>
        </form>
      </div>
    </div>
  )
}

export default RegistroProfesional
