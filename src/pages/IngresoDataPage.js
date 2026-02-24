

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function IngresoDataPage() {
  const [showFacturaOptions, setShowFacturaOptions] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar navigation */}
      <aside style={{
        width: '200px',
        background: '#f5f5f5',
        padding: '1rem',
        boxSizing: 'border-box'
      }}>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '1rem' }}>
              <Link to="/"><button style={{ width: '100%' }}>Regresar</button></Link>
            </li>
            <li style={{ marginBottom: '1rem' }}>
              <button 
                onClick={() => setShowFacturaOptions(false)} 
                style={{ width: '100%' }}
              >
                Ingreso de Data
              </button>
            </li>
            <li style={{ marginBottom: '1rem' }}>
              <Link to="/ingreso-data/inventario">
                <button style={{ width: '100%' }}>Inventario</button>
              </Link>
            </li>
            {showFacturaOptions && (
              <>
                <li style={{ marginBottom: '1rem' }}>
                  <Link to="/ingreso-data/factura-inicial">
                    <button style={{ width: '100%' }}>Factura Inicial</button>
                  </Link>
                </li>
                <li style={{ marginBottom: '1rem' }}>
                  <Link to="/ingreso-data/factura-final">
                    <button style={{ width: '100%' }}>Factura Final</button>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', boxSizing: 'border-box' }}>
        {!showFacturaOptions ? (
          <div style={{ textAlign: 'center' }}>
            <h2>¿Qué deseas ingresar?</h2>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                onClick={() => setShowFacturaOptions(true)}
                style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
              >
                Facturas
              </button>
              <Link to="/ingreso-data/inventario">
                <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  Inventario
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2>Seleccione tipo de Factura</h2>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <Link to="/ingreso-data/factura-inicial">
                <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  Factura Inicial
                </button>
              </Link>
              <Link to="/ingreso-data/factura-final">
                <button style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  Factura Final
                </button>
              </Link>
              <button
                onClick={() => setShowFacturaOptions(false)}
                style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}