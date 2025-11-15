// frontend/src/PatientRoutinePage.tsx (NUEVO ARCHIVO)

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/PatientRoutinePage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 
import logo from './assets/logo.svg'; // Fallback por si un ejercicio no tiene imagen

// --- Definición de Tipos ---
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
  descripcion: string;
  ejercicios: ExerciseDetail[];
}

export function PatientRoutinePage() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  // --- Cargar la rutina del paciente ---
  const fetchMyRoutine = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/patient/my-routine', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.message) {
        // El backend responde con un mensaje si no hay rutina
        setMessage(response.data.message); // "No tienes ninguna rutina asignada."
        setRoutine(null);
      } else {
        setRoutine(response.data);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar tu rutina.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Protección de la Ruta
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'paciente') {
        // Si un admin llega aquí, lo mandamos a su dashboard
        navigate('/admin/dashboard');
      }
    } catch (e) {
      navigate('/login');
    }
    
    fetchMyRoutine(); // Carga inicial
  }, [token, navigate, fetchMyRoutine]);

  const handleStartRoutine = () => {
    // Aquí irá la lógica para la pantalla de "Vamos começar?"
    alert('Iniciando la rutina... (Próximamente)');
  };
  
  // Función para renderizar el contenido
  const renderContent = () => {
    if (isLoading) {
      return <p className={styles.message}>Cargando tu rutina...</p>;
    }
    if (error) {
      return <p className={styles.error}>{error}</p>;
    }
    if (message || !routine || routine.ejercicios.length === 0) {
      return <p className={styles.message}>No tienes una rutina asignada. Por favor, contacta a tu fisioterapeuta.</p>;
    }
    
    // Si todo está bien, muestra la lista de ejercicios
    return (
      <div className={styles.routineList}>
        {routine.ejercicios.map((ex, index) => (
          // Hacemos que la tarjeta sea un Link a la página del ejercicio individual
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
          onClick={() => navigate('/')} // Vuelve al dashboard del paciente
        />
        <h1 className={styles.headerTitle}>Ejercicios diarios</h1>
      </header>
      
      {/* Contenido principal (lista o mensajes) */}
      {renderContent()}

      {/* Botón "Iniciar" fijo abajo */}
      {routine && routine.ejercicios.length > 0 && (
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