// frontend/src/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './styles/HomePage.module.css';
import logo from './assets/logo.svg'; 

import { ReportModal } from './ReportModal.tsx'; 
import { jwtDecode } from 'jwt-decode';
import adminPhoto from './assets/profile.jpg'; // Ya estaba importada aquí

interface DecodedToken {
  nombre: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken'); 
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [userName, setUserName] = useState('Usuario');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        const firstName = decodedToken.nombre.split(' ')[0];
        setUserName(firstName);
      } catch (e) {
        console.error("Token inválido:", e);
        sessionStorage.removeItem('authToken');
        navigate('/login');
      }
    }
  }, [token, navigate]); 

  if (!token) {
    return <p>Redirigiendo a la página de login...</p>;
  }

  return (
    <div className={styles.page}> 
      
      <header className={styles.header}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <span className={styles.title}>¡Qué bueno tenerte de vuelta, {userName}!</span>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>¿Cómo te sientes hoy?</h2>
          <p className={styles.cardSubtitle}>
            Añade un informe para ayudar al profesional en el tratamiento.
          </p>
          <button 
            className={styles.cardButton}
            onClick={() => setIsReportModalOpen(true)}
          >
            Agregar informe
          </button>
        </section>

        <Link to="/my-routine" className={styles.card} style={{textDecoration: 'none'}}>
          <h2 className={styles.cardTitle}>Ejercicios diarios</h2>
          <p className={styles.cardSubtitle}>
            Establece una rutina diaria de ejercicio para acelerar tu recuperación.
          </p>
          <button className={styles.cardButton}>Iniciar rutina diaria</button>
        </Link>
        <Link 
          to="/contact" 
          className={styles.card} 
          style={{ textDecoration: 'none' }} // Evita que el texto salga subrayado azul
        >
          <h2 className={styles.cardTitle}>Tu Fisioterapeuta</h2>
          
          <div className={styles.physioInfo}>
            <img 
              src={adminPhoto} 
              alt="Foto del fisioterapeuta" 
              className={styles.physioImage} 
            />
            <span className={styles.physioText}>Dr(a). Fisioterapeuta</span>
          </div>

          {/* Cambiamos 'button' por 'div' para evitar errores de HTML, 
              pero mantenemos la clase para que se vea igual */}
          <div className={styles.cardButton}>
            Ponte en contacto
          </div>
        </Link>
      </main>
      
      {isReportModalOpen && (
        <ReportModal onClose={() => setIsReportModalOpen(false)} />
      )}
    </div>
  );
}