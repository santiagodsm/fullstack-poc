import React, { useRef, useEffect } from 'react';

/**
 * AddressAutocomplete input using Google Places Autocomplete.
 *
 * Props:
 * - value: string, current input value
 * - onChange: function, called with new input value on user typing
 * - onSelect: function, called with formatted address when a place is selected
 * - placeholder: optional string for input placeholder
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Enter address'
}) {
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
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { types: ['address'] }
    );
    autocompleteRef.current.setFields(['formatted_address', 'address_components']);
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        // Update the input to display the complete formatted address
        if (inputRef.current) {
          inputRef.current.value = place.formatted_address;
        }
        onSelect(place.formatted_address);
      }
    });
  }, [onSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
    />
  );
}