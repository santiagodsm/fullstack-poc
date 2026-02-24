import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useMasterData } from '../../hooks/useMasterData';
import CajasList from '../../components/CajasList';

const SPREADSHEET_ID = '17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E';
const SHEET_NAME = 'Cajas';

export default function CajasPage() {
  const [showData, setShowData] = useState(false);
  const { data, loading, error } = useMasterData(SHEET_NAME, showData);
  const initialForm = {
    Concepto: '',
    Multiplicativo: '',
    Caja: '',
    Panal: '',
    Liga: '',
    FleteImporta: '',
    Sueldos: '',
    Renta: '',
    Ryan: '',
    Empaque: '',
    TagsBags: '',
    FleteLocales: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [editingRow, setEditingRow] = useState(null);
  const [formError, setFormError] = useState('');

  // Prepare rows safely
  const rows = Array.isArray(data) ? data.slice(1) : [];

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const computeTotal = fd => {
    const fields = ['Caja','Panal','Liga','FleteImporta','Sueldos','Renta','Ryan','Empaque','TagsBags','FleteLocales'];
    return fields.reduce((sum, key) => {
      const num = parseFloat(fd[key]) || 0;
      return sum + num;
    }, 0);
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    let err = '';
    // Validate required
    const keys = Object.keys(formData);
    keys.forEach(key => {
      if (formData[key].toString().trim() === '') {
        err = `${key} is required`;
      }
    });
    // Unique Concepto
    const existing = rows.map(r => r[0]);
    if (!editingRow && existing.includes(formData.Concepto.trim())) {
      err = 'Concepto must be unique';
    }
    if (err) {
      setFormError(err);
      return;
    }
    // Prepare values: convert to numbers
    const values = [[
      formData.Concepto.trim(),
      parseFloat(formData.Multiplicativo) || 0,
      ...['Caja','Panal','Liga','FleteImporta','Sueldos','Renta','Ryan','Empaque','TagsBags','FleteLocales']
        .map(key => parseFloat(formData[key]) || 0),
      computeTotal(formData)
    ]];
    try {
      if (showData) setShowData(false);
      if (editingRow) {
        const range = `${SHEET_NAME}!A${editingRow}:M${editingRow}`;
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
      setFormError('');
      setFormData(initialForm);
      setEditingRow(null);
      setShowData(true);
    } catch {
      setFormError('Error saving record');
    }
  };

  const handleEdit = idx => {
    const rowNum = idx + 2;
    setEditingRow(rowNum);
    const row = data[idx + 1] || [];
    setFormData({
      Concepto: row[0] || '',
      Multiplicativo: row[1] != null ? String(row[1]).replace(/[^\d.-]/g, '') : '',
      Caja: row[2] != null ? String(row[2]).replace(/[^\d.-]/g, '') : '',
      Panal: row[3] != null ? String(row[3]).replace(/[^\d.-]/g, '') : '',
      Liga: row[4] != null ? String(row[4]).replace(/[^\d.-]/g, '') : '',
      FleteImporta: row[5] != null ? String(row[5]).replace(/[^\d.-]/g, '') : '',
      Sueldos: row[6] != null ? String(row[6]).replace(/[^\d.-]/g, '') : '',
      Renta: row[7] != null ? String(row[7]).replace(/[^\d.-]/g, '') : '',
      Ryan: row[8] != null ? String(row[8]).replace(/[^\d.-]/g, '') : '',
      Empaque: row[9] != null ? String(row[9]).replace(/[^\d.-]/g, '') : '',
      TagsBags: row[10] != null ? String(row[10]).replace(/[^\d.-]/g, '') : '',
      FleteLocales: row[11] != null ? String(row[11]).replace(/[^\d.-]/g, '') : ''
    });
    setShowData(true);
  };

  const handleDelete = async idx => {
    if (showData) setShowData(false);
    if (!window.confirm('Delete this record?')) return;
    const rowNum = idx + 2;
    const range = `${SHEET_NAME}!A${rowNum}:M${rowNum}`;
    try {
      await axios.post('/clear-sheet', {
        spreadsheetId: SPREADSHEET_ID,
        range
      });
      setShowData(true);
    } catch {
      setFormError('Error deleting record');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{ width: '200px', borderRight: '1px solid #ccc', padding: '1rem' }}>
        <Link to="/master-data"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '1rem' }}>← Master Data</button></Link>
        <Link to="/master-data/agricultores"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>1. Agricultores</button></Link>
        <Link to="/master-data/clientes"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>2. Clientes</button></Link>
        <Link to="/master-data/producto-esparrago"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>3. Producto_Esparrago</button></Link>
        <Link to="/master-data/comisiones"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>4. Comisiones</button></Link>
        <button disabled style={{ width: '100%', padding: '0.5rem', textAlign: 'left', background: '#eee', fontWeight: 'bold', border: 'none' }}>5. Cajas</button>
      </nav>
      {/* Main */}
      <div style={{ flex: 1, padding: '1rem' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '1rem 0', borderBottom: '1px solid #ccc' }}>
          <h2>Cajas</h2>
          {formError && <p style={{ color: 'red' }}>{formError}</p>}
          <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '800px' }}>
            {Object.keys(initialForm).map(key => (
              <label key={key}>
                {key}
                <input
                  name={key}
                  type={key === 'Concepto' ? 'text' : 'number'}
                  value={formData[key]}
                  onChange={handleInputChange}
                  disabled={key === 'Concepto' && !!editingRow}
                  {...(key !== 'Concepto' && { min: "0", step: "any" })}
                />
              </label>
            ))}
            {/* Read-only Totales field */}
            <label style={{ gridColumn: 'span 2' }}>
              Totales
              <input value={computeTotal(formData).toFixed(2)} readOnly />
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
          <CajasList data={data} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}