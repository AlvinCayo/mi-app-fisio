// frontend/src/AuthCallbackPage.tsx

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  role: 'admin' | 'paciente';
  // ...
}

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      sessionStorage.setItem('authToken', token); // <-- Usa sessionStorage

      const decodedToken = jwtDecode<DecodedToken>(token);

      if (decodedToken.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
      
    } else {
      navigate('/login?error=google-auth-failed');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ fontFamily: 'Arial', padding: '40px', textAlign: 'center' }}>
      <h2>Autenticando...</h2>
      <p>Por favor, espera.</p>
    </div>
  );
}