// frontend/src/HomePage.tsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './styles/HomePage.module.css';
import logo from './assets/logo.svg'; 
import iconStart from './assets/start.svg'; 
import iconCalendar from './assets/exercises.svg'; 
import iconProfile from './assets/agenda.svg'; 

export function HomePage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken'); // <-- Usa sessionStorage

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]); 

  if (!token) {
    return <p>Redirigiendo a la página de login...</p>;
  }

  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <span className={styles.title}>¡Qué bueno tenerte de vuelta, Usuario!</span>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>¿Cómo te sientes hoy?</h2>
          <p className={styles.cardSubtitle}>
            Añade un informe para ayudar al profesional en el tratamiento.
          </p>
          <button className={styles.cardButton}>Agregar informe</button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Ejercicios diarios</h2>
          <p className={styles.cardSubtitle}>
            Establece una rutina diaria de ejercicio para acelerar tu recuperación.
          </p>
          <button className={styles.cardButton}>Iniciar rutina diaria</button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Seu fisio</h2>
          <div className={styles.physioInfo}>
            <div className={styles.physioImage}></div> 
            <span className={styles.physioText}>Dr(a). Fisioterapeuta</span>
          </div>
          <button className={styles.cardButton}>Ponte en contacto</button>
        </section>
      </main>

      <nav className={styles.bottomNav}>
        <img src={iconStart} alt="Inicio" className={styles.navIcon} />
        <img src={iconCalendar} alt="Ejercicios" className={styles.navIcon} />
        <img src={iconProfile} alt="Agenda" className={styles.navIcon} />
      </nav>
    </div>
  );
}