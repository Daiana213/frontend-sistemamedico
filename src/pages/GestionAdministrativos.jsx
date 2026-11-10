import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, ShieldCheck, ShieldOff, UserRoundCog } from 'lucide-react'
import api from '../api/axios'
import '../styles/GestionAdministrativos.css'

export default function GestionAdministrativos() {
  const [administrativos, setAdministrativos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardandoId, setGuardandoId] = useState(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/administrativos')
      setAdministrativos(data.administrativos || [])
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el equipo administrativo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const actualizar = async (administrativo, cambios, confirmacion) => {
    if (confirmacion && !window.confirm(confirmacion)) return
    setGuardandoId(administrativo.idAdministrativo)
    setError('')
    setMensaje('')
    try {
      await api.patch(`/administrativos/${administrativo.idAdministrativo}`, cambios)
      setMensaje('Los datos del administrativo se actualizaron.')
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el perfil administrativo.')
    } finally {
      setGuardandoId(null)
    }
  }

  return <main className="adminstaff-page">
    <header className="adminstaff-header"><Link to="/dashboard"><ArrowLeft size={16} /> Panel administrativo</Link><img src="/logo-completo.png" alt="Sanatorio Antonia" /></header>
    <section className="adminstaff-content">
      <div className="adminstaff-heading"><div><span>EQUIPO Y ACCESOS</span><h1>Gestión de administrativos</h1><p>Consultá las cuentas, los permisos de gestión y el estado de acceso.</p></div><div className="adminstaff-actions"><button type="button" onClick={cargar} disabled={cargando}><RefreshCw size={16} /> Actualizar</button><Link to="/registro-administrativo"><UserRoundCog size={17} /> Registrar administrativo</Link></div></div>
      {error && <p className="adminstaff-alert adminstaff-alert--error" role="alert">{error}</p>}
      {mensaje && <p className="adminstaff-alert adminstaff-alert--success" role="status">{mensaje}</p>}
      {cargando ? <div className="adminstaff-empty">Cargando administrativos…</div> : administrativos.length === 0 ? <div className="adminstaff-empty">No hay perfiles administrativos para mostrar.</div> : <div className="adminstaff-list">{administrativos.map((admin) => <article className="adminstaff-card" key={admin.idAdministrativo}>
        <div className="adminstaff-person"><span className="adminstaff-avatar"><UserRoundCog size={21} /></span><div><h2>{admin.nombreCompleto}</h2><p>DNI {admin.dni} · {admin.puesto}</p><small>{admin.email || 'Sin email'} · {admin.telefono || 'Sin teléfono'}</small></div></div>
        <div className="adminstaff-settings"><label>Puesto<input aria-label={`Puesto de ${admin.nombreCompleto}`} defaultValue={admin.puesto} onBlur={(event) => { const puesto = event.target.value.trim(); if (puesto && puesto !== admin.puesto) actualizar(admin, { puesto }) }} disabled={guardandoId === admin.idAdministrativo} /></label>
          <button type="button" className={`adminstaff-permission ${admin.permisoGestionUsuarios ? 'is-enabled' : ''}`} onClick={() => actualizar(admin, { permisoGestionUsuarios: !admin.permisoGestionUsuarios }, `¿Querés ${admin.permisoGestionUsuarios ? 'quitar' : 'otorgar'} el permiso para gestionar usuarios a ${admin.nombreCompleto}?`)} disabled={guardandoId === admin.idAdministrativo}>
            {admin.permisoGestionUsuarios ? <ShieldCheck size={17} /> : <ShieldOff size={17} />} {admin.permisoGestionUsuarios ? 'Gestiona usuarios' : 'Sin permiso de gestión'}
          </button>
          <button type="button" className={`adminstaff-state ${admin.estado === 'ACTIVO' ? 'is-active' : 'is-inactive'}`} onClick={() => actualizar(admin, { estado: admin.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }, `¿Querés ${admin.estado === 'ACTIVO' ? 'desactivar' : 'reactivar'} la cuenta de ${admin.nombreCompleto}?`)} disabled={guardandoId === admin.idAdministrativo}>
            {guardandoId === admin.idAdministrativo ? 'Guardando…' : admin.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}
          </button>
        </div>
      </article>)}</div>}
    </section>
  </main>
}
