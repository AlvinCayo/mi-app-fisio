// frontend/src/RegisterPage.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Importa los estilos
import styles from './styles/RegisterPage.module.css';

// Importa tu logo
import logo from './assets/logo.svg';

export function RegisterPage() {
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
      await axios.post('http://localhost:3000/api/auth/register', {
        nombreCompleto: formData.nombreCompleto,
        ci: formData.ci,
        telefono: formData.telefono,
        email: formData.email,
        password: formData.password
      });
      
      // ¡Éxito! Redirige a la página de verificación
      navigate(`/verify?email=${formData.email}`); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar. Intenta de nuevo.');
    }
  };

  return (
    <div className={styles.container}>
      
      <img src={logo} alt="Logo" className={styles.logo} /> 
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <input className={styles.input} name="nombreCompleto" placeholder="Nombre Completo" onChange={handleChange} />
        <input className={styles.input} name="ci" placeholder="CI" onChange={handleChange} />
        <input className={styles.input} name="telefono" placeholder="Telefono" onChange={handleChange} />
        <input className={styles.input} name="email" type="email" placeholder="Email" onChange={handleChange} />
        <input className={styles.input} name="password" type="password" placeholder="Contraseña" onChange={handleChange} />
        <input className={styles.input} name="confirmPassword" type="password" placeholder="Confirme su Contraseña" onChange={handleChange} />
        
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