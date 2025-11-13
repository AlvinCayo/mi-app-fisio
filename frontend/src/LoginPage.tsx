import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const styles: { [key: string]: React.CSSProperties } = {
  container: { width: '300px', margin: '50px auto', fontFamily: 'Arial', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '10px', margin: '8px 0', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
  button: { width: '100%', padding: '12px', background: '#6f42c1', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '16px' },
  link: { display: 'block', textAlign: 'center', marginTop: '15px', color: '#6f42c1' },
  error: { color: 'red', fontSize: '0.9em' }
};

export function LoginPage() {
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        ci: ci,
        password: password
      });

      localStorage.setItem('authToken', response.data.token);
      navigate('/'); 

    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{textAlign: 'center'}}>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <input style={styles.input} name="ci" placeholder="CI" onChange={(e) => setCi(e.target.value)} />
        <input style={styles.input} name="password" type="password" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} />
        
        {error && <p style={styles.error}>{error}</p>}
        
        <button style={styles.button} type="submit">Entrar</button>
      </form>
      <Link to="/register" style={styles.link}>¿No tienes cuenta? Regístrate</Link>
    </div>
  );
}