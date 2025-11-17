// frontend/src/ResetPasswordPage.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import styles from './styles/ResetPasswordPage.module.css'; // ¡Usa su propio CSS!
import logo from './assets/logo.svg';
import eyeOpen from './assets/eye-open.svg';
import eyeClosed from './assets/eye-closed.svg';

export function ResetPasswordPage() {
  const [codigo, setCodigo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const email = searchParams.get('email');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    try {
      const response = await axios.post('import.meta.env.VITE_API_URL/api/auth/reset-password', {
        email: email,
        codigo_sms: codigo,
        newPassword: newPassword
      });
      
      setSuccess(response.data.message + " Redirigiendo al login...");

      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error en el servidor.');
    }
  };

  return (
    <div className={styles.container}>
      <img src={logo} alt="Logo" className={styles.logo} />
      <h2 className={styles.title}>Nueva Contraseña</h2>
      <p className={styles.subtitle}>
        Revisa tu email (<strong>{email || "..."}</strong>) por el código.
      </p>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <input 
          className={styles.input} 
          name="codigo"
          placeholder="Código de 6 dígitos" 
          onChange={(e) => setCodigo(e.target.value)} 
        />
        
        <div className={styles.passwordWrapper}>
          <input 
            className={`${styles.input} ${styles.passwordInput}`}
            name="newPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Tu nueva contraseña" 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
          <img 
            src={showPassword ? eyeOpen : eyeClosed}
            alt="Ver/Ocultar"
            className={styles.passwordIcon}
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>
        
        <div className={styles.passwordWrapper}>
          <input 
            className={`${styles.input} ${styles.passwordInput}`}
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirma la nueva contraseña" 
            onChange={(e) => setConfirmPassword(e.target.value)} 
          />
          <img 
            src={showConfirm ? eyeOpen : eyeClosed}
            alt="Ver/Ocultar"
            className={styles.passwordIcon}
            onClick={() => setShowConfirm(!showConfirm)}
          />
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.successMessage}>{success}</p>}
        
        <div className={styles.buttonContainer}>
          <button className={styles.button} type="submit">Actualizar Contraseña</button>
          <Link to="/login" className={styles.link}>Volver a Iniciar Sesión</Link>
        </div>
      </form>
    </div>
  );
}