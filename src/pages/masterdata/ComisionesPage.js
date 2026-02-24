import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useMasterData } from '../../hooks/useMasterData';
import ComisionesList from '../../components/ComisionesList';

const SPREADSHEET_ID = '17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E';
const SHEET_NAME = 'Comisiones';

export default function ComisionesPage() {
  const [showData, setShowData] = useState(false);
  const { data, loading, error } = useMasterData(SHEET_NAME, showData);
  const [formData, setFormData] = useState({ concepto: '', porcentaje: '' });
  const [editingRow, setEditingRow] = useState(null);
  const [formError, setFormError] = useState('');

  // Safely get data rows
  const rows = Array.isArray(data) ? data.slice(1) : [];

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    // Clear previous errors
    let err = '';
    const { concepto, porcentaje } = formData;
    // Required fields
    if (!concepto.trim() || porcentaje.trim() === '') {
      err = 'Both Concepto and Porcentaje are required';
    }
    // Unique concepto
    const existing = rows.map(r => r[0]);
    if (!editingRow && existing.includes(concepto.trim())) {
      err = 'Concepto must be unique';
    }
    // Validate porcentaje as non-negative number (entered as whole percent)
    const pct = parseFloat(porcentaje);
    if (isNaN(pct) || pct < 0) {
      err = 'Porcentaje must be a non-negative number';
    }
    if (err) {
      setFormError(err);
      return;
    }

    // Prepare value: store as fraction (e.g. 5% => 0.05)
    const valueFraction = pct / 100;
    const values = [[concepto.trim(), valueFraction]];

    try {
      // Hide existing view
      if (showData) setShowData(false);
      if (editingRow) {
        const range = `${SHEET_NAME}!A${editingRow}:B${editingRow}`;
        await axios.post('/update-sheet', {
          spreadsheetId: SPREADSHEET_ID,
          range,
          values
        });
      } else {
        const range = `${SHEET_NAME}!A1`;
        await axios.post('/write-sheet', {
          spreadsheetId: SPREADSHEET_ID,
          range,
          values
        });
      }
      // Reset form and exit edit mode
      setFormError('');
      setFormData({ concepto: '', porcentaje: '' });
      setEditingRow(null);
      // Refresh view
      setShowData(true);
    } catch (uploadErr) {
      console.error(uploadErr);
      setFormError('Error saving record');
    }
  };

  const handleEdit = idx => {
    // Compute row number for sheet operations
    const rowNum = idx + 2;
    setEditingRow(rowNum);
    // Use the full data array to get the correct row (first element is headers)
    const row = Array.isArray(data) && data.length > idx + 1
      ? data[idx + 1]
      : [];
    const conceptoVal = row[0] || '';
    const porcentajeFraction = row[1] != null ? parseFloat(row[1]) : null;
    setFormData({
      concepto: conceptoVal,
      porcentaje: porcentajeFraction != null
        ? String(porcentajeFraction)
        : ''
    });
    // Ensure the table view is visible for context
    setShowData(true);
  };

  const handleDelete = async idx => {
    if (showData) setShowData(false);
    if (!window.confirm('Delete this record?')) return;
    const rowNum = idx + 2;
    const range = `${SHEET_NAME}!A${rowNum}:B${rowNum}`;
    try {
      await axios.post('/clear-sheet', {
        spreadsheetId: SPREADSHEET_ID,
        range
      });
      setShowData(true);
    } catch (delErr) {
      console.error(delErr);
      setFormError('Error deleting record');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{ width: '200px', borderRight: '1px solid #ccc', padding: '1rem' }}>
        <Link to="/master-data">
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '1rem' }}>
            ← Master Data
          </button>
        </Link>
        <Link to="/master-data/agricultores">
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>
            1. Agricultores
          </button>
        </Link>
        <Link to="/master-data/clientes">
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>
            2. Clientes
          </button>
        </Link>
        <Link to="/master-data/producto-esparrago">
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>
            3. Producto_Esparrago
          </button>
        </Link>
        <button
          disabled
          style={{
            width: '100%',
            padding: '0.5rem',
            textAlign: 'left',
            marginBottom: '0.5rem',
            background: '#eee',
            fontWeight: 'bold',
            border: 'none'
          }}
        >
          4. Comisiones
        </button>
        <Link to="/master-data/cajas">
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>
            5. Cajas
          </button>
        </Link>
      </nav>
      {/* Main */}
      <div style={{ flex: 1, padding: '1rem' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '1rem 0', borderBottom: '1px solid #ccc' }}>
          <h2>Comisiones</h2>
          {formError && <p style={{ color: 'red' }}>{formError}</p>}
          <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '500px' }}>
            <label>
              Concepto
              <input name="concepto" value={formData.concepto} onChange={handleInputChange} disabled={!!editingRow} />
            </label>
            <label>
              Porcentaje
              <input
                name="porcentaje"
                type="number"
                value={formData.porcentaje}
                onChange={handleInputChange}
                min="0"
                step="any"
              />
            </label>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit">{editingRow ? 'Update' : 'Add'}</button>
            </div>
          </form>
          <div style={{ marginTop: '1rem' }}>
            <button onClick={() => setShowData(true)}>Visualizar data</button>
          </div>
        </div>
        {/* Data Table */}
        {showData && (
          loading ? <p>Loading...</p> :
          error ? <p>{error.message || 'Error loading data'}</p> :
          <ComisionesList data={data} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}