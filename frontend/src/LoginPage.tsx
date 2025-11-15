// frontend/src/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import styles from './styles/LoginPage.module.css';
import logo from './assets/logo.svg';
import eyeOpen from './assets/eye-open.svg';
import eyeClosed from './assets/eye-closed.svg';

interface DecodedToken {
  role: 'admin' | 'paciente';
  // ...
}

export function LoginPage() {
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const status = searchParams.get('status');
    const errorMsg = searchParams.get('error');
    
    if (status === 'pending') {
      setSuccess("¡Gracias! Tu cuenta está pendiente de aprobación.");
    }
    if (status === 'inactive') {
      setError("Tu cuenta ha sido desactivada por un administrador.");
    }
    if (errorMsg === 'google-auth-failed') {
      setError("Error al iniciar sesión con Google.");
    }
  }, [searchParams]);

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
      sessionStorage.setItem('authToken', token); // <-- Usa sessionStorage
      
      const decodedToken = jwtDecode<DecodedToken>(token);

      if (decodedToken.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.');
    }
  };

  const handleGoogleLogin = () => {
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
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña" 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <img 
            src={showPassword ? eyeOpen : eyeClosed}
            alt="Ver/Ocultar contraseña"
            className={styles.passwordIcon}
            onClick={() => setShowPassword(!showPassword)}
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