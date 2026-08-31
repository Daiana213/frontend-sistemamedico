import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import RegistroPaciente from './pages/RegistroPaciente'
import RutaProtegida from './components/RutaProtegida'
import AprobacionMenores from './pages/AprobacionMenores'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/registro-paciente" element={<RegistroPaciente />} />

      <Route
        path="/dashboard"
        element={
          <RutaProtegida>
            <div>
              <p>Dashboard (placeholder)</p>
              {localStorage.getItem('rolActivo') === 'ADMINISTRATIVO' && (
                <>
                  <a href="/menores-pendientes">Ver menores pendientes de aprobación</a>
                  <br />
                </>
              )}
              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.href = '/'
                }}
              >
                Cerrar sesión
              </button>
            </div>
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
    </Routes>
  )
}

export default App