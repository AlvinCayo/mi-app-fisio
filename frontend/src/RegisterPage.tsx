import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Tus estilos (puedes moverlos a un .css)
const styles: { [key: string]: React.CSSProperties } = {
  container: { width: '300px', margin: '50px auto', fontFamily: 'Arial', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '10px', margin: '8px 0', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
  button: { width: '100%', padding: '12px', background: '#6f42c1', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '16px' },
  link: { display: 'block', textAlign: 'center', marginTop: '15px', color: '#6f42c1' },
  error: { color: 'red', fontSize: '0.9em' }
};

export function RegisterPage() {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    ci: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      // Llama a tu backend
      await axios.post('http://localhost:3000/api/auth/register', {
        nombreCompleto: formData.nombreCompleto,
        ci: formData.ci,
        telefono: formData.telefono,
        email: formData.email,
        password: formData.password
      });
      
      // ¡Éxito! Redirige a la página de verificación
      navigate(`/verify?email=${formData.email}`); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar. Intenta de nuevo.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Aquí pones tu logo */}
      <h2 style={{textAlign: 'center'}}>Registrar</h2>
      <form onSubmit={handleSubmit}>
        <input style={styles.input} name="nombreCompleto" placeholder="Nombre Completo" onChange={handleChange} />
        <input style={styles.input} name="ci" placeholder="CI" onChange={handleChange} />
        <input style={styles.input} name="telefono" placeholder="Telefono" onChange={handleChange} />
        <input style={styles.input} name="email" type="email" placeholder="Email" onChange={handleChange} />
        <input style={styles.input} name="password" type="password" placeholder="Contraseña" onChange={handleChange} />
        <input style={styles.input} name="confirmPassword" type="password" placeholder="Confirme su Contraseña" onChange={handleChange} />
        
        {error && <p style={styles.error}>{error}</p>}
        
        <button style={styles.button} type="submit">Registrar</button>
      </form>
      <Link to="/login" style={styles.link}>Volver a iniciar sesión</Link>
    </div>
  );
}