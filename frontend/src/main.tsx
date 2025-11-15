// frontend/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Importa tus páginas
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { VerifyPage } from './VerifyPage'
import { HomePage } from './HomePage'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { AuthCallbackPage } from './AuthCallbackPage'
import { AdminDashboardPage } from './AdminDashboardPage'
import { AdminUserListPage } from './AdminUserListPage' // <-- El menú de usuarios

// --- ¡NUEVAS PÁGINAS DE LISTAS! ---
import { AdminPendingUsersPage } from './AdminPendingUsersPage'
import { AdminActiveUsersPage } from './AdminActiveUsersPage'


// Define las rutas
const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/verify", element: <VerifyPage /> },
  { path: "/", element: <HomePage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    path: "/admin/dashboard",
    element: <AdminDashboardPage />,
  },
  {
    path: "/admin/users",
    element: <AdminUserListPage />,
  },
  // --- ¡NUEVAS RUTAS DE ADMIN! ---
  {
    path: "/admin/users/pending",
    element: <AdminPendingUsersPage />,
  },
  {
    path: "/admin/users/manage", // <-- Corregido de 'active' a 'manage'
    element: <AdminActiveUsersPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)