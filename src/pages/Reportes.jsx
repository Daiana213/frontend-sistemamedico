import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import '../styles/Reportes.css'

const FILTROS_INICIALES = { periodo: 'mes_actual', fechaInicio: '', fechaFin: '', idEspecialidad: '', idProfesional: '' }
const ETIQUETAS_ESTADO = { REALIZADO: 'Atendidos', CANCELADO: 'Cancelados', AUSENTE: 'Ausentes', REPROGRAMADO: 'Reprogramados', PENDIENTE: 'Pendientes' }

function mensajeError(error, fallback) {
  return error.response?.data?.error || error.response?.data?.message || fallback
}

function fechaLegible(fecha) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(fecha))
}

function numero(valor, decimales = 0) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales }).format(Number(valor || 0))
}

function queryFiltros(filtros) {
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== '' && valor != null))
}

function Reportes() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [panel, setPanel] = useState(null)
  const [reportes, setReportes] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [reporteAbierto, setReporteAbierto] = useState(null)
  const [cargandoReporte, setCargandoReporte] = useState(false)

  const cargarPanel = useCallback(async (parametros = filtros, silencioso = false) => {
    if (silencioso) setActualizando(true)
    else setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/reportes/panel', { params: queryFiltros(parametros) })
      setPanel(data)
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar las métricas.'))
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [filtros])

  const cargarHistorial = useCallback(async () => {
    try {
      const { data } = await api.get('/reportes/historial')
      setReportes(Array.isArray(data?.reportes) ? data.reportes : [])
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar el historial de reportes.'))
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    Promise.all([
      api.get('/especialidades'),
      api.get('/profesionales'),
      api.get('/reportes/panel', { params: { periodo: 'mes_actual' } }),
      api.get('/reportes/historial'),
    ]).then(([resEspecialidades, resProfesionales, resPanel, resReportes]) => {
      if (cancelado) return
      setEspecialidades(Array.isArray(resEspecialidades.data) ? resEspecialidades.data : [])
      setProfesionales(Array.isArray(resProfesionales.data) ? resProfesionales.data : [])
      setPanel(resPanel.data)
      setReportes(Array.isArray(resReportes.data?.reportes) ? resReportes.data.reportes : [])
    }).catch((err) => {
      if (!cancelado) setError(mensajeError(err, 'No se pudieron cargar los datos del panel.'))
    }).finally(() => {
      if (!cancelado) setCargando(false)
    })
    return () => { cancelado = true }
  }, [])

  const aplicarFiltros = async (event) => {
    event.preventDefault()
    if (filtros.periodo === 'personalizado') {
      if (!filtros.fechaInicio || !filtros.fechaFin) {
        setError('Elegí la fecha de inicio y la fecha de fin.')
        return
      }
      if (filtros.fechaInicio > filtros.fechaFin) {
        setError('La fecha de inicio debe ser anterior o igual a la fecha de fin.')
        return
      }
    }
    setError('')
    await cargarPanel(filtros, true)
  }

  const descargar = async (url, formato) => {
    setError('')
    setProcesando(true)
    try {
      const { data } = await api.get(url, {
        params: { ...queryFiltros(filtros), formato },
        responseType: 'blob',
      })
      const blobUrl = URL.createObjectURL(data)
      const enlace = document.createElement('a')
      enlace.href = blobUrl
      enlace.download = `reporte_${panel?.periodo?.fechaInicio || 'metricas'}_${panel?.periodo?.fechaFin || ''}.${formato === 'pdf' ? 'pdf' : 'xls'}`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(mensajeError(err, `No se pudo descargar el archivo ${formato.toUpperCase()}.`))
    } finally {
      setProcesando(false)
    }
  }

  const generarReporte = async () => {
    if (!panel || panel.sinDatos) {
      setError('No hay datos para generar un reporte con estos filtros.')
      return
    }
    setError('')
    setMensaje('')
    setProcesando(true)
    try {
      const payload = {
        periodo: filtros.periodo,
        ...(filtros.periodo === 'personalizado' ? { fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin } : {}),
        ...(filtros.idEspecialidad ? { idEspecialidad: Number(filtros.idEspecialidad) } : {}),
        ...(filtros.idProfesional ? { idProfesional: Number(filtros.idProfesional) } : {}),
      }
      const { data } = await api.post('/reportes/generar', payload)
      setMensaje(data.mensaje || 'El reporte se generó y guardó en el historial.')
      await cargarHistorial()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo generar el reporte.'))
    } finally {
      setProcesando(false)
    }
  }

  const abrirReporte = async (idReporte) => {
    setCargandoReporte(true)
    setError('')
    try {
      const { data } = await api.get(`/reportes/${idReporte}`)
      setReporteAbierto(data)
    } catch (err) {
      setError(mensajeError(err, 'No se pudo abrir el reporte guardado.'))
    } finally {
      setCargandoReporte(false)
    }
  }

  const descargarGuardado = async (formato) => {
    if (!reporteAbierto) return
    await descargar(`/reportes/${reporteAbierto.idReporte}/exportar`, formato)
  }

  const cambiarFiltro = (campo, valor) => setFiltros((actual) => ({ ...actual, [campo]: valor }))
  const kpi = panel?.indicadoresPrincipales || {}
  const evolucion = panel?.graficos?.evolucionTemporalDiaria || []
  const maxEvolucion = Math.max(1, ...evolucion.map((item) => item.total || 0))
  const topProfesionales = panel?.rendimientoPorProfesional || []
  const especialidadesGrafico = panel?.graficos?.distribucionPorEspecialidad || []
  const estadosGrafico = panel?.graficos?.distribucionPorEstado || []

  return <main className="reports-page">
    <header className="reports-header"><Link to="/dashboard">← Volver al panel</Link><img src="/logo-completo.png" alt="Sanatorio Antonia" /></header>
    <section className="reports-content">
      <div className="reports-heading"><div><p className="reports-eyebrow">ADMINISTRACIÓN</p><h1>Reportes y métricas</h1><p>Consultá actividad, ocupación y resultados del sistema.</p></div><button type="button" className="reports-refresh" onClick={() => { cargarPanel(filtros, true); cargarHistorial() }} disabled={actualizando}>{actualizando ? 'Actualizando…' : 'Actualizar'}</button></div>
      {mensaje && <p className="reports-message reports-message--success" role="status">{mensaje}<button type="button" onClick={() => setMensaje('')} aria-label="Cerrar mensaje">×</button></p>}
      {error && <p className="reports-message reports-message--error" role="alert">{error}</p>}

      <form className="reports-filters" onSubmit={aplicarFiltros}>
        <label>Período<select value={filtros.periodo} onChange={(event) => cambiarFiltro('periodo', event.target.value)}><option value="mes_actual">Mes actual</option><option value="ultimos_30_dias">Últimos 30 días</option><option value="personalizado">Personalizado</option></select></label>
        {filtros.periodo === 'personalizado' && <><label>Desde<input type="date" value={filtros.fechaInicio} onChange={(event) => cambiarFiltro('fechaInicio', event.target.value)} required /></label><label>Hasta<input type="date" value={filtros.fechaFin} onChange={(event) => cambiarFiltro('fechaFin', event.target.value)} required /></label></>}
        <label>Especialidad<select value={filtros.idEspecialidad} onChange={(event) => cambiarFiltro('idEspecialidad', event.target.value)}><option value="">Todas</option>{especialidades.filter((item) => item.estado === 'ACTIVO').map((item) => <option key={item.idEspecialidad} value={item.idEspecialidad}>{item.nombre}</option>)}</select></label>
        <label>Profesional<select value={filtros.idProfesional} onChange={(event) => cambiarFiltro('idProfesional', event.target.value)}><option value="">Todos</option>{profesionales.filter((item) => item.estado === 'ACTIVO').map((item) => <option key={item.idProfesional} value={item.idProfesional}>{item.nombreCompleto}</option>)}</select></label>
        <button type="submit" className="reports-primary" disabled={actualizando}>{actualizando ? 'Aplicando…' : 'Aplicar filtros'}</button>
      </form>

      <div className="reports-period-bar"><div><span>Período mostrado</span><strong>{panel?.periodo?.etiqueta || 'Cargando métricas…'}</strong><small>{panel?.periodo?.fechaInicio || '—'} al {panel?.periodo?.fechaFin || '—'}</small></div><div className="reports-export-actions"><button type="button" onClick={() => descargar('/reportes/exportar', 'pdf')} disabled={!panel || procesando}>Exportar PDF</button><button type="button" onClick={() => descargar('/reportes/exportar', 'excel')} disabled={!panel || procesando}>Exportar Excel</button><button type="button" className="reports-primary" onClick={generarReporte} disabled={!panel || panel.sinDatos || procesando}>{procesando ? 'Procesando…' : 'Guardar reporte'}</button></div></div>

      {cargando ? <div className="reports-empty">Cargando reportes…</div> : panel && <>
        {panel.sinDatos && <div className="reports-empty"><strong>{panel.mensaje || 'No hay datos para este período'}</strong><p>Probá otro período o quitá alguno de los filtros.</p></div>}
        <div className="reports-kpis">
          <article><span>Turnos totales</span><strong>{numero(kpi.totalTurnos)}</strong><small>{numero(kpi.turnosPendientes)} pendientes</small></article>
          <article><span>Atención efectiva</span><strong>{numero(kpi.tasaEfectividadAtencion?.porcentajeEfectividad, 1)}%</strong><small>{numero(kpi.tasaEfectividadAtencion?.cantidadRealizados)} atendidos</small></article>
          <article><span>Ausentismo</span><strong>{numero(kpi.porcentajeAusentismo, 1)}%</strong><small>{numero(kpi.cantidadAusentes)} ausencias</small></article>
          <article><span>Cancelaciones</span><strong>{numero(kpi.porcentajeCancelaciones, 1)}%</strong><small>{numero(kpi.cantidadCancelados)} cancelados</small></article>
          <article><span>Ocupación de agenda</span><strong>{numero(panel.metricasCapacidadOcupacion?.tasaOcupacionAgendaPct, 1)}%</strong><small>{numero(panel.metricasCapacidadOcupacion?.turnosOcupados)} turnos ocupan agenda</small></article>
          <article><span>Pacientes únicos</span><strong>{numero(panel.metricasPacientes?.pacientesUnicosAtendidosOAgendados)}</strong><small>{numero(panel.metricasPacientes?.pacientesNuevos?.cantidad)} nuevos</small></article>
        </div>

        <div className="reports-grid">
          <section className="reports-panel reports-panel--wide"><div className="reports-panel-heading"><div><h2>Evolución de turnos</h2><p>Actividad diaria en el período seleccionado</p></div></div>
            {evolucion.length ? <div className="reports-chart-scroll"><div className="reports-bar-chart">{evolucion.map((item) => <div className="reports-bar-column" key={item.fecha} title={`${item.fecha}: ${item.total} turnos`}><strong>{item.total}</strong><div className="reports-bar-track"><span style={{ height: `${Math.max(item.total ? 5 : 0, (item.total / maxEvolucion) * 100)}%` }} /></div><small>{item.fecha.slice(8, 10)}</small></div>)}</div></div> : <p className="reports-no-chart">No hay actividad diaria para mostrar.</p>}
          </section>
          <section className="reports-panel"><div className="reports-panel-heading"><div><h2>Estados de turnos</h2><p>Distribución del período</p></div></div><div className="reports-state-list">{estadosGrafico.map((item) => <div className="reports-state-row" key={item.estado}><span>{ETIQUETAS_ESTADO[item.estado] || item.estado}</span><div><i style={{ width: `${Math.min(100, Math.max(0, Number(item.porcentaje || 0)))}%` }} /></div><strong>{numero(item.cantidad)}</strong></div>)}</div></section>
          <section className="reports-panel"><div className="reports-panel-heading"><div><h2>Por especialidad</h2><p>Demanda de atención</p></div></div>{especialidadesGrafico.length ? <div className="reports-ranking">{especialidadesGrafico.slice(0, 8).map((item) => <div className="reports-rank-row" key={item.idEspecialidad}><div><strong>{item.especialidad}</strong><span>{numero(item.totalTurnos)} turnos</span></div><div className="reports-rank-track"><i style={{ width: `${Math.min(100, Number(item.porcentajeSobreTotal || 0))}%` }} /></div></div>)}</div> : <p className="reports-no-chart">Sin datos de especialidad.</p>}</section>
          <section className="reports-panel"><div className="reports-panel-heading"><div><h2>Rendimiento profesional</h2><p>Turnos por profesional</p></div></div>{topProfesionales.length ? <div className="reports-ranking">{topProfesionales.slice(0, 8).map((item) => <div className="reports-rank-row" key={item.idProfesional}><div><strong>{item.nombreCompleto}</strong><span>{(item.especialidades || []).join(', ')}</span></div><b>{numero(item.totalTurnos)}</b></div>)}</div> : <p className="reports-no-chart">Sin datos de profesionales.</p>}</section>
          <section className="reports-panel"><div className="reports-panel-heading"><div><h2>Comparación con período anterior</h2><p>Variación en puntos porcentuales</p></div></div><div className="reports-comparison"><div><span>Turnos</span><strong>{numero(kpi.comparativaPeriodoAnterior?.variacionTotalTurnosPct, 1)}%</strong></div><div><span>Ausentismo</span><strong>{numero(kpi.comparativaPeriodoAnterior?.variacionAusentismoPuntos, 1)} pp</strong></div><div><span>Efectividad</span><strong>{numero(kpi.comparativaPeriodoAnterior?.variacionEfectividadPuntos, 1)} pp</strong></div></div></section>
        </div>
      </>}

      <section className="reports-panel reports-history"><div className="reports-panel-heading"><div><h2>Historial de reportes</h2><p>Hasta 50 reportes manuales y automáticos</p></div></div>
        {reportes.length ? <div className="reports-history-list">{reportes.map((reporte) => <article key={reporte.idReporte}><div><strong>{reporte.periodo?.etiqueta || reporte.descripcion}</strong><span>{reporte.tipoGeneracion === 'AUTOMATICO' ? 'Automático' : 'Manual'} · {fechaLegible(reporte.fechaGeneracion)} · {reporte.generadoPor}</span></div><button type="button" onClick={() => abrirReporte(reporte.idReporte)} disabled={cargandoReporte}>Ver / exportar</button></article>)}</div> : <p className="reports-no-chart">Todavía no hay reportes guardados.</p>}
      </section>
    </section>

    {reporteAbierto && <div className="reports-backdrop" role="presentation"><section className="reports-modal" role="dialog" aria-modal="true" aria-labelledby="report-detail-title"><button type="button" className="reports-close" onClick={() => setReporteAbierto(null)} aria-label="Cerrar">×</button><p className="reports-eyebrow">REPORTE GUARDADO</p><h2 id="report-detail-title">{reporteAbierto.metricas?.periodo?.etiqueta || reporteAbierto.descripcion}</h2><p>Generado {fechaLegible(reporteAbierto.fechaGeneracion)} · {reporteAbierto.generadoPor}</p>{reporteAbierto.metricas && <div className="reports-detail-kpis"><div><span>Turnos</span><strong>{numero(reporteAbierto.metricas.indicadoresPrincipales?.totalTurnos)}</strong></div><div><span>Atención efectiva</span><strong>{numero(reporteAbierto.metricas.indicadoresPrincipales?.tasaEfectividadAtencion?.porcentajeEfectividad, 1)}%</strong></div><div><span>Ausentismo</span><strong>{numero(reporteAbierto.metricas.indicadoresPrincipales?.porcentajeAusentismo, 1)}%</strong></div></div>}<div className="reports-modal-actions"><button type="button" onClick={() => descargarGuardado('pdf')} disabled={procesando}>Descargar PDF</button><button type="button" onClick={() => descargarGuardado('excel')} disabled={procesando}>Descargar Excel</button><button type="button" className="reports-primary" onClick={() => setReporteAbierto(null)}>Cerrar</button></div></section></div>}
  </main>
}

export default Reportes
