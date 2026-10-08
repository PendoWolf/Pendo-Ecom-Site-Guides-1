import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function getOrCreateVisitorId() {
  const key = 'pieriot-visitor-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = 'anon-' + crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

window.pendo.initialize({
  visitor: {
    id: getOrCreateVisitorId(),
    isAutomated: navigator.webdriver === true,
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
