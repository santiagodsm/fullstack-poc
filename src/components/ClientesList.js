import React from 'react';

const API_URL = process.env.REACT_APP_API_URL || '';

/**
 * Displays a table of Clientes records.
 * Expects `data` as an array of arrays, where the first row is headers.
 * The "Icono" column should contain a Drive file ID, rendered as an image.
 */
export default function ClientesList({ data, onEdit, onDelete }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p>No Clientes data available.</p>;
  }

  // The first row contains column headers
  const headers = data[0];
  // The remaining rows are the records
  const rows = data.slice(1);

  return (
    <table style={{ margin: '0 auto', borderCollapse: 'collapse', width: '80%' }}>
      <thead>
        <tr>
          <th
            style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f0f0' }}
          >
            Actions
          </th>
          {headers.map((col, idx) => (
            <th
              key={idx}
              style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f0f0' }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rIdx) => (
          <tr key={rIdx}>
            <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>
              {onEdit && <button onClick={() => onEdit(rIdx)} style={{ marginRight: '0.5rem' }}>Edit</button>}
              {onDelete && <button onClick={() => onDelete(rIdx)}>Delete</button>}
            </td>
            {headers.map((col, cIdx) => (
              <td key={cIdx} style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>
                {col === 'Icono' && row[cIdx] ? (
                  (() => {
                    const raw = row[cIdx];
                    // Use proxy endpoint to fetch Drive files without CORS issues
                    const src = `${API_URL}/download/${raw}`;
                    return (
                      <img
                        src={src}
                        alt="Logo"
                        style={{ maxWidth: '50px', maxHeight: '50px' }}
                      />
                    );
                  })()
                ) : (
                  row[cIdx]
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
