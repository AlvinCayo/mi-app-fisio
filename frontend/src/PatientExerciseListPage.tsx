// frontend/src/PatientExerciseListPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/PatientExerciseListPage.module.css';
import backArrow from './assets/back-arrow.svg'; 

// Asegúrate de tener esta imagen en 'frontend/src/assets/'
// o cámbiala por la URL real de tu ejercicio si la tienes en el backend
import genericExerciseImage from './assets/exercise-placeholder.png'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}

interface AssignedExercise {
  id: number;
  nombre_ejercicio: string;
  descripcion_ejercicio: string;
  series: number;
  repeticiones: number | null; // Puede ser null si es por duración
  duracion_segundos: number | null; // Puede ser null si es por repeticiones
  imagen_url: string | null; // URL de la imagen del ejercicio
}

export function PatientExerciseListPage() {
  const [assignedExercises, setAssignedExercises] = useState<AssignedExercise[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const fetchAssignedExercises = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'paciente') {
        navigate('/'); // Redirige si no es paciente
        return;
      }

      // Endpoint para obtener los ejercicios asignados para HOY
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/patient/assigned-exercises/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignedExercises(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar tus ejercicios diarios.');
      console.error("Error fetching assigned exercises:", err);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchAssignedExercises();
  }, [fetchAssignedExercises]);

  const handleStartRoutine = () => {
    // Si hay ejercicios, navegamos al primer ejercicio en la secuencia
    if (assignedExercises.length > 0) {
      navigate(`/patient/exercises/${assignedExercises[0].id}`);
    } else {
      setError('No tienes ejercicios asignados para hoy para iniciar.');
    }
  };

  const handleExerciseClick = (exerciseId: number) => {
    navigate(`/patient/exercises/${exerciseId}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/patient/dashboard')} // Asume que vuelves al dashboard
        />
        <h1 className={styles.headerTitle}>Ejercicios diarios</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.exerciseList}>
        {assignedExercises.length === 0 ? (
          <p style={{textAlign: 'center', marginTop: '50px', color: '#777'}}>
            No tienes ejercicios asignados para hoy. ¡Disfruta de tu día libre!
          </p>
        ) : (
          assignedExercises.map((exercise) => (
            <div 
              key={exercise.id} 
              className={styles.exerciseCard}
              onClick={() => handleExerciseClick(exercise.id)}
            >
              <img 
                src={exercise.imagen_url || genericExerciseImage} 
                alt={exercise.nombre_ejercicio} 
                className={styles.exerciseImage}
              />
              <div className={styles.exerciseDetails}>
                <h3 className={styles.exerciseName}>{exercise.nombre_ejercicio}</h3>
                <p className={styles.exerciseInfo}>
                  {exercise.series} series &bull;{' '}
                  {exercise.repeticiones ? `${exercise.repeticiones} repeticiones` : ''}
                  {exercise.duracion_segundos ? `${exercise.duracion_segundos} segundos` : ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        className={styles.startRoutineButton}
        onClick={handleStartRoutine}
        disabled={assignedExercises.length === 0}
      >
        Iniciar
      </button>
    </div>
  );
}