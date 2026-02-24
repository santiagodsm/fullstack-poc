import React, { useEffect } from 'react';
import useForm from '../hooks/useForm';

/**
 * Header form for Factura Inicial
 * Props:
 *  - header: object
 *  - clients: array of client names
 *  - onHeaderChange: function(values)
 */
export default function FacturaInicialHeaderForm({ header: externalHeader, clients, onHeaderChange, onFileChange }) {
  const [values, handleChange, setValues] = useForm(externalHeader);

  useEffect(() => {
    setValues(externalHeader);
  }, [externalHeader, setValues]);

  useEffect(() => {
    onHeaderChange(values);
  }, [values, onHeaderChange]);

  return (
    <div className="mb-md">
      <div className="mb-md">
        <label>Fecha</label><br />
        <input
          type="date"
          name="fecha"
          value={values.fecha}
          onChange={handleChange}
        />
      </div>
      <div className="mb-md">
        <label>Semana</label><br />
        <input
          type="number"
          name="semana"
          value={values.semana}
          onChange={handleChange}
        />
      </div>
      <div className="mb-md">
        <label>No. Factura</label><br />
        <input
          type="text"
          name="noFactura"
          value={values.noFactura}
          onChange={handleChange}
        />
      </div>
      <div className="mb-md">
        <label>Cliente</label><br />
        <select
          name="cliente"
          value={values.cliente}
          onChange={handleChange}
        >
          <option value="">-- Selecciona Cliente --</option>
          {clients.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="mb-md">
        <label>Observaciones</label><br />
        <textarea
          name="observaciones"
          value={values.observaciones}
          onChange={handleChange}
          rows={3}
        />
      </div>
    </div>
  );
}
