import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SystemApp from './SystemApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SystemApp />
  </StrictMode>,
)
