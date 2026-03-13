import React, { useState, useEffect } from 'react';
import useLakeData from '../../hooks/useLakeData';
import useQuery from '../../hooks/useQuery';

const STATUS_ICON = { processed: '✅', raw: '⚠️', error: '❌' };

export default function CatalogExplorer() {
  const { db, loading: dbLoading, error: dbError } = useLakeData();
  const { run: runFiles,    results: files }    = useQuery(db);
  const { run: runLineage,  results: lineage }  = useQuery(db);
  const { run: runQuality,  results: quality }  = useQuery(db);
  const { run: runDetail,   results: detail }   = useQuery(db);

  const [tab,            setTab]            = useState('files');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [fileFilter,     setFileFilter]     = useState({ type: '', status: '' });

  useEffect(() => {
    if (!db) return;
    runFiles(`SELECT FileId, FileName, FileType, FileSizeMB, PartitionPath, Status, UploadedAt FROM catalog ORDER BY UploadedAt DESC`);
    runQuality(`
      SELECT 'unprocessed' AS check_type, COUNT(*) AS count FROM catalog WHERE Status = 'raw'
      UNION ALL
      SELECT 'error', COUNT(*) FROM catalog WHERE Status = 'error'
      UNION ALL
      SELECT 'no_detail', COUNT(*) FROM (
        SELECT h."No_Factura" FROM header h LEFT JOIN detail d ON h."No_Factura" = d."No_Factura" WHERE d."No_Factura" IS NULL
      )
      UNION ALL
      SELECT 'missing_client', COUNT(*) FROM header WHERE "Cliente" IS NULL OR "Cliente" = ''
    `);
  }, [db, runFiles, runQuality]);

  useEffect(() => {
    if (!db || !selectedFileId) return;
    // Header row linked to this file
    runLineage(`SELECT * FROM header WHERE "DriveFileId" = '${selectedFileId}' LIMIT 1`);
  }, [db, selectedFileId, runLineage]);

  useEffect(() => {
    if (!db || lineage.length === 0) return;
    const noFactura = lineage[0]['No_Factura'];
    if (noFactura) {
      runDetail(`SELECT * FROM detail WHERE "No_Factura" = '${noFactura}'`);
    }
  }, [db, lineage, runDetail]);

  // Filtered files list
  const filteredFiles = files.filter(f => {
    if (fileFilter.type   && f.FileType !== fileFilter.type)   return false;
    if (fileFilter.status && f.Status   !== fileFilter.status) return false;
    return true;
  });

  const selectedCatalogRow = files.find(f => f.FileId === selectedFileId);

  if (dbLoading) return <div style={{ padding: '2rem' }}>Cargando datos del lago...</div>;
  if (dbError)   return <div style={{ padding: '2rem', color: 'red' }}>Error: {dbError.message}</div>;

  const tabStyle = (t) => ({
    padding: '0.5rem 1.2rem', cursor: 'pointer', border: 'none',
    borderBottom: tab === t ? '2px solid #2d6a2d' : '2px solid transparent',
    background: 'none', fontWeight: tab === t ? 700 : 400, fontSize: '0.95rem'
  });

  const cellStyle = { padding: '0.4rem 0.6rem', borderBottom: '1px solid #eee', fontSize: '0.85rem' };
  const thStyle   = { ...cellStyle, borderBottom: '2px solid #ddd', fontWeight: 600, textAlign: 'left' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Catalog Explorer</h2>

      <div style={{ borderBottom: '1px solid #ddd', marginBottom: '1.5rem' }}>
        <button style={tabStyle('files')}   onClick={() => setTab('files')}>Archivos</button>
        <button style={tabStyle('lineage')} onClick={() => setTab('lineage')}>Lineage</button>
        <button style={tabStyle('quality')} onClick={() => setTab('quality')}>Calidad de Datos</button>
      </div>

      {/* TAB: Files */}
      {tab === 'files' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={fileFilter.type} onChange={e => setFileFilter(f => ({ ...f, type: e.target.value }))}
              style={{ padding: '0.3rem', borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="">Tipo: Todos</option>
              <option value="PDF">PDF</option>
              <option value="XML">XML</option>
            </select>
            <select value={fileFilter.status} onChange={e => setFileFilter(f => ({ ...f, status: e.target.value }))}
              style={{ padding: '0.3rem', borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="">Estado: Todos</option>
              <option value="raw">raw</option>
              <option value="processed">processed</option>
              <option value="error">error</option>
            </select>
            <span style={{ color: '#666', fontSize: '0.85rem', alignSelf: 'center' }}>
              {filteredFiles.length} archivos
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Archivo', 'Tipo', 'Tamaño', 'Partición', 'Estado', 'Subido'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f, i) => (
                  <tr key={f.FileId} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                    <td style={cellStyle}>{f.FileName}</td>
                    <td style={cellStyle}>{f.FileType}</td>
                    <td style={cellStyle}>{f.FileSizeMB ? `${f.FileSizeMB} MB` : '—'}</td>
                    <td style={cellStyle}>{f.PartitionPath}</td>
                    <td style={cellStyle}>{STATUS_ICON[f.Status] || '?'} {f.Status}</td>
                    <td style={cellStyle}>{f.UploadedAt ? new Date(f.UploadedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {filteredFiles.length === 0 && (
                  <tr><td colSpan={6} style={{ ...cellStyle, color: '#999', textAlign: 'center' }}>Sin archivos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Lineage */}
      {tab === 'lineage' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.9rem', marginRight: 8 }}>Selecciona archivo:</label>
            <select value={selectedFileId} onChange={e => setSelectedFileId(e.target.value)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="">— elige un archivo —</option>
              {files.map(f => <option key={f.FileId} value={f.FileId}>{f.FileName}</option>)}
            </select>
          </div>

          {selectedFileId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 600 }}>
              {/* Drive file node */}
              <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '1rem' }}>
                <strong>📄 {selectedCatalogRow?.FileName}</strong>
                <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 4 }}>
                  Google Drive · {selectedCatalogRow?.PartitionPath} · {selectedCatalogRow?.FileSizeMB} MB · subido {selectedCatalogRow?.UploadedAt ? new Date(selectedCatalogRow.UploadedAt).toLocaleDateString() : '—'}
                </div>
              </div>

              {lineage.length > 0 ? (
                <>
                  <div style={{ paddingLeft: '2rem', color: '#888', fontSize: '0.8rem' }}>↓ GPT-4o-mini extrajo</div>
                  {/* Header row node */}
                  <div style={{ background: '#fff9e6', border: '1px solid #ffe082', borderRadius: 8, padding: '1rem' }}>
                    <strong>📊 HeaderFactura</strong>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 4 }}>
                      No_Factura: {lineage[0]['No_Factura']} · Cliente: {lineage[0]['Cliente']} · Semana: {lineage[0]['Semana']} · Total: ${Number(lineage[0]['Total'] || 0).toLocaleString()}
                    </div>
                  </div>
                  {detail.length > 0 && (
                    <>
                      <div style={{ paddingLeft: '2rem', color: '#888', fontSize: '0.8rem' }}>↓ {detail.length} líneas de detalle</div>
                      <div style={{ background: '#f3f4f6', border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
                        <strong>📋 DetalleFactura ({detail.length} filas)</strong>
                        {detail.slice(0, 5).map((d, i) => (
                          <div key={i} style={{ fontSize: '0.85rem', color: '#555', marginTop: 4 }}>
                            {d['Codigo_Esparrago']} × {d['Cantidad']} @ ${d['Precio']} = ${d['Total']}
                          </div>
                        ))}
                        {detail.length > 5 && <div style={{ fontSize: '0.8rem', color: '#999', marginTop: 4 }}>...y {detail.length - 5} más</div>}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ color: '#999', fontSize: '0.9rem', padding: '0.5rem 0' }}>
                  ⚠️ Este archivo aún no ha sido procesado (sin factura vinculada).
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Data Quality */}
      {tab === 'quality' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxWidth: 600 }}>
            {quality.map(q => {
              const count = Number(q.count);
              const isOk  = count === 0;
              return (
                <div key={q.check_type} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.8rem 1rem',
                  background: isOk ? '#e8f5e9' : '#fff8e1',
                  border: `1px solid ${isOk ? '#a5d6a7' : '#ffe082'}`,
                  borderRadius: 8
                }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    {isOk ? '✅' : '⚠️'}{' '}
                    {q.check_type === 'unprocessed'    && 'Archivos sin procesar (raw)'}
                    {q.check_type === 'error'          && 'Archivos con error'}
                    {q.check_type === 'no_detail'      && 'Facturas sin líneas de detalle'}
                    {q.check_type === 'missing_client' && 'Facturas sin cliente'}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: isOk ? '#2d6a2d' : '#e65100' }}>
                    {count}
                  </span>
                </div>
              );
            })}
            {quality.length === 0 && <div style={{ color: '#999' }}>Cargando revisiones de calidad...</div>}
          </div>
        </div>
      )}
    </div>
  );
}
