import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import FlashPage from './pages/FlashPage'
import { useStore } from './store/useStore'
import { connectWS } from './ws/useWebSocket'

function Nav() {
  const location = useLocation()
  const linkStyle = (path) => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 500,
    textDecoration: 'none',
    background: location.pathname === path ? '#2563eb' : '#1e1e1e',
    color: location.pathname === path ? '#fff' : '#a0a0a0',
  })

  return (
    <nav style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      <Link to="/" style={linkStyle('/')}>Dashboard</Link>
      <Link to="/flash" style={linkStyle('/flash')}>Flash</Link>
    </nav>
  )
}

function App() {
  const setBars     = useStore(s => s.setBars)
  const updateBar   = useStore(s => s.updateBar)
  const setUniverse = useStore(s => s.setUniverse)

  useEffect(() => {
    connectWS({ setBars, updateBar, setUniverse })
  }, [])

  return (
    <BrowserRouter>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/flash" element={<FlashPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
