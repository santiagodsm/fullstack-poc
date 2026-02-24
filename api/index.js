// Load environment variables from .env file into process.env
require('dotenv').config();

// Import Express framework for building API server
const express = require('express');
// Import CORS middleware to enable cross-origin requests
const cors = require('cors');
// Import Google APIs client library
const { google } = require('googleapis');
// Import Node.js file system module for reading files
const fs = require('fs');
// Import Multer middleware for handling multipart/form-data (file uploads)
const multer = require('multer');
// Import OpenAI client for interacting with ChatGPT API
const { OpenAI } = require('openai/index.mjs');
// Import Danfo.js for DataFrame support in Node.js
const danfo = require('danfojs-node');
// Import Node.js path module for handling file paths
const path = require('path');

// Directory for storing uploaded files locally
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Main Google Drive folder for all Drive operations
const MAIN_FOLDER_ID = '151IG_Rd4awTrElqgafxjTPXqWr3n-pzX';

// Initialize an Express application
const app = express();
// Enable CORS for all routes to allow frontend access
app.use(cors());
// Parse incoming JSON payloads and populate req.body
app.use(express.json());

// Configure Google Auth for service account using credentials.json
const auth = new google.auth.GoogleAuth({
  // Path to service account key file
  keyFile: path.join(__dirname, 'credentials.json'),
  // Scopes define the permissions the app will request
  scopes: [
    'https://www.googleapis.com/auth/drive',        // Full Drive access
    'https://www.googleapis.com/auth/drive.file',   // App-specific files
    'https://www.googleapis.com/auth/spreadsheets'
  ]
});
// Initialize Google Drive API client with authenticated credentials
const drive = google.drive({ version: 'v3', auth });

// Initialize Google Sheets API client with the same auth
const sheets = google.sheets({ version: 'v4', auth });

// Configure Multer to store uploaded files in server/uploads directory
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Proxy endpoint to stream Drive files without CORS issues

app.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const driveResp = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    // Set the appropriate content type for the streamed file
    res.set('Content-Type', driveResp.headers['content-type'] || 'application/octet-stream');
    // Pipe the file stream directly to the response
    driveResp.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error downloading file');
  }
});

// Endpoint to clear all local upload files
app.post('/clear-uploads', async (req, res) => {
  try {
    const files = await fs.promises.readdir(UPLOAD_DIR);
    await Promise.all(files.map(f =>
      fs.promises.unlink(path.join(UPLOAD_DIR, f))
    ));
    res.json({ cleared: files.length });
  } catch (err) {
    console.error('Error clearing uploads:', err);
    res.status(500).json({ error: 'Failed to clear uploads' });
  }
});

// Define endpoint for uploading a file to Google Drive (no folder specified)
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Ensure a file was uploaded
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }
    // Extract uploaded file details
    const filePath = req.file.path;
    const originalname = req.file.originalname;
    const mimetype = req.file.mimetype;
    // Safely read folderId from body, default to env or main folder
    const parentFolder = (req.body && req.body.folderId) || process.env.GOOGLE_DRIVE_FOLDER_ID || MAIN_FOLDER_ID;
    //const parentFolder = req.body.folderId || '151IG_Rd4awTrElqgafxjTPXqWr3n-pzX';
    const requestBody = { name: originalname, mimeType: mimetype };
    if (parentFolder) requestBody.parents = [parentFolder];
    const driveResp = await drive.files.create({
      requestBody,
      media: { mimeType: mimetype, body: fs.createReadStream(filePath) },
    });
    res.json(driveResp.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Upload failed');
  }
});

// Define endpoint for uploading a file to Google Drive into a specific folder
app.post('/upload/:folderId', upload.single('file'), async (req, res) => {
  try {
    // Ensure a file was uploaded
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }
    const parentFolder = req.params.folderId;
    // Extract uploaded file details
    const filePath = req.file.path;
    const originalname = req.file.originalname;
    const mimetype = req.file.mimetype;
    const requestBody = { name: originalname, mimeType: mimetype, parents: [parentFolder] };
    const driveResp = await drive.files.create({
      requestBody,
      media: { mimeType: mimetype, body: fs.createReadStream(filePath) },
    });
    res.json(driveResp.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Upload failed');
  }
});

