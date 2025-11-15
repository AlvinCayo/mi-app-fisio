// frontend/src/AdminDashboardPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Define el tipo para el token decodificado
interface DecodedToken {
  userId: number;
  ci: string;
  role: 'admin' | 'paciente';
  iat: number;
  exp: number;
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
    
    fetchPendingUsers();
  }, [token, navigate]);

  // --- 3. Funciones para aprobar o desactivar ---
  const handleApprove = async (userId: number) => {
    try {
      await axios.post(`http://localhost:3000/api/admin/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Usuario aprobado con éxito.');
      // Quita al usuario de la lista
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
    <div style={{ fontFamily: 'Arial', padding: '20px' }}>
      <h1>Panel de Administrador (Fisioterapeuta)</h1>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {message && <p style={{color: 'green'}}>{message}</p>}

      <h2>Usuarios Pendientes de Aprobación</h2>
      {users.length === 0 ? (
        <p>No hay usuarios pendientes.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <th style={{padding: '8px', border: '1px solid #ddd'}}>Nombre</th>
              <th style={{padding: '8px', border: '1px solid #ddd'}}>Email</th>
              <th style={{padding: '8px', border: '1px solid #ddd'}}>CI</th>
              <th style={{padding: '8px', border: '1px solid #ddd'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{padding: '8px', border: '1px solid #ddd'}}>{user.nombre_completo}</td>
                <td style={{padding: '8px', border: '1px solid #ddd'}}>{user.email}</td>
                <td style={{padding: '8px', border: '1px solid #ddd'}}>{user.ci}</td>
                <td style={{padding: '8px', border: '1px solid #ddd'}}>
                  <button onClick={() => handleApprove(user.id)} style={{background: 'green', color: 'white', border: 'none', padding: '5px', cursor: 'pointer'}}>Aprobar</button>
                  <button onClick={() => handleDeactivate(user.id)} style={{background: 'red', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', marginLeft: '5px'}}>Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}