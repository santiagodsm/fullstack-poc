import React from 'react';
import { Link } from 'react-router-dom';

export default function FacturaFinalPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/ingreso-data"><button>← Volver</button></Link>
      <h2>Factura Final</h2>
      <p>Próximamente.</p>
    </div>
  );
}
