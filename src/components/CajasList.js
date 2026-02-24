import React from 'react';

/**
 * List component for Cajas master data.
 * Props:
 * - data: array of arrays (first row is headers)
 * - onEdit: function(rowIndex)
 * - onDelete: function(rowIndex)
 */
export default function CajasList({ data, onEdit, onDelete }) {
  if (!Array.isArray(data) || data.length < 2) {
    return <p>No data available.</p>;
  }
  const headers = data[0];
  const rows = data.slice(1);

  return (
    <table style={{ margin: '0 auto', borderCollapse: 'collapse', width: '95%' }}>
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
            <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>
              {onEdit && <button onClick={() => onEdit(rIdx)} style={{ marginRight: '0.5rem' }}>Edit</button>}
              {onDelete && <button onClick={() => onDelete(rIdx)}>Delete</button>}
            </td>
            {row.map((cell, cIdx) => {
              // Concepto (cIdx 0) and Multiplicativo (cIdx 1) as plain text; others as currency
              let display = cell;
              if (cIdx > 1) {
                const num = parseFloat(cell);
                display = isNaN(num)
                  ? cell
                  : num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
              }
              return (
                <td key={cIdx} style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: cIdx > 1 ? 'right' : 'left' }}>
                  {display}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
