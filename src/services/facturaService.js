import axios from 'axios';

/**
 * Analyze an invoice file via ChatGPT, using clients and products master data.
 * @param {File} file - PDF or XML file of the invoice.
 * @param {string[]} clientOptions - Array of client names.
 * @param {Array<{code: string, price: number}>} productOptions - Array of product objects.
 * @returns {Promise<{ header: object, details: Array<object> }>}
 */
async function analyzeInvoice(file, clientOptions, productOptions) {
  // Build prompt with strict JSON schema
  const jsonSchema = `{
  "header": {
    "fecha": "YYYY-MM-DD",
    "semana": Number,
    "noFactura": String,
    "cliente": String,
    "observaciones": String
  },
  "details": [
    {
      "Codigo_Esparrago": String,
      "Cantidad": Number,
      "Precio": Number
    }
  ]
}`;
  const prompt = `
You will receive an invoice file, along with two JSON arrays for context:
clients = ${JSON.stringify(clientOptions)}
products = ${JSON.stringify(productOptions)}

Instructions:
1. In the invoice, the term "folio" means the invoice number and must map to "noFactura".
2. The quantity ("Cantidad") is the actual number of items.
3. Parse any "Concepto"/"Descripcion" text to correctly identify product codes and breakdowns.
4. Ensure the sum of all detail line totals matches the invoice total; if it does not, retry extraction.
5. Respond ONLY with a JSON object matching exactly this schema (no extra fields, no explanation, no markdown):

${jsonSchema}
`;

  // Prepare multipart form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prompt', prompt);

  // Send to backend /chat-file endpoint
  const response = await axios.post('/chat-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  // The backend returns { role, content }
  const { content } = response.data;
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON response from analysis: ${err.message}`);
  }

  // Expect parsed to have { header, details }
  if (!parsed.header || !Array.isArray(parsed.details)) {
    throw new Error('Analysis response missing header or details');
  }

  return parsed;
}

/**
 * Save a factura inicial by writing header and details to Google Sheets.
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID.
 * @param {object} header - Header fields.
 * @param {Array<object>} details - Array of detail line objects.
 */
async function saveFacturaInicial(spreadsheetId, header, details) {
  // Batch save header and details in a single API call
  await axios.post('/write-factura-inicial', {
    spreadsheetId,
    header,
    details
  });
}

/**
 * Upload a document file to Google Drive and return its file ID.
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} The Drive file ID.
 */
async function uploadDocument(file) {
  const DRIVE_FOLDER_ID = '1h88VrnN8p_YTRFwj0bR4jP4gze8UmvVZ';
  const formData = new FormData();
  formData.append('file', file);
  const resp = await axios.post(
    `/upload/${DRIVE_FOLDER_ID}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return resp.data.id;
}

const facturaService = {
  analyzeInvoice,
  saveFacturaInicial,
  uploadDocument
};

export default facturaService;