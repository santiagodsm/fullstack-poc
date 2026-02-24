

import { useState } from 'react';

/**
 * Custom hook to manage form state for an object of values.
 * @param {Object} initialValues - The initial form values.
 * @returns {[Object, function, function]} 
 *   - values: current form values,
 *   - handleChange: input change handler,
 *   - setValues: manually set form values.
 */
export default function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);

  /**
   * Generic change handler for form inputs.
   * Expects input fields with `name` attribute matching a key in `values`.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return [values, handleChange, setValues];
}