// frontend/src/AdminRoutineDashboard.tsx (NUEVO)

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminRoutineDashboard.module.css'; // Nuevo CSS para el dashboard de rutinas
import backArrow from './assets/back-arrow.svg'; 

// Definición de tipos para la autenticación
interface DecodedToken {
  role: 'admin' | 'paciente';
}

// Definición de tipo para una rutina
interface Routine {
  id: number;
  name: string;
  // Añadiremos más propiedades cuando tengamos el backend, como los ejercicios en la rutina
}

export function AdminRoutineDashboard() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  // Función para cargar las rutinas (vacía por ahora, se conectará al backend)
  const fetchRoutines = useCallback(async () => {
    if (!token) return;
    try {
      // TODO: Implementar llamada real al backend para obtener las rutinas
      // const response = await axios.get('http://localhost:3000/api/admin/routines', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setRoutines(response.data);

      // Datos de ejemplo para que veas algo
      setRoutines([
        { id: 1, name: 'Rutina de Fuerza Básica' },
        { id: 2, name: 'Rutina de Recuperación de Rodilla' },
        { id: 3, name: 'Rutina Cardio Suave' },
      ]);

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar las rutinas.');
    }
  }, [token]);

  useEffect(() => {
    // Protección de la Ruta para Admin
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'admin') {
        navigate('/'); // Redirigir si no es admin
        return;
      }
    } catch (e) {
      sessionStorage.removeItem('authToken'); // Token inválido
      navigate('/login');
      return;
    }
    
    fetchRoutines();
  }, [token, navigate, fetchRoutines]);


  const handleCreateRoutine = () => {
    navigate('/admin/routines/create'); // Navega a la página de creación
  };

  const handleEditRoutine = (routineId: number) => {
    // TODO: Implementar la navegación a una página de edición de rutina
    alert(`Editar rutina ${routineId} - No implementado`);
  };

  const handleDeleteRoutine = async (routineId: number) => {
    if (!token || !window.confirm(`¿Estás seguro de que quieres borrar la rutina ${routineId}?`)) {
      return;
    }
    try {
      // TODO: Implementar llamada real al backend para borrar una rutina
      // await axios.delete(`http://localhost:3000/api/admin/routines/${routineId}`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      setMessage('Rutina eliminada con éxito (simulado).');
      setRoutines(prev => prev.filter(r => r.id !== routineId)); // Actualiza la UI
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
          onClick={() => navigate('/admin/dashboard')} // Vuelve al dashboard de admin
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
            <div key={routine.id} className={styles.routineItem}>
              <span className={styles.routineName}>{routine.name}</span>
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
          ))
        )}
      </div>
    </div>
  );
}