import { Link, useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Baby, Bone, Brain, CalendarPlus, Eye, HeartPulse, ScanLine, ShieldCheck, Stethoscope } from 'lucide-react'
import '../styles/LandingPage.css'

const ESPECIALIDADES = [
  { nombre: 'Clínica Médica', descripcion: 'Atención integral, prevención y seguimiento clínico.', Icono: Stethoscope },
  { nombre: 'Cardiología', descripcion: 'Cuidado y evaluación de la salud cardiovascular.', Icono: HeartPulse },
  { nombre: 'Diagnóstico por Imágenes', descripcion: 'Estudios de radiología, tomografía y ecografía.', Icono: ScanLine },
  { nombre: 'Traumatología', descripcion: 'Atención del sistema osteoarticular y muscular.', Icono: Bone },
  { nombre: 'Pediatría', descripcion: 'Acompañamiento de la salud de niños y adolescentes.', Icono: Baby },
  { nombre: 'Neurología', descripcion: 'Evaluación y seguimiento de la salud neurológica.', Icono: Brain },
  { nombre: 'Dermatología', descripcion: 'Prevención y cuidado integral de la piel.', Icono: Activity },
  { nombre: 'Oftalmología', descripcion: 'Controles y atención para la salud visual.', Icono: Eye },
  { nombre: 'Ginecología', descripcion: 'Acompañamiento para la salud integral de la mujer.', Icono: HeartPulse },
  { nombre: 'Nutrición', descripcion: 'Evaluación nutricional y orientación alimentaria.', Icono: Activity },
  { nombre: 'Psiquiatría', descripcion: 'Atención y seguimiento de la salud mental.', Icono: Brain },
]

function LandingPage() {
  const navigate = useNavigate()

  const sacarTurno = () => {
    const token = localStorage.getItem('accessToken')
    const rol = localStorage.getItem('rolActivo')
    if (!token) {
      navigate('/login')
    } else if (rol === 'PACIENTE') {
      navigate('/mis-turnos?solicitar=true', { state: { abrirSolicitud: true } })
    } else if (rol === 'PROFESIONAL') {
      navigate('/agenda')
    } else {
      navigate('/dashboard')
    }
  }

  return <main className="landing-page">
    <header className="landing-header">
      <Link to="/" className="landing-brand" aria-label="Sanatorio Antonia, inicio"><img src="/logo-completo.png" alt="Sanatorio Antonia" /></Link>
      <nav className="landing-nav" aria-label="Navegación principal"><a href="#especialidades">Especialidades</a><a href="#como-funciona">Cómo funciona</a><Link to="/login" className="landing-login">Ingresar</Link></nav>
      <button type="button" className="landing-header-cta" onClick={sacarTurno}><CalendarPlus size={17} /> Sacar turno</button>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-inner">
        <div className="landing-hero-copy">
          <span className="landing-kicker"><span /> ATENCIÓN MÉDICA, MÁS CERCA</span>
          <h1>Tu salud merece una atención <em>cercana y simple.</em></h1>
          <p>Encontrá profesionales, conocé nuestras especialidades y gestioná tus turnos desde un solo lugar.</p>
          <div className="landing-hero-actions"><button type="button" className="landing-button-primary" onClick={sacarTurno}>Sacar un turno <ArrowRight size={18} /></button><a className="landing-button-secondary" href="#especialidades">Conocer especialidades</a></div>
          <div className="landing-trust-note"><ShieldCheck size={17} /><span>Tu información médica, protegida y disponible cuando la necesitás.</span></div>
        </div>
        <div className="landing-hero-art" aria-label="Servicios digitales del Sanatorio Antonia">
          <div className="landing-art-orbit landing-art-orbit--one" /><div className="landing-art-orbit landing-art-orbit--two" />
          <div className="landing-art-symbol"><img src="/logo-simbolo-blanco.png" alt="" /></div>
          <div className="landing-float-card landing-float-card--appointment"><span className="landing-float-icon"><CalendarPlus size={20} /></span><div><strong>Turnos en línea</strong><small>Elegí el día y horario</small></div><ArrowRight size={16} /></div>
          <div className="landing-float-card landing-float-card--care"><span className="landing-float-icon landing-float-icon--green"><HeartPulse size={20} /></span><div><strong>Atención integral</strong><small>Un equipo para acompañarte</small></div></div>
          <div className="landing-art-caption"><span>SA</span><div><strong>Sanatorio Antonia</strong><small>Cuidado y confianza</small></div></div>
        </div>
      </div>
      <div className="landing-hero-bottom"><span>Atención para cada etapa de tu vida</span><span className="landing-scroll-cue">Deslizá para conocer más <span>↓</span></span></div>
    </section>

    <section className="landing-specialties" id="especialidades">
      <div className="landing-section-heading"><div><span className="landing-section-kicker">NUESTRA CARTILLA</span><h2>Especialidades para cuidar de vos</h2></div><p>Encontrá el área de atención que necesitás y continuá con la reserva de tu turno en línea.</p></div>
      <div className="landing-specialty-grid">{ESPECIALIDADES.map(({ nombre, descripcion, Icono }) => <article className="landing-specialty-card" key={nombre}><span className="landing-specialty-icon"><Icono size={21} strokeWidth={1.8} /></span><h3>{nombre}</h3><p>{descripcion}</p><button type="button" onClick={sacarTurno} aria-label={`Sacar turno para ${nombre}`}><ArrowRight size={18} /></button></article>)}</div>
      <div className="landing-specialties-cta"><span>¿Ya sabés qué atención necesitás?</span><button type="button" onClick={sacarTurno}>Buscá un turno <ArrowRight size={16} /></button></div>
    </section>

    <section className="landing-steps" id="como-funciona">
      <div className="landing-section-heading landing-section-heading--center"><span className="landing-section-kicker">UN PROCESO SIMPLE</span><h2>Tu próximo turno, en pocos pasos</h2><p>Gestioná tu atención de forma clara y segura desde el portal.</p></div>
      <div className="landing-step-grid"><article><span className="landing-step-number">01</span><div className="landing-step-icon"><ShieldCheck size={22} /></div><h3>Ingresá a tu cuenta</h3><p>Registrate con tus datos para acceder a tus turnos e información médica.</p></article><article><span className="landing-step-number">02</span><div className="landing-step-icon"><Stethoscope size={22} /></div><h3>Elegí la especialidad</h3><p>Buscá el profesional y el horario que mejor se adapten a vos.</p></article><article><span className="landing-step-number">03</span><div className="landing-step-icon"><CalendarPlus size={22} /></div><h3>Confirmá tu turno</h3><p>Revisá los datos de la consulta y consultá tus turnos desde el portal.</p></article></div>
      <button type="button" className="landing-button-primary landing-steps-cta" onClick={sacarTurno}>Empezar ahora <ArrowRight size={18} /></button>
    </section>

    <section className="landing-final-cta"><div><span className="landing-section-kicker">ESTAMOS PARA ACOMPAÑARTE</span><h2>Tu bienestar empieza con un primer paso.</h2><p>Conocé nuestro portal y gestioná tu atención cuando lo necesites.</p></div><button type="button" className="landing-button-light" onClick={sacarTurno}>Sacar un turno <ArrowRight size={18} /></button></section>

    <footer className="landing-footer"><Link to="/" className="landing-footer-brand"><img src="/logo-blanco.png" alt="Sanatorio Antonia" /></Link><span>Atención médica con cercanía y confianza.</span><div><Link to="/login">Ingresar</Link><Link to="/registro-paciente">Crear cuenta</Link><a href="#especialidades">Especialidades</a></div><small>© {new Date().getFullYear()} Sanatorio Antonia</small></footer>
  </main>
}

export default LandingPage
