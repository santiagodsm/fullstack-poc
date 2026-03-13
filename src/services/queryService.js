import * as duckdb from '@duckdb/duckdb-wasm';

// Module-level DB instance — initialized once and reused
let _db = null;

/**
 * Initialize (or return cached) DuckDB WASM instance.
 * Loads bundles from jsDelivr CDN to avoid CRA WASM config issues.
 */
export async function initDB() {
  if (_db) return _db;

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  _db = db;
  return db;
}

/**
 * Clear the cached DB instance (called by refresh).
 */
export function resetDB() {
  _db = null;
}

/**
 * Register a Sheets dataset as a DuckDB in-memory table.
 * @param {AsyncDuckDB} db
 * @param {string} tableName - e.g. 'header', 'detail', 'catalog'
 * @param {Array<Array>} rows - Raw row arrays (no header row)
 * @param {string[]} columns - Column names
 */
export async function registerTable(db, tableName, rows, columns) {
  const objects = rows.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      const val = row[i] !== undefined ? row[i] : null;
      obj[col] = val;
    });
    return obj;
  });

  const jsonStr = JSON.stringify(objects);
  await db.registerFileText(`${tableName}.json`, jsonStr);

  const conn = await db.connect();
  await conn.query(
    `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${tableName}.json')`
  );
  await conn.close();
}

/**
 * Run a SQL query against the in-memory DB.
 * @param {AsyncDuckDB} db
 * @param {string} sql
 * @returns {Promise<Array<Object>>}
 */
export async function query(db, sql) {
  const conn = await db.connect();
  const result = await conn.query(sql);
  await conn.close();
  return result.toArray().map(row => row.toJSON());
}

/**
 * Build a SQL string from a structured query definition.
 * @param {object} def
 * @param {string}   def.table    - 'header' | 'detail' | 'catalog' | 'joined'
 * @param {Array}    def.filters  - [{ column, op, value }]
 * @param {string[]} def.groupBy  - column names
 * @param {Array}    def.metrics  - [{ column, agg }] e.g. { column: 'Total', agg: 'SUM' }
 * @param {object}   def.orderBy  - { column, direction }
 * @param {number}   def.limit
 * @returns {string} SQL string
 */
export function buildSQL({ table, filters = [], groupBy = [], metrics = [], orderBy, limit }) {
  // SELECT clause
  const selectParts = [];
  if (groupBy.length > 0) {
    groupBy.forEach(col => selectParts.push(`"${col}"`));
  }
  if (metrics.length > 0) {
    metrics.forEach(({ column, agg }) =>
      selectParts.push(`${agg}("${column}") AS "${agg}_${column}"`)
    );
  }
  const selectClause = selectParts.length > 0 ? selectParts.join(', ') : '*';

  // WHERE clause
  let whereClause = '';
  if (filters.length > 0) {
    const conditions = filters.map(({ column, op, value }) => {
      const isNumeric = !isNaN(value) && value !== '';
      const val = isNumeric ? value : `'${String(value).replace(/'/g, "''")}'`;
      return `"${column}" ${op} ${val}`;
    });
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // GROUP BY clause
  const groupByClause = groupBy.length > 0
    ? `GROUP BY ${groupBy.map(c => `"${c}"`).join(', ')}`
    : '';

  // ORDER BY clause
  const orderByClause = orderBy && orderBy.column
    ? `ORDER BY "${orderBy.column}" ${orderBy.direction || 'DESC'}`
    : '';

  // LIMIT clause
  const limitClause = limit ? `LIMIT ${limit}` : '';

  return [
    `SELECT ${selectClause}`,
    `FROM "${table}"`,
    whereClause,
    groupByClause,
    orderByClause,
    limitClause
  ].filter(Boolean).join('\n');
}

/**
 * Trigger a CSV download of query results in the browser.
 * @param {Array<Object>} results
 * @param {string} filename
 */
export function exportCSV(results, filename = 'lake-export.csv') {
  if (!results || results.length === 0) return;
  const columns = Object.keys(results[0]);
  const header = columns.join(',');
  const rows = results.map(row =>
    columns.map(col => {
      const val = row[col] == null ? '' : String(row[col]);
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
