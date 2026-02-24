

import React from 'react';
import { Link } from 'react-router-dom';

export default function MasterDataPage() {
  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '0.5rem 1rem' }}>← Home</button>
        </Link>
      </div>
      <h1>Master Data</h1>
      <p>Seleccione una categoría:</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(150px, 200px))',
        gap: '1rem',
        justifyContent: 'center',
        marginTop: '2rem'
      }}>
        <Link to="/master-data/agricultores" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>1. Agricultores</button>
        </Link>
        <Link to="/master-data/clientes" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>2. Clientes</button>
        </Link>
        <Link to="/master-data/producto-esparrago" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>3. Producto Esparrago</button>
        </Link>
        <Link to="/master-data/comisiones" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>4. Comisiones</button>
        </Link>
        <Link to="/master-data/cajas" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>5. Cajas</button>
        </Link>
      </div>
    </div>
  );
}