// frontend/src/AdminDashboardPage.tsx (ACTUALIZADO)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminDashboard.module.css';
import logo from './assets/logo.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}

export function AdminDashboardPage() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  useEffect(() => {
    // (Protección de la Ruta se queda igual)
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'admin') {
        setError('Acceso denegado. No eres administrador.');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (e) {
      sessionStorage.removeItem('authToken');
      navigate('/login');
    }
  }, [token, navigate]);

  const goToUserManagement = () => navigate('/admin/users');
  const goToExerciseManagement = () => navigate('/admin/exercises');
  const goToStats = () => alert('Función de "Estadísticas" no implementada');

  // --- ¡NUEVA NAVEGACIÓN! ---
  const goToReportManagement = () => {
    navigate('/admin/reports');
  };

  if (error) { /*... (JSX de error se queda igual) ...*/ }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <span className={styles.title}>Panel de Administrador</span>
      </header>

      <main className={styles.mainContent}>

        {/* --- ¡NUEVA TARJETA DE REPORTES! --- */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Gestión de Informes</h2>
          <p className={styles.cardSubtitle}>
            Revisar los informes diarios de síntomas de los pacientes.
          </p>
          <button className={styles.cardButton} onClick={goToReportManagement}>
            Ir a Informes
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Gestión de Usuarios</h2>
          <p className={styles.cardSubtitle}>
            Aprobar pacientes o ver la lista de usuarios.
          </p>
          <button className={styles.cardButton} onClick={goToUserManagement}>
            Ir a Gestión de Usuarios
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Gestión de Ejercicios</h2>
          <p className={styles.cardSubtitle}>
            Asignar o borrar rutinas de ejercicios por paciente.
          </p>
          <button className={styles.cardButton} onClick={goToExerciseManagement}>
            Ir a Gestión de Ejercicios
          </button>
        </section>
        
      </main>
    </div>
  );
}