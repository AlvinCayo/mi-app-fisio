// frontend/src/PatientRoutinePage.tsx (CORREGIDO)

// --- ¡CORRECCIÓN! Importamos React para usar React.Fragment ---
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/PatientRoutinePage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 
import logo from './assets/logo.svg'; 

// (Definición de Tipos se queda igual)
interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface ExerciseDetail {
  nombre: string;
  url_media: string | null;
  series: number;
  repeticiones_tiempo: string;
}
interface Routine {
  id: number;
  nombre: string;
  ejercicios: ExerciseDetail[];
}

export function PatientRoutinePage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const fetchMyRoutine = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/patient/my-routine-for-today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.message) {
        setMessage(response.data.message);
        setRoutines([]);
      } else {
        setRoutines(response.data);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar tu rutina.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'paciente') {
        navigate('/admin/dashboard');
      }
    } catch (e) {
      navigate('/login');
    }
    
    fetchMyRoutine();
  }, [token, navigate, fetchMyRoutine]);

  const handleStartRoutine = () => {
    alert('Iniciando la rutina... (Próximamente)');
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <p className={styles.loading}>Cargando tu rutina...</p>;
    }
    if (error) {
      return <p className={styles.error}>{error}</p>;
    }
    if (message || routines.length === 0) {
      return <p className={styles.message}>No tienes rutinas asignadas para hoy. ¡Disfruta tu descanso!</p>;
    }
    
    return (
      <div className={styles.routineList}>
        {routines.map((routine) => (
          // --- ¡CORRECCIÓN! React.Fragment ahora está definido ---
          <React.Fragment key={routine.id}>
            {routine.ejercicios.map((ex, index) => (
              <Link to={`/exercise/${index}`} key={index} className={styles.exerciseCard}>
                <div className={styles.exerciseMedia}>
                  <img 
                    src={ex.url_media ? `http://localhost:3000${ex.url_media}` : logo}
                    alt={ex.nombre}
                    className={styles.exerciseImage}
                  />
                </div>
                <div className={styles.exerciseDetails}>
                  <span className={styles.exerciseName}>{ex.nombre}</span>
                  <span className={styles.exerciseStats}>
                    {ex.series} series <br />
                    {ex.repeticiones_tiempo}
                  </span>
                </div>
              </Link>
            ))}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/')}
        />
        <h1 className={styles.headerTitle}>Ejercicios diarios</h1>
      </header>
      
      {renderContent()}

      {routines.length > 0 && (
        <div className={styles.startButtonContainer}>
          <button 
            className={styles.startButton}
            onClick={handleStartRoutine}
          >
            Iniciar
          </button>
        </div>
      )}
    </div>
  );
}