// Define endpoint to proxy simple ChatGPT queries
app.post('/chat', async (req, res) => {
  try {
    // Extract the user prompt from request body
    const { prompt } = req.body;
    // Send the prompt to OpenAI API and await completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    });
    // Return the AI's response message
    res.json(completion.choices[0].message);
  } catch (err) {
    // Handle errors and respond with 500 status
    console.error(err);
    res.status(500).send('Chat request failed');
  }
});

// Define endpoint to proxy ChatGPT queries that include an optional file attachment
app.post('/chat-file', upload.single('file'), async (req, res) => {
  try {
    // Extract user prompt
    const { prompt } = req.body;
    const messages = [];
    // If a file was uploaded, read its contents as a system message
    if (req.file) {
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      messages.push({ role: 'system', content: fileContent });
    }
    // Add the user prompt as a user message
    messages.push({ role: 'user', content: prompt });
    // Send combined messages to OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages
    });
    // Return the AI's reply
    res.json(completion.choices[0].message);
  } catch (err) {
    // Handle errors
    console.error(err);
    res.status(500).send('Chat with file request failed');
  }
});

// Define endpoint to compute sum of 'value' column in a CSV using Danfo.js
app.get('/df-sum', async (req, res) => {
  try {
    // Read CSV file from uploads directory
    const df = await danfo.readCSV(path.join(__dirname, 'uploads', 'data.csv'));
    // Compute the sum of the 'value' column
    const sum = df['value'].sum();
    // Send the sum as JSON
    res.json({ sum });
  } catch (err) {
    // Handle read or parsing errors
    console.error(err);
    res.status(500).send('DataFrame processing failed');
  }
});

