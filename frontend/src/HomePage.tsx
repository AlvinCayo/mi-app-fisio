import React from 'react';

export function HomePage() {
  const token = localStorage.getItem('authToken');

  return (
    <div style={{ fontFamily: 'Arial', padding: '20px', maxWidth: '800px', margin: '20px auto' }}>
      <h1>¡Bienvenido!</h1>
      <p>Has iniciado sesión con éxito.</p>
      {token ? (
        <div style={{ wordBreak: 'break-all', background: '#f4f4f4', padding: '10px', borderRadius: '4px' }}>
          <p><strong>Tu token es:</strong></p>
          <p>{token}</p>
        </div>
      ) : (
        <p style={{color: 'red'}}>No se encontró el token. Por favor, inicia sesión de nuevo.</p>
      )}
    </div>
  );
}