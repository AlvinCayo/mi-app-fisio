// frontend/src/VerifyPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles/VerifyPage.module.css';

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
      await axios.post('http://localhost:3000/api/auth/verify', {
        email: email,
        codigo_sms: codigo
      });
      
      // ¡CAMBIO! Redirige a Login con mensaje de pendiente
      navigate('/login?status=pending'); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al verificar.');
    }
  };

  const handleResendCode = async () => {
    // ... (Tu función de handleResendCode se queda igual)
    if (!email || isResending || cooldown > 0) return;
    setIsResending(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axios.post('http://localhost:3000/api/auth/resend-code', {
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
      <h2 className={styles.title}>Verificar tu cuenta</h2>
      <p className={styles.subtitle}>
        Enviamos un código de 6 dígitos a <strong>{email || "tu correo"}</strong>.
      </p>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <input 
          className={styles.input} 
          name="codigo" 
          placeholder="Código de Email" 
          onChange={(e) => setCodigo(e.target.value)} 
        />
        
        {error && <p className={styles.error}>{error}</p>}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
        
        <button className={styles.button} type="submit">Verificar</button>
      </form>
      
      <button 
        className={styles.resendButton}
        onClick={handleResendCode}
        disabled={isResending || cooldown > 0} 
      >
        {isResending
          ? 'Enviando...'
          : cooldown > 0
            ? `Reenviar en ${cooldown}s`
            : 'Reenviar código'}
      </button>
    </div>
  );
}