import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useFacturaInicial from '../../hooks/useFacturaInicial';
import FacturaInicialHeaderForm from '../../components/FacturaInicialHeaderForm';
import FacturaInicialDetailForm from '../../components/FacturaInicialDetailForm';

export default function FacturaInicialPage() {
  const {
    header,
    details,
    setHeader,
    setDetails,
    clientOptions,
    productOptions,
    onFileChange,
    isAnalyzing,
    analyzeError,
    analyzeInvoice,
    isSaving,
    saveError,
    saveFactura,
    canSave,
    file
  } = useFacturaInicial();

  const fileInputRef = useRef();

  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [file]);

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
              <Link to="/ingreso-data">
                <button className="primary" style={{ width: '100%' }}>
                  Volver
                </button>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', boxSizing: 'border-box', overflowY: 'auto' }}>
        <h2 className="mb-md">Ingreso Factura Inicial</h2>

        <div className="mb-md">
          <label>Documento Factura</label><br/>
          <input
            type="file"
            accept=".pdf,.xml"
            ref={fileInputRef}
            onChange={e => onFileChange(e.target.files[0])}
          /><br/>
          <button
            type="button"
            className="accent"
            onClick={analyzeInvoice}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analizando...' : 'Analizar'}
          </button>
          {analyzeError && (
            <p style={{ color: 'red' }}>{analyzeError.message}</p>
          )}
        </div>

        {/* Header form with file upload */}
        <FacturaInicialHeaderForm
          header={header}
          clients={clientOptions}
          onHeaderChange={setHeader}
        />

        {/* Detail form/table always renders */}
        <FacturaInicialDetailForm
          header={header}
          details={details}
          products={productOptions}
          onDetailsChange={setDetails}
        />

        {/* Save section always displays */}
        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
          {saveError && <p style={{ color: 'red' }}>{saveError.message}</p>}
          <button
            className="primary"
            onClick={saveFactura}
            disabled={!canSave}
          >
            {isSaving ? 'Guardando...' : 'Guardar Factura Inicial'}
          </button>
        </div>
      </main>
    </div>
  );
}
