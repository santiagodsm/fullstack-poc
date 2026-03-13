import React from 'react';
import { Link } from 'react-router-dom';

export default function InventarioPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/ingreso-data"><button>← Volver</button></Link>
      <h2>Inventario</h2>
      <p>Próximamente.</p>
    </div>
  );
}
