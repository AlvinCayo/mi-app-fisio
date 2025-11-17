// src/PatientRoutinePage.tsx
// Muestra una vista previa de video en la lista
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import styles from './styles/PatientRoutinePage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

// --- Interfaces (movidas fuera del componente) ---
interface Ejercicio {
  id: number; 
  nombre: string;
  url_media: string | null;
  series: number;
  repeticiones_tiempo: string;
  descripcion?: string; // <-- Descripción añadida
}

interface Routine {
  id: number;
  nombre: string;
  ejercicios: Ejercicio[];
}

// --- URLs del Backend ---
const API_URL = 'http://localhost:3000/api';
const BACKEND_URL = 'http://localhost:3000';

export function PatientRoutinePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.routine) {
      setRoutine(location.state.routine as Routine);
      setLoading(false);
    } else {
      const fetchRoutine = async () => {
        try {
          setLoading(true);
          const token = sessionStorage.getItem('authToken'); 
          if (!token) {
            navigate('/login');
            return;
          }

          const response = await fetch(`${API_URL}/patient/my-routine-for-today`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem('authToken');
            navigate('/login'); 
            return;
          }
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}`);
          }

          const data = await response.json();
          
          if (data.message) {
            setRoutine(null); 
          } else {
            setRoutine(data[0] || null);
          }
          setError(null);

        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Error al cargar la rutina.');
          setRoutine(null);
        } finally {
          setLoading(false);
        }
      };
      
      fetchRoutine();
    }
  }, [location.state, navigate]);

  if (loading) {
    return <div className={`${styles.page} ${styles.loading}`}>Cargando ejercicios...</div>;
  }

  if (error) {
    return <div className={`${styles.page} ${styles.error}`}>{error}</div>;
  }

  if (!routine || routine.ejercicios.length === 0) {
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
        <p className={styles.message}>
          No tienes ejercicios asignados para hoy. ¡Disfruta tu descanso!
        </p>
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
          onClick={() => navigate('/')} 
        />
        <h1 className={styles.headerTitle}>Ejercicios diarios</h1>
      </header>

      <div className={styles.routineList}>
        {routine.ejercicios.map((ejercicio: Ejercicio) => (
          <div key={ejercicio.id} className={styles.exerciseCard}>
            
            <div className={styles.exerciseMedia}>
              {/* --- ¡CORRECCIÓN AQUÍ! --- */}
              {ejercicio.url_media ? (
                // Verificamos si es video usando la lógica de AdminExerciseEditPage
                (ejercicio.url_media.endsWith('.mp4') || ejercicio.url_media.endsWith('.webm')) ? (
                  <video 
                    src={`${BACKEND_URL}${ejercicio.url_media}`} 
                    className={styles.exerciseImage} // Usamos la misma clase para el tamaño
                    autoPlay
                    muted
                    loop
                    playsInline // Importante para que funcione en móviles
                  />
                ) : (
                  // Si no es video, es una imagen
                  <img 
                    src={`${BACKEND_URL}${ejercicio.url_media}`} 
                    alt={ejercicio.nombre} 
                    className={styles.exerciseImage} 
                  />
                )
              ) : (
                <span></span> // Espacio reservado si no hay media
              )}
              {/* ------------------------- */}
            </div>
            
            <div className={styles.exerciseDetails}>
              <span className={styles.exerciseName}>{ejercicio.nombre}</span>
              {ejercicio.descripcion && (
                <span className={styles.exerciseDescriptionSmall}>
                  {ejercicio.descripcion.substring(0, 50)}...
                </span>
              )}
              <span className={styles.exerciseStats}>
                {ejercicio.series} series • {ejercicio.repeticiones_tiempo}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.startButtonContainer}>
        <Link to="/my-routine/execute" state={{ routine: routine }} style={{ textDecoration: 'none' }}>
          <button className={styles.startButton}>
            Iniciar
          </button>
        </Link>
      </div>
    </div>
  );
}