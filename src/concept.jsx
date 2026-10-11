import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ConceptApp from './ConceptApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConceptApp />
  </StrictMode>,
)
