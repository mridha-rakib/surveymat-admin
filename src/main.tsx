import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import './index.css'
import App from './App.tsx'
import { AdminForgotPasswordPage } from './components/admin-forgot-password-page.tsx'
import { AdminLoginPage } from './components/admin-login-page.tsx'
import { readAdminSession } from './lib/admin-session'

function ProtectedAdminApp() {
  const location = useLocation()
  const session = readAdminSession()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <App />
}

function RootRedirect() {
  const session = readAdminSession()
  return <Navigate to={session ? "/overview" : "/login"} replace />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/forgot-password" element={<AdminForgotPasswordPage />} />
        <Route path="/overview" element={<ProtectedAdminApp />} />
        <Route path="/campaigns" element={<ProtectedAdminApp />} />
        <Route path="/reviews" element={<ProtectedAdminApp />} />
        <Route path="/users" element={<ProtectedAdminApp />} />
        <Route path="/payouts" element={<ProtectedAdminApp />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
