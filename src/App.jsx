import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<div>Dashboard (placeholder)</div>} />
    </Routes>
  )
}

export default App