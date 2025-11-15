// frontend/src/AuthCallbackPage.tsx

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Define el tipo para el token decodificado
interface DecodedToken {
  userId: number;
  ci: string;
  role: 'admin' | 'paciente';
  iat: number;
  exp: number;
}

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // 1. Guardamos el token que vino de Google
      localStorage.setItem('authToken', token);

      // 2. Decodificamos el token para saber el rol
      const decodedToken = jwtDecode<DecodedToken>(token);

      // 3. Redirigimos según el rol
      if (decodedToken.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
      
    } else {
      // Si no hay token, hubo un error
      navigate('/login?error=google-auth-failed');
    }
  }, [searchParams, navigate]);

  // Esto es lo que el usuario ve mientras es redirigido
  return (
    <div style={{ fontFamily: 'Arial', padding: '40px', textAlign: 'center' }}>
      <h2>Autenticando...</h2>
      <p>Por favor, espera.</p>
    </div>
  );
}