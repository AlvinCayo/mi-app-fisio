// src/PatientExerciseExecutionPage.tsx
// Esta página maneja las 3 etapas de tu Imagen 1.
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './styles/PatientExerciseExecutionPage.module.css'; 

// --- URL base del backend para las imágenes ---
const BACKEND_URL = '${import.meta.env.VITE_API_URL}';

// --- Interfaces (Corregidas) ---
interface Ejercicio {
  id: number;
  nombre: string;
  url_media: string | null;
  series: number;
  repeticiones_tiempo: string;
  descripcion?: string; // <-- La descripción está aquí
}

interface Routine {
  id: number;
  nombre: string;
  ejercicios: Ejercicio[];
}

interface CommonProps {
  onNext: () => void;
  onFinish?: () => void; 
  onBack?: () => void; // Para el botón "Volver"
  ejercicioActual?: Ejercicio;
  currentSeries?: number;
  totalSeries?: number;
  remainingTime?: number;
}

// --- Etapa 1: Instrucciones iniciales ---
const WelcomeStage = ({ onNext }: CommonProps) => (
  <div className={`${styles.page} ${styles.welcomeContainer}`}>
    <h1>¡Vamos a comenzar!</h1>
    <p>Realizaremos una serie de ejercicios recomendados por su fisioterapeuta...</p>
    <p>Se recomienda usar auriculares para este ejercicio.</p>
    <button className={styles.finishButton} onClick={onNext}>Iniciar</button>
  </div>
);

// --- Etapa 2: Descripción del ejercicio ---
const ExerciseDetailStage = ({ onNext, onBack, ejercicioActual }: CommonProps) => (
  <div className={`${styles.page} ${styles.exerciseDetailContainer}`}>
    <h2 className={styles.exerciseName}>{ejercicioActual?.nombre}</h2>
    
    <p className={styles.exerciseDescription}>
      {ejercicioActual?.descripcion || "Este ejercicio no tiene descripción."}
    </p>

    <p>{ejercicioActual?.series} series</p>
    <p>{ejercicioActual?.repeticiones_tiempo}</p>
    <p>1 minuto de descanso entre series</p>
    
    {/* --- ¡CORRECCIÓN AQUÍ! --- */}
    {ejercicioActual?.url_media && (
      <div className={styles.mediaContainer}>
        {(ejercicioActual.url_media.endsWith('.mp4') || ejercicioActual.url_media.endsWith('.webm')) ? (
          <video 
            src={`${BACKEND_URL}${ejercicioActual.url_media}`} 
            className={styles.exerciseImage} // Usamos la misma clase para el tamaño
            controls // <-- ¡Añadimos controles!
          />
        ) : (
          <img 
            src={`${BACKEND_URL}${ejercicioActual.url_media}`} 
            alt={ejercicioActual.nombre} 
            className={styles.exerciseImage} 
          />
        )}
      </div>
    )}
    {/* ------------------------- */}

    <div className={styles.buttonGroup}>
      <button className={styles.finishButton} onClick={onNext}>Comenzar Ejercicio</button>
      <button className={`${styles.finishButton} ${styles.backButton}`} onClick={onBack}>
        Volver
      </button>
    </div>
  </div>
);

// --- Etapa 3: Ejecución del ejercicio / Temporizador ---
const ExerciseExecutionStage = ({ onNext, onFinish, ejercicioActual, currentSeries, totalSeries, remainingTime }: CommonProps) => {
  const displayTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTimerExercise = ejercicioActual?.repeticiones_tiempo.toLowerCase().includes("segundos");

  return (
    <div className={styles.page}>
      <h2 className={styles.exerciseName}>{ejercicioActual?.nombre}</h2>
      
      <div className={styles.timerContainer}>
        {isTimerExercise && remainingTime !== undefined ? (
          // Si es por tiempo, muestra el contador
          <div className={styles.timerText}>{displayTime(remainingTime)}</div>
        ) : (
          // Si es por repeticiones, muestra la media
          ejercicioActual?.url_media ? (
             // --- ¡CORRECCIÓN AQUÍ! ---
            (ejercicioActual.url_media.endsWith('.mp4') || ejercicioActual.url_media.endsWith('.webm')) ? (
              <video 
                src={`${BACKEND_URL}${ejercicioActual.url_media}`} 
                className={styles.timerImage} // Usamos la clase de la imagen para el tamaño
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img 
                src={`${BACKEND_URL}${ejercicioActual.url_media}`} 
                alt={ejercicioActual.nombre} 
                className={styles.timerImage} 
              />
            )
            // -------------------------
          ) : (
             <div className={styles.seriesIndicator}>
                Serie {currentSeries} de {totalSeries}
             </div>
          )
        )}
      </div>

      {!isTimerExercise && (
        <div className={styles.seriesIndicator}>
          Serie {currentSeries} de {totalSeries}
        </div>
      )}

      {/* Muestra la descripción aquí también */}
      <p className={styles.exerciseDescription}>
        {ejercicioActual?.descripcion || ""}
      </p>
      
      {onFinish ? (
        <button className={styles.finishButton} onClick={onFinish}>Finalizar Rutina</button>
      ) : (
        !isTimerExercise && (
          <button className={styles.finishButton} onClick={onNext}>
            Siguiente Serie
          </button>
        )
      )}
    </div>
  );
};


// --- Componente Principal de Ejecución ---
export function PatientExerciseExecutionPage() { // <-- Nombre Correcto
  const location = useLocation();
  const navigate = useNavigate();
  const routine: Routine | undefined = location.state?.routine; 

  const [stage, setStage] = useState<'welcome' | 'detail' | 'execution' | 'rest' | 'finished_routine'>('welcome');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSeries, setCurrentSeries] = useState(1);
  const [remainingTime, setRemainingTime] = useState<number | null>(null); 
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);

  const REST_DURATION_SECONDS = 60; // 1 min descanso

  useEffect(() => {
    if (!routine) {
      navigate('/my-routine', { replace: true }); 
    }
  }, [routine, navigate]);

  const ejercicioActual = routine?.ejercicios[currentExerciseIndex];

  // --- Lógica de Temporizadores (Corregida) ---
  useEffect(() => {
    let timer: number = 0; // Inicializada en 0

    if (stage === 'execution' && ejercicioActual?.repeticiones_tiempo.toLowerCase().includes("segundos")) {
      const timeInSecondsMatch = ejercicioActual.repeticiones_tiempo.match(/\d+/);
      const exerciseDuration = timeInSecondsMatch ? parseInt(timeInSecondsMatch[0], 10) : 0;
      
      if (remainingTime === null) setRemainingTime(exerciseDuration); 

      if (remainingTime && remainingTime > 0) {
        timer = setTimeout(() => setRemainingTime(prev => (prev ? prev - 1 : 0)), 1000);
      } else if (remainingTime === 0) {
        handleNextSeriesOrExercise(); 
      }
    } else if (stage === 'rest' && isResting && restTimeLeft > 0) {
      timer = setTimeout(() => setRestTimeLeft(prev => prev - 1), 1000);
    } else if (stage === 'rest' && isResting && restTimeLeft === 0) {
      setIsResting(false);
      if (currentSeries <= (ejercicioActual?.series || 0)) {
        setStage('execution'); 
        setRemainingTime(null); 
      } else {
        handleNextExercise(); 
      }
    }

    return () => clearTimeout(timer);
  }, [stage, remainingTime, restTimeLeft, isResting, ejercicioActual, currentSeries]);

  // --- Funciones de Navegación ---
  const handleStartRoutine = () => setStage('detail');
  
  const handleStartExercise = () => {
    setCurrentSeries(1);
    setRemainingTime(null);
    setIsResting(false);
    setStage('execution');
  };

  const handleGoBack = () => {
    navigate('/my-routine'); 
  };

  const handleNextSeriesOrExercise = () => {
    if (!ejercicioActual) return;
    if (currentSeries < ejercicioActual.series) {
      setIsResting(true);
      setRestTimeLeft(REST_DURATION_SECONDS);
      setStage('rest');
      setCurrentSeries(prev => prev + 1);
    } else {
      handleNextExercise();
    }
  };

  const handleNextExercise = () => {
    if (!routine) return;
    if (currentExerciseIndex < routine.ejercicios.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setStage('detail'); 
    } else {
      setStage('finished_routine');
    }
  };

  const handleFinishRoutine = () => {
    navigate('/', { replace: true });
  };

  if (!routine) return <p>Cargando...</p>;
  
  // --- Renderizado Condicional de Etapas ---
  return (
    <>
      {stage === 'welcome' && <WelcomeStage onNext={handleStartRoutine} />}

      {stage === 'detail' && (
        <ExerciseDetailStage
          onNext={handleStartExercise}
          onBack={handleGoBack} 
          ejercicioActual={ejercicioActual}
        />
      )}

      {stage === 'execution' && ejercicioActual && (
        <ExerciseExecutionStage
          onNext={handleNextSeriesOrExercise}
          onFinish={
            (currentExerciseIndex === routine.ejercicios.length - 1 && 
             currentSeries === ejercicioActual.series)
            ? handleFinishRoutine 
            : undefined
          }
          ejercicioActual={ejercicioActual}
          currentSeries={currentSeries}
          totalSeries={ejercicioActual.series} // <-- Corregido
          remainingTime={remainingTime !== null ? remainingTime : undefined}
        />
      )}

      {stage === 'rest' && (
        <div className={`${styles.page} ${styles.restContainer}`}>
          <h2>Descanso...</h2>
          <div className={styles.timerContainer}>
            <div className={styles.timerText}>
              {Math.floor(restTimeLeft / 60).toString().padStart(2, '0')}:{(restTimeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <p>Prepárate para la serie {currentSeries} de {ejercicioActual?.nombre}</p>
        </div>
      )}

      {stage === 'finished_routine' && (
        <div className={`${styles.page} ${styles.finishedRoutineContainer}`}>
          <h1>¡Rutina Completada!</h1>
          <p>Has terminado todos los ejercicios asignados para hoy. ¡Bien hecho!</p>
          <button className={styles.finishButton} onClick={handleFinishRoutine}>Volver al Inicio</button>
        </div>
      )}
    </>
  );
}