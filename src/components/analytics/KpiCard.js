import React from 'react';

export default function KpiCard({ label, value, sub }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: 8,
      padding: '1.2rem 1.5rem',
      textAlign: 'center',
      minWidth: 140
    }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2d6a2d' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
