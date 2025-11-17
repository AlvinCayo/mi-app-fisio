// frontend/src/AdminRoutineAssignPage.tsx (CORREGIDO)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Calendar from 'react-calendar'; 
import './Calendar.css'; // <-- Importa el CSS del calendario
import styles from './styles/AdminRoutineAssignPage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

// --- Definición de Tipos ---
interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface Patient {
  id: number;
  nombre_completo: string;
}
interface Routine {
  id: number;
  nombre: string;
}
interface Assignment {
  id: number;
  fecha_asignada: string; 
  nombre: string;
}

type CalendarValue = Date | null;
type CalendarValuePiece = Date | null | [CalendarValue, CalendarValue];

export function AdminRoutineAssignPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<CalendarValue>(new Date());
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  // (fetchInitialData y fetchAssignments se quedan igual)
  const fetchInitialData = useCallback(async () => {
    if (!token) return;
    try {
      const patientsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/assignable-patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const routinesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/routines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(patientsRes.data);
      setRoutines(routinesRes.data);
      if (patientsRes.data.length > 0) {
        setSelectedPatientId(String(patientsRes.data[0].id));
      }
      if (routinesRes.data.length > 0) {
        setSelectedRoutineId(String(routinesRes.data[0].id));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar los datos.');
    }
  }, [token]);

  const fetchAssignments = useCallback(async () => {
    if (!token || !selectedPatientId) {
      setAssignments([]);
      return;
    }
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/calendar/${selectedPatientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar el calendario.');
    }
  }, [token, selectedPatientId]);

  // (useEffect se queda igual)
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
    fetchInitialData();
  }, [token, navigate, fetchInitialData]);

  useEffect(() => {
    fetchAssignments();
  }, [selectedPatientId, fetchAssignments]);

  // (handleAssign y handleDeleteAssignment se quedan igual)
  const handleAssign = async () => {
    if (!token || !selectedPatientId || !selectedRoutineId || !selectedDate) {
      setError("Faltan datos (paciente, rutina o fecha).");
      return;
    }
    const isoDate = selectedDate.toISOString().split('T')[0];
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/calendar/assign`, 
        { paciente_id: Number(selectedPatientId), rutina_id: Number(selectedRoutineId), fecha_asignada: isoDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Rutina asignada con éxito.');
      fetchAssignments(); 
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar la rutina.');
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!token || !window.confirm("¿Quitar esta rutina del calendario?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/calendar/unassign/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Asignación eliminada.');
      fetchAssignments();
    } catch (err: any) { 
      setError(err.response?.data?.error || 'Error al eliminar.');
    }
  };
  
  // (getFormattedDate y tileContent se quedan igual)
  const getFormattedDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(date);
  };
  
  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      const hasAssignment = assignments.some(a => a.fecha_asignada.startsWith(dateString));
      if (hasAssignment) {
        return <div className="has-assignment-dot" />;
      }
    }
    return null;
  };
  
  const handleCalendarChange = (value: CalendarValuePiece) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      setMessage(''); 
      setError(''); 
    }
  };
  
  // --- ¡NUEVA FUNCIÓN PARA LAS INICIALES! ---
  // Esta función formatea las cabeceras L, M, M, J, V, S, D
  const formatWeekday = (locale: string | undefined, date: Date): string => {
    // 'locale' no se usa, pero es parte de la firma
    const weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return weekdays[date.getDay()]; // 0 es Domingo, 1 es Lunes...
  };
  // ----------------------------------------

  const assignmentsForSelectedDay = assignments.filter(
    a => selectedDate && a.fecha_asignada.startsWith(selectedDate.toISOString().split('T')[0])
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/exercises')}
        />
        <h1 className={styles.headerTitle}>Asignar Rutinas</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.patientSelector}>
        <label htmlFor="patient-select">Selecciona un Paciente:</label>
        <select 
          id="patient-select"
          className={styles.select}
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
        >
          <option value="">-- Elige un paciente --</option>
          {patients.map(patient => (
            <option key={patient.id} value={patient.id}>
              {patient.nombre_completo}
            </option>
          ))}
        </select>
      </div>

      {selectedPatientId && (
        <div className={styles.calendarContainer}>
          <Calendar
            onChange={handleCalendarChange}
            value={selectedDate}
            tileContent={tileContent}
            // --- ¡PROPIEDADES AÑADIDAS! ---
            formatShortWeekday={formatWeekday} // Usa la nueva función
            locale="es-ES" // Asegura que la semana empiece en Lunes
          />
        </div>
      )}

      {selectedPatientId && selectedDate && (
        <div className={styles.assignmentBox}>
          <h3 className={styles.assignmentTitle}>
            Asignar para: {getFormattedDate(selectedDate)}
          </h3>
          
          <div className={styles.assignControls}>
            <select 
              className={styles.select}
              value={selectedRoutineId}
              onChange={(e) => setSelectedRoutineId(e.target.value)}
            >
              <option value="">-- Selecciona Rutina --</option>
              {routines.map(routine => (
                <option key={routine.id} value={routine.id}>
                  {routine.nombre}
                </option>
              ))}
            </select>
            <button 
              className={styles.button}
              onClick={handleAssign}
            >
              Asignar
            </button>
          </div>

          <div className={styles.assignmentList}>
            <h4 style={{margin: '20px 0 5px 0'}}>Rutinas asignadas:</h4>
            {assignmentsForSelectedDay.length === 0 ? (
              <p style={{fontSize: '12px', color: '#777'}}>No hay rutinas asignadas a este día.</p>
            ) : (
              assignmentsForSelectedDay.map(ass => (
                <div key={ass.id} className={styles.assignmentItem}>
                  <span className={styles.assignmentName}>{ass.nombre}</span>
                  <button 
                    className={styles.deleteButton}
                    onClick={() => handleDeleteAssignment(ass.id)}
                  >
                    Quitar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}