import React, { useMemo } from 'react';

/**
 * Detail form for Factura Inicial
 * Props:
 *  - header: header object (to display noFactura)
 *  - details: array of detail objects
 *  - products: array of { code, price } options
 *  - onDetailsChange: function(newDetailsArray)
 */
export default function FacturaInicialDetailForm({ header, details, products, onDetailsChange }) {
  // Memoized list of products not yet used in details
  const availableProducts = useMemo(() => {
    const usedCodes = details.map(d => d.Codigo_Esparrago);
    return products.filter(p => !usedCodes.includes(p.code));
  }, [products, details]);
  // Add a new line for a missing product
  const addLine = () => {
    const missing = availableProducts.map(p => p.code);
    if (!missing.length) return;
    const code = missing[0];
    const price = products.find(p => p.code === code).price;
    onDetailsChange([...details, { Codigo_Esparrago: code, Cantidad: '', Precio: price, Total: 0 }]);
  };

  // Handle quantity change per row
  const handleCantidadChange = (idx, value) => {
    const newDetails = details.map((d, i) =>
      i === idx
        ? { ...d, Cantidad: value, Total: parseFloat(value || 0) * parseFloat(d.Precio) }
        : d
    );
    onDetailsChange(newDetails);
  };

  // Handle price change per row
  const handlePrecioChange = (idx, value) => {
    const newDetails = details.map((d, i) =>
      i === idx
        ? {
            ...d,
            Precio: value,
            Total: parseFloat(d.Cantidad || 0) * parseFloat(value || 0)
          }
        : d
    );
    onDetailsChange(newDetails);
  };

  // Handle removal of a row
  const removeLine = idx => {
    onDetailsChange(details.filter((_, i) => i !== idx));
  };

  // Handle product select change per row
  const handleProductChange = (idx, code) => {
    const price = products.find(p => p.code === code)?.price || 0;
    const cantidad = parseFloat(details[idx].Cantidad) || 0;
    const newDetails = details.map((d, i) =>
      i === idx
        ? {
            ...d,
            Codigo_Esparrago: code,
            Precio: price,
            Total: cantidad * price
          }
        : d
    );
    onDetailsChange(newDetails);
  };

  // Compute overall total
  const totalGeneral = details.reduce((sum, d) => sum + (parseFloat(d.Total) || 0), 0).toFixed(2);

  return (
    <div className="mb-md">
      <h3>Detalle Factura: {header.noFactura}</h3>
      {details.length < products.length && (
        <button
          type="button"
          className="accent mb-md"
          onClick={addLine}
        >
          Añadir Línea
        </button>
      )}
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Total</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d, idx) => (
            <tr key={d.Codigo_Esparrago + idx}>
              <td>
                <select
                  value={d.Codigo_Esparrago}
                  onChange={e => handleProductChange(idx, e.target.value)}
                >
                  <option value="">-- Selecciona Producto --</option>
                  {[
                    // Include the current row’s code first (if any)
                    ...products.filter(p => p.code === d.Codigo_Esparrago),
                    // Then list other available products
                    ...availableProducts
                  ].map(p => (
                    <option key={p.code} value={p.code}>{p.code}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  value={d.Cantidad}
                  onChange={e => handleCantidadChange(idx, e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={d.Precio}
                  onChange={e => handlePrecioChange(idx, e.target.value)}
                />
              </td>
              <td>{(parseFloat(d.Total) || 0).toFixed(2)}</td>
              <td>
                <button type="button" className="accent" onClick={() => removeLine(idx)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mb-md">
        <strong>Total General: </strong>{totalGeneral}
      </div>
    </div>
  );
}