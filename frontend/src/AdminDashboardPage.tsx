// frontend/src/AdminDashboardPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/AdminDashboard.module.css';

// Define el tipo para el token decodificado
interface DecodedToken {
  role: 'admin' | 'paciente';
  // ... (añade otros campos)
}

// Define el tipo para un usuario pendiente
interface PendingUser {
  id: number;
  nombre_completo: string;
  email: string;
  ci: string;
}

export function AdminDashboardPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    // --- 1. Protección de la Ruta ---
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      if (decodedToken.role !== 'admin') {
        setError('Acceso denegado. No eres administrador.');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (e) {
      localStorage.removeItem('authToken');
      navigate('/login');
    }

    // --- 2. Cargar los usuarios pendientes ---
    const fetchPendingUsers = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/admin/pending-users', {
          headers: {
            Authorization: `Bearer ${token}` // Envía el token de admin
          }
        });
        setUsers(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar usuarios.');
      }
    };
    
    if (token) fetchPendingUsers();
  }, [token, navigate]);

  // --- 3. Funciones para aprobar o desactivar ---
  const handleApprove = async (userId: number) => {
    try {
      await axios.post(`http://localhost:3000/api/admin/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Usuario aprobado con éxito.');
      setUsers(users.filter(user => user.id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al aprobar.');
    }
  };

  const handleDeactivate = async (userId: number) => {
     try {
      await axios.post(`http://localhost:3000/api/admin/users/${userId}/deactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Usuario desactivado con éxito.');
      setUsers(users.filter(user => user.id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al desactivar.');
    }
  };


  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Administrador (Fisioterapeuta)</h1>
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <h2 style={{marginTop: '40px'}}>Usuarios Pendientes de Aprobación</h2>
      {users.length === 0 ? (
        <p>No hay usuarios pendientes.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>CI</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.nombre_completo}</td>
                <td>{user.email}</td>
                <td>{user.ci}</td>
                <td>
                  <button onClick={() => handleApprove(user.id)} className={`${styles.button} ${styles.approveButton}`}>Aprobar</button>
                  <button onClick={() => handleDeactivate(user.id)} className={`${styles.button} ${styles.deactivateButton}`}>Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}