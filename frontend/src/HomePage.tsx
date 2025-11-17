// frontend/src/HomePage.tsx (Corregido)

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './styles/HomePage.module.css';
import logo from './assets/logo.svg'; 
// --- ¡Quitamos los iconos de navegación de aquí! ---
import { ReportModal } from './ReportModal.tsx'; 
import { jwtDecode } from 'jwt-decode';

// Interfaz para el token decodificado
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
    <> 
      {/* --- ¡Quitamos el div className={styles.page} de aquí! --- */}
      
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

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Seu fisio</h2>
          <div className={styles.physioInfo}>
            <div className={styles.physioImage}></div> 
            <span className={styles.physioText}>Dr(a). Fisioterapeuta</span>
          </div>
          <button className={styles.cardButton}>Ponte en contacto</button>
        </section>
      </main>
        
      {/* --- ¡LA BARRA DE NAVEGACIÓN SE HA QUITADO DE AQUÍ! --- */}
      
      {isReportModalOpen && (
        <ReportModal onClose={() => setIsReportModalOpen(false)} />
      )}
    </>
  );
}