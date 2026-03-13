import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { initDB, resetDB, registerTable } from '../services/queryService';

/**
 * Sanitize a column name from Google Sheets into a valid SQL identifier.
 * "No. Factura" → "No_Factura", "Costo Aduanal" → "Costo_Aduanal"
 */
function sanitizeCol(col) {
  return (col || '').trim().replace(/[\s.]+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

function sanitizeCols(columns) {
  return columns.map(sanitizeCol);
}

/**
 * Boot DuckDB WASM, fetch /lake-snapshot, register all tables.
 * Column names are sanitized on load so all SQL uses clean identifiers.
 */
export default function useLakeData() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get('/lake-snapshot');
      const { header, detail, catalog, columns } = data;

      const database = await initDB();

      // Sanitize column names before registering so SQL identifiers are clean
      await registerTable(database, 'header',  header,  sanitizeCols(columns.header));
      await registerTable(database, 'detail',  detail,  sanitizeCols(columns.detail));
      await registerTable(database, 'catalog', catalog, sanitizeCols(columns.catalog));

      // Create joined VIEW — uses sanitized column names
      const conn = await database.connect();
      await conn.query(`
        CREATE OR REPLACE VIEW joined AS
        SELECT h.*, d."Codigo_Esparrago", d."Cantidad", d."Precio", d."Total" AS "TotalDetalle"
        FROM header h
        LEFT JOIN detail d ON h."No_Factura" = d."No_Factura"
      `);
      await conn.close();

      loadedRef.current = true;
      setDb(database);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!loadedRef.current && !loading && !error) {
    load();
  }

  const refresh = useCallback(async () => {
    resetDB();
    loadedRef.current = false;
    setDb(null);
    await load();
  }, [load]);

  return { db, loading, error, refresh };
}
