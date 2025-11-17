// frontend/src/AdminActiveUsersPage.tsx (CORREGIDO)

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import styles from './styles/AdminUserListPage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface PatientUser {
  id: number;
  nombre_completo: string;
  email: string;
  ci: string;
  telefono: string;
  status: 'activo' | 'inactivo' | 'pendiente';
}

export function AdminActiveUsersPage() {
  const [users, setUsers] = useState<PatientUser[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  // Llama al endpoint que trae activos E inactivos
  const fetchAllPatients = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/active-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar usuarios.');
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
    
    fetchAllPatients();
  }, [token, navigate, fetchAllPatients]);

  const handleActivate = useCallback(async (userId: number) => {
    if (!token) {
      setError("Sesión expirada.");
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Usuario activado con éxito.');
      fetchAllPatients(); 
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al activar.');
    }
  }, [token, fetchAllPatients]);

  const handleDeactivate = useCallback(async (userId: number) => {
    if (!token) {
      setError("Sesión expirada.");
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}/deactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Usuario desactivado con éxito.');
      fetchAllPatients();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al desactivar.');
    }
  }, [token, fetchAllPatients]);

  const capitalize = (s: string) => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/users')}
        />
        <h1 className={styles.headerTitle}>Gestionar Pacientes</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}
      
      <h2 className={styles.pageTitle}>Todos los Pacientes</h2>
      {users.length === 0 ? (
        <p>No hay pacientes activos o inactivos.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>CI</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.nombre_completo}</td>
                  <td>{user.email}</td>
                  <td>{user.ci || 'N/A'}</td>
                  
                  <td style={{ color: user.status === 'activo' ? 'green' : 'red' }}>
                    {capitalize(user.status)}
                  </td>

                  <td>
                    {/* --- ¡LÓGICA REVERTIDA! --- 
                       Ahora muestra el botón correcto según el estado
                    */}
                    {user.status === 'activo' ? (
                      <button 
                        onClick={() => handleDeactivate(user.id)} 
                        className={`${styles.button} ${styles.deactivateButton}`}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleActivate(user.id)} 
                        className={`${styles.button} ${styles.activateButton}`}
                      >
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}