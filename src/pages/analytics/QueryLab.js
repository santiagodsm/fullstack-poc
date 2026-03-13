import React, { useState } from 'react';
import useLakeData from '../../hooks/useLakeData';
import useQuery from '../../hooks/useQuery';
import { buildSQL } from '../../services/queryService';

const DATASET_COLUMNS = {
  header:  ['Fecha', 'Semana', 'No_Factura', 'Cliente', 'Total', 'DocumentoFactura', 'Observaciones'],
  detail:  ['No_Factura', 'Codigo_Esparrago', 'Cantidad', 'Precio', 'Total'],
  catalog: ['FileId', 'FileName', 'FileType', 'FileSizeMB', 'PartitionPath', 'Status', 'UploadedAt'],
  joined:  ['Fecha', 'Semana', 'No_Factura', 'Cliente', 'Total', 'Codigo_Esparrago', 'Cantidad', 'Precio']
};

const AGGREGATIONS = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];
const OPERATORS    = ['=', '!=', '>', '>=', '<', '<=', 'LIKE'];
const DIRECTIONS   = ['DESC', 'ASC'];
const LIMITS       = [50, 100, 500, 1000];

const emptyDef = { dataset: 'header', groupBy: [], metrics: [], filters: [], orderBy: { column: '', direction: 'DESC' }, limit: 100 };

export default function QueryLab() {
  const { db, loading: dbLoading, error: dbError } = useLakeData();
  const { run, results, columns, loading, error, exportCSV } = useQuery(db);
  const [def, setDef] = useState(emptyDef);

  const availableCols = DATASET_COLUMNS[def.dataset] || [];

  function addGroupBy()  { setDef(d => ({ ...d, groupBy: [...d.groupBy, availableCols[0] || ''] })); }
  function addMetric()   { setDef(d => ({ ...d, metrics: [...d.metrics, { column: availableCols[0] || '', agg: 'SUM' }] })); }
  function addFilter()   { setDef(d => ({ ...d, filters: [...d.filters, { column: availableCols[0] || '', op: '=', value: '' }] })); }
  function updateGroupBy(i, val) { setDef(d => { const a = [...d.groupBy]; a[i] = val; return { ...d, groupBy: a }; }); }
  function removeGroupBy(i) { setDef(d => ({ ...d, groupBy: d.groupBy.filter((_, j) => j !== i) })); }
  function updateMetric(i, key, val) { setDef(d => { const a = [...d.metrics]; a[i] = { ...a[i], [key]: val }; return { ...d, metrics: a }; }); }
  function removeMetric(i) { setDef(d => ({ ...d, metrics: d.metrics.filter((_, j) => j !== i) })); }
  function updateFilter(i, key, val) { setDef(d => { const a = [...d.filters]; a[i] = { ...a[i], [key]: val }; return { ...d, filters: a }; }); }
  function removeFilter(i) { setDef(d => ({ ...d, filters: d.filters.filter((_, j) => j !== i) })); }

  function runQuery() {
    const sql = buildSQL({
      table: def.dataset,
      filters: def.filters.filter(f => f.value !== ''),
      groupBy: def.groupBy.filter(Boolean),
      metrics: def.metrics.filter(m => m.column),
      orderBy: def.orderBy,
      limit: def.limit
    });
    run(sql);
  }

  if (dbLoading) return <div style={{ padding: '2rem' }}>Cargando datos del lago...</div>;
  if (dbError)   return <div style={{ padding: '2rem', color: 'red' }}>Error: {dbError.message}</div>;

  const sectionStyle = { background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '1rem' };
  const selectStyle  = { marginRight: '0.5rem', padding: '0.25rem' };
  const inputStyle   = { marginRight: '0.5rem', padding: '0.25rem', width: 100 };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Query Lab</h2>
        <button onClick={() => setDef(emptyDef)} style={{ padding: '0.4rem 1rem', cursor: 'pointer' }}>↺ Reset</button>
      </div>

      {/* Dataset */}
      <div style={sectionStyle}>
        <strong>Dataset</strong>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {Object.keys(DATASET_COLUMNS).map(ds => (
            <label key={ds} style={{ cursor: 'pointer' }}>
              <input type="radio" name="dataset" value={ds} checked={def.dataset === ds}
                onChange={() => setDef({ ...emptyDef, dataset: ds })} style={{ marginRight: '0.25rem' }} />
              {ds}
            </label>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={sectionStyle}>
        <strong>Filtros</strong>
        <div style={{ marginTop: '0.5rem' }}>
          {def.filters.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={f.column} onChange={e => updateFilter(i, 'column', e.target.value)} style={selectStyle}>
                {availableCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={f.op} onChange={e => updateFilter(i, 'op', e.target.value)} style={{ ...selectStyle, width: 60 }}>
                {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)}
                placeholder="valor" style={inputStyle} />
              <button onClick={() => removeFilter(i)} style={{ color: 'red', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button onClick={addFilter} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>+ Agregar filtro</button>
        </div>
      </div>

      {/* Group By */}
      <div style={sectionStyle}>
        <strong>Agrupar por</strong>
        <div style={{ marginTop: '0.5rem' }}>
          {def.groupBy.map((col, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <select value={col} onChange={e => updateGroupBy(i, e.target.value)} style={selectStyle}>
                {availableCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => removeGroupBy(i)} style={{ color: 'red', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button onClick={addGroupBy} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>+ Agregar</button>
        </div>
      </div>

      {/* Metrics */}
      <div style={sectionStyle}>
        <strong>Métricas</strong>
        <div style={{ marginTop: '0.5rem' }}>
          {def.metrics.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <select value={m.column} onChange={e => updateMetric(i, 'column', e.target.value)} style={selectStyle}>
                {availableCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={m.agg} onChange={e => updateMetric(i, 'agg', e.target.value)} style={selectStyle}>
                {AGGREGATIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={() => removeMetric(i)} style={{ color: 'red', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button onClick={addMetric} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>+ Agregar métrica</button>
        </div>
      </div>

      {/* Order By + Limit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={sectionStyle}>
          <strong>Ordenar por</strong>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={def.orderBy.column}
              onChange={e => setDef(d => ({ ...d, orderBy: { ...d.orderBy, column: e.target.value } }))}
              style={selectStyle}>
              <option value="">—</option>
              {availableCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={def.orderBy.direction}
              onChange={e => setDef(d => ({ ...d, orderBy: { ...d.orderBy, direction: e.target.value } }))}
              style={selectStyle}>
              {DIRECTIONS.map(dir => <option key={dir} value={dir}>{dir}</option>)}
            </select>
          </div>
        </div>
        <div style={sectionStyle}>
          <strong>Límite</strong>
          <div style={{ marginTop: '0.5rem' }}>
            <select value={def.limit} onChange={e => setDef(d => ({ ...d, limit: Number(e.target.value) }))} style={selectStyle}>
              {LIMITS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Execute */}
      <button onClick={runQuery} disabled={loading || !db}
        style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', cursor: 'pointer', marginBottom: '1.5rem', background: '#3A7D44', color: '#fff', border: 'none', borderRadius: 6 }}>
        {loading ? 'Ejecutando...' : '▶ Ejecutar'}
      </button>

      {/* Results */}
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error.message}</div>}
      {results.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span>{results.length} filas</span>
            <button onClick={() => exportCSV('query-lab-export.csv')} style={{ cursor: 'pointer', padding: '0.25rem 0.75rem' }}>
              ↓ CSV
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col} style={{ border: '1px solid #ddd', padding: '0.5rem', background: '#f0f0f0', textAlign: 'left', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    {columns.map(col => (
                      <td key={col} style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{row[col] == null ? '' : String(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {results.length === 0 && !error && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
          Configura una consulta y presiona Ejecutar
        </div>
      )}
    </div>
  );
}
