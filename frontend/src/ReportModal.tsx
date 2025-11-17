// frontend/src/ReportModal.tsx (ACTUALIZADO)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styles from './styles/ReportModal.module.css';

// --- Tipos ---
interface ReportModalProps {
  onClose: () => void; // Función para cerrar el modal
}
interface ReportData {
  id: number;
  sintomas: string[];
  comentario: string;
}

const SINTOMAS_OPCIONES = [
  "Cansado",
  "Dolor crónico",
  "Dolores agudos",
  "Dificultades de movimiento",
  "Intensificación de la lesión"
];

export function ReportModal({ onClose }: ReportModalProps) {
  // --- Estados del Formulario ---
  const [selectedSintomas, setSelectedSintomas] = useState<string[]>([]);
  const [comentario, setComentario] = useState('');
  
  // --- Estados de Lógica ---
  const [existingReportId, setExistingReportId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Empieza en true para cargar datos
  const token = sessionStorage.getItem('authToken');

  // --- ¡NUEVO! Cargar el informe de hoy al abrir el modal ---
  const fetchTodayReport = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await axios.get<ReportData>('${import.meta.env.VITE_API_URL}/api/patient/reports/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Si se encuentra un informe, puebla el formulario
      const { id, sintomas, comentario } = response.data;
      setExistingReportId(id);
      setSelectedSintomas(sintomas);
      setComentario(comentario || '');
    } catch (err: any) {
      // (Si da 404, está bien, significa que no hay informe)
      if (err.response && err.response.status !== 404) {
        setError("Error al cargar tu informe de hoy.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTodayReport();
  }, [fetchTodayReport]);

  // Manejador para los checkboxes
  const handleCheckboxChange = (sintoma: string) => {
    setSelectedSintomas(prev => 
      prev.includes(sintoma)
        ? prev.filter(s => s !== sintoma)
        : [...prev, sintoma]
    );
  };

  // --- ¡MODIFICADO! Ahora maneja CREAR (POST) y ACTUALIZAR (PUT) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSintomas.length === 0) {
      setError("Por favor, selecciona al menos un síntoma.");
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');

    const reportPayload = {
      sintomas: selectedSintomas,
      comentario: comentario
    };

    try {
      if (existingReportId) {
        // --- Flujo de ACTUALIZACIÓN (PUT) ---
        await axios.put('${import.meta.env.VITE_API_URL}/api/patient/reports/today', 
          reportPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('¡Informe actualizado con éxito!');
      } else {
        // --- Flujo de CREACIÓN (POST) ---
        await axios.post('${import.meta.env.VITE_API_URL}/api/patient/reports', 
          reportPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('¡Informe enviado con éxito!');
      }
      
      setTimeout(() => onClose(), 2000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar el informe.');
      setIsLoading(false);
    }
  };

  // --- ¡NUEVO! Manejador para ELIMINAR ---
  const handleDelete = async () => {
    if (!existingReportId || !window.confirm("¿Estás seguro de que quieres eliminar el informe de hoy?")) {
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.delete('${import.meta.env.VITE_API_URL}/api/patient/reports/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Informe eliminado con éxito.');
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar el informe.');
      setIsLoading(false);
    }
  };

  // --- Renderizado ---

  if (isLoading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <p className={styles.message}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h2 className={styles.title}>¡Listo!</h2>
          <p className={styles.message}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        
        <h2 className={styles.title}>
          {existingReportId ? "Editar informe de hoy" : "¿Cómo te sientes hoy?"}
        </h2>
        
        <div className={styles.checkboxGroup}>
          {SINTOMAS_OPCIONES.map((sintoma) => (
            <label key={sintoma} className={styles.checkboxLabel}>
              <input 
                type="checkbox"
                className={styles.checkboxInput}
                value={sintoma}
                checked={selectedSintomas.includes(sintoma)} // <-- Controlado
                onChange={() => handleCheckboxChange(sintoma)}
              />
              {sintoma}
            </label>
          ))}
        </div>
        
        <textarea
          className={styles.textarea}
          placeholder="Agregar comentario..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        
        {error && <p className={styles.error}>{error}</p>}
        
        {/* --- ¡LÓGICA DE BOTONES ACTUALIZADA! --- */}
        <div className={styles.buttonGroup}>
          <button 
            type="submit" 
            className={styles.button} 
            disabled={isLoading}
          >
            {isLoading ? "Guardando..." : (existingReportId ? "Actualizar" : "Agregar")}
          </button>
          
          {/* Solo muestra "Eliminar" si ya existe un informe */}
          {existingReportId && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
              disabled={isLoading}
            >
              Eliminar informe
            </button>
          )}

          <button 
            type="button" 
            className={styles.closeButton} 
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
        
      </form>
    </div>
  );
}