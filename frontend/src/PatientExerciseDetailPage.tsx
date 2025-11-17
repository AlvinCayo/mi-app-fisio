// frontend/src/PatientExerciseDetailPage.tsx (NUEVO)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/PatientExerciseDetailPage.module.css';
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}

interface AssignedExercise {
  id: number;
  nombre_ejercicio: string;
  descripcion_ejercicio: string;
  series: number;
  repeticiones: number;
  duracion_segundos: number; // Duración si es un ejercicio de tiempo
  imagen_url: string; // URL de la imagen del ejercicio
}

export function PatientExerciseDetailPage() {
  const [exercise, setExercise] = useState<AssignedExercise | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');
  const { exerciseId } = useParams<{ exerciseId: string }>();

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

      // Endpoint para obtener los detalles de un ejercicio asignado específico
      const response = await axios.get(`http://localhost:3000/api/patient/assigned-exercises/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExercise(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar el detalle del ejercicio.');
      console.error("Error fetching exercise details:", err);
      // Podrías redirigir a la lista si el ejercicio no se encuentra o no está asignado
      // navigate('/patient/exercises'); 
    }
  }, [token, navigate, exerciseId]);

  useEffect(() => {
    fetchExerciseDetails();
  }, [fetchExerciseDetails]);

  const handleStartExercise = () => {
    if (exercise) {
      navigate(`/patient/exercise-execution/${exercise.id}`);
    }
  };

  if (!exercise) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <img 
            src={backArrow} 
            alt="Volver" 
            className={styles.backArrow}
            onClick={() => navigate('/patient/exercises')}
          />
          <h1 className={styles.headerTitle}>Ejercicio</h1>
        </header>
        {error && <p className={styles.error}>{error}</p>}
        {!error && <p style={{textAlign: 'center', marginTop: '50px'}}>Cargando detalles del ejercicio...</p>}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/patient/exercises')}
        />
        <h1 className={styles.headerTitle}>Ejercicios diarios</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.content}>
        <h2 className={styles.exerciseName}>{exercise.nombre_ejercicio}</h2>
        <p className={styles.exerciseDescription}>
          {exercise.descripcion_ejercicio}
        </p>
        <p className={styles.exerciseDescription}>
          Realizar: {exercise.series} series &bull; 
          {exercise.repeticiones ? `${exercise.repeticiones} repeticiones` : ''}
          {exercise.duracion_segundos ? `${exercise.duracion_segundos} segundos` : ''}
        </p>
      </div>

      <button 
        className={styles.startButton}
        onClick={handleStartExercise}
      >
        Iniciar
      </button>
    </div>
  );
}