// Define endpoint to list all non-trashed folders in Google Drive
app.get('/list-folders', async (req, res) => {
  try {
    // Query Drive for items where mimeType indicates a folder and not trashed
    const resp = await drive.files.list({
      q: `'${MAIN_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      pageSize: 100,
      fields: 'files(id, name)'
    });
    // Return the list of folder metadata
    res.json(resp.data.files);
  } catch (err) {
    // Handle errors listing folders
    console.error(err);
    res.status(500).send('Error listing folders');
  }
});

// Endpoint: list all non-trashed files
app.get('/list-files', async (req, res) => {
  try {
    const resp = await drive.files.list({
      q: `'${MAIN_FOLDER_ID}' in parents and trashed = false`,
      pageSize: 100,
      fields: 'files(id, name)',
    });
    res.json(resp.data.files);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error listing files');
  }
});

// Endpoint: list files in a specific folder
app.get('/list-files/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const resp = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 100,
      fields: 'files(id, name)',
    });
    res.json(resp.data.files);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error listing files in folder');
  }
});

// Define endpoint to append rows to a Google Sheet
app.post('/write-sheet', async (req, res) => {
  try {
    // Extract spreadsheet ID, the range to write to, and values to append
    const { spreadsheetId, range, values } = req.body;
    const resp = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values }
    });
    // Return append result
    res.json(resp.data);
  } catch (err) {
    // Handle errors writing to sheet
    console.error(err);
    res.status(500).send('Error writing to sheet');
  }
});

// Define endpoint to read a range of values from a Google Sheet
app.post('/read-sheet', async (req, res) => {
  try {
    // Use the provided range if it includes a cell range, otherwise treat it as a sheet name
    const { spreadsheetId, range: reqRange } = req.body;
    const useRange = reqRange && reqRange.includes(':')
      ? reqRange
      : reqRange; // if no colon, it's just the sheet name
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: useRange
    });
    // Return the retrieved values array
    res.json(resp.data.values);
  } catch (err) {
    // Handle sheet read errors
    console.error(err);
    res.status(500).send('Error reading from sheet');
  }
});

// Define endpoint to update a range of cells in a Google Sheet
app.post('/update-sheet', async (req, res) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    const resp = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,                // e.g. 'Agricultores!A5:G5'
      valueInputOption: 'RAW',
      requestBody: { values }, // 2D array of new row values
    });
    res.json(resp.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating sheet');
  }
});

// Define endpoint to delete a row from a Google Sheet (removing the row entirely)
app.post('/clear-sheet', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    // Parse sheet name and row number from the range string (e.g. 'Agricultores!A5:G5')
    const [sheetName, cellRange] = range.split('!');
    const rowMatch = cellRange.match(/\d+/);
    if (!rowMatch) {
      return res.status(400).send('Invalid range format');
    }
    const rowNum = parseInt(rowMatch[0], 10);

    // Retrieve sheet metadata to find the sheetId
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) {
      return res.status(400).send(`Sheet not found: ${sheetName}`);
    }
    const sheetId = sheet.properties.sheetId;

    // Send a batchUpdate request to delete the row (0-based index)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNum - 1,
                endIndex: rowNum
              }
            }
          }
        ]
      }
    });
    res.json({ deletedRow: rowNum });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error clearing sheet range');
  }
});

// New endpoint to write factura inicial data to Google Sheets
app.post('/write-factura-inicial', async (req, res) => {
  try {
    const { spreadsheetId, header, details } = req.body;
    if (!spreadsheetId || !header || !Array.isArray(details)) {
      return res.status(400).send('spreadsheetId, header, and details are required');
    }

    const headerValues = [[
      header.fecha,               // 1. Fecha
      header.semana,              // 2. Semana
      header.noFactura,           // 3. No. Factura
      header.cliente,             // 4. Cliente
      header.totalGeneral,        // 5. Total
      header.documentoFactura,    // 6. DocumentoFactura
      '',                         // 7. Flete
      '',                         // 8. Costo Aduanal
      '',                         // 9. Renta Bodega
      '',                         // 10. Comision DG
      '',                         // 11. Comision Broker
      '',                         // 12. total final
      '',                         // 13. Ingresado Por
      '',                         // 14. Fecha Ingresado
      header.observaciones,       // 15. Observaciones
      ''                          // 16. Procesado_Flag
    ]];

    const detailValues = details.map(d => [
      header.noFactura,
      d.Codigo_Esparrago,
      d.Cantidad,
      d.Precio,
      d.Total
    ]);

    // Batch append header
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'HeaderFactura!A1',
      valueInputOption: 'RAW',
      requestBody: { values: headerValues }
    });

    // Batch append details
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'DetalleFactura!A1',
      valueInputOption: 'RAW',
      requestBody: { values: detailValues }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error writing factura inicial:', err);
    res.status(500).send('Error writing factura inicial data');
  }
});

// Endpoint: get default upload folder ID
app.get('/drive-info', (req, res) => {
  res.json({
    defaultFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null
  });
});

// Endpoint: share multiple files with a user
app.post('/share-files', async (req, res) => {
  try {
    const { fileIds, email } = req.body;
    if (!Array.isArray(fileIds) || !email) {
      return res.status(400).send('fileIds (array) and email are required');
    }
    const results = [];
    for (const fileId of fileIds) {
      const permResp = await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'user',
          emailAddress: email
        }
      });
      results.push({ fileId, permissionId: permResp.data.id });
    }
    res.json({ shared: results });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sharing files');
  }
});

// Endpoint: delete multiple files from Google Drive
app.post('/delete-files', async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds)) {
      return res.status(400).send('fileIds (array) is required');
    }
    const deleted = [];
    for (const fileId of fileIds) {
      await drive.files.delete({ fileId });
      deleted.push(fileId);
    }
    res.json({ deleted });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting files');
  }
});

// Start the Express server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));