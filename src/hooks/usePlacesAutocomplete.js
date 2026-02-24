import { useEffect, useRef } from 'react';

/**
 * Custom hook to attach Google Places Autocomplete to an input.
 *
 * @param {Function} onSelect - Callback receiving the selected formatted address.
 * @param {Object} options - Optional Autocomplete options (e.g., types, fields).
 * @returns {Object} - A ref to be attached to the input element.
 *
 * Usage:
 *   const inputRef = usePlacesAutocomplete(handleSelect, { types: ['address'] });
 *   <input ref={inputRef} ... />
 */
export default function usePlacesAutocomplete(onSelect, options = {}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (
      !window.google ||
      !window.google.maps ||
      !window.google.maps.places
    ) {
      console.error('Google Maps Places API not loaded');
      return;
    }
    // Initialize Autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      options
    );
    // Limit fields returned
    autocompleteRef.current.setFields(['formatted_address']);
    // Listen for place selection
    const listener = () => {
      const place = autocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        onSelect(place.formatted_address);
      }
    };
    autocompleteRef.current.addListener('place_changed', listener);

    // Cleanup on unmount
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(
          autocompleteRef.current
        );
      }
    };
  }, [onSelect, options]);

  return inputRef;
}
