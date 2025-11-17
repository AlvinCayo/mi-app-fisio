// frontend/src/AdminPatientReportViewPage.tsx (ACTUALIZADO)

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
// --- ¡CAMBIO! Importa el nuevo CSS ---
import styles from './styles/AdminPatientReportViewPage.module.css'; 
import backArrow from './assets/back-arrow.svg'; 

interface DecodedToken {
  role: 'admin' | 'paciente';
}
interface Patient {
  id: number;
  nombre_completo: string;
  email: string;
}
interface Report {
  id: number;
  fecha_reporte: string;
  sintomas: string[];
  comentario: string;
}

export function AdminPatientReportViewPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');
  const { id } = useParams<{ id: string }>(); // ID del paciente

  useEffect(() => {
    // (Protección de ruta se queda igual)
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
    
    // Cargar los reportes de este paciente
    const fetchPatientReports = async () => {
      try {
        const response = await axios.get(`import.meta.env.VITE_API_URL/api/admin/reports/patient/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatient(response.data.paciente);
        setReports(response.data.reportes);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar los informes.');
      }
    };
    
    fetchPatientReports();
  }, [token, navigate, id]);

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
          onClick={() => navigate('/admin/reports')}
        />
        <h1 className={styles.headerTitle}>
          Informes de: {patient ? patient.nombre_completo : 'Cargando...'}
        </h1>
      </header>
      
      {error && <p className={styles.error}>{error}</p>}
      
      {/* --- ¡DISEÑO DE LISTA ACTUALIZADO! --- */}
      {reports.length === 0 ? (
        <p>Este paciente no tiene informes.</p>
      ) : (
        <div className={styles.reportList}>
          {reports.map(report => (
            <div key={report.id} className={styles.reportCard}>
              <h3 className={styles.reportDate}>{formatDate(report.fecha_reporte)}</h3>
              
              <div>
                <h4 className={styles.reportSectionTitle}>Síntomas reportados:</h4>
                <ul className={styles.symptomList}>
                  {report.sintomas.map((s, idx) => (
                    <li key={idx} className={styles.symptomItem}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className={styles.reportSectionTitle}>Comentario:</h4>
                <div className={styles.commentBox}>
                  {report.comentario ? (
                    <p className={styles.commentText}>{report.comentario}</p>
                  ) : (
                    <p className={styles.noCommentText}>(Sin comentario)</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* --- FIN DE LA ACTUALIZACIÓN --- */}
    </div>
  );
}