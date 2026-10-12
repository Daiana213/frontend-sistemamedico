import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/RegistroPaciente.css'
import { nombreValido } from '../utils/sesion'

const EDAD_MAXIMA = 120
const hoy = new Date()
const mesHoyStr = String(hoy.getMonth() + 1).padStart(2, '0')
const diaHoyStr = String(hoy.getDate()).padStart(2, '0')
const fechaMinima = `${hoy.getFullYear() - EDAD_MAXIMA}-${mesHoyStr}-${diaHoyStr}`
const fechaMaxima = `${hoy.getFullYear()}-${mesHoyStr}-${diaHoyStr}`

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const partes = String(fechaNacimiento).split('-').map(Number)
  if (partes.length !== 3 || partes.some(isNaN)) return null
  const [ano, mes, dia] = partes
  const fechaActual = new Date()
  let edad = fechaActual.getFullYear() - ano
  const mesDiff = (fechaActual.getMonth() + 1) - mes
  const diaDiff = fechaActual.getDate() - dia
  if (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0)) edad--
  return edad
}

function RegistroPaciente() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    fechaNacimiento: '',
    password: '',
    confirmarPassword: '',
    dniResponsable: '',
    parentesco: '',
    tipoDocumento: '',
  })
  const [documento, setDocumento] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Estado del flujo de verificación por WhatsApp (6 casillas de dígitos)
  const [paso, setPaso] = useState('FORMULARIO') // 'FORMULARIO' | 'VERIFICACION'
  const [codigoArray, setCodigoArray] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])
  const [verificando, setVerificando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [errorVerificacion, setErrorVerificacion] = useState('')
  const [infoMensaje, setInfoMensaje] = useState('')
  const [verificadoExitoso, setVerificadoExitoso] = useState(false)

  // Timer para reenvío del código (cooldown)
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const edad = calcularEdad(form.fechaNacimiento)
  const esMenor = edad !== null && edad < 18

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!nombreValido(form.nombre) || !nombreValido(form.apellido)) {
      setError('El nombre y el apellido solo pueden contener letras y espacios.')
      return
    }

    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (!form.fechaNacimiento) {
      setError('Por favor, ingresá tu fecha de nacimiento.')
      return
    }

    if (edad === null || edad < 0) {
      setError('La fecha de nacimiento no puede ser una fecha futura.')
      return
    }

    if (edad > EDAD_MAXIMA) {
      setError(`La fecha de nacimiento no es válida. No puede ser una fecha anterior a ${EDAD_MAXIMA} años.`)
      return
    }

    if (esMenor && !documento) {
      setError('Debe adjuntar el documento del adulto responsable.')
      return
    }

    setLoading(true)
    try {
      // Solicitamos el envío del código por WhatsApp antes de registrar al paciente
      await api.post('/auth/request-phone-code', { telefono: form.telefono })
      setInfoMensaje('Te enviamos un código de 6 dígitos a tu WhatsApp.')
      setPaso('VERIFICACION')
      setCooldown(45)
      setCodigoArray(['', '', '', '', '', ''])
    } catch (errTwilio) {
      const mensaje =
        errTwilio.response?.data?.message ||
        errTwilio.response?.data?.error ||
        'Error al enviar el código de verificación por WhatsApp. Verificá tu número de teléfono e intentá nuevamente.'
      setError(mensaje)
    } finally {
      setLoading(false)
    }
  }

  const handleDigitChange = (index, valor) => {
    const digito = valor.replace(/\D/g, '').slice(-1)
    const nuevoCodigo = [...codigoArray]
    nuevoCodigo[index] = digito
    setCodigoArray(nuevoCodigo)
    if (errorVerificacion) setErrorVerificacion('')

    // Auto-avance al siguiente campo si se ingresó un dígito
    if (digito && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!codigoArray[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const textoPegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!textoPegado) return

    const nuevoCodigo = [...codigoArray]
    for (let i = 0; i < 6; i++) {
      nuevoCodigo[i] = textoPegado[i] || ''
    }
    setCodigoArray(nuevoCodigo)
    if (errorVerificacion) setErrorVerificacion('')

    const siguienteIndice = Math.min(textoPegado.length, 5)
    inputRefs.current[siguienteIndice]?.focus()
  }

  const handleVerificarCodigo = async (e) => {
    e.preventDefault()
    setErrorVerificacion('')

    const codigoLimpio = codigoArray.join('').trim()
    if (!codigoLimpio || codigoLimpio.length !== 6) {
      setErrorVerificacion('Por favor, ingresá los 6 dígitos del código.')
      return
    }

    setVerificando(true)
    try {
      // 1. Validar el código de WhatsApp en el backend
      await api.post('/auth/verify-phone-code', {
        telefono: form.telefono,
        codigo: codigoLimpio,
      })

      // 2. Si el código fue validado con éxito, recién ahora registramos al paciente
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'confirmarPassword') return
        if (value !== '') formData.append(key, value)
      })
      if (documento) formData.append('documento', documento)

      await api.post('/pacientes/registro', formData)

      setVerificadoExitoso(true)
      setTimeout(() => {
        navigate('/', { state: { registroExitoso: true } })
      }, 1500)
    } catch (err) {
      const mensaje =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Código incorrecto o error al registrar. Verificalo e intentá de nuevo.'
      setErrorVerificacion(mensaje)
    } finally {
      setVerificando(false)
    }
  }

  const handleReenviarCodigo = async () => {
    if (cooldown > 0 || reenviando) return
    setErrorVerificacion('')
    setReenviando(true)
    try {
      await api.post('/auth/request-phone-code', { telefono: form.telefono })
      setInfoMensaje('Código reenviado exitosamente a tu WhatsApp.')
      setCooldown(45)
    } catch (err) {
      setErrorVerificacion('No pudimos reenviar el código. Intentá nuevamente en unos momentos.')
    } finally {
      setReenviando(false)
    }
  }

  return (
    <div className="registro-split">
      <div className="registro-visual">
        <div className="registro-visual-content">
          {paso === 'VERIFICACION' ? (
            <>
              <div className="verificacion-badge-visual">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Seguridad de tu cuenta</span>
              </div>
              <h3>Validá tu WhatsApp</h3>
              <p>Te enviamos un código de 6 dígitos para asegurar y verificar tu número de teléfono.</p>
            </>
          ) : (
            <>
              <h3>Unite a nosotros</h3>
              <p>Creá tu cuenta y empezá a gestionar tu salud en un solo lugar.</p>
            </>
          )}
        </div>
      </div>
      <div className="registro-page">
        {paso === 'VERIFICACION' ? (
          <div className="registro-form verificacion-form">
            {verificadoExitoso ? (
              <div className="verificacion-exito-box">
                <div className="verificacion-icono-exito">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <h2 className="registro-title" style={{ marginBottom: '8px' }}>¡Teléfono verificado!</h2>
                <p className="registro-subtitle">
                  Tu número fue validado correctamente. Tu cuenta ya está lista.
                </p>
                <p className="verificacion-redirigiendo">Redirigiendo al inicio de sesión...</p>
              </div>
            ) : (
              <>
                <div className="verificacion-header">
                  <div className="verificacion-icono-whatsapp">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.18 8.18 0 0 1-5.83 2.41c-1.47 0-2.93-.39-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.186 8.186 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.27-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.3z"/>
                    </svg>
                  </div>
                  <h2 className="registro-title" style={{ marginBottom: '6px' }}>Validá tu WhatsApp</h2>
                  <p className="registro-subtitle">
                    Ingresá el código de 6 dígitos que enviamos al número <strong>{form.telefono}</strong>.
                  </p>
                </div>

                {infoMensaje && (
                  <div className="verificacion-info">
                    {infoMensaje}
                  </div>
                )}

                <form onSubmit={handleVerificarCodigo} className="verificacion-subform">
                  <div className="verificacion-input-group">
                    <label className="registro-label" style={{ textAlign: 'center' }}>
                      Código de verificación (6 dígitos)
                    </label>
                    <div className="otp-container" onPaste={handlePaste}>
                      {codigoArray.map((digito, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (inputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digito}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className={`otp-box ${digito ? 'otp-box-filled' : ''}`}
                          autoFocus={idx === 0}
                          aria-label={`Dígito ${idx + 1}`}
                          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                        />
                      ))}
                    </div>
                  </div>

                  {errorVerificacion && (
                    <p className="registro-error" style={{ textAlign: 'center' }}>
                      {errorVerificacion}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={verificando || codigoArray.join('').length !== 6}
                    className="registro-button"
                  >
                    {verificando ? 'Verificando...' : 'Verificar código'}
                  </button>
                </form>

                <div className="verificacion-acciones-footer">
                  <div className="verificacion-reenviar">
                    <span className="verificacion-texto-ayuda">¿No te llegó el código?</span>
                    {cooldown > 0 ? (
                      <span className="verificacion-countdown">Podés reenviar en {cooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleReenviarCodigo}
                        disabled={reenviando}
                        className="verificacion-btn-link"
                      >
                        {reenviando ? 'Reenviando...' : 'Reenviar código por WhatsApp'}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setPaso('FORMULARIO'); setErrorVerificacion(''); }}
                    className="verificacion-btn-volver"
                  >
                    ← Modificar número o datos
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <h2 className="registro-title">Registro de paciente</h2>

            <form onSubmit={handleSubmit} className="registro-form">
              <div className="registro-row">
          <label className="registro-label">
            Nombre
            <input name="nombre" placeholder="Ej: Ana" className="registro-input" value={form.nombre} onChange={handleChange} required pattern="[\p{L}\p{M} ]+" title="Ingresá solo letras y espacios." />
          </label>
          <label className="registro-label">
            Apellido
            <input name="apellido" placeholder="Ej: González" className="registro-input" value={form.apellido} onChange={handleChange} required pattern="[\p{L}\p{M} ]+" title="Ingresá solo letras y espacios." />
          </label>
        </div>

        <label className="registro-label">
          DNI
          <input name="dni" placeholder="Ej: 30123456" className="registro-input" value={form.dni} onChange={handleChange} required />
        </label>

        <label className="registro-label">
          Teléfono
          <input name="telefono" placeholder="Ej: 3564123456" className="registro-input" value={form.telefono} onChange={handleChange} required />
        </label>

        <div className="registro-row">
          <label className="registro-label">
            Contraseña
            <input
              name="password"
              type="password"
              placeholder="Mín. 8 caracteres"
              className="registro-input"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          <label className="registro-label">
            Confirmar contraseña
            <input
              name="confirmarPassword"
              type="password"
              placeholder="Repetir contraseña"
              className="registro-input"
              value={form.confirmarPassword}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <p className="registro-password-hint">
          Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
        </p>

        <label className="registro-label">
          Fecha de nacimiento
          <input
            name="fechaNacimiento"
            type="date"
            className="registro-input"
            value={form.fechaNacimiento}
            onChange={handleChange}
            min={fechaMinima}
            max={fechaMaxima}
            required
          />
        </label>

        {esMenor && (
          <fieldset className="registro-fieldset">
            <legend className="registro-legend">
              Datos del adulto responsable (paciente menor de edad)
            </legend>

            <label className="registro-label">
              DNI del responsable
              <input
                name="dniResponsable"
                placeholder="Ej: 25987654"
                className="registro-input"
                value={form.dniResponsable}
                onChange={handleChange}
                required
              />
            </label>

            <label className="registro-label">
              Parentesco
              <input
                name="parentesco"
                placeholder="Ej: madre, padre, tutor"
                className="registro-input"
                value={form.parentesco}
                onChange={handleChange}
                required
              />
            </label>

            <label className="registro-label">
              Tipo de documento
              <select
                name="tipoDocumento"
                className="registro-input"
                value={form.tipoDocumento}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar</option>
                <option value="PARTIDA_NACIMIENTO">Partida de nacimiento</option>
                <option value="LIBRETA_MATRIMONIO">Libreta de matrimonio</option>
                <option value="SENTENCIA_ADOPCION">Sentencia de adopción</option>
              </select>
            </label>

            <label className="registro-label">
              Documento adjunto (PDF, JPG o PNG)
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="registro-input"
                onChange={(e) => setDocumento(e.target.files[0])}
                required
              />
            </label>
          </fieldset>
        )}

        {error && <p className="registro-error">{error}</p>}

        <button type="submit" disabled={loading} className="registro-button">
          {loading ? 'Enviando código...' : 'Registrarme'}
        </button>

            <p className="registro-footer">
              ¿Ya tenés cuenta?{' '}
              <Link to="/">
                Iniciar sesión
              </Link>
            </p>
          </form>
        </>
      )}
    </div>
    </div>
  )
}

export default RegistroPaciente
