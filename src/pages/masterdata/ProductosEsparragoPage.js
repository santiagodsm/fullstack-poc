import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useMasterData } from '../../hooks/useMasterData';
import ProductosEsparragoList from '../../components/ProductosEsparragoList';

const SHEET_NAME = 'Producto_Esparrago';
const SPREADSHEET_ID = '17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E';

export default function ProductosEsparragoPage() {
  const [showData, setShowData] = useState(false);
  const { data, loading, error } = useMasterData(SHEET_NAME, showData);
  const [formData, setFormData] = useState({
    Codigo_Esparrago: '',
    Nombre: '',
    TipoCaja: '',
    PrimerasSegundas: '',
    Cajas: '',
    Avance: '',
    CostoCajas: '',
    PrecioFacturaBase: '',
    AvanceCajas: '',
    AvanceEmpaque: '',
    Multiplicativo: ''
  });
  const [editingRow, setEditingRow] = useState(null);
  const [formError, setFormError] = useState('');

  // Handler templates (to be fleshed out)
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    // Clear any prior errors
    let errorMsg = '';
    // Required fields (all except TipoCaja)
    const required = ['Codigo_Esparrago', 'Nombre', 'PrimerasSegundas', 'Cajas', 'Avance', 'CostoCajas', 'PrecioFacturaBase', 'AvanceCajas', 'AvanceEmpaque', 'Multiplicativo'];
    required.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        errorMsg = `${field} is required`;
      }
    });
    // Validate positive numbers
    ['Avance','CostoCajas','PrecioFacturaBase','AvanceCajas','AvanceEmpaque','Multiplicativo'].forEach(field => {
      const val = parseFloat(formData[field]);
      if (isNaN(val) || val < 0) {
        errorMsg = `${field} must be a non-negative number`;
      }
    });
    if (errorMsg) {
      setFormError(errorMsg);
      return;
    }

    // Prepare values for sheet (match header order)
    const values = [[
      formData.Codigo_Esparrago.trim(),
      formData.Nombre.trim(),
      formData.TipoCaja,
      formData.PrimerasSegundas,
      formData.Cajas,
      parseFloat(formData.Avance),
      parseFloat(formData.CostoCajas),
      parseFloat(formData.PrecioFacturaBase),
      parseFloat(formData.AvanceCajas),
      parseFloat(formData.AvanceEmpaque),
      parseFloat(formData.Multiplicativo)
    ]];

    try {
      if (showData) setShowData(false);
      if (editingRow) {
        // Update existing row
        const range = `${SHEET_NAME}!A${editingRow}:K${editingRow}`;
        await axios.post('/update-sheet', {
          spreadsheetId: SPREADSHEET_ID,
          range,
          values
        });
        setShowData(true);
      } else {
        // Append new row
        const range = `${SHEET_NAME}!A1`;
        await axios.post('/write-sheet', {
          spreadsheetId: SPREADSHEET_ID,
          range,
          values
        });
        setShowData(true);
      }
      // On success, reset form and trigger data view
      setFormError('');
      setFormData({
        Codigo_Esparrago: '',
        Nombre: '',
        TipoCaja: '',
        PrimerasSegundas: '',
        Cajas: '',
        Avance: '',
        CostoCajas: '',
        PrecioFacturaBase: '',
        AvanceCajas: '',
        AvanceEmpaque: '',
        Multiplicativo: ''
      });
      // Exit edit mode so button reverts to "Add"
      setEditingRow(null);
    } catch (err) {
      console.error(err);
      setFormError('Error saving record');
    }
  };

  const handleEdit = idx => {
    // Populate formData with the selected row’s values
    const row = data[idx + 1]; // data[0] is headers
    setFormData({
      Codigo_Esparrago: row[0] || '',
      Nombre: row[1] || '',
      TipoCaja: row[2] || '',
      PrimerasSegundas: row[3] || '',
      Cajas: row[4] || '',
      // Strip any currency symbols or commas so number inputs accept the value
      Avance: row[5] != null ? String(row[5]).replace(/[^\d.-]/g, '') : '',
      CostoCajas: row[6] != null ? String(row[6]).replace(/[^\d.-]/g, '') : '',
      PrecioFacturaBase: row[7] != null ? String(row[7]).replace(/[^\d.-]/g, '') : '',
      AvanceCajas: row[8] != null ? String(row[8]).replace(/[^\d.-]/g, '') : '',
      AvanceEmpaque: row[9] != null ? String(row[9]).replace(/[^\d.-]/g, '') : '',
      Multiplicativo: row[10] != null ? String(row[10]).replace(/[^\d.-]/g, '') : ''
    });
    // Set the row number for update
    setEditingRow(idx + 2);
    // Ensure the table view is visible when editing
    setShowData(true);
  };

  const handleDelete = async idx => {
    if (showData) setShowData(false);
    // Confirm deletion
    if (!window.confirm('Delete this record?')) return;
    try {
      // Compute the row number (header is row 1)
      const rowNum = idx + 2;
      const range = `${SHEET_NAME}!A${rowNum}:K${rowNum}`;
      // Send clear-sheet request to delete the entire row
      await axios.post('/clear-sheet', {
        spreadsheetId: SPREADSHEET_ID,
        range
      });
      setShowData(true);
    } catch (err) {
      console.error(err);
      setFormError('Error deleting record');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: '200px',
        borderRight: '1px solid #ccc',
        padding: '1rem',
        boxSizing: 'border-box'
      }}>
        <Link to="/master-data">
          <button
            style={{
              width: '100%',
              padding: '0.5rem',
              textAlign: 'left',
              marginBottom: '1rem'
            }}
          >
            ← Master Data
          </button>
        </Link>
        <Link to="/master-data/agricultores"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>1. Agricultores</button></Link>
        <Link to="/master-data/clientes"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>2. Clientes</button></Link>
        <button disabled style={{ width: '100%', padding: '0.5rem', textAlign: 'left', background:'#eee', fontWeight:'bold', border:'none', marginBottom:'0.5rem' }}>3. Producto_Esparrago</button>
        <Link to="/master-data/comisiones"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>4. Comisiones</button></Link>
        <Link to="/master-data/cajas"><button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>5. Cajas</button></Link>
      </nav>

      {/* Main */}
      <div style={{ flex: 1, padding: '1rem' }}>
        {/* Form */}
        <h2>Producto Esparrago</h2>
        {formError && <p style={{ color: 'red' }}>{formError}</p>}
        <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Replace with dropdowns and inputs */}
          <label>
            Codigo_Esparrago
            <input name="Codigo_Esparrago" value={formData.Codigo_Esparrago} onChange={handleInputChange} />
          </label>
          <label>
            Nombre
            <input name="Nombre" value={formData.Nombre} onChange={handleInputChange} />
          </label>
          <label>
            TipoCaja
            <select name="TipoCaja" value={formData.TipoCaja} onChange={handleInputChange}>
              <option value="">Select...</option>
              <option>Made+Cart</option>
              <option>Fresh 28</option>
              <option>Costco 28</option>
              <option>Costco 36</option>
              <option>Cajas Segunda 28</option>
            </select>
          </label>
          <label>
            Primeras/Segundas
            <select name="PrimerasSegundas" value={formData.PrimerasSegundas} onChange={handleInputChange}>
              <option value="">Select...</option>
              <option>Primeras</option>
              <option>Segundas</option>
            </select>
          </label>
          <label>
            Cajas
            <select name="Cajas" value={formData.Cajas} onChange={handleInputChange}>
              <option value="">Select...</option>
              <option>11 Lbs</option>
              <option>28 Lbs</option>
              <option>Walmart</option>
              <option>Costco</option>
              <option>36 Lbs</option>
              <option>Small 28</option>
              <option>Tips</option>
            </select>
          </label>
          {/* Numeric/Currency */}
          <label>
            Avance
            <input type="number" name="Avance" value={formData.Avance} onChange={handleInputChange} />
          </label>
          <label>
            Costo Cajas
            <input type="number" name="CostoCajas" value={formData.CostoCajas} onChange={handleInputChange} />
          </label>
          <label>
            Precio Factura Base
            <input type="number" name="PrecioFacturaBase" value={formData.PrecioFacturaBase} onChange={handleInputChange} />
          </label>
          <label>
            Avance Cajas
            <input type="number" name="AvanceCajas" value={formData.AvanceCajas} onChange={handleInputChange} />
          </label>
          <label>
            Avance Empaque
            <input type="number" name="AvanceEmpaque" value={formData.AvanceEmpaque} onChange={handleInputChange} />
          </label>
          <label>
            Multiplicativo
            <input type="number" name="Multiplicativo" value={formData.Multiplicativo} onChange={handleInputChange} />
          </label>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit">{editingRow ? 'Update' : 'Add'}</button>
          </div>
        </form>

        {/* Data Table */}
        <div style={{ marginTop: '1rem' }}>
          <button type="button" onClick={() => setShowData(true)}>Visualizar data</button>
          {showData && (
            loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p>Error loading data</p>
            ) : (
              <ProductosEsparragoList data={data} onEdit={handleEdit} onDelete={handleDelete} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
