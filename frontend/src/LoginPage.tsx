// frontend/src/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Importa los estilos y assets
import styles from './styles/LoginPage.module.css';
import logo from './assets/logo.svg';
import eyeOpen from './assets/eye-open.svg';
import eyeClosed from './assets/eye-closed.svg';

// Interfaz para decodificar el token
interface DecodedToken {
  role: 'admin' | 'paciente';
  // ... (añade otros campos del token si los necesitas)
}

export function LoginPage() {
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Estado para el ícono del ojo
  const [showPassword, setShowPassword] = useState(false);

  // Lee mensajes de la URL (ej. de Google o Verificación)
  useEffect(() => {
    const status = searchParams.get('status');
    const errorMsg = searchParams.get('error');
    
    if (status === 'pending') {
      setSuccess("¡Gracias por registrarte! Tu cuenta está pendiente de aprobación por un administrador.");
    }
    if (status === 'inactive') {
      setError("Tu cuenta ha sido desactivada por un administrador.");
    }
    if (errorMsg === 'google-auth-failed') {
      setError("Error al iniciar sesión con Google.");
    }
  }, [searchParams]);

  // Manejador para el login local
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        ci: ci,
        password: password
      });

      const token = response.data.token;
      localStorage.setItem('authToken', token);
      
      const decodedToken = jwtDecode<DecodedToken>(token);

      // Redirige según el rol
      if (decodedToken.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/'); // Redirige al paciente al home
      }

    } catch (err: any)
      {
      setError(err.response?.data?.error || 'Error al iniciar sesión.');
    }
  };

  // Manejador para el login con Google
  const handleGoogleLogin = () => {
    // Redirige al backend para iniciar el flujo de Google
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  return (
    <div className={styles.container}>
      
      <img src={logo} alt="Logo" className={styles.logo} /> 
      
      <form className={styles.form} onSubmit={handleSubmit}>
        
        <input 
          className={styles.input} 
          name="ci" 
          placeholder="CI" 
          onChange={(e) => setCi(e.target.value)} 
        />
        
        <div className={styles.passwordWrapper}>
          <input 
            className={`${styles.input} ${styles.passwordInput}`}
            name="password" 
            type={showPassword ? "text" : "password"} // Tipo dinámico
            placeholder="Contraseña" 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <img 
            src={showPassword ? eyeOpen : eyeClosed}
            alt="Ver/Ocultar contraseña"
            className={styles.passwordIcon}
            onClick={() => setShowPassword(!showPassword)} // El toggle
          />
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.successMessage}>{success}</p>}
        
        <div className={styles.buttonContainer}>
          <button className={styles.button} type="submit">Entrar</button>
          
          <Link to="/register" className={styles.buttonOutline}>
            Registrar
          </Link>

          <button 
            type="button" 
            className={styles.googleButton} 
            onClick={handleGoogleLogin}
          >
            Iniciar sesión con Google
          </button>
          
          <Link to="/forgot-password" className={styles.link}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
    </div>
  );
}