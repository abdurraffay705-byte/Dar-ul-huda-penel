import React from 'react';

export default function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={40} className="empty-state-icon" />}
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-message">{message}</p>
    </div>
  );
}
