// frontend/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Importa tus páginas
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { VerifyPage } from './VerifyPage'
import { HomePage } from './HomePage'

// --- ¡NUEVAS PÁGINAS! ---
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { AuthCallbackPage } from './AuthCallbackPage'
import { AdminDashboardPage } from './AdminDashboardPage'


// Define las rutas (¡ACTUALIZADAS!)
const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/verify",
    element: <VerifyPage />,
  },
  {
    path: "/", 
    element: <HomePage />,
  },
  // --- ¡NUEVAS RUTAS! ---
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    // Esta página captura el token de Google
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    // Ruta protegida para el Admin
    path: "/admin/dashboard",
    element: <AdminDashboardPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)