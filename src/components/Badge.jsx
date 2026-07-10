import React from 'react';

export default function Badge({ label, type }) {
  // Normalize the input type to determine the styling variant
  const cleanType = (type || label || '').toLowerCase().trim();
  let variant = 'info'; // Default blue

  if (
    cleanType === 'teacher' ||
    cleanType === 'present' ||
    cleanType === 'paid' ||
    cleanType === 'success' ||
    cleanType === 'active'
  ) {
    variant = 'success'; // Green
  } else if (
    cleanType === 'admin' ||
    cleanType === 'medium' ||
    cleanType === 'partial' ||
    cleanType === 'late' ||
    cleanType === 'warning'
  ) {
    variant = 'warning'; // Amber/Gold
  } else if (
    cleanType === 'absent' ||
    cleanType === 'unpaid' ||
    cleanType === 'high' ||
    cleanType === 'danger' ||
    cleanType === 'remove'
  ) {
    variant = 'danger'; // Red
  } else if (
    cleanType === 'student' ||
    cleanType === 'data_entry' ||
    cleanType === 'low' ||
    cleanType === 'info' ||
    cleanType === 'cash' ||
    cleanType === 'bank' ||
    cleanType === 'online'
  ) {
    variant = 'info'; // Blue
  }

  return (
    <span className={`badge ${variant}`} style={{ textTransform: 'capitalize' }}>
      {label || type}
    </span>
  );
}
