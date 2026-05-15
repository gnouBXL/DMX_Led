import { useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import { useStore } from './store/useStore'
import { connectWS } from './ws/useWebSocket'

function App() {
  const setBars = useStore(s => s.setBars)
  const updateBar = useStore(s => s.updateBar)

  useEffect(() => {
    connectWS({ setBars, updateBar })
  }, [])

  return <Dashboard />
}

export default App