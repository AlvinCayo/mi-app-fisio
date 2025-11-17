// frontend/src/AdminReportListPage.tsx (ACTUALIZADO)

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
// --- ¡CAMBIO! Importa su propio CSS ---
import styles from './styles/AdminReportListPage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface ReportSummary {
  id: number;
  nombre_completo: string;
  email: string;
  ci: string;
  total_reportes: string;
  ultimo_reporte: string;
}

export function AdminReportListPage() {
  const [reportList, setReportList] = useState<ReportSummary[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

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
    
    const fetchReportSummary = async () => {
      try {
        const response = await axios.get('${import.meta.env.VITE_API_URL}/api/admin/reports/summary', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReportList(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar los informes.');
      }
    };
    
    fetchReportSummary();
  }, [token, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img 
          src={backArrow} 
          alt="Volver" 
          className={styles.backArrow}
          onClick={() => navigate('/admin/dashboard')}
        />
        <h1 className={styles.headerTitle}>Informes de Pacientes</h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      
      <h2 className={styles.pageTitle}>Pacientes con Informes</h2>
      {reportList.length === 0 ? (
        <p>Ningún paciente ha enviado informes todavía.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Email</th>
                <th>CI</th>
                <th>Total de Informes</th>
                <th>Último Informe</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportList.map(report => (
                <tr key={report.id}>
                  <td>{report.nombre_completo}</td>
                  <td>{report.email}</td>
                  <td>{report.ci || 'N/A'}</td>
                  <td>{report.total_reportes}</td>
                  <td>{formatDate(report.ultimo_reporte)}</td>
                  <td>
                    <Link 
                      to={`/admin/reports/patient/${report.id}`}
                      className={`${styles.button} ${styles.viewButton}`}
                    >
                      Ver Informes
                    </Link>
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