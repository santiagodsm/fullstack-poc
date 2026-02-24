import React from 'react';

/**
 * Displays a table of Agricultores records.
 * Expects `data` as an array of arrays, where the first row is headers.
 */
export default function AgricultoresList({ data, onEdit, onDelete }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p>No Agricultores data available.</p>;
  }

  // The first row contains column headers
  const headers = data[0];
  // The remaining rows are the records
  const rows = data.slice(1);

  return (
    <table style={{ margin: '0 auto', borderCollapse: 'collapse', width: '80%' }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f0f0' }}>
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
            <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
              {onEdit && <button onClick={() => onEdit(rIdx)}>Edit</button>}
              {onDelete && <button onClick={() => onDelete(rIdx)} style={{ marginLeft: '0.5rem' }}>Delete</button>}
            </td>
            {headers.map((_, cIdx) => (
              <td key={cIdx} style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
                {row[cIdx] !== undefined ? row[cIdx] : ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
