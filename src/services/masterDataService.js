

import axios from 'axios';

// ID of the Master Data spreadsheet
const SPREADSHEET_ID = '17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E';

/**
 * Fetch master data for a given category (sheet name) from the spreadsheet.
 * @param {string} category - The name of the sheet (e.g., 'Agricultores', 'Clientes').
 * @returns {Promise} Axios response promise containing the sheet values.
 */
export function fetchMasterData(category) {
  return axios.post('/read-sheet', {
    spreadsheetId: SPREADSHEET_ID,
    range: category
  });
}