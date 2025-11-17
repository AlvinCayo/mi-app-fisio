// frontend/src/AdminRoutineEditPage.tsx (NUEVO ARCHIVO)

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminRoutineEditPage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

// --- Definición de Tipos ---
interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface Exercise {
  id: number;
  nombre: string;
}
// Esta es la interfaz de los ejercicios que VIENEN DEL BACKEND
// (en el endpoint /api/admin/routines/:id)
interface BackendExerciseData {
  id: number; // El backend nos da 'id', no 'ejercicio_id'
  nombre: string;
  series: number;
  repeticiones_tiempo: string;
  orden: number;
}
// Esta es la interfaz para los ejercicios DENTRO de la rutina
// (tal como los guardamos en el estado)
interface RoutineExercise {
  ejercicio_id: number; // Este es el ID que enviamos al backend
  nombre?: string; // Para mostrar en la lista
  series: number;
  repeticiones_tiempo: string;
  orden: number;
}
interface RoutineToEdit {
  id: number;
  nombre: string;
  descripcion: string;
  ejercicios: BackendExerciseData[]; // <-- Usa la interfaz del backend
}

export function AdminRoutineEditPage() {
  const { id } = useParams<{ id: string }>(); 
  const routineId = Number(id);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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


  // --- Cargar datos (Paso 1: Cargar ejercicios disponibles) ---
  const fetchInitialExercises = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('import.meta.env.VITE_API_URL/api/admin/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllExercises(response.data);
      if (response.data.length > 0) {
        setSelectedExerciseId(String(response.data[0].id));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar ejercicios disponibles.');
    }
  }, [token]);

  // --- Cargar datos (Paso 2: Cargar la rutina específica a editar) ---
  const fetchRoutineToEdit = useCallback(async () => {
    if (!token || isNaN(routineId)) return;

    try {
      const response = await axios.get(`import.meta.env.VITE_API_URL/api/admin/routines/${routineId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const routine: RoutineToEdit = response.data;
      
      setRoutineName(routine.nombre);
      setRoutineDescription(routine.descripcion || '');
      
      // --- ¡CORRECCIÓN! ---
      // Mapea del formato del Backend (ex.id) 
      // al formato del Estado Local (ejercicio_id)
      setRoutineExercises(routine.ejercicios.map(ex => ({
        ejercicio_id: ex.id, // <-- ex.id ahora es válido
        nombre: ex.nombre,
        series: ex.series,
        repeticiones_tiempo: ex.repeticiones_tiempo,
        orden: ex.orden
      })));
      // --- FIN CORRECCIÓN ---

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar la rutina.');
      navigate('/admin/routines'); 
    } finally {
      setIsLoading(false);
    }
  }, [token, routineId, navigate]);


  useEffect(() => {
    // Protección de la Ruta
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
    
    fetchInitialExercises(); 
    fetchRoutineToEdit(); 
  }, [token, navigate, fetchInitialExercises, fetchRoutineToEdit]);


  // (Las funciones handleAddExercise y handleRemoveExercise son idénticas a las de Crear)
  const handleAddExercise = () => {
    const selectedExercise = allExercises.find(ex => ex.id === Number(selectedExerciseId));
    if (!selectedExercise || !selectedExerciseId) {
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
  
  // --- ¡CORRECCIÓN! ---
  // Usamos 'ejercicio_id' para filtrar, no 'id'
  const handleRemoveExercise = (exerciseId: number) => {
    setRoutineExercises(
      routineExercises
        .filter(ex => ex.ejercicio_id !== exerciseId)
        .map((ex, index) => ({ ...ex, orden: index + 1 }))
    );
  };

  // --- Guardar la Rutina (PUT en lugar de POST) ---
  const handleSubmitRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!routineName || routineExercises.length === 0 || !token) {
      setError("Faltan datos o la sesión ha expirado.");
      return;
    }

    try {
      await axios.put(`import.meta.env.VITE_API_URL/api/admin/routines/${routineId}`, 
        {
          nombre: routineName,
          descripcion: routineDescription,
          ejercicios: routineExercises
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setMessage('¡Rutina actualizada con éxito!');
      setTimeout(() => navigate('/admin/routines'), 2000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar la rutina.');
    }
  };


  if (isLoading) {
    return <p style={{textAlign: 'center', marginTop: '50px'}}>Cargando datos de la rutina...</p>
  }
  if (error && !routineName) {
    return <p style={{textAlign: 'center', marginTop: '50px', color: 'red'}}>Error: {error}</p>
  }


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/routines')}
        />
        <h1 className={styles.headerTitle}>Editar Rutina</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <h2 className={styles.pageTitle}>Editando: {routineName || `ID ${routineId}`}</h2>
      
      <form className={styles.form} onSubmit={handleSubmitRoutine}>
        
        <h2 className={styles.pageTitle} style={{marginTop: '10px'}}>1. Datos de la Rutina</h2>
        <input 
          type="text"
          className={styles.input}
          placeholder="Nombre de la Rutina"
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
                  <div className={styles.exerciseName}>{ex.orden}. {ex.nombre}</div>
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
          disabled={!routineName || routineExercises.length === 0}
          style={{marginTop: '20px'}}
        >
          Guardar Cambios
        </button>

      </form>
    </div>
  );
}