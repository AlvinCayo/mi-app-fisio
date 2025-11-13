// frontend/src/HomePage.tsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './styles/HomePage.module.css';

// Importa tu logo
import logo from './assets/logo.svg'; 

// --- ¡Tus importaciones de íconos! ---
import iconStart from './assets/start.svg'; 
import iconCalendar from './assets/exercises.svg'; 
import iconProfile from './assets/agenda.svg'; 

/*
  NOTA: Todavía necesitarás añadir la imagen de tu fisio 
  a tu carpeta `frontend/src/assets`
  
  import physioImage from '../assets/doctor.png';
*/

export function HomePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    // Si no hay token, no puedes estar aquí
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]); // Se ejecuta si el token cambia

  // Si no hay token, no renderiza nada mientras redirige
  if (!token) {
    return <p>Redirigiendo a la página de login...</p>;
  }

  // Si el token SÍ existe, muestra la página de bienvenida
  return (
    <div className={styles.page}>
      
      {/* --- Header --- */}
      <header className={styles.header}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <span className={styles.title}>¡Qué bueno tenerte de vuelta, Usuario!</span>
      </header>

      {/* --- Contenido Principal (Tarjetas) --- */}
      <main className={styles.mainContent}>

        {/* Card 1: Sentimientos */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>¿Cómo te sientes hoy?</h2>
          <p className={styles.cardSubtitle}>
            Añade un informe para ayudar al profesional en el tratamiento.
          </p>
          <button className={styles.cardButton}>Agregar informe</button>
        </section>

        {/* Card 2: Ejercicios */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Ejercicios diarios</h2>
          <p className={styles.cardSubtitle}>
            Establece una rutina diaria de ejercicio para acelerar tu recuperación.
          </p>
          <button className={styles.cardButton}>Iniciar rutina diaria</button>
        </section>

        {/* Card 3: Fisio */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Tu Fisioterapeuta</h2>
          <div className={styles.physioInfo}>
            {/* Cuando tengas la imagen, reemplaza este div por:
              <img src={physioImage} alt="Fisioterapeuta" className={styles.physioImage} />
            */}
            <div className={styles.physioImage}></div> 
            <span className={styles.physioText}>Dr(a). Fisioterapeuta</span>
          </div>
          <button className={styles.cardButton}>Ponte en contacto</button>
        </section>

      </main>

      {/* --- Barra de Navegación Inferior (ACTUALIZADA) --- */}
      <nav className={styles.bottomNav}>
        {/* Tus íconos están ahora aquí */}
        <img src={iconStart} alt="Inicio" className={styles.navIcon} />
        <img src={iconCalendar} alt="Ejercicios" className={styles.navIcon} />
        <img src={iconProfile} alt="Agenda" className={styles.navIcon} />
      </nav>

    </div>
  );
}