// frontend/src/AdminPendingUsersPage.tsx

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import styles from './styles/AdminUserListPage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface PendingUser {
  id: number;
  nombre_completo: string;
  email: string;
  ci: string;
  telefono: string;
}

export function AdminPendingUsersPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const fetchPendingUsers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/pending-users`, {
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
      if (decodedToken.role !== 'admin') {
        navigate('/');
        return; 
      }
    } catch (e) {
      navigate('/login');
      return;
    }
    
    fetchPendingUsers();
  }, [token, navigate, fetchPendingUsers]);

  const handleApprove = useCallback(async (userId: number) => {
    if (!token) {
      setError("Sesión expirada.");
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Usuario aprobado con éxito.');
      fetchPendingUsers(); // Recarga la lista
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al aprobar.');
    }
  }, [token, fetchPendingUsers]);

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
      fetchPendingUsers(); // Recarga la lista
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al desactivar.');
    }
  }, [token, fetchPendingUsers]);


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/users')}
        />
        <h1 className={styles.headerTitle}>Usuarios Pendientes</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <h2 className={styles.pageTitle}>Nuevos Registros</h2>
      {users.length === 0 ? (
        <p>No hay usuarios pendientes.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>CI</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.nombre_completo}</td>
                  <td>{user.email}</td>
                  <td>{user.ci || 'N/A'}</td>
                  <td>{user.telefono || 'N/A'}</td>
                  <td>
                    <button onClick={() => handleApprove(user.id)} className={`${styles.button} ${styles.approveButton}`}>Aprobar</button>
                    <button onClick={() => handleDeactivate(user.id)} className={`${styles.button} ${styles.deactivateButton}`}>Rechazar</button>
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