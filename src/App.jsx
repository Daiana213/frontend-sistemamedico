import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import RegistroPaciente from './pages/RegistroPaciente'
import RutaProtegida from './components/RutaProtegida'
import AprobacionMenores from './pages/AprobacionMenores'
import RegistroAdministrativo from './pages/RegistroAdministrativo'
import RegistroProfesional from './pages/RegistroProfesional'
import CambiarPassword from './pages/CambiarPassword'
import Dashboard from './pages/Dashboard'
import AgendaProfesional from './pages/AgendaProfesional'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/registro-paciente" element={<RegistroPaciente />} />
      <Route path="/cambiar-password" element={<CambiarPassword />} />

      <Route
        path="/dashboard"
        element={
          <RutaProtegida>
            <Dashboard />
          </RutaProtegida>
        }
      />

      <Route
        path="/menores-pendientes"
        element={
          <RutaProtegida rolesPermitidos={['ADMINISTRATIVO']}>
            <AprobacionMenores />
          </RutaProtegida>
        }
      />

      <Route
        path="/registro-administrativo"
        element={
          <RutaProtegida rolesPermitidos={['ADMINISTRATIVO']} permisosRequeridos={['gestion_usuarios']}>
            <RegistroAdministrativo />
          </RutaProtegida>
        }
      />

      <Route
        path="/registro-profesional"
        element={
          <RutaProtegida rolesPermitidos={['ADMINISTRATIVO']} permisosRequeridos={['gestion_usuarios']}>
            <RegistroProfesional />
          </RutaProtegida>
        }
      />

      <Route
        path="/agenda"
        element={
          <RutaProtegida rolesPermitidos={['PROFESIONAL']}>
            <AgendaProfesional />
          </RutaProtegida>
        }
      />

      <Route
        path="/agenda/turnos/:idTurno"
        element={
          <RutaProtegida rolesPermitidos={['PROFESIONAL']}>
            <AgendaProfesional />
          </RutaProtegida>
        }
      />
    </Routes>
    
  )
}

export default App
