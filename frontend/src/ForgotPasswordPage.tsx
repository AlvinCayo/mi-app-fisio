// frontend/src/ForgotPasswordPage.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles/LoginPage.module.css'; // Reutiliza el estilo de Login
import logo from './assets/logo.svg';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('${import.meta.env.VITE_API_URL}/api/auth/forgot-password', { email });
      setSuccess(response.data.message);
      
      setTimeout(() => {
        navigate(`/reset-password?email=${email}`);
      }, 3000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error en el servidor.');
    }
  };

  return (
    <div className={styles.container}>
      <img src={logo} alt="Logo" className={styles.logo} />
      <h2 className={styles.title}>Recuperar Contraseña</h2>
      <p style={{textAlign: 'center', color: '#555', marginTop: 0}}>Ingresa tu email y te enviaremos un código.</p>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <input 
          className={styles.input} 
          name="email"
          type="email"
          placeholder="Tu correo electrónico" 
          onChange={(e) => setEmail(e.target.value)} 
        />
        
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.successMessage}>{success}</p>}
        
        <div className={styles.buttonContainer} style={{marginTop: '20px'}}>
          <button className={styles.button} type="submit">Enviar Código</button>
          <Link to="/login" className={styles.link}>Volver a Iniciar Sesión</Link>
        </div>
      </form>
    </div>
  );
}