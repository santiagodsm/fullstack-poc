import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMasterData } from '../../hooks/useMasterData';
import axios from 'axios';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { formatPhone, isValidPhone, isValidEmail } from '../../utils/validators';

const SPREADSHEET_ID = '17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E';
const SHEET_NAME = 'Agricultores';

export default function AgricultoresPage() {
  const [showData, setShowData] = useState(false);
  const { data, loading, error } = useMasterData(SHEET_NAME, showData);
  const [formData, setFormData] = useState({
    clave: '',
    agricultor: '',
    zona: '',
    email: '',
    telefono: '',
    direccion: '',
    orden: ''
  });
  const [editingRow, setEditingRow] = useState(null);
  const [formError, setFormError] = useState('');

  // records: first row is headers
  const rows = data.slice(1);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'telefono') {
      newValue = formatPhone(value);
    }
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // Ensure showData toggles to trigger data reload
    if (showData) {
      setShowData(false);
    }
    // Validate phone
    const telefonoValue = formData.telefono.trim();
    if (telefonoValue && !isValidPhone(telefonoValue)) {
      setFormError('Telefono must be in XXX-XXX-XXXX format');
      return;
    }
    // Validate email
    const emailValue = formData.email.trim();
    if (emailValue && !isValidEmail(emailValue)) {
      setFormError('Invalid email address');
      return;
    }
    // Ensure direccion is not empty when required
    if (!formData.direccion.trim()) {
      setFormError('Direccion is required');
      return;
    }
    // Format clave and nombre
    const claveFormatted = formData.clave.trim().toUpperCase();
    const agricultorFormatted = formData.agricultor
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    // Check for duplicate clave when adding new
    const existingClaves = rows.map(r => r[0]);
    if (!editingRow && existingClaves.includes(claveFormatted)) {
      setFormError('Clave already exists');
      return;
    }

    // Build values array with formatted fields and trimmed others
    const values = [[
      claveFormatted,
      agricultorFormatted,
      formData.zona.trim(),
      formData.email.trim(),
      formData.telefono.trim(),
      formData.direccion.trim(),
      formData.orden.trim()
    ]];

    try {
      if (editingRow) {
        // update existing row
        const range = `${SHEET_NAME}!A${editingRow}:G${editingRow}`;
        await axios.post('/update-sheet', { spreadsheetId: SPREADSHEET_ID, range, values });
      } else {
        // add new row
        const range = `${SHEET_NAME}!A1`;
        await axios.post('/write-sheet', { spreadsheetId: SPREADSHEET_ID, range, values });
      }
      setFormError('');
      // Trigger refresh of table data
      setShowData(true);
    } catch (err) {
      console.error(err);
      setFormError('Error saving record');
    }
  };

  const handleEdit = (idx) => {
    const rowNum = idx + 2; // sheet row number
    setEditingRow(rowNum);
    const [clave, agricultor, zona, email, telefono, direccion, orden] = rows[idx];
    setFormData({ clave, agricultor, zona, email, telefono, direccion, orden });
    setShowData(true);
  };

  const handleDelete = async (idx) => {
    if (!window.confirm('Delete this record?')) return;
    const rowNum = idx + 2;
    const range = `${SHEET_NAME}!A${rowNum}:G${rowNum}`;
    await axios.post('/clear-sheet', { spreadsheetId: SPREADSHEET_ID, range });
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar navigation */}
      <nav style={{
        width: '200px',
        borderRight: '1px solid #ccc',
        padding: '1rem',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/master-data">
            <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>
              ← Back to Master Data
            </button>
          </Link>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <button
            style={{
              width: '100%',
              padding: '0.5rem',
              textAlign: 'left',
              background: '#eee',
              fontWeight: 'bold',
              border: 'none'
            }}
            disabled
          >
            1. Agricultores
          </button>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <Link to="/master-data/clientes" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>
              2. Clientes
            </button>
          </Link>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <Link to="/master-data/producto-esparrago" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>
              3. Producto_Esparrago
            </button>
          </Link>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <Link to="/master-data/comisiones" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>
              4. Comisiones
            </button>
          </Link>
        </div>
        <div>
          <Link to="/master-data/cajas" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>
              5. Cajas
            </button>
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, textAlign: 'center', marginTop: '2rem', padding: '0 1rem' }}>
        <div style={{
          position: 'sticky',
          top: 0,
          background: '#fff',
          padding: '1rem 0',
          zIndex: 100,
          borderBottom: '1px solid #ccc'
        }}>
          <h2>Agricultores</h2>

          {formError && (
            <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>
          )}
          <form onSubmit={handleFormSubmit} style={{ maxWidth: '600px', margin: '1rem auto', textAlign: 'left' }}>
            <h3>{editingRow ? 'Edit Agricultor' : 'Add Agricultor'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <label>
                Clave
                <input
                  name="clave"
                  value={formData.clave}
                  onChange={handleInputChange}
                  disabled={!!editingRow}
                />
              </label>
              <label>
                Agricultor
                <input name="agricultor" value={formData.agricultor} onChange={handleInputChange} />
              </label>
              <label>
                Zona
                <input name="zona" value={formData.zona} onChange={handleInputChange} />
              </label>
              <label>
                Email
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => {
                    if (formData.email && !isValidEmail(formData.email)) {
                      setFormError('Invalid email format');
                    }
                  }}
                />
              </label>
              <label>
                Telefono
                <input name="telefono" value={formData.telefono} onChange={handleInputChange} />
              </label>
              <label>
                Direccion
                <AddressAutocomplete
                  value={formData.direccion}
                  onChange={val => setFormData(prev => ({ ...prev, direccion: val }))}
                  onSelect={val => setFormData(prev => ({ ...prev, direccion: val }))}
                  placeholder="Enter address"
                />
              </label>
              <label>
                Orden
                <input name="orden" value={formData.orden} onChange={handleInputChange} />
              </label>
            </div>
            <button type="submit" style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
              {editingRow ? 'Update' : 'Add'}
            </button>
          </form>

          <div style={{ margin: '1rem' }}>
            <button onClick={() => setShowData(true)} style={{ padding: '0.5rem 1rem' }}>
              Visualizar data
            </button>
          </div>
        </div>

        {/* Data Table */}
        {showData && (
          loading ? (
            <p>Loading Agricultores...</p>
          ) : error ? (
            <p>{error.message || 'Error loading data'}</p>
          ) : !Array.isArray(data) || data.length < 2 ? (
            <p>No Agricultores data available.</p>
          ) : (
            <table style={{ margin: '0 auto', borderCollapse: 'collapse', width: '80%' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f0f0' }}>
                    Actions
                  </th>
                  {data[0].map((col, i) => (
                    <th
                      key={i}
                      style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f0f0' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(1).map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
                      <button onClick={() => handleEdit(idx)} style={{ marginRight: '0.5rem' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(idx)}>Delete</button>
                    </td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}