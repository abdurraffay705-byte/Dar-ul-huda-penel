import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

/**
 * Custom Select component (native-like API)
 * Props:
 * - items: [{ value: string, label: string, disabled?: boolean, color?: string }]
 * - value: controlled selected value (string)
 * - onChange: (value) => void
 * - placeholder: string displayed when no value selected
 * - className?: string for outer container
 */
export default function Select({ items = [], value, onChange, placeholder = '', className = '' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      const enabledItems = items.filter((i) => !i.disabled);
      const currentIndex = enabledItems.findIndex((i) => i.value === value);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = enabledItems[(currentIndex + 1) % enabledItems.length];
        onChange(next.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = enabledItems[(currentIndex - 1 + enabledItems.length) % enabledItems.length];
        onChange(prev.value);
      } else if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, items, value, onChange]);

  const selectedItem = items.find((i) => i.value === value);

  const toggleOpen = () => setOpen((prev) => !prev);

  const handleSelect = (item) => {
    if (item.disabled) return;
    onChange(item.value);
    setOpen(false);
  };

  return (
    <div className={`custom-select ${className}`} ref={containerRef}>
      <div
        className="select-trigger"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggleOpen}
        tabIndex={0}
      >
        <span className="select-value">
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown size={16} className="select-icon" />
      </div>
      {open && (
        <ul className="select-content" role="listbox" aria-activedescendant={value}>
          <li className="select-group">
            {items.map((item) => (
              <li
                key={item.value}
                className={`select-item ${item.disabled ? 'disabled' : ''} ${item.value === value ? 'selected' : ''}`}
                role="option"
                aria-selected={item.value === value}
                onClick={() => handleSelect(item)}
              >
                {item.color && <span className="color-dot" style={{ backgroundColor: item.color }}></span>}
                {item.label}
              </li>
            ))}
          </li>
        </ul>
      )}
    </div>
  );
}
