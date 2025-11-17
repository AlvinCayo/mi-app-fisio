// frontend/src/main.tsx (ACTUALIZADO)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// (Importaciones de páginas existentes)
import { LoginPage } from './LoginPage.tsx'
import { RegisterPage } from './RegisterPage.tsx'
import { VerifyPage } from './VerifyPage.tsx'
import { HomePage } from './HomePage.tsx'
import { ForgotPasswordPage } from './ForgotPasswordPage.tsx'
import { ResetPasswordPage } from './ResetPasswordPage.tsx'
import { AuthCallbackPage } from './AuthCallbackPage.tsx'
import { AdminDashboardPage } from './AdminDashboardPage.tsx'
import { AdminUserListPage } from './AdminUserListPage.tsx'
import { AdminPendingUsersPage } from './AdminPendingUsersPage.tsx'
import { AdminActiveUsersPage } from './AdminActiveUsersPage.tsx'
import { AdminExerciseDashboard } from './AdminExerciseDashboard.tsx'
import { AdminExerciseManagePage } from './AdminExerciseManagePage.tsx'
import { AdminExerciseEditPage } from './AdminExerciseEditPage.tsx'
import { AdminRoutineDashboard } from './AdminRoutineDashboard.tsx'
import { AdminRoutineCreatePage } from './AdminRoutineCreatePage.tsx'
import { AdminRoutineAssignPage } from './AdminRoutineAssignPage.tsx'
import { PatientRoutinePage } from './PatientRoutinePage.tsx'

// --- ¡NUEVA PÁGINA DE EDICIÓN DE RUTINA! ---
import { AdminRoutineEditPage } from './AdminRoutineEditPage.tsx'


// Define las rutas
const router = createBrowserRouter([
  // ... (Tus rutas de /login, /register, /, etc. se quedan igual)
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/verify", element: <VerifyPage /> },
  { path: "/", element: <HomePage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  
  // --- Rutas de Administrador ---
  { path: "/admin/dashboard", element: <AdminDashboardPage /> },
  { path: "/admin/users", element: <AdminUserListPage /> },
  { path: "/admin/users/pending", element: <AdminPendingUsersPage /> },
  { path: "/admin/users/manage", element: <AdminActiveUsersPage /> },
  { path: "/admin/exercises", element: <AdminExerciseDashboard /> },
  { path: "/admin/exercises/manage", element: <AdminExerciseManagePage /> },
  { path: "/admin/exercises/edit/:id", element: <AdminExerciseEditPage /> },
  { path: "/admin/routines", element: <AdminRoutineDashboard /> },
  { path: "/admin/routines/create", element: <AdminRoutineCreatePage /> },
  { path: "/admin/routines/assign", element: <AdminRoutineAssignPage /> },
  { path: "/my-routine", element: <PatientRoutinePage /> }, // Ruta de Paciente

  // --- ¡NUEVA RUTA PARA EDITAR UNA RUTINA! ---
  {
    path: "/admin/routines/edit/:id", // El :id es un parámetro de la URL
    element: <AdminRoutineEditPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)