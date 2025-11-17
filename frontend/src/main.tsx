// frontend/src/main.tsx (ACTUALIZADO CON LAYOUT DE ADMIN CORREGIDO)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// (Importaciones existentes)
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
import { AdminRoutineEditPage } from './AdminRoutineEditPage.tsx'
import { AdminReportListPage } from './AdminReportListPage.tsx'
import { AdminPatientReportViewPage } from './AdminPatientReportViewPage.tsx'
import { PatientExerciseExecutionPage } from './PatientExerciseExecutionPage.tsx'

// --- ¡NUEVAS IMPORTACIONES DE LAYOUTS! ---
import { PatientLayout } from './PatientLayout.tsx'
import { AdminLayout } from './AdminLayout.tsx'


// Define las rutas
const router = createBrowserRouter([
  
  // --- Rutas de Paciente (Con Layout) ---
  {
    path: '/',
    element: <PatientLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/my-routine', element: <PatientRoutinePage /> },
    ]
  },

  // --- Rutas de Admin (Con Layout) ---
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      // Vistas de la barra de navegación
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'routines/assign', element: <AdminRoutineAssignPage /> },
      { path: 'reports', element: <AdminReportListPage /> },

      // --- ¡RUTAS MOVIDAS AQUÍ DENTRO! ---
      // (Paths actualizados a relativos, sin /admin)
      { path: "users", element: <AdminUserListPage /> },
      { path: "users/pending", element: <AdminPendingUsersPage /> },
      { path: "users/manage", element: <AdminActiveUsersPage /> },
      { path: "exercises", element: <AdminExerciseDashboard /> },
      { path: "exercises/manage", element: <AdminExerciseManagePage /> },
      { path: "exercises/edit/:id", element: <AdminExerciseEditPage /> },
      { path: "routines", element: <AdminRoutineDashboard /> },
      { path: "routines/create", element: <AdminRoutineCreatePage /> },
      { path: "routines/edit/:id", element: <AdminRoutineEditPage /> },
      { path: "reports/patient/:id", element: <AdminPatientReportViewPage /> },
    ]
  },
  
  // --- Rutas sin Layout (Login, Ejecución de Paciente, etc.) ---
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/verify", element: <VerifyPage /> },
  { path: "/my-routine/execute", element: <PatientExerciseExecutionPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)