// frontend/src/AdminExerciseDashboard.tsx (ACTUALIZADO)

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminExerciseDashboard.module.css';
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}

export function AdminExerciseDashboard() {
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
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (e) {
      sessionStorage.removeItem('authToken');
      navigate('/login');
    }
  }, [token, navigate]);

  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/dashboard')}
        />
        <h1 className={styles.headerTitle}>Gestión de Ejercicios</h1>
      </header>

      <main className={styles.mainContent}>

        <Link to="/admin/exercises/manage" className={styles.card}>
          <h2 className={styles.cardTitle}>Gestionar Ejercicios</h2>
          <p className={styles.cardSubtitle}>
            Crear, editar o borrar ejercicios individuales (con sus videos/imágenes).
          </p>
        </Link>

        <Link to="/admin/routines" className={styles.card}> {/* <- Enlaza al dashboard de rutinas */}
          <h2 className={styles.cardTitle}>Gestionar Rutinas</h2>
          <p className={styles.cardSubtitle}>
            Crear o editar rutinas (grupos de ejercicios) con series y repeticiones.
          </p>
        </Link>
        
        {/* --- ¡CAMBIO AQUÍ! ---
            Ahora es un <Link> a la nueva página de asignación
        */}
        <Link to="/admin/routines/assign" className={styles.card}>
          <h2 className={styles.cardTitle}>Asignar Rutinas</h2>
          <p className={styles.cardSubtitle}>
            Asignar una rutina específica a cada paciente.
          </p>
        </Link>
        {/* --- FIN DEL CAMBIO --- */}
        
      </main>
    </div>
  );
}