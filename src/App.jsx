import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import RegistroPaciente from './pages/RegistroPaciente'
import RutaProtegida from './components/RutaProtegida'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/registro-paciente" element={<RegistroPaciente />} />

      <Route element={<RutaProtegida />}>
        <Route
          path="/dashboard"
          element={
            <div>
              <p>Dashboard (placeholder)</p>
              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.href = '/'
                }}
              >
                Cerrar sesión
              </button>
            </div>
          }
        />
      </Route>
    </Routes>
  )
}

export default App