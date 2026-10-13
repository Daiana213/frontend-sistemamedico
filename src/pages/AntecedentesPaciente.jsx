import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import '../styles/AntecedentesPaciente.css'

const INICIAL = { alergias: '', enfermedadesCronicas: '', grupoSanguineo: '' }
const GRUPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']

export default function AntecedentesPaciente() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INICIAL)
  const [formGuardado, setFormGuardado] = useState(INICIAL)
  const [existenAntecedentes, setExistenAntecedentes] = useState(false)
  const [editando, setEditando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/pacientes/me/antecedentes')
      .then(({ data }) => {
        const antecedentes = data.data || null
        setExistenAntecedentes(Boolean(antecedentes))
        const cargados = { ...INICIAL, ...(antecedentes || {}) }
        setForm(cargados)
        setFormGuardado(cargados)
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar tus antecedentes.'))
      .finally(() => setCargando(false))
  }, [])

  const guardar = async (event) => {
    event.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await api.put('/pacientes/me/antecedentes', {
        alergias: form.alergias,
        enfermedadesCronicas: form.enfermedadesCronicas,
        grupoSanguineo: form.grupoSanguineo || null,
      })
      navigate('/dashboard', { replace: true, state: { antecedentesGuardados: true } })
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar tus antecedentes.')
    } finally {
      setGuardando(false)
    }
  }

  const cancelarEdicion = () => {
    setForm(formGuardado)
    setEditando(false)
    setError('')
  }

  return <main className="health-page"><header className="health-header"><Link to="/dashboard">← Volver al panel</Link><span>Sanatorio Antonia</span></header><section className="health-card"><p className="health-eyebrow">MI SALUD</p><h1>Antecedentes médicos</h1><p>Esta información ayuda al equipo de salud a conocer tus antecedentes.</p>{cargando ? <div className="health-message">Cargando antecedentes…</div> : error && !editando ? <p className="health-error" role="alert">{error}</p> : editando ? <form onSubmit={guardar}><label>Alergias<textarea value={form.alergias || ''} onChange={(e) => setForm({ ...form, alergias: e.target.value })} placeholder="Indicá alergias conocidas o escribí ‘Ninguna’" /></label><label>Enfermedades crónicas<textarea value={form.enfermedadesCronicas || ''} onChange={(e) => setForm({ ...form, enfermedadesCronicas: e.target.value })} placeholder="Por ejemplo: asma, diabetes, hipertensión" /></label><label>Grupo sanguíneo<select value={form.grupoSanguineo || ''} onChange={(e) => setForm({ ...form, grupoSanguineo: e.target.value })}><option value="">Sin informar</option>{GRUPOS.map((grupo) => <option key={grupo}>{grupo}</option>)}</select></label>{error && <p className="health-error" role="alert">{error}</p>}<div className="health-actions"><button disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar antecedentes'}</button>{existenAntecedentes && <button type="button" className="health-secondary-button" onClick={cancelarEdicion} disabled={guardando}>Cancelar</button>}</div></form> : <><dl className="health-details"><div><dt>Alergias</dt><dd>{form.alergias || 'Sin información'}</dd></div><div><dt>Enfermedades crónicas</dt><dd>{form.enfermedadesCronicas || 'Sin información'}</dd></div><div><dt>Grupo sanguíneo</dt><dd>{form.grupoSanguineo || 'Sin informar'}</dd></div></dl><button onClick={() => setEditando(true)}>{existenAntecedentes ? 'Editar antecedentes' : 'Cargar antecedentes'}</button></>}<aside className="health-note">La carga y edición de estudios todavía no está habilitada en el servicio.</aside></section></main>
}
