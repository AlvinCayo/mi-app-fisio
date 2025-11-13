// frontend/src/LoginPage.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Importa los estilos
import styles from './styles/LoginPage.module.css';

// 1. ¡Importa tu nuevo logo.svg!
import logo from "./assets/logo.svg"; // Asegúrate de que el nombre del archivo coincida

export function LoginPage() {
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        ci: ci,
        password: password
      });

      localStorage.setItem('authToken', response.data.token);
      navigate('/'); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.');
    }
  };

  return (
    <div className={styles.container}>
      
      {/* 2. Usa el logo importado en una etiqueta <img> */}
      <img src={logo} alt="Logo Fisioterapia" className={styles.logo} /> 
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <input 
          className={styles.input} 
          name="ci" 
          placeholder="CI" 
          onChange={(e) => setCi(e.target.value)} 
        />
        <input 
          className={styles.input} 
          name="password" 
          type="password" 
          placeholder="Contraseña" 
          onChange={(e) => setPassword(e.target.value)} 
        />
        
        {error && <p className={styles.error}>{error}</p>}
        
        <div className={styles.buttonContainer}>
          <button className={styles.button} type="submit">Entrar</button>
          
          <Link to="/register" className={styles.buttonOutline}>
            Registrar
          </Link>
        </div>
      </form>
    </div>
  );
}