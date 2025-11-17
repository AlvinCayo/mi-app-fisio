// frontend/src/PatientLayout.tsx (¡Archivo CORREGIDO!)

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
// ¡Importamos el CSS del layout (HomePage) aquí!
import styles from './styles/HomePage.module.css'; 
import iconStart from './assets/start.svg'; 
import iconCalendar from './assets/exercises.svg'; 
import iconProfile from './assets/agenda.svg'; 

export function PatientLayout() {
  return (
    // AHORA el layout provee el .page
    // Esto asegura que .bottomNav está DENTRO del contenedor centrado
    <div className={styles.page}>
      
      {/* El <Outlet/> renderiza el contenido (HomePage, etc.) DENTRO de .page */}
      <Outlet /> 

      {/* La barra de navegación ahora está dentro de .page y se centrará con él */}
      <nav className={styles.bottomNav}>
        <Link to="/">
          <img src={iconStart} alt="Inicio" className={styles.navIcon} />
        </Link>
        
        <Link to="/my-routine">
          <img src={iconCalendar} alt="Ejercicios" className={styles.navIcon} />
        </Link>
        
        <img 
          src={iconProfile} 
          alt="Perfil" 
          className={styles.navIcon} 
          onClick={() => alert('Esta función se agregará pronto.')}
          style={{ opacity: 0.5, cursor: 'not-allowed' }} 
        />
      </nav>
    </div>
  );
}