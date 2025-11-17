// frontend/src/AdminRoutineDashboard.tsx (ACTUALIZADO)

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminRoutineDashboard.module.css';
import backArrow from './assets/back-arrow.svg'; 

// (Tipos se quedan igual)
interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface ExercisePreview {
  nombre: string;
}
interface Routine {
  id: number;
  nombre: string;
  descripcion: string;
  ejercicios: ExercisePreview[] | null;
}

export function AdminRoutineDashboard() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  // (fetchRoutines y useEffect se quedan igual)
  const fetchRoutines = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('${import.meta.env.VITE_API_URL}/api/admin/routines', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoutines(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar las rutinas.');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'admin') {
        navigate('/');
        return;
      }
    } catch (e) {
      sessionStorage.removeItem('authToken');
      navigate('/login');
      return;
    }
    
    fetchRoutines();
  }, [token, navigate, fetchRoutines]);


  const handleCreateRoutine = () => {
    navigate('/admin/routines/create');
  };

  // --- ¡CAMBIO AQUÍ! ---
  // El botón "Editar" ahora navega a la página de edición
  const handleEditRoutine = (routineId: number) => {
    navigate(`/admin/routines/edit/${routineId}`);
  };
  // ---------------------

  // (handleDeleteRoutine se queda igual)
  const handleDeleteRoutine = async (routineId: number) => {
    if (!token || !window.confirm(`¿Estás seguro de que quieres borrar esta rutina?`)) {
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/routines/${routineId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Rutina eliminada con éxito.');
      setRoutines(prev => prev.filter(r => r.id !== routineId));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar la rutina.');
    }
  };


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/exercises')}
        />
        <h1 className={styles.headerTitle}>Gestionar Rutinas</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <h2 className={styles.pageTitle}>Panel de Rutinas</h2>
      
      <button 
        className={styles.createButton} 
        onClick={handleCreateRoutine}
      >
        Crear Nueva Rutina
      </button>

      <div className={styles.routineList}>
        {routines.length === 0 ? (
          <p>No hay rutinas creadas.</p>
        ) : (
          routines.map(routine => (
            <div key={routine.id} className={styles.routineCard}>
              <div className={styles.routineHeader}>
                <h3 className={styles.routineName}>{routine.nombre}</h3>
                
                <div className={styles.buttonActions}>
                  <button 
                    onClick={() => handleEditRoutine(routine.id)}
                    className={styles.editButton}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDeleteRoutine(routine.id)}
                    className={styles.deleteButton}
                  >
                    Borrar
                  </button>
                </div>
              </div>
              <div className={styles.exerciseList}>
                <span className={styles.exerciseListTitle}>Ejercicios:</span>
                {(!routine.ejercicios || routine.ejercicios.length === 0) ? (
                  <span className={styles.exerciseItem}>- Vacía -</span>
                ) : (
                  routine.ejercicios.map((ex, index) => (
                    <span key={index} className={styles.exerciseItem}>- {ex.nombre}</span>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}