import { useState, useCallback } from 'react';
import { query as dbQuery, exportCSV as exportCSVUtil } from '../services/queryService';

/**
 * Run SQL queries against a DuckDB instance.
 * @param {AsyncDuckDB|null} db - From useLakeData()
 */
export default function useQuery(db) {
  const [results, setResults] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (sql) => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await dbQuery(db, sql);
      setResults(rows);
      setColumns(rows.length > 0 ? Object.keys(rows[0]) : []);
    } catch (err) {
      setError(err);
      setResults([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const exportCSV = useCallback((filename) => {
    exportCSVUtil(results, filename);
  }, [results]);

  return { run, results, columns, loading, error, exportCSV };
}
