// frontend/src/PatientExerciseExecutionPage.tsx (NUEVO)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/PatientExerciseExecutionPage.module.css';

// Imagen de ejemplo, reemplázala por tus assets o la URL del ejercicio
import genericExerciseImage from './assets/exercise-placeholder.png'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}

interface AssignedExercise {
  id: number;
  nombre_ejercicio: string;
  duracion_segundos: number; // Duración si es un ejercicio de tiempo
  imagen_url: string; // URL de la imagen del ejercicio
  // Aquí podríamos añadir más detalles para mostrar al finalizar, si aplica
}

export function PatientExerciseExecutionPage() {
  const [exercise, setExercise] = useState<AssignedExercise | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const timerRef = useRef<number | null>(null); // Para guardar el ID del setInterval

  const fetchExerciseDetails = useCallback(async () => {
    if (!token || !exerciseId) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'paciente') {
        navigate('/');
        return;
      }

      const response = await axios.get(`http://localhost:3000/api/patient/assigned-exercises/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExercise(response.data);
      
      // Iniciar el cronómetro automáticamente al cargar la página
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(prevTime => prevTime + 1);
      }, 1000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar el ejercicio.');
      console.error("Error fetching exercise details for execution:", err);
    }
  }, [token, navigate, exerciseId]);

  useEffect(() => {
    fetchExerciseDetails();

    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchExerciseDetails]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFinishExercise = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current); // Detener el cronómetro
    }
    // Aquí puedes enviar la información del ejercicio completado al backend
    // Por ejemplo: await axios.post('/api/patient/exercise-completion', { exerciseId, timeElapsed });
    
    // Redirigir de vuelta a la lista de ejercicios o a una página de resumen
    navigate('/patient/exercises'); 
  };

  if (!exercise) {
    return (
      <div className={styles.page}>
        {error && <p className={styles.error}>{error}</p>}
        {!error && <p style={{textAlign: 'center', marginTop: '50px'}}>Cargando ejercicio...</p>}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.exerciseName}>{exercise.nombre_ejercicio}</h2>

      <div className={styles.timerContainer}>
        <img 
          src={exercise.imagen_url || genericExerciseImage} 
          alt={exercise.nombre_ejercicio} 
          className={styles.timerImage}
        />
        <span className={styles.timerText}>{formatTime(timeElapsed)}</span>
      </div>
      
      {error && <p className={styles.error}>{error}</p>}

      <button 
        className={styles.finishButton}
        onClick={handleFinishExercise}
      >
        Finalizar
      </button>
    </div>
  );
}