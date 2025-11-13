import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const styles: { [key: string]: React.CSSProperties } = {
  container: { width: '300px', margin: '50px auto', fontFamily: 'Arial', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '10px', margin: '8px 0', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
  button: { width: '100%', padding: '12px', background: '#6f42c1', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '16px' },
  error: { color: 'red', fontSize: '0.9em' }
};

export function VerifyPage() {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
        setError("Error: No se encontró el email del usuario.");
        return;
    }

    try {
      await axios.post('http://localhost:3000/api/auth/verify', {
        email: email,
        codigo_sms: codigo
      });
      
      navigate('/login'); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al verificar.');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{textAlign: 'center'}}>Verificar tu cuenta</h2>
      <p style={{textAlign: 'center', color: '#555'}}>Enviamos un código de 6 dígitos a <strong>{email}</strong>.</p>
      <form onSubmit={handleSubmit}>
        <input 
          style={styles.input} 
          name="codigo" 
          placeholder="Código de Email" 
          onChange={(e) => setCodigo(e.target.value)} 
        />
        
        {error && <p style={styles.error}>{error}</p>}
        
        <button style={styles.button} type="submit">Verificar</button>
      </form>
    </div>
  );
}