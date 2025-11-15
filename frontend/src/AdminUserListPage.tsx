// frontend/src/AdminUserListPage.tsx

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminUserListPage.module.css';
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}

export function AdminUserListPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  useEffect(() => {
    // (Protección de la Ruta)
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
          onClick={() => navigate('/admin/dashboard')} // Vuelve al dashboard de admin
        />
        <h1 className={styles.headerTitle}>Gestión de Usuarios</h1>
      </header>

      <main className={styles.mainContent}>
        <Link to="/admin/users/pending" className={styles.card}>
          <h2 className={styles.cardTitle}>Usuarios Pendientes</h2>
          <p className={styles.cardSubtitle}>
            Aprobar o rechazar nuevos pacientes que se registraron.
          </p>
        </Link>

        <Link to="/admin/users/manage" className={styles.card}>
          <h2 className={styles.cardTitle}>Gestionar Pacientes</h2>
          <p className={styles.cardSubtitle}>
            Ver todos los pacientes (activos e inactivos) y cambiar su estado.
          </p>
        </Link>
      </main>
    </div>
  );
}