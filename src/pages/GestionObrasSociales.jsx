import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import api from '../api/axios'
import '../styles/GestionObrasSociales.css'

const TIPOS_OBRA_SOCIAL = [
  ['OBRA_SOCIAL_SINDICAL', 'Obra social sindical'],
  ['MEDICINA_PREPAGA', 'Medicina prepaga'],
  ['OBRA_SOCIAL_PROVINCIAL', 'Obra social provincial'],
  ['PAMI_INSSJP', 'PAMI / INSSJP'],
  ['OTRA', 'Otra'],
]

const OBRA_VACIA = {
  nombre: '', razonSocial: '', cuit: '', codigoRnos: '', tipo: 'OBRA_SOCIAL_SINDICAL', descripcion: '',
}
const PLAN_VACIO = {
  nombre: '', descripcion: '', requiereCopago: false, montoCopago: '', requiereAutorizacionPrevia: false,
}

function mensajeError(error, fallback) {
  return error.response?.data?.message || error.response?.data?.error || fallback
}

function cuitValidoAFIP(cuit) {
  if (!/^\d{11}$/.test(cuit)) return false
  if (!['20', '23', '24', '27', '30', '33', '34'].includes(cuit.slice(0, 2))) return false
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = multiplicadores.reduce((total, multiplicador, indice) => total + Number(cuit[indice]) * multiplicador, 0)
  const resto = suma % 11
  const digito = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto
  return digito === Number(cuit[10])
}

export default function GestionObrasSociales() {
  const [obrasSociales, setObrasSociales] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [mostrarInactivas, setMostrarInactivas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorPagina, setErrorPagina] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [obraAbierta, setObraAbierta] = useState(null)
  const [modal, setModal] = useState('')
  const [obraEditando, setObraEditando] = useState(null)
  const [obraForm, setObraForm] = useState(OBRA_VACIA)
  const [planEditando, setPlanEditando] = useState(null)
  const [planForm, setPlanForm] = useState(PLAN_VACIO)
  const [errorModal, setErrorModal] = useState('')
  const [erroresCamposObra, setErroresCamposObra] = useState({})
  const [confirmacion, setConfirmacion] = useState(null)

  const cargarObrasSociales = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true)
    setErrorPagina('')
    try {
      const { data } = await api.get('/obras-sociales', { params: { incluirInactivas: true } })
      setObrasSociales(Array.isArray(data) ? data : [])
    } catch (error) {
      setErrorPagina(mensajeError(error, 'No se pudieron cargar las obras sociales.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarObrasSociales() }, [cargarObrasSociales])

  const obrasVisibles = useMemo(() => obrasSociales.filter((obra) => {
    if (!mostrarInactivas && obra.estado !== 'ACTIVO') return false
    const consulta = busqueda.trim().toLocaleLowerCase('es')
    return !consulta || [obra.nombre, obra.razonSocial, obra.cuit, obra.codigoRnos]
      .filter(Boolean).join(' ').toLocaleLowerCase('es').includes(consulta)
  }), [obrasSociales, busqueda, mostrarInactivas])

  const abrirAltaObra = () => {
    setObraEditando(null)
    setObraForm(OBRA_VACIA)
    setErrorModal('')
    setErroresCamposObra({})
    setModal('obra')
  }

  const abrirEdicionObra = (obra) => {
    setObraEditando(obra)
    setObraForm({
      nombre: obra.nombre || '',
      razonSocial: obra.razonSocial || '',
      cuit: obra.cuit || '',
      codigoRnos: obra.codigoRnos || '',
      tipo: obra.tipo || 'OBRA_SOCIAL_SINDICAL',
      descripcion: obra.descripcion || '',
    })
    setErrorModal('')
    setErroresCamposObra({})
    setModal('obra')
  }

  const guardarObra = async (event) => {
    event.preventDefault()
    setErrorModal('')
    setErroresCamposObra({})
    if (obraForm.cuit && !cuitValidoAFIP(obraForm.cuit)) {
      setErroresCamposObra({ cuit: 'El CUIT ingresado no es válido según el algoritmo oficial de AFIP.' })
      return
    }
    setGuardando(true)
    setErrorModal('')
    try {
      const payload = {
        nombre: obraForm.nombre.trim(),
        razonSocial: obraForm.razonSocial.trim() || null,
        cuit: obraForm.cuit.trim() || null,
        codigoRnos: obraForm.codigoRnos.trim() || null,
        tipo: obraForm.tipo,
        descripcion: obraForm.descripcion.trim() || null,
      }
      const { data } = obraEditando
        ? await api.put(`/obras-sociales/${obraEditando.idObraSocial}`, payload)
        : await api.post('/obras-sociales', payload)
      setMensaje(data.mensaje || (obraEditando ? 'Obra social actualizada.' : 'Obra social creada.'))
      setModal('')
      await cargarObrasSociales(false)
    } catch (error) {
      const detalles = error.response?.data?.details || {}
      const mensaje = mensajeError(error, 'No se pudo guardar la obra social.')
      const campos = { ...detalles }
      if (!campos.cuit && /cuit/i.test(mensaje) && /inv[aá]lid/i.test(mensaje)) {
        campos.cuit = 'El CUIT ingresado no es válido según el algoritmo oficial de AFIP.'
      }
      if (!campos.cuit && /cuit/i.test(mensaje) && /existe/i.test(mensaje)) {
        campos.cuit = 'Ya existe una obra social registrada con ese CUIT.'
      }
      if (!campos.nombre && /nombre/i.test(mensaje) && /existe/i.test(mensaje)) {
        campos.nombre = 'Ya existe una obra social registrada con ese nombre.'
      }
      if (Object.keys(campos).length) {
        setErroresCamposObra(campos)
        setErrorModal('')
      } else {
        setErrorModal(mensaje)
      }
    } finally {
      setGuardando(false)
    }
  }

  const abrirAltaPlan = (obra) => {
    setObraEditando(obra)
    setPlanEditando(null)
    setPlanForm(PLAN_VACIO)
    setErrorModal('')
    setModal('plan')
  }

  const abrirEdicionPlan = (obra, plan) => {
    setObraEditando(obra)
    setPlanEditando(plan)
    setPlanForm({
      nombre: plan.nombre || '',
      descripcion: plan.descripcion || '',
      requiereCopago: Boolean(plan.requiereCopago),
      montoCopago: plan.montoCopago == null ? '' : String(plan.montoCopago),
      requiereAutorizacionPrevia: Boolean(plan.requiereAutorizacionPrevia),
    })
    setErrorModal('')
    setModal('plan')
  }

  const guardarPlan = async (event) => {
    event.preventDefault()
    setGuardando(true)
    setErrorModal('')
    try {
      const payload = {
        nombre: planForm.nombre.trim(),
        descripcion: planForm.descripcion.trim() || null,
        requiereCopago: planForm.requiereCopago,
        montoCopago: planForm.requiereCopago && planForm.montoCopago !== ''
          ? Number(planForm.montoCopago)
          : null,
        requiereAutorizacionPrevia: planForm.requiereAutorizacionPrevia,
      }
      const { data } = planEditando
        ? await api.put(`/obras-sociales/planes/${planEditando.idPlan}`, payload)
        : await api.post(`/obras-sociales/${obraEditando.idObraSocial}/planes`, payload)
      setMensaje(data.mensaje || (planEditando ? 'Plan actualizado.' : 'Plan creado.'))
      setModal('')
      await cargarObrasSociales(false)
    } catch (error) {
      setErrorModal(mensajeError(error, 'No se pudo guardar el plan.'))
    } finally {
      setGuardando(false)
    }
  }

  const ejecutarAccion = async () => {
    if (!confirmacion) return
    setGuardando(true)
    setErrorModal('')
    try {
      const { tipo, objetivo } = confirmacion
      let respuesta
      if (tipo === 'baja-obra') respuesta = await api.delete(`/obras-sociales/${objetivo.idObraSocial}`)
      if (tipo === 'reactivar-obra') respuesta = await api.patch(`/obras-sociales/${objetivo.idObraSocial}/reactivar`)
      if (tipo === 'baja-plan') respuesta = await api.delete(`/obras-sociales/planes/${objetivo.idPlan}`)
      if (tipo === 'reactivar-plan') respuesta = await api.patch(`/obras-sociales/planes/${objetivo.idPlan}/reactivar`)
      setMensaje(respuesta?.data?.mensaje || 'Cambio guardado correctamente.')
      setConfirmacion(null)
      await cargarObrasSociales(false)
    } catch (error) {
      setErrorModal(mensajeError(error, 'No se pudo completar la acción.'))
    } finally {
      setGuardando(false)
    }
  }

  const cerrarModal = () => {
    if (guardando) return
    setModal('')
    setConfirmacion(null)
    setErrorModal('')
    setErroresCamposObra({})
  }

  return <main className="admin-insurance-page">
    <header className="admin-insurance-header"><Link to="/dashboard">← Volver al panel</Link><img src="/logo-completo.png" alt="Sanatorio Antonia" /></header>
    <section className="admin-insurance-content">
      <div className="admin-insurance-heading"><p className="admin-insurance-eyebrow">ADMINISTRACIÓN</p><h1>Obras sociales y prepagas</h1><p>Gestioná convenios, datos fiscales y planes de cobertura.</p></div>
      {mensaje && <p className="admin-insurance-message admin-insurance-message--success" role="status">{mensaje}<button type="button" onClick={() => setMensaje('')} aria-label="Cerrar mensaje">×</button></p>}
      {errorPagina && <p className="admin-insurance-message admin-insurance-message--error" role="alert">{errorPagina}</p>}
      <div className="admin-insurance-toolbar">
        <label>Buscar entidad<input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre, razón social, CUIT o RNOS" /></label>
        <label className="admin-insurance-inactive"><input type="checkbox" checked={mostrarInactivas} onChange={(event) => setMostrarInactivas(event.target.checked)} /> Mostrar inactivas</label>
        <button type="button" className="admin-insurance-primary" onClick={abrirAltaObra}><Plus size={17} /> Nueva obra social</button>
      </div>

      {cargando ? <div className="admin-insurance-empty">Cargando obras sociales…</div> : obrasVisibles.length ? <div className="admin-insurance-list">
        {obrasVisibles.map((obra) => {
          const abierta = obraAbierta === obra.idObraSocial
          return <article className="admin-insurance-card" key={obra.idObraSocial}>
            <div className="admin-insurance-card-main">
              <div className="admin-insurance-card-title"><div><h2>{obra.nombre}</h2><p>{obra.razonSocial || 'Sin razón social'}</p></div><span className={`admin-insurance-status admin-insurance-status--${String(obra.estado).toLowerCase()}`}>{obra.estado === 'ACTIVO' ? 'Activa' : 'Inactiva'}</span></div>
              <dl className="admin-insurance-details"><div><dt>CUIT</dt><dd>{obra.cuit || '—'}</dd></div><div><dt>Código RNOS</dt><dd>{obra.codigoRnos || '—'}</dd></div><div><dt>Tipo</dt><dd>{TIPOS_OBRA_SOCIAL.find(([valor]) => valor === obra.tipo)?.[1] || obra.tipo}</dd></div></dl>
              {obra.descripcion && <p className="admin-insurance-description">{obra.descripcion}</p>}
            </div>
            <div className="admin-insurance-actions"><button type="button" onClick={() => setObraAbierta(abierta ? null : obra.idObraSocial)} aria-expanded={abierta}>{abierta ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Planes ({obra.planes?.length || 0})</button><button type="button" onClick={() => abrirEdicionObra(obra)}>Editar</button>{obra.estado === 'ACTIVO' ? <button type="button" className="admin-insurance-danger" onClick={() => { setConfirmacion({ tipo: 'baja-obra', objetivo: obra }); setErrorModal('') }}>Dar de baja</button> : <button type="button" onClick={() => { setConfirmacion({ tipo: 'reactivar-obra', objetivo: obra }); setErrorModal('') }}>Reactivar</button>}</div>
            {abierta && <section className="admin-insurance-plans"><div className="admin-insurance-plans-heading"><div><h3>Planes de {obra.nombre}</h3><p>Configurá copagos y requisitos de autorización.</p></div><button type="button" className="admin-insurance-primary" onClick={() => abrirAltaPlan(obra)} disabled={obra.estado !== 'ACTIVO'}><Plus size={16} /> Nuevo plan</button></div>
              {obra.planes?.length ? <div className="admin-plan-list">{obra.planes.map((plan) => <article className="admin-plan-card" key={plan.idPlan}><div className="admin-plan-main"><div className="admin-plan-title"><h4>{plan.nombre}</h4><span className={`admin-insurance-status admin-insurance-status--${String(plan.estado).toLowerCase()}`}>{plan.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span></div><p>{plan.descripcion || 'Sin descripción'}</p><div className="admin-plan-rules"><span>{plan.requiereCopago ? `Copago ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(plan.montoCopago || 0))}` : 'Sin copago'}</span><span>{plan.requiereAutorizacionPrevia ? 'Requiere autorización previa' : 'Sin autorización previa'}</span></div></div><div className="admin-insurance-actions"><button type="button" onClick={() => abrirEdicionPlan(obra, plan)}>Editar</button>{plan.estado === 'ACTIVO' ? <button type="button" className="admin-insurance-danger" onClick={() => { setConfirmacion({ tipo: 'baja-plan', objetivo: plan }); setErrorModal('') }}>Dar de baja</button> : <button type="button" onClick={() => { setConfirmacion({ tipo: 'reactivar-plan', objetivo: plan }); setErrorModal('') }}>Reactivar</button>}</div></article>)}</div> : <p className="admin-insurance-empty admin-insurance-empty--inline">Todavía no hay planes registrados.</p>}
            </section>}
          </article>
        })}
      </div> : <div className="admin-insurance-empty"><strong>No hay obras sociales que coincidan</strong><p>Probá otra búsqueda o agregá una entidad.</p></div>}
    </section>

    {modal && <div className="admin-insurance-backdrop" role="presentation"><section className="admin-insurance-modal" role="dialog" aria-modal="true" aria-labelledby="insurance-modal-title"><button type="button" className="admin-insurance-close" onClick={cerrarModal} aria-label="Cerrar" disabled={guardando}>×</button>
      {modal === 'obra' && <form onSubmit={guardarObra}><p className="admin-insurance-eyebrow">DATOS DE COBERTURA</p><h2 id="insurance-modal-title">{obraEditando ? 'Editar obra social' : 'Nueva obra social o prepaga'}</h2>{errorModal && <p className="admin-insurance-message admin-insurance-message--error" role="alert">{errorModal}</p>}<div className="admin-insurance-form-grid"><label>Nombre *<input required minLength={2} maxLength={100} value={obraForm.nombre} aria-invalid={Boolean(erroresCamposObra.nombre)} aria-describedby={erroresCamposObra.nombre ? 'insurance-name-error' : undefined} className={erroresCamposObra.nombre ? 'admin-insurance-field--invalid' : ''} onChange={(event) => { setObraForm((actual) => ({ ...actual, nombre: event.target.value })); setErroresCamposObra((actual) => ({ ...actual, nombre: '' })) }} />{erroresCamposObra.nombre && <span id="insurance-name-error" className="admin-insurance-field-error" role="alert">{erroresCamposObra.nombre}</span>}</label><label>Razón social<input maxLength={150} value={obraForm.razonSocial} onChange={(event) => setObraForm((actual) => ({ ...actual, razonSocial: event.target.value }))} /></label><label>CUIT<input inputMode="numeric" maxLength={11} pattern="\d{11}" title="Ingresá 11 dígitos, sin guiones." value={obraForm.cuit} aria-invalid={Boolean(erroresCamposObra.cuit)} aria-describedby={erroresCamposObra.cuit ? 'insurance-cuit-error' : undefined} className={erroresCamposObra.cuit ? 'admin-insurance-field--invalid' : ''} onChange={(event) => { setObraForm((actual) => ({ ...actual, cuit: event.target.value.replace(/\D/g, '').slice(0, 11) })); setErroresCamposObra((actual) => ({ ...actual, cuit: '' })) }} placeholder="Sin guiones" />{erroresCamposObra.cuit && <span id="insurance-cuit-error" className="admin-insurance-field-error" role="alert">{erroresCamposObra.cuit}</span>}</label><label>Código RNOS<input maxLength={20} value={obraForm.codigoRnos} onChange={(event) => setObraForm((actual) => ({ ...actual, codigoRnos: event.target.value }))} /></label><label>Tipo de entidad<select value={obraForm.tipo} onChange={(event) => setObraForm((actual) => ({ ...actual, tipo: event.target.value }))}>{TIPOS_OBRA_SOCIAL.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></label><label className="admin-insurance-full">Descripción<textarea rows={3} maxLength={255} value={obraForm.descripcion} onChange={(event) => setObraForm((actual) => ({ ...actual, descripcion: event.target.value }))} /></label></div><div className="admin-insurance-modal-actions"><button type="button" className="admin-insurance-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="submit" className="admin-insurance-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar obra social'}</button></div></form>}
      {modal === 'plan' && <form onSubmit={guardarPlan}><p className="admin-insurance-eyebrow">{obraEditando?.nombre}</p><h2 id="insurance-modal-title">{planEditando ? 'Editar plan' : 'Nuevo plan'}</h2>{errorModal && <p className="admin-insurance-message admin-insurance-message--error" role="alert">{errorModal}</p>}<div className="admin-insurance-form-grid admin-insurance-form-grid--single"><label>Nombre del plan *<input required minLength={2} maxLength={100} value={planForm.nombre} onChange={(event) => setPlanForm((actual) => ({ ...actual, nombre: event.target.value }))} placeholder="Ej. Plan Integral 210" /></label><label>Descripción<textarea rows={3} maxLength={255} value={planForm.descripcion} onChange={(event) => setPlanForm((actual) => ({ ...actual, descripcion: event.target.value }))} /></label><label className="admin-insurance-check"><input type="checkbox" checked={planForm.requiereCopago} onChange={(event) => setPlanForm((actual) => ({ ...actual, requiereCopago: event.target.checked, montoCopago: event.target.checked ? actual.montoCopago : '' }))} /> Requiere copago</label>{planForm.requiereCopago && <label>Monto del copago (ARS)<input type="number" min="0" step="0.01" value={planForm.montoCopago} onChange={(event) => setPlanForm((actual) => ({ ...actual, montoCopago: event.target.value }))} /></label>}<label className="admin-insurance-check"><input type="checkbox" checked={planForm.requiereAutorizacionPrevia} onChange={(event) => setPlanForm((actual) => ({ ...actual, requiereAutorizacionPrevia: event.target.checked }))} /> Requiere autorización previa</label></div><div className="admin-insurance-modal-actions"><button type="button" className="admin-insurance-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="submit" className="admin-insurance-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar plan'}</button></div></form>}
    </section></div>}

    {confirmacion && <div className="admin-insurance-backdrop" role="presentation"><section className="admin-insurance-modal admin-insurance-confirm" role="dialog" aria-modal="true" aria-labelledby="insurance-confirm-title"><button type="button" className="admin-insurance-close" aria-label="Cerrar" onClick={cerrarModal} disabled={guardando}>×</button><p className="admin-insurance-eyebrow">CONFIRMACIÓN</p><h2 id="insurance-confirm-title">{confirmacion.tipo.includes('reactivar') ? '¿Reactivar este registro?' : '¿Dar de baja este registro?'}</h2><p>{confirmacion.tipo.includes('obra') ? `Obra social: ${confirmacion.objetivo.nombre}.` : `Plan: ${confirmacion.objetivo.nombre}.`}{confirmacion.tipo === 'baja-obra' && ' La baja también inactiva sus planes asociados.'}</p>{errorModal && <p className="admin-insurance-message admin-insurance-message--error" role="alert">{errorModal}</p>}<div className="admin-insurance-modal-actions"><button type="button" className="admin-insurance-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="button" className={confirmacion.tipo.includes('baja') ? 'admin-insurance-danger-button' : 'admin-insurance-primary'} onClick={ejecutarAccion} disabled={guardando}>{guardando ? 'Procesando…' : confirmacion.tipo.includes('baja') ? 'Confirmar baja' : 'Reactivar'}</button></div></section></div>}
  </main>
}
