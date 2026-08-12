import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// 👉 PASO A: Importar el protector de Google
import { GoogleOAuthProvider } from '@react-oauth/google'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 👉 PASO B: Envolver tu App con el proveedor */}
    <GoogleOAuthProvider clientId="849091491290-t1h1q1p8j40rhndjlosh0e0dsokm5907.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)