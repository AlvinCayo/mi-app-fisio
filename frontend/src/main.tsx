// frontend/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Importa tus páginas
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { VerifyPage } from './VerifyPage'
import { HomePage } from './HomePage'

// Define las rutas
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
    // Esta será la página principal (después de iniciar sesión)
    path: "/", 
    element: <HomePage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)