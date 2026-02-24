import { useState, useEffect } from 'react';
import { fetchMasterData } from '../services/masterDataService';

/**
 * Custom hook to fetch master data from Google Sheets for a given category.
 * @param {string} category - Sheet name (e.g., 'Agricultores', 'Clientes').
 * @returns {{ data: any[], loading: boolean, error: Error|null }}
 */
export function useMasterData(category, trigger = false) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    // Only fetch when triggered
    if (!trigger) {
      return () => {
        isCancelled = true;
      };
    }
    setLoading(true);
    setError(null);

    fetchMasterData(category)
      .then((response) => {
        if (!isCancelled) {
          setData(response.data);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!isCancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    // Cleanup if the component unmounts
    return () => {
      isCancelled = true;
    };
  }, [category, trigger]);

  return { data, loading, error };
}