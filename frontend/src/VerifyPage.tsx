// frontend/src/VerifyPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import styles from './styles/RegisterPage.module.css'; // Reutiliza el estilo de Registro
import logo from './assets/logo.svg';

export function VerifyPage() {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); 
  const [isResending, setIsResending] = useState(false); 
  const [cooldown, setCooldown] = useState(0); 
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get('email');

  useEffect(() => {
    let timer: number; 
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    // @ts-ignore
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
        setError("Error: No se encontró el email del usuario.");
        return;
    }

    try {
      await axios.post('${import.meta.env.VITE_API_URL}/api/auth/verify', {
        email: email,
        codigo_sms: codigo
      });
      
      navigate('/login?status=pending'); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al verificar.');
    }
  };

  const handleResendCode = async () => {
    if (!email || isResending || cooldown > 0) return;
    setIsResending(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axios.post('${import.meta.env.VITE_API_URL}/api/auth/resend-code', {
        email: email,
      });
      setSuccessMessage(response.data.message);
      setCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al reenviar el código.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <img src={logo} alt="Logo" className={styles.logo} />
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 style={{textAlign: 'center'}}>Verificar tu cuenta</h2>
        <p style={{textAlign: 'center', color: '#555', marginTop: 0}}>
          Enviamos un código de 6 dígitos a <strong>{email || "tu correo"}</strong>.
        </p>
        
        <input 
          className={styles.input} 
          name="codigo" 
          placeholder="Código de Email" 
          onChange={(e) => setCodigo(e.target.value)} 
        />
        
        {error && <p className={styles.error}>{error}</p>}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
        
        <div className={styles.buttonContainer}>
          <button className={styles.button} type="submit">Verificar</button>
        
          <button 
            type="button"
            className={styles.buttonOutline}
            onClick={handleResendCode}
            disabled={isResending || cooldown > 0} 
          >
            {isResending
              ? 'Enviando...'
              : cooldown > 0
                ? `Reenviar en ${cooldown}s`
                : 'Reenviar código'}
          </button>

          <Link to="/login" className={styles.link}>Volver a Iniciar Sesión</Link>
        </div>
      </form>
    </div>
  );
}