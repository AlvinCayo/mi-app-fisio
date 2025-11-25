// frontend/src/PatientContactPage.tsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './styles/PatientContactPage.module.css';

// --- CAMBIO IMPORTANTE AQUÍ ---
// Importamos tu foto real
import adminPhoto from './assets/profile.jpg'; 
// ------------------------------

// Esta interfaz debe coincidir EXACTAMENTE con tu base de datos
interface ContactInfo {
  nombre_completo: string;
  email: string;
  telefono: string;
}

export function PatientContactPage() {
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/patient/contact-info`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContact(response.data);
      } catch (err: any) {
        console.error("Error cargando contacto:", err);
        setError('No se pudo cargar la información.');
      } finally {
        setLoading(false);
      }
    };
    fetchContact();
  }, [token]);

  if (loading) return <div className={styles.container}><p>Cargando...</p></div>;
  
  if (error || !contact) {
      return (
        <div className={styles.container}>
            <h1 className={styles.title}>Ponte en Contacto</h1>
            <p>No hay información de contacto disponible en este momento.</p>
        </div>
      );
  }

  // Limpiamos el número para el link de WhatsApp
  const whatsappNumber = contact.telefono ? contact.telefono.replace(/\D/g, '') : '';
  const whatsappLink = `https://wa.me/591${whatsappNumber}`; 

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ponte en Contacto</h1>
      
      <div className={styles.card}>
        <div className={styles.imageWrapper}>
          {/* Aquí se usa la variable que importamos arriba */}
          <img src={adminPhoto} alt="Fisioterapeuta" className={styles.avatar} />
        </div>
        
        <h2 className={styles.name}>{contact.nombre_completo}</h2>
        <p className={styles.role}>Fisioterapeuta Profesional</p>

        <div className={styles.infoList}>
          
          <div className={styles.infoItem}>
            <span className={styles.label}>Teléfono:</span>
            <a href={`tel:${contact.telefono}`} className={styles.value}>{contact.telefono}</a>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.label}>Email:</span>
            <a href={`mailto:${contact.email}`} className={styles.value}>{contact.email}</a>
          </div>

        </div>

        {contact.telefono && (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={styles.whatsappButton}>
            <span style={{marginRight: '8px'}}>📱</span> Contactar por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}