import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useMasterData } from '../../hooks/useMasterData';
import ClientesList from '../../components/ClientesList';
import { formatPhone, isValidPhone } from '../../utils/validators';
import AddressAutocomplete from '../../components/AddressAutocomplete';


const SPREADSHEET_ID = '17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E';
const SHEET_NAME = 'Clientes';
const CLIENTES_LOGO_FOLDER_ID = '1v1nEWeGCpw4oNS1FxBRWkG5b5UFLy6Bg';

export default function ClientesPage() {
  const [showData, setShowData] = useState(false);
  const fileInputRef = useRef(null);
  const { data, loading, error } = useMasterData(SHEET_NAME, showData);
  const [formData, setFormData] = useState({
    id: '',
    nombreCliente: '',
    telefono: '',
    direccion: '',
    icono: ''
  });
  const [editingRow, setEditingRow] = useState(null);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Clear local uploads when leaving the page
  useEffect(() => {
    return () => {
      axios.post('/clear-uploads').catch(console.error);
    };
  }, []);

  // Safely get data rows
  const rows = Array.isArray(data) ? data.slice(1) : [];

  const handleInputChange = e => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'telefono') {
      newValue = formatPhone(value);
    }
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleIconUpload = async e => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const resp = await axios.post(`/upload/${CLIENTES_LOGO_FOLDER_ID}`, fd);
      // Extract the file ID from the response (handles different response shapes)
      const uploadedId = resp.data?.id ?? resp.data?.fileId ?? '';
      console.log('Uploaded file ID:', uploadedId);
      setFormData(prev => ({ ...prev, icono: uploadedId }));
      setUploading(false);
    }
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    console.log('Submitting Cliente with icono ID:', formData.icono);
    if (showData) setShowData(false);

    const idFormatted = (formData.id || '').trim().toUpperCase();
    const nombreFormatted = (formData.nombreCliente || '')
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const telefonoValue = (formData.telefono || '').trim();
    if (telefonoValue && !isValidPhone(telefonoValue)) {
      setFormError('Telefono must be in XXX-XXX-XXXX format');
      return;
    }

    const direccionValue = (formData.direccion || '').trim();
    // Determine the icono value: use newly uploaded ID or keep existing on edit
    let iconoValue = formData.icono;
    // If editing and no new upload, preserve the original icono from the sheet
    if (editingRow && (!formData.icono || formData.icono === '')) {
      const existingIdx = editingRow - 2; // adjust for header row
      iconoValue = rows[existingIdx]?.[4] || '';
    }

    // Prevent duplicate ID
    const existingIds = rows.map(r => r[0]);
    if (!editingRow && existingIds.includes(idFormatted)) {
      setFormError('ID already exists');
      return;
    }

    const values = [[
      idFormatted,
      nombreFormatted,
      telefonoValue,
      direccionValue,
      iconoValue
    ]];

    setFormData(prev => ({ ...prev, id: idFormatted, nombreCliente: nombreFormatted }));

    if (!idFormatted || !nombreFormatted) {
      setFormError('ID and Nombre Cliente are required');
      return;
    }

    try {
      if (editingRow) {
        const range = `${SHEET_NAME}!A${editingRow}:E${editingRow}`;
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
      setShowData(true);
      // Clear form and reset to Add mode
      setFormData({
        id: '',
        nombreCliente: '',
        telefono: '',
        direccion: '',
        icono: ''
      });
      setEditingRow(null);
      // Clear the file input display
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      setFormError('Error saving record');
    }
  };

  const handleEdit = idx => {
    const rowNum = idx + 2;
    setEditingRow(rowNum);
    const [id, nombre, telefono = '', direccion = '', icono = ''] = rows[idx];
    setFormData({
      id,
      nombreCliente: nombre,
      telefono,
      direccion,
      icono
    });
    setShowData(true);
  };

  const handleDelete = async idx => {
    if (showData) setShowData(false);
    if (!window.confirm('Delete this record?')) return;
    const rowNum = idx + 2;
    const range = `${SHEET_NAME}!A${rowNum}:E${rowNum}`;
    await axios.post('/clear-sheet', {
      spreadsheetId: SPREADSHEET_ID,
      range
    });
    setShowData(true);
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
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '1rem' }}>
            ← Master Data
          </button>
        </Link>
        <Link to="/master-data/agricultores" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>
            1. Agricultores
          </button>
        </Link>
        <button
          style={{
            width: '100%',
            padding: '0.5rem',
            textAlign: 'left',
            background: '#eee',
            fontWeight: 'bold',
            border: 'none',
            marginBottom: '0.5rem'
          }}
          disabled
        >
          2. Clientes
        </button>
        <Link to="/master-data/producto-esparrago" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>
            3. Producto_Esparrago
          </button>
        </Link>
        <Link to="/master-data/comisiones" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>
            4. Comisiones
          </button>
        </Link>
        <Link to="/master-data/cajas" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }}>
            5. Cajas
          </button>
        </Link>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '1rem' }}>
        {/* Header + Form */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: '#fff',
          padding: '1rem 0',
          zIndex: 100,
          borderBottom: '1px solid #ccc'
        }}>
          <h2>Clientes</h2>
          {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}
          <form onSubmit={handleFormSubmit} style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
            <h3>{editingRow ? 'Edit Cliente' : 'Add Cliente'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <label>
                ID
                <input
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  disabled={!!editingRow}
                />
              </label>
              <label>
                Nombre Cliente
                <input
                  name="nombreCliente"
                  value={formData.nombreCliente}
                  onChange={handleInputChange}
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
                />
              </label>
              <label>
                Icono
                <input type="file" ref={fileInputRef} onChange={handleIconUpload} />
              </label>
            </div>
            <button
              type="submit"
              disabled={uploading}
              style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
            >
              {uploading ? 'Uploading…' : editingRow ? 'Update' : 'Add'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button onClick={() => setShowData(true)} style={{ padding: '0.5rem 1rem' }}>Visualizar data</button>
          </div>
        </div>

        {/* Data Table */}
        {showData && (
          loading ? (
            <p>Loading Clientes...</p>
          ) : error ? (
            <p>{error.message || 'Error loading data'}</p>
          ) : !Array.isArray(data) || data.length < 2 ? (
            <p>No Clientes data available.</p>
          ) : (
            <ClientesList data={data} onEdit={handleEdit} onDelete={handleDelete} />
          )
        )}
      </div>
    </div>
  );
}