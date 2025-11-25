// frontend/src/PatientLayout.tsx

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './styles/HomePage.module.css'; 
import iconStart from './assets/start.svg'; 
import iconCalendar from './assets/exercises.svg'; 
import iconContact from './assets/agenda.svg'; // Usaremos agenda como contacto

export function PatientLayout() {
  const location = useLocation();

  // Función auxiliar para saber si el link está activo (opcional, para dar estilo visual)
  const isActive = (path: string) => location.pathname === path ? 1 : 0.5;

  return (
    <div className={styles.page}>
      <Outlet /> 

      <nav className={styles.bottomNav}>
        <Link to="/">
          <img 
            src={iconStart} 
            alt="Inicio" 
            className={styles.navIcon} 
            style={{ opacity: isActive('/') }} 
          />
        </Link>
        
        <Link to="/my-routine">
          <img 
            src={iconCalendar} 
            alt="Ejercicios" 
            className={styles.navIcon}
            style={{ opacity: isActive('/my-routine') }} 
          />
        </Link>
        
        {/* Nuevo Link a Contacto */}
        <Link to="/contact">
          <img 
            src={iconContact} 
            alt="Contacto" 
            className={styles.navIcon} 
            style={{ opacity: isActive('/contact') }} 
          />
        </Link>
      </nav>
    </div>
  );
}