import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../api/axios"
import "../styles/RegistroProfesional.css"

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
  const [form, setForm] = useState(FORM_INICIAL)
  const [especialidades, setEspecialidades] = useState([])
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState([])
  const [error, setError] = useState("")
  const [exito, setExito] = useState("")
  const [loading, setLoading] = useState(false)
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(true)

  useEffect(() => {
    api
      .get("/especialidades")
      .then((res) => setEspecialidades(res.data))
      .catch(() => setError("No se pudieron cargar las especialidades. Recarga la pagina."))
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setExito("")

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
      ...(form.telefonoAlternativo && { telefonoAlternativo: form.telefonoAlternativo }),
      ...(form.emailAlternativo && { emailAlternativo: form.emailAlternativo }),
    }

    setLoading(true)
    try {
      const res = await api.post("/profesionales/registro", payload)
      setExito(res.data.mensaje || "Profesional registrado correctamente en el sistema.")
      setForm(FORM_INICIAL)
      setEspecialidadesSeleccionadas([])
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
          <h3>Cuerpo médico</h3>
          <p>Registra profesionales de la salud y asignales sus especialidades de forma centralizada.</p>
        </div>
      </div>

      {/* Columna del formulario */}
      <div className="regpro-page">
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
              <input
                name="password"
                type="password"
                placeholder="Min. 8 carácteres"
                className="regpro-input"
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>
            <label className="regpro-label">
              Confirmar contraseña
              <input
                name="confirmarPassword"
                type="password"
                placeholder="Repetir contraseña"
                className="regpro-input"
                value={form.confirmarPassword}
                onChange={handleChange}
                required
              />
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
