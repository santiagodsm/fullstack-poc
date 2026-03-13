import { Link } from 'react-router-dom';
import React from 'react';

export default function HomePage() {
  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>Bienvenido a Mi Aplicación React</h1>
      <p>Selecciona una opción para comenzar:</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(150px, 200px))',
        gap: '1rem',
        justifyContent: 'center',
        marginTop: '2rem'
      }}>
        <Link to="/master-data" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>1. Master Data</button>
        </Link>
        <Link to="/ingreso-data" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>2. Ingreso de Data</button>
        </Link>
        <Link to="/procesar-data" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>3. Procesar Data</button>
        </Link>
        <Link to="/analisis-venta-final" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>4. Análisis y Venta Final</button>
        </Link>
        <Link to="/lake" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>5. Data Lake</button>
        </Link>
      </div>
    </div>
  );
}
