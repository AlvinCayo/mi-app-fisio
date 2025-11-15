// frontend/src/AdminDashboardPage.tsx

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
  const token = sessionStorage.getItem('authToken'); // <-- Usa sessionStorage

  useEffect(() => {
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
      sessionStorage.removeItem('authToken'); // <-- Usa sessionStorage
      navigate('/login');
    }
  }, [token, navigate]);

  const goToUserManagement = () => {
    navigate('/admin/users'); // Te lleva al *menú* de usuarios
  };

  const goToExerciseManagement = () => {
    alert('Función de "Gestión de Ejercicios" no implementada');
  };

  const goToStats = () => {
    alert('Función de "Estadísticas" no implementada');
  };

  if (error) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <span className={styles.title}>Panel de Administrador</span>
        </header>
        <main className={styles.mainContent}>
          <p className={styles.error}>{error}</p>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <span className={styles.title}>Panel de Administrador</span>
      </header>

      <main className={styles.mainContent}>
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
        
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Estadísticas</h2>
          <p className={styles.cardSubtitle}>
            Ver el progreso general de los pacientes (próximamente).
          </p>
          <button className={styles.cardButton} onClick={goToStats}>
            Ver Estadísticas
          </button>
        </section>
      </main>
    </div>
  );
}