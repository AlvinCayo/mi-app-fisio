// frontend/src/RegisterPage.tsx (CORREGIDO)

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Importa estilos y assets
import styles from './styles/RegisterPage.module.css';
import logo from './assets/logo.svg';
import eyeOpen from './assets/eye-open.svg';
import eyeClosed from './assets/eye-closed.svg';

export function RegisterPage() {
  
  // ¡CORREGIDO! Inicializa el estado con el objeto completo
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    ci: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Estados para los íconos de los ojos
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    try {
      // ¡CORREGIDO! Pasa el objeto de datos completo
      await axios.post('http://localhost:3000/api/auth/register', {
        nombreCompleto: formData.nombreCompleto,
        ci: formData.ci,
        telefono: formData.telefono,
        email: formData.email,
        password: formData.password
      });

      navigate(`/verify?email=${formData.email}`); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar.');
    }
  };

  return (
    <div className={styles.container}>
      <img src={logo} alt="Logo" className={styles.logo} /> 
      
      <form className={styles.form} onSubmit={handleSubmit}>
        
        {/* Inputs de texto normales */}
        <input className={styles.input} name="nombreCompleto" placeholder="Nombre Completo" onChange={handleChange} />
        <input className={styles.input} name="ci" placeholder="CI" onChange={handleChange} />
        <input className={styles.input} name="telefono" placeholder="Telefono" onChange={handleChange} />
        <input className={styles.input} name="email" type="email" placeholder="Email" onChange={handleChange} />

        {/* --- ESTRUCTURA CORREGIDA (Contraseña 1) --- */}
        <div className={styles.passwordWrapper}>
          <input 
            className={`${styles.input} ${styles.passwordInput}`}
            name="password" 
            type={showPassword ? "text" : "password"} 
            placeholder="Contraseña" 
            onChange={handleChange} 
          />
          <img 
            src={showPassword ? eyeOpen : eyeClosed}
            alt="Ver/Ocultar"
            className={styles.passwordIcon}
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>

        {/* --- ESTRUCTURA CORREGIDA (Contraseña 2) --- */}
        <div className={styles.passwordWrapper}>
          <input 
            className={`${styles.input} ${styles.passwordInput}`}
            name="confirmPassword" 
            type={showConfirm ? "text" : "password"} 
            placeholder="Confirme su Contraseña" 
            onChange={handleChange} 
          />
          <img 
            src={showConfirm ? eyeOpen : eyeClosed}
            alt="Ver/Ocultar"
            className={styles.passwordIcon}
            onClick={() => setShowConfirm(!showConfirm)}
          />
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <div className={styles.buttonContainer}>
          <button className={styles.button} type="submit">Registrar</button>
          <Link to="/login" className={styles.buttonOutline}>
            Volver a iniciar sesión
          </Link>
        </div>
      </form>
    </div>
  );
}