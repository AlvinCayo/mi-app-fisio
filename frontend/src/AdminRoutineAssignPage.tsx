// frontend/src/AdminRoutineAssignPage.tsx (CORREGIDO)

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminRoutineAssignPage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface Patient {
  id: number;
  nombre_completo: string;
  email: string;
  rutina_asignada_id: number | null;
}
interface Routine {
  id: number;
  nombre: string;
}

export function AdminRoutineAssignPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutines, setSelectedRoutines] = useState<{ [patientId: number]: string }>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      // --- ¡CORRECCIÓN! ---
      // Llama al nuevo endpoint que solo trae pacientes ACTIVOS
      const patientsRes = await axios.get('http://localhost:3000/api/admin/assignable-patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // ---------------------
      
      const routinesRes = await axios.get('http://localhost:3000/api/admin/routines', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPatients(patientsRes.data);
      setRoutines(routinesRes.data);
      
      const initialSelections: { [patientId: number]: string } = {};
      patientsRes.data.forEach((patient: Patient) => {
        initialSelections[patient.id] = String(patient.rutina_asignada_id || 'none');
      });
      setSelectedRoutines(initialSelections);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar los datos.');
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
    
    fetchData();
  }, [token, navigate, fetchData]);

  // (El resto del archivo, handleSelectChange, handleAssign, y el JSX, se quedan igual)
  const handleSelectChange = (patientId: number, routineId: string) => {
    setSelectedRoutines(prev => ({
      ...prev,
      [patientId]: routineId
    }));
  };

  const handleAssign = async (patientId: number) => {
    if (!token) {
      setError("Sesión expirada.");
      return;
    }
    
    const selectedRoutineId = selectedRoutines[patientId];
    
    try {
      if (selectedRoutineId === 'none') {
        await axios.delete(`http://localhost:3000/api/admin/assign-routine/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage(`Rutina desasignada para el paciente ${patientId}.`);
      } else {
        await axios.post(`http://localhost:3000/api/admin/assign-routine/${patientId}`, 
          { rutina_id: Number(selectedRoutineId) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage(`Rutina ${selectedRoutineId} asignada al paciente ${patientId}.`);
      }
      setError('');
      fetchData(); 
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar la rutina.');
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
        <h1 className={styles.headerTitle}>Asignar Rutinas</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <h2 className={styles.pageTitle}>Pacientes Activos</h2>
      <div className={styles.patientList}>
        {patients.length === 0 ? (
          <p>No hay pacientes activos para asignar rutinas.</p>
        ) : (
          patients.map(patient => (
            <div key={patient.id} className={styles.patientItem}>
              <div>
                <div className={styles.patientName}>{patient.nombre_completo}</div>
                <div className={styles.patientEmail}>{patient.email}</div>
              </div>
              
              <div className={styles.assignControls}>
                <select 
                  className={styles.select}
                  value={selectedRoutines[patient.id] || 'none'}
                  onChange={(e) => handleSelectChange(patient.id, e.target.value)}
                >
                  <option value="none">-- Ninguna --</option>
                  {routines.map(routine => (
                    <option key={routine.id} value={routine.id}>
                      {routine.nombre}
                    </option>
                  ))}
                </select>
                
                <button 
                  className={styles.button}
                  onClick={() => handleAssign(patient.id)}
                >
                  Guardar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}