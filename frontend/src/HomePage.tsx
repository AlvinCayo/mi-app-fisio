// frontend/src/HomePage.tsx (ACTUALIZADO)

import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // <-- ¡Añadido Link!
import styles from './styles/HomePage.module.css';
import logo from './assets/logo.svg'; 
import iconStart from './assets/start.svg'; 
import iconCalendar from './assets/exercises.svg'; 
import iconProfile from './assets/agenda.svg'; 

export function HomePage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken'); 

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
    // (Aquí podrías decodificar el token y si es 'admin', redirigir a '/admin/dashboard')
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

        {/* --- ¡CAMBIO AQUÍ! --- */}
        {/* Ahora es un <Link> en lugar de un <button> */}
        <Link to="/my-routine" className={styles.card} style={{textDecoration: 'none'}}>
          <h2 className={styles.cardTitle}>Ejercicios diarios</h2>
          <p className={styles.cardSubtitle}>
            Establece una rutina diaria de ejercicio para acelerar tu recuperación.
          </p>
          {/* El botón ahora es parte del Link */}
          <div className={styles.cardButton}>Iniciar rutina diaria</div>
        </Link>
        {/* --- FIN DEL CAMBIO --- */}


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
        <img src={iconProfile} alt="Perfil" className={styles.navIcon} />
      </nav>
    </div>
  );
}