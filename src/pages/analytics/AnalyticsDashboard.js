import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import useLakeData from '../../hooks/useLakeData';
import useQuery from '../../hooks/useQuery';
import KpiCard from '../../components/analytics/KpiCard';
import FilterBar from '../../components/analytics/FilterBar';
import { buildSQL } from '../../services/queryService';

const COLORS = ['#2d6a2d', '#4a9e4a', '#76c776', '#a8e0a8', '#d4f0d4'];

function buildWhereFilters(filters) {
  const f = [];
  if (filters.weekFrom) f.push({ column: 'Semana', op: '>=', value: Number(filters.weekFrom) });
  if (filters.weekTo)   f.push({ column: 'Semana', op: '<=', value: Number(filters.weekTo) });
  if (filters.client && filters.client !== 'All') f.push({ column: 'Cliente', op: '=', value: filters.client });
  return f;
}

export default function AnalyticsDashboard() {
  const { db, loading: dbLoading, error: dbError, refresh } = useLakeData();
  const { run: runKpi,     results: kpiResults }     = useQuery(db);
  const { run: runWeek,    results: weekResults }    = useQuery(db);
  const { run: runClient,  results: clientResults }  = useQuery(db);
  const { run: runProduct, results: productResults } = useQuery(db);
  const { run: runMeta,    results: metaResults }    = useQuery(db);

  const [filters, setFilters] = useState({ weekFrom: null, weekTo: null, client: 'All' });

  // Derive filter options from metadata query
  const weekOptions  = (metaResults.find(r => r.type === 'weeks')  || { vals: '' }).vals
    ? String((metaResults.find(r => r.type === 'weeks') || { vals: '' }).vals).split(',').filter(Boolean)
    : [];
  const clientOptions = (metaResults.find(r => r.type === 'clients') || { vals: '' }).vals
    ? String((metaResults.find(r => r.type === 'clients') || { vals: '' }).vals).split(',').filter(Boolean)
    : [];

  useEffect(() => {
    if (!db) return;
    // Load filter options
    runMeta(`
      SELECT 'weeks' AS type, STRING_AGG(CAST(Semana AS VARCHAR), ',' ORDER BY Semana) AS vals FROM (SELECT DISTINCT CAST("Semana" AS INTEGER) AS Semana FROM header WHERE "Semana" IS NOT NULL)
      UNION ALL
      SELECT 'clients', STRING_AGG(Cliente, ',' ORDER BY Cliente) FROM (SELECT DISTINCT "Cliente" AS Cliente FROM header WHERE "Cliente" IS NOT NULL AND "Cliente" != '')
    `);
  }, [db, runMeta]);

  useEffect(() => {
    if (!db) return;
    const f = buildWhereFilters(filters);

    runKpi(buildSQL({ table: 'header', filters: f, metrics: [
      { column: 'Total', agg: 'SUM' },
      { column: 'No_Factura', agg: 'COUNT' },
    ]}));

    runWeek(buildSQL({ table: 'header', filters: f,
      groupBy: ['Semana'],
      metrics: [{ column: 'Total', agg: 'SUM' }],
      orderBy: { column: 'Semana', direction: 'ASC' }
    }));

    runClient(buildSQL({ table: 'header', filters: f,
      groupBy: ['Cliente'],
      metrics: [{ column: 'Total', agg: 'SUM' }],
      orderBy: { column: 'SUM_Total', direction: 'DESC' },
      limit: 10
    }));

    runProduct(buildSQL({ table: 'joined', filters: f,
      groupBy: ['Codigo_Esparrago'],
      metrics: [{ column: 'Cantidad', agg: 'SUM' }],
      orderBy: { column: 'SUM_Cantidad', direction: 'DESC' },
      limit: 8
    }));
  }, [db, filters, runKpi, runWeek, runClient, runProduct]);

  const kpi = kpiResults[0] || {};
  const totalRevenue = kpi['SUM_Total'] ? Number(kpi['SUM_Total']).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';
  const totalInvoices = kpi['COUNT_No_Factura'] ?? '—';

  const uniqueClients = clientResults.length;

  if (dbLoading) return <div style={{ padding: '2rem' }}>Cargando datos del lago...</div>;
  if (dbError)   return <div style={{ padding: '2rem', color: 'red' }}>Error: {dbError.message}</div>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Analytics Dashboard</h2>
        <button onClick={refresh} style={{ padding: '0.4rem 1rem', cursor: 'pointer' }}>↻ Actualizar</button>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        weekOptions={weekOptions}
        clientOptions={clientOptions}
      />

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <KpiCard label="Ingresos Totales"   value={totalRevenue} />
        <KpiCard label="Facturas"           value={totalInvoices} />
        <KpiCard label="Clientes Activos"   value={uniqueClients} />
        <KpiCard label="Productos Únicos"   value={productResults.length || '—'} />
      </div>

      {/* Revenue by Week */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Ingresos por Semana</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weekResults}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Semana" />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
            <Line type="monotone" dataKey="SUM_Total" stroke="#2d6a2d" strokeWidth={2} dot={false} name="Total" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Revenue by Client */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Ingresos por Cliente</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clientResults} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="Cliente" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="SUM_Total" fill="#2d6a2d" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Product Volume */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Volumen por Producto</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={productResults}
                dataKey="SUM_Cantidad"
                nameKey="Codigo_Esparrago"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {productResults.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
