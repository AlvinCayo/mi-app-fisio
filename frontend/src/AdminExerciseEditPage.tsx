// frontend/src/AdminExerciseEditPage.tsx (NUEVO)

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom'; // <-- Añadido useParams
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminExerciseEditPage.module.css'; // <-- Importa el CSS específico
import backArrow from './assets/back-arrow.svg'; 
import logo from './assets/logo.svg'; 

// Definición de Tipos
interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface Exercise {
  id: number;
  nombre: string;
  descripcion: string;
  url_media: string | null;
}

export function AdminExerciseEditPage() {
  const { id } = useParams<{ id: string }>(); // Obtiene el ID de la URL
  const exerciseId = Number(id); // Convierte el ID a número

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false); // Para indicar si se debe borrar el medio existente

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Cargar datos del ejercicio específico ---
  const fetchExercise = useCallback(async () => {
    if (!token || isNaN(exerciseId)) { // Validar si el ID es un número
      setError('ID de ejercicio no válido.');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:3000/api/admin/exercises/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const exercise: Exercise = response.data;
      setNombre(exercise.nombre);
      setDescripcion(exercise.descripcion || ''); // Manejar null si no hay descripción
      setCurrentMediaUrl(exercise.url_media);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar el ejercicio.');
    }
  }, [token, exerciseId]);

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
      sessionStorage.removeItem('authToken');
      navigate('/login');
    }
    
    fetchExercise(); // Carga los datos al iniciar
  }, [token, navigate, fetchExercise]);

  // --- Manejador para el input de archivo nuevo ---
  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewMediaFile(e.target.files[0]);
      setRemoveMedia(false); // Si se sube un nuevo archivo, no se remueve el anterior
    } else {
      setNewMediaFile(null);
    }
  };

  // --- Manejador para ACTUALIZAR un ejercicio ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !nombre) {
      setError("El nombre es obligatorio.");
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('descripcion', descripcion);
    if (newMediaFile) {
      formData.append('media', newMediaFile);
    }
    formData.append('removeMedia', String(removeMedia)); // Envía si se debe eliminar el medio existente

    try {
      await axios.put(`http://localhost:3000/api/admin/exercises/${exerciseId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('Ejercicio actualizado con éxito.');
      // Después de actualizar, recargar el ejercicio para ver los cambios
      fetchExercise(); 
      setNewMediaFile(null); // Limpiar el archivo subido
      setRemoveMedia(false); // Resetear la bandera
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar el ejercicio.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/exercises/manage')} // Vuelve a la lista de ejercicios
        />
        <h1 className={styles.headerTitle}>Editar Ejercicio</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <h2 className={styles.pageTitle}>Editando: {nombre || 'Cargando...'}</h2>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <input 
          type="text"
          className={styles.input}
          placeholder="Nombre del Ejercicio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <textarea 
          className={styles.textarea}
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        
        {/* --- Previsualización de medio existente --- */}
        {currentMediaUrl && !newMediaFile && !removeMedia && (
          <div className={styles.currentMediaContainer}>
            <span className={styles.currentMediaLabel}>Tutorial Actual:</span>
            {currentMediaUrl.endsWith('.mp4') || currentMediaUrl.endsWith('.webm') ? (
              <video controls src={`http://localhost:3000${currentMediaUrl}`} className={styles.currentMedia} />
            ) : (
              <img src={`http://localhost:3000${currentMediaUrl}`} alt="Media actual" className={styles.currentMedia} />
            )}
            <button 
              type="button" 
              className={styles.removeMediaButton}
              onClick={() => {
                setCurrentMediaUrl(null); // Quita la previsualización
                setRemoveMedia(true); // Marca para borrar en el backend
                setNewMediaFile(null); // Asegura que no hay nuevo archivo seleccionado
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Quitar Tutorial
            </button>
          </div>
        )}

        {/* --- Input para nuevo archivo --- */}
        <div className={styles.fileInputWrapper}>
          <label className={styles.fileInputLabelText}>Subir Nuevo Tutorial (Imagen o Video):</label>
          <label htmlFor="file-upload" className={styles.fileInputLabel}>
            Elegir archivo
          </label>
          <span className={styles.fileName}>
            {newMediaFile ? newMediaFile.name : (currentMediaUrl && !removeMedia ? "Manteniendo el archivo actual" : "No se eligió ningún archivo nuevo")}
          </span>
          <input 
            id="file-upload"
            ref={fileInputRef}
            type="file"
            className={styles.hiddenInput}
            accept="image/*,video/*"
            onChange={handleNewFileChange}
          />
        </div>

        <button 
          type="submit" 
          className={styles.button}
          disabled={isLoading || !nombre}
        >
          {isLoading ? "Actualizando..." : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}