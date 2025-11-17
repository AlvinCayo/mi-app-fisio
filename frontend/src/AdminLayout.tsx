// frontend/src/AdminLayout.tsx (¡Archivo NUEVO!)

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
// Usaremos un NUEVO archivo CSS para el layout del admin
import styles from './styles/AdminLayout.module.css'; 
// Re-usamos los mismos iconos, puedes cambiarlos si tienes otros
import iconStart from './assets/start.svg'; 
import iconCalendar from './assets/exercises.svg'; 
import iconProfile from './assets/agenda.svg'; 

export function AdminLayout() {
  return (
    // Este div centra la página y la barra de navegación
    <div className={styles.page}>
      
      {/* Aquí se renderizarán tus páginas: Dashboard, Assign, Reports */}
      <Outlet /> 

      {/* La barra de navegación del Admin */}
      <nav className={styles.bottomNav}>
        {/* 1. Botón de Admin Dashboard */}
        <Link to="/admin/dashboard">
          {/* Deberías cambiar este icono por uno de "Dashboard" o "Home" */}
          <img src={iconStart} alt="Dashboard" className={styles.navIcon} />
        </Link>
        
        {/* 2. Botón de Asignar Rutina */}
        <Link to="/admin/routines/assign">
           {/* Deberías cambiar este icono por uno de "Calendario" o "Asignar" */}
          <img src={iconCalendar} alt="Asignar" className={styles.navIcon} />
        </Link>
        
        {/* 3. Botón de Reportes */}
        <Link to="/admin/reports">
           {/* Deberías cambiar este icono por uno de "Reportes" o "Gráfica" */}
          <img src={iconProfile} alt="Reportes" className={styles.navIcon} />
        </Link>
      </nav>
    </div>
  );
}