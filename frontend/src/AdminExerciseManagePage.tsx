// frontend/src/AdminExerciseManagePage.tsx (ACTUALIZADO ESTILO RUTINAS)

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminExerciseManagePage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 
import logo from './assets/logo.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface Exercise {
  id: number;
  nombre: string;
  descripcion: string;
  url_media: string | null;
}

export function AdminExerciseManagePage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchExercises = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/exercises`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExercises(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar ejercicios.');
    }
  }, [token]);

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
    
    fetchExercises();
  }, [token, navigate, fetchExercises]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    } else {
      setMediaFile(null);
    }
  };

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
    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/exercises`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('Ejercicio creado con éxito.');
      setNombre('');
      setDescripcion('');
      setMediaFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
      fetchExercises(); 
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el ejercicio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (exerciseId: number) => {
    if (!token || !window.confirm("¿Estás seguro de que quieres borrar este ejercicio?")) {
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/exercises/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Ejercicio eliminado con éxito.');
      fetchExercises();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar el ejercicio.');
    }
  };

  const handleEdit = (exerciseId: number) => {
    navigate(`/admin/exercises/edit/${exerciseId}`);
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
        <h1 className={styles.headerTitle}>Gestionar Ejercicios</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <h2 className={styles.pageTitle}>Crear Nuevo Ejercicio</h2>
      
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
        <div className={styles.fileInputWrapper}>
          <span className={styles.fileInputLabelText}>Multimedia:</span>
          <label htmlFor="file-upload" className={styles.fileInputLabel}>
            Elegir archivo
          </label>
          <span className={styles.fileName}>
            {mediaFile ? mediaFile.name : "Sin archivo seleccionado"}
          </span>
          <input 
            id="file-upload"
            ref={fileInputRef}
            type="file"
            className={styles.hiddenInput}
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
        </div>
        <button 
          type="submit" 
          className={styles.button}
          disabled={isLoading || !nombre}
        >
          {isLoading ? "Guardando..." : "Crear Ejercicio"}
        </button>
      </form>

      <h2 className={styles.pageTitle}>Lista de Ejercicios</h2>
      <div className={styles.exerciseList}>
        {exercises.length === 0 ? (
          <p style={{textAlign: 'center', color: '#777'}}>No hay ejercicios creados.</p>
        ) : (
          exercises.map(ex => (
            // Usamos .exerciseCard para que sea igual a .routineCard
            <div key={ex.id} className={styles.exerciseCard}>
              
              {/* Lado Izquierdo: Imagen + Textos */}
              <div className={styles.exerciseInfo}>
                <img 
                  src={ex.url_media ? `${import.meta.env.VITE_API_URL}${ex.url_media}` : logo} 
                  alt={ex.nombre}
                  className={styles.mediaPreview}
                />
                <div className={styles.textContainer}>
                  <h3 className={styles.exerciseName} title={ex.nombre}>{ex.nombre}</h3>
                  <p className={styles.exerciseDesc} title={ex.descripcion}>
                    {ex.descripcion || "Sin descripción"}
                  </p>
                </div>
              </div>
              
              {/* Lado Derecho: Botones Fijos */}
              <div className={styles.buttonActions}>
                <button 
                  onClick={() => handleEdit(ex.id)}
                  className={styles.editButton}
                >
                  Editar
                </button>
                 <button 
                  onClick={() => handleDelete(ex.id)}
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