// frontend/src/AdminRoutineCreatePage.tsx (CORREGIDO)

import { useState, useEffect } from 'react'; // <-- 'useCallback' eliminado
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminRoutineCreatePage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

// --- Definición de Tipos ---
interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface Exercise {
  id: number;
  nombre: string;
}
interface RoutineExercise {
  ejercicio_id: number;
  nombre: string;
  series: number;
  repeticiones_tiempo: string;
  orden: number;
}

export function AdminRoutineCreatePage() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  // --- Estados para el formulario ---
  const [routineName, setRoutineName] = useState('');
  const [routineDescription, setRoutineDescription] = useState('');
  
  // --- Estados para el "constructor" de rutinas ---
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [series, setSeries] = useState('3');
  const [reps, setReps] = useState('10 repeticiones');
  
  const [routineExercises, setRoutineExercises] = useState<RoutineExercise[]>([]);

  // --- Cargar todos los ejercicios disponibles ---
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'admin') navigate('/');
    } catch (e) {
      navigate('/login');
    }
    
    const fetchExercises = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/exercises`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllExercises(response.data);
        if (response.data.length > 0) {
          setSelectedExerciseId(String(response.data[0].id));
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar ejercicios.');
      }
    };
    
    fetchExercises();
  }, [token, navigate]);

  // --- Añadir un ejercicio a la lista de la rutina ---
  const handleAddExercise = () => {
    const selectedExercise = allExercises.find(ex => ex.id === Number(selectedExerciseId));
    if (!selectedExercise) {
      setError("Por favor, selecciona un ejercicio válido.");
      return;
    }
    
    if (routineExercises.find(ex => ex.ejercicio_id === selectedExercise.id)) {
      setError("Ese ejercicio ya está en la rutina.");
      return;
    }

    setRoutineExercises([
      ...routineExercises,
      {
        ejercicio_id: selectedExercise.id,
        nombre: selectedExercise.nombre,
        series: Number(series),
        repeticiones_tiempo: reps,
        orden: routineExercises.length + 1
      }
    ]);
    setError('');
  };

  // --- Quitar un ejercicio de la lista ---
  const handleRemoveExercise = (exerciseId: number) => {
    setRoutineExercises(
      routineExercises
        .filter(ex => ex.ejercicio_id !== exerciseId)
        .map((ex, index) => ({ ...ex, orden: index + 1 })) // Re-ordena
    );
  };

  // --- Guardar la Rutina completa ---
  const handleSubmitRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!routineName) {
      setError("El nombre de la rutina es obligatorio.");
      return;
    }
    if (routineExercises.length === 0) {
      setError("Debes añadir al menos un ejercicio a la rutina.");
      return;
    }
    if (!token) {
      setError("Sesión expirada.");
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/routines`, 
        {
          nombre: routineName,
          descripcion: routineDescription,
          ejercicios: routineExercises
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setMessage('¡Rutina creada con éxito!');
      setTimeout(() => navigate('/admin/exercises'), 2000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear la rutina.');
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
        <h1 className={styles.headerTitle}>Crear Nueva Rutina</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <form className={styles.form} onSubmit={handleSubmitRoutine}>
        
        <h2 className={styles.pageTitle}>1. Datos de la Rutina</h2>
        <input 
          type="text"
          className={styles.input}
          placeholder="Nombre de la Rutina (ej: Rodilla Fase 1)"
          value={routineName}
          onChange={(e) => setRoutineName(e.target.value)}
        />
        <textarea 
          className={styles.textarea}
          placeholder="Descripción de la rutina (opcional)"
          value={routineDescription}
          onChange={(e) => setRoutineDescription(e.target.value)}
        />

        <h2 className={styles.pageTitle} style={{marginTop: '10px'}}>2. Añadir Ejercicios</h2>
        <div className={styles.exerciseAdder}>
          <label>Elige un ejercicio:</label>
          <select 
            className={styles.select} 
            value={selectedExerciseId} 
            onChange={(e) => setSelectedExerciseId(e.target.value)}
          >
            {allExercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.nombre}</option>
            ))}
          </select>
          
          <div className={styles.adderRow}>
            <input 
              type="number"
              className={styles.smallInput}
              placeholder="Series"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
            />
            <input 
              type="text"
              className={styles.input}
              placeholder="Reps (ej: 10 repeticiones)"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
          <button type="button" className={styles.addButton} onClick={handleAddExercise}>
            Añadir Ejercicio a la Rutina
          </button>
        </div>

        <h2 className={styles.pageTitle} style={{marginTop: '10px'}}>
          Ejercicios en esta Rutina
        </h2>
        <div className={styles.exerciseList}>
          {routineExercises.length === 0 ? (
            <p style={{textAlign: 'center', color: '#777'}}>Aún no hay ejercicios.</p>
          ) : (
            routineExercises.map((ex) => (
              <div key={ex.ejercicio_id} className={styles.exerciseItem}>
                <div>
                    <div className={styles.exerciseDetails}>
                        {ex.series} series, {ex.repeticiones_tiempo}
                    </div>
                </div>
                <button 
                  type="button" 
                  className={styles.removeButton}
                  onClick={() => handleRemoveExercise(ex.ejercicio_id)}
                >
                  Quitar
                </button>
              </div>
            ))
          )}
        </div>

        <button 
          type="submit" 
          className={styles.button}
          style={{marginTop: '20px'}}
        >
          Guardar Rutina Completa
        </button>

      </form>
    </div>
  );
}