import React from 'react';

export default function FilterBar({ filters, onChange, clientOptions, weekOptions }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      <label style={{ fontSize: '0.9rem', color: '#555' }}>
        Semana desde{' '}
        <select
          value={filters.weekFrom || ''}
          onChange={e => onChange({ ...filters, weekFrom: e.target.value || null })}
        >
          <option value="">Todas</option>
          {weekOptions.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.9rem', color: '#555' }}>
        hasta{' '}
        <select
          value={filters.weekTo || ''}
          onChange={e => onChange({ ...filters, weekTo: e.target.value || null })}
        >
          <option value="">Todas</option>
          {weekOptions.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.9rem', color: '#555' }}>
        Cliente{' '}
        <select
          value={filters.client || 'All'}
          onChange={e => onChange({ ...filters, client: e.target.value })}
        >
          <option value="All">Todos</option>
          {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
    </div>
  );
}
