import { useState, useCallback, useMemo } from 'react';
import { useMasterData } from './useMasterData';
import facturaService from '../services/facturaService';
import { parseNumber } from '../utils/numberUtils';

// Hard-coded spreadsheet ID for Facturas
const SPREADSHEET_ID = '1U3JF2AfkrQ1R9Q7mqy8xEDI0p0ZK4ba4-JoTWcgiyGQ';

// Initial empty header
const initialHeader = {
  fecha: '',
  semana: '',
  noFactura: '',
  cliente: '',
  documentoFactura: '',
  observaciones: ''
};

export default function useFacturaInicial() {
  // Form state
  const [header, setHeader] = useState(initialHeader);
  const [details, setDetails] = useState([]);

  // File state for invoice document
  const [file, setFile] = useState(null);

  // Master data loading
  const { data: clientesData } = useMasterData('Clientes', true);
  const { data: productosData } = useMasterData('Producto_Esparrago', true);

  // Derived client options
  const clientOptions = useMemo(() => {
    if (!clientesData || clientesData.length < 2) return [];
    const headers = clientesData[0];
    const idx = headers.indexOf('Nombre Cliente');
    return clientesData.slice(1).map(row => row[idx]);
  }, [clientesData]);

  // Derived product options and price map
  const productOptions = useMemo(() => {
    if (!productosData || productosData.length < 2) return [];
    const headers = productosData[0];
    const codeIdx = headers.indexOf('Codigo_Esparrago');
    const priceIdx = headers.indexOf('Precio Factura Base');
    return productosData.slice(1).map(row => ({
      code: row[codeIdx],
      price: parseNumber(row[priceIdx])
    }));
  }, [productosData]);

  const priceMap = useMemo(() => {
    if (!productosData || productosData.length < 2) return {};
    const headers = productosData[0];
    const codeIdx = headers.indexOf('Codigo_Esparrago');
    const priceIdx = headers.indexOf('Precio Factura Base');
    return productosData.slice(1).reduce((acc, row) => {
      acc[row[codeIdx]] = parseFloat(row[priceIdx]) || 0;
      return acc;
    }, {});
  }, [productosData]);

  // Analyze invoice via ChatGPT
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const analyzeInvoice = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      if (!file) throw new Error('No invoice file selected');
      const result = await facturaService.analyzeInvoice(file, clientOptions, productOptions);
      if (result.header) {
        // Replace header state entirely with the analyzed header
        setHeader({
          fecha: result.header.fecha || '',
          semana: result.header.semana || '',
          noFactura: result.header.noFactura || '',
          cliente: result.header.cliente || '',
          documentoFactura: result.header.documentoFactura || '',
          observaciones: result.header.observaciones || ''
        });
      }
      if (result.details) {
        // Normalize strings to numbers and compute Total
        const normalized = result.details.map(d => {
          const cantidad = parseNumber(d.Cantidad);
          const precio = parseNumber(d.Precio);
          return {
            Codigo_Esparrago: d.Codigo_Esparrago,
            Cantidad: cantidad,
            Precio: precio,
            Total: parseFloat((cantidad * precio).toFixed(2))
          };
        });
        setDetails(normalized);
      }
    } catch (err) {
      setAnalyzeError(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [clientOptions, productOptions, file]);

  // Save factura via backend
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const saveFactura = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Basic validation
      if (!header.noFactura) throw new Error('El número de factura es requerido.');
      if (details.length === 0) throw new Error('Agrega al menos una línea de detalle.');
      // Upload document if file is present
      let documentoId = header.documentoFactura;
      if (file) {
        documentoId = await facturaService.uploadDocument(file);
      }
      // Compute total general from details
      const totalGeneral = details.reduce((sum, d) => sum + (d.Total || 0), 0);
      const headerWithDoc = {
        ...header,
        documentoFactura: documentoId,
        totalGeneral
      };
      await facturaService.saveFacturaInicial(SPREADSHEET_ID, headerWithDoc, details);
      // Reset after successful save
      setHeader(initialHeader);
      setDetails([]);
      setFile(null);
    } catch (err) {
      setSaveError(err);
    } finally {
      setIsSaving(false);
    }
  }, [header, details, file]);

  // Determine if the form is valid for saving
  const canSave = useMemo(() => {
    const { fecha, semana, noFactura, cliente } = header;
    const headerValid = !!fecha && !!semana && !!noFactura && !!cliente;
    const detailsValid = details.length > 0;
    return headerValid && detailsValid && !isSaving;
  }, [header, details, isSaving]);

  return {
    header,
    setHeader,
    details,
    setDetails,
    clientOptions,
    productOptions,
    priceMap,
    isAnalyzing,
    analyzeError,
    analyzeInvoice,
    file,
    onFileChange: setFile,
    isSaving,
    saveError,
    canSave,
    saveFactura
  };
}