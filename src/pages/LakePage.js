import React from 'react';
import { Link } from 'react-router-dom';

export default function LakePage() {
  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>Data Lake</h1>
      <p>Explora, consulta y analiza los datos del lago:</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(150px, 200px))', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link to="/lake/analytics" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1rem 1.5rem', fontSize: '1rem' }}>📊 Analytics</button>
        </Link>
        <Link to="/lake/query" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1rem 1.5rem', fontSize: '1rem' }}>🔍 Query Lab</button>
        </Link>
        <Link to="/lake/catalog" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1rem 1.5rem', fontSize: '1rem' }}>🗂 Catálogo</button>
        </Link>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/" style={{ color: '#2d6a2d' }}>← Volver al inicio</Link>
      </div>
    </div>
  );
}
