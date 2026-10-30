import { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import '../styles/CompletarPerfil.css'

const perfilInicial = {
  email: '',
  sexo: '',
  idObraSocial: '',
  idPlan: '',
  numeroAfiliado: '',
  subfijoAdherente: '',
  vencimientoCredencial: '',
}

function CompletarPerfil({ abierto, alCompletar }) {
  const [perfil, setPerfil] = useState(perfilInicial)
  const [emailOriginal, setEmailOriginal] = useState('')
  const [obrasSociales, setObrasSociales] = useState([])
  const [planes, setPlanes] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Estado del paso de verificación de email (6 dígitos)
  const [paso, setPaso] = useState('FORMULARIO') // 'FORMULARIO' | 'VERIFICACION'
  const [codigoArray, setCodigoArray] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])
  const [verificando, setVerificando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [infoMensaje, setInfoMensaje] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (!abierto) return
    setPaso('FORMULARIO')
    setCodigoArray(['', '', '', '', '', ''])
    const cargarDatos = async () => {
      setError('')
      try {
        const [{ data: datosPerfil }, { data: datosObrasSociales }] = await Promise.all([
          api.get('/pacientes/perfil'),
          api.get('/obras-sociales'),
        ])
        const { paciente } = datosPerfil
        const correoActual = paciente.usuario.email || ''
        setEmailOriginal(correoActual)
        setPerfil({
          email: correoActual,
          sexo: paciente.sexo || '',
          idObraSocial: paciente.plan?.idObraSocial?.toString() || '',
          idPlan: paciente.idPlan?.toString() || '',
          numeroAfiliado: paciente.numeroAfiliado || '',
          subfijoAdherente: paciente.subfijoAdherente || '',
          vencimientoCredencial: paciente.vencimientoCredencial
            ? new Date(paciente.vencimientoCredencial).toISOString().slice(0, 10)
            : '',
        })
        setObrasSociales(datosObrasSociales)
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar tu perfil. Recargá la página.')
      }
    }

    cargarDatos()
  }, [abierto])

  useEffect(() => {
    if (!perfil.idObraSocial) {
      setPlanes([])
      return
    }

    api
      .get(`/obras-sociales/${perfil.idObraSocial}/planes`)
      .then(({ data }) => setPlanes(data))
      .catch(() => setError('No se pudieron cargar los planes de esa obra social.'))
  }, [perfil.idObraSocial])

  const handleChange = ({ target: { name, value } }) => {
    setError('')
    setPerfil((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'idObraSocial' ? { idPlan: '' } : {}),
    }))
  }

  const guardarPerfilEnBackend = async () => {
    const { data } = await api.put('/pacientes/perfil', {
      ...perfil,
      email: perfil.email.trim(),
      idObraSocial: Number(perfil.idObraSocial),
      idPlan: Number(perfil.idPlan),
      numeroAfiliado: perfil.numeroAfiliado.trim(),
      subfijoAdherente: perfil.subfijoAdherente.trim() || null,
      vencimientoCredencial: perfil.vencimientoCredencial || null,
    })
    if (!data.perfilCompleto) {
      setError('Completá todos los datos requeridos para continuar.')
      return
    }
    alCompletar?.(data.paciente)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setCargando(true)
    setError('')
    try {
      const emailLimpio = perfil.email.trim()
      // Si el usuario ya tenía ese mismo email registrado y solo completó sexo/plan, guardamos directo
      if (emailOriginal && emailOriginal.toLowerCase() === emailLimpio.toLowerCase()) {
        await guardarPerfilEnBackend()
        return
      }

      // Solicitamos el envío del código de 6 dígitos al correo ingresado
      await api.post('/auth/request-email-code', { email: emailLimpio })
      setInfoMensaje(`Te enviamos un código de 6 dígitos a ${emailLimpio}`)
      setPaso('VERIFICACION')
      setCooldown(45)
      setCodigoArray(['', '', '', '', '', ''])
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'No se pudo enviar el código de verificación al correo indicado.'
      )
    } finally {
      setCargando(false)
    }
  }

  const handleDigitChange = (index, valor) => {
    const digito = valor.replace(/\D/g, '').slice(-1)
    const nuevoCodigo = [...codigoArray]
    nuevoCodigo[index] = digito
    setCodigoArray(nuevoCodigo)
    if (error) setError('')

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
    if (error) setError('')

    const siguienteIndice = Math.min(textoPegado.length, 5)
    inputRefs.current[siguienteIndice]?.focus()
  }

  const handleVerificarYGuardar = async (e) => {
    e.preventDefault()
    setError('')

    const codigoLimpio = codigoArray.join('').trim()
    if (codigoLimpio.length !== 6) {
      setError('Por favor, ingresá los 6 dígitos del código enviado a tu correo.')
      return
    }

    setVerificando(true)
    try {
      await api.post('/auth/verify-email-code', {
        email: perfil.email.trim(),
        codigo: codigoLimpio,
      })

      await guardarPerfilEnBackend()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'El código es inválido o expiró. Verificalo e intentá nuevamente.'
      )
    } finally {
      setVerificando(false)
    }
  }

  const handleReenviarCodigo = async () => {
    if (cooldown > 0 || reenviando) return
    setError('')
    setReenviando(true)
    try {
      await api.post('/auth/request-email-code', { email: perfil.email.trim() })
      setInfoMensaje(`Código reenviado a ${perfil.email.trim()}`)
      setCooldown(45)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'No pudimos reenviar el código en este momento.'
      )
    } finally {
      setReenviando(false)
    }
  }

  if (!abierto) return null

  return (
    <div className="perfil-modal-backdrop" role="presentation">
      <section className="perfil-modal" role="dialog" aria-modal="true" aria-labelledby="completar-perfil-titulo">
        {paso === 'FORMULARIO' ? (
          <>
            <h2 id="completar-perfil-titulo">Completá tu perfil</h2>
            <p>Necesitamos estos datos para que puedas solicitar un turno y recibir notificaciones.</p>

            <form className="perfil-form" onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={perfil.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Sexo
                <select name="sexo" value={perfil.sexo} onChange={handleChange} required>
                  <option value="">Seleccionar</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                  <option value="OTRO">Otro</option>
                </select>
              </label>

              <label>
                Obra social
                <select name="idObraSocial" value={perfil.idObraSocial} onChange={handleChange} required>
                  <option value="">Seleccionar</option>
                  {obrasSociales.map((obraSocial) => (
                    <option key={obraSocial.idObraSocial} value={obraSocial.idObraSocial}>
                      {obraSocial.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Plan
                <select
                  name="idPlan"
                  value={perfil.idPlan}
                  onChange={handleChange}
                  disabled={!perfil.idObraSocial}
                  required
                >
                  <option value="">Seleccionar</option>
                  {planes.map((plan) => (
                    <option key={plan.idPlan} value={plan.idPlan}>
                      {plan.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Número de afiliado
                <input
                  name="numeroAfiliado"
                  type="text"
                  maxLength={50}
                  placeholder="Número que figura en tu credencial"
                  value={perfil.numeroAfiliado}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Subfijo de adherente (opcional)
                <input
                  name="subfijoAdherente"
                  type="text"
                  maxLength={10}
                  placeholder="Ej. /00 (titular), /01"
                  value={perfil.subfijoAdherente}
                  onChange={handleChange}
                />
              </label>

              <label>
                Vencimiento de credencial (opcional)
                <input
                  name="vencimientoCredencial"
                  type="date"
                  value={perfil.vencimientoCredencial}
                  onChange={handleChange}
                />
              </label>

              {error && <p className="perfil-error">{error}</p>}

              <button type="submit" disabled={cargando}>
                {cargando ? 'Enviando código...' : 'Validar correo y guardar'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 id="completar-perfil-titulo">Verificá tu correo</h2>
            <p>{infoMensaje || `Ingresá el código de 6 dígitos enviado a ${perfil.email}`}</p>

            <form className="perfil-form" onSubmit={handleVerificarYGuardar}>
              <div className="perfil-otp-grid" onPaste={handlePaste}>
                {codigoArray.map((digito, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="perfil-otp-input"
                    value={digito}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    aria-label={`Dígito ${index + 1}`}
                  />
                ))}
              </div>

              {error && <p className="perfil-error">{error}</p>}

              <button type="submit" disabled={verificando}>
                {verificando ? 'Verificando...' : 'Confirmar código y guardar'}
              </button>

              <div className="perfil-otp-actions">
                <button
                  type="button"
                  className="perfil-btn-secundario"
                  onClick={handleReenviarCodigo}
                  disabled={cooldown > 0 || reenviando}
                >
                  {reenviando
                    ? 'Reenviando...'
                    : cooldown > 0
                      ? `Reenviar código en ${cooldown}s`
                      : 'Reenviar código'}
                </button>

                <button
                  type="button"
                  className="perfil-btn-link"
                  onClick={() => {
                    setPaso('FORMULARIO')
                    setError('')
                  }}
                >
                  Cambiar correo electrónico
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

export default CompletarPerfil

