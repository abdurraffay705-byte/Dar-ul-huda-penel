import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ChevronLeft, Layers } from 'lucide-react';
import Badge from './Badge';

const PAGE_SIZE = 30;

/**
 * Shared reusable DataTable component
 *
 * Props:
 * - columns: Array of { key, header, sortable, type, render, mobilePrimary, mobileSecondary }
 * - data: Array of data objects
 * - renderActions: (row) => JSX (rendered in the actions column)
 * - emptyIcon: Lucide icon component (fallback: Layers)
 * - emptyTitle: string (fallback: "No records found")
 * - emptyMessage: string (fallback: "No matching records were found.")
 */
export default function DataTable({
  columns = [],
  data = [],
  renderActions = null,
  emptyIcon: EmptyIcon = Layers,
  emptyTitle = "No records found",
  emptyMessage = "No matching records found."
}) {
  const [searchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMobileRows, setExpandedMobileRows] = useState({});
  const [imgErrorState, setImgErrorState] = useState({});

  // 1. FILTERING
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lowerSearch = searchTerm.toLowerCase().trim();
    return data.filter(row => {
      return Object.entries(row).some(([key, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, searchTerm]);

  // 2. SORTING
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  // 3. PAGINATION
  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * PAGE_SIZE;
    return sortedData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedData, validCurrentPage]);

  // Handlers
  const handleSort = (column) => {
    if (column.sortable === false || !column.key) return;

    setSortConfig(prev => {
      if (prev.key === column.key) {
        return { key: column.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: column.key, direction: 'asc' };
    });
  };

  const toggleMobileRowExpand = (rowId) => {
    setExpandedMobileRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const handleImageError = (rowId) => {
    setImgErrorState(prev => ({ ...prev, [rowId]: true }));
  };

  // Helper to render Avatar column
  const renderAvatar = (row, photoUrl, name) => {
    const rowId = row.id || row._id || name;
    const hasImage = photoUrl && !imgErrorState[rowId];
    const initial = name ? String(name).trim().charAt(0).toUpperCase() : '?';

    // Seeded background color for initial avatar fallback
    const colors = ['#064e3b', '#0f766e', '#b45309', '#1e3a8a', '#4c1d95', '#831843'];
    const colorIndex = (name ? name.charCodeAt(0) : 0) % colors.length;
    const bg = colors[colorIndex];

    if (hasImage) {
      return (
        <div className="table-avatar-container">
          <img
            src={photoUrl}
            alt={name || ''}
            className="table-avatar-img"
            onError={() => handleImageError(rowId)}
          />
        </div>
      );
    }

    return (
      <div className="table-avatar-container table-avatar-fallback" style={{ backgroundColor: bg }}>
        {initial}
      </div>
    );
  };

  // Helper to render Cell Content
  const renderCellContent = (col, row) => {
    if (col.render) {
      return col.render(row);
    }

    const value = row[col.key];

    if (col.type === 'avatar') {
      const photoUrl = row.photo_url || row.avatar_url || row.photo;
      const name = row.full_name || row.name || row.donor_name || value || '';
      return (
        <div className="table-cell-avatar">
          {renderAvatar(row, photoUrl, name)}
          <div className="table-cell-avatar-text">
            <span className="table-cell-title">{name}</span>
            {col.subtextKey && row[col.subtextKey] && (
              <span className="table-cell-subtext">{row[col.subtextKey]}</span>
            )}
          </div>
        </div>
      );
    }

    if (col.type === 'badge') {
      return <Badge label={value} type={value} />;
    }

    if (col.type === 'currency') {
      const num = Number(value) || 0;
      return <span className="table-cell-currency">Rs. {num.toLocaleString()}</span>;
    }

    return value !== undefined && value !== null ? String(value) : '-';
  };

  return (
    <div className="datatable-wrapper">
      {/* ── DESKTOP & TABLET TABLE VIEW ── */}
      <div className="datatable-container desktop-table-only">
        {paginatedData.length === 0 ? (
          <div className="datatable-empty">
            <EmptyIcon size={40} className="datatable-empty-icon" />
            <h4 className="datatable-empty-title">{emptyTitle}</h4>
            <p className="datatable-empty-message">{emptyMessage}</p>
          </div>
        ) : (
          <table className="datatable">
            <thead>
              <tr>
                {columns.map((col, idx) => {
                  const isSorted = sortConfig.key === col.key;
                  const isSortable = col.sortable !== false && col.key;
                  return (
                    <th
                      key={col.key || idx}
                      onClick={() => isSortable && handleSort(col)}
                      className={`datatable-th ${isSortable ? 'sortable' : ''}`}
                      style={col.width ? { width: col.width } : {}}
                    >
                      <div className="th-content">
                        <span>{col.header}</span>
                        {isSortable && (
                          <span className="sort-icon">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                              <ChevronDown size={12} style={{ opacity: 0.3 }} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {renderActions && <th className="datatable-th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIdx) => {
                const rowId = row.id || row._id || rowIdx;
                return (
                  <tr key={rowId} className="datatable-tr">
                    {columns.map((col, colIdx) => (
                      <td key={col.key || colIdx} className="datatable-td">
                        {renderCellContent(col, row)}
                      </td>
                    ))}
                    {renderActions && (
                      <td className="datatable-td text-right">
                        <div className="datatable-actions-group">
                          {renderActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MOBILE COMPACT CARDS VIEW ── */}
      <div className="mobile-cards-only">
        {paginatedData.length === 0 ? (
          <div className="datatable-empty">
            <EmptyIcon size={36} className="datatable-empty-icon" />
            <h4 className="datatable-empty-title">{emptyTitle}</h4>
            <p className="datatable-empty-message">{emptyMessage}</p>
          </div>
        ) : (
          <div className="mobile-rows-list">
            {paginatedData.map((row, rowIdx) => {
              const rowId = row.id || row._id || rowIdx;
              const isExpanded = !!expandedMobileRows[rowId];
              const avatarCol = columns.find(c => c.type === 'avatar');
              const badgeCol = columns.find(c => c.type === 'badge');
              const primaryName = row.full_name || row.name || row.donor_name || row.title || 'Record';
              const photoUrl = row.photo_url || row.avatar_url || row.photo;

              return (
                <div key={rowId} className={`mobile-row-card ${isExpanded ? 'expanded' : ''}`}>
                  <div className="mobile-row-header" onClick={() => toggleMobileRowExpand(rowId)}>
                    <div className="mobile-row-identity">
                      {avatarCol ? (
                        renderAvatar(row, photoUrl, primaryName)
                      ) : (
                        renderAvatar(row, null, primaryName)
                      )}
                      <div className="mobile-row-titles">
                        <span className="mobile-row-name">{primaryName}</span>
                        {avatarCol?.subtextKey && row[avatarCol.subtextKey] && (
                          <span className="mobile-row-subtext">{row[avatarCol.subtextKey]}</span>
                        )}
                      </div>
                    </div>

                    <div className="mobile-row-header-right">
                      {badgeCol && (
                        <Badge label={row[badgeCol.key]} type={row[badgeCol.key]} />
                      )}
                      <button className="mobile-expand-btn" aria-label="Toggle details">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Secondary Details */}
                  {isExpanded && (
                    <div className="mobile-row-details fade-in">
                      <div className="mobile-details-grid">
                        {columns.map((col, idx) => {
                          if (col.type === 'avatar') return null;
                          return (
                            <div key={col.key || idx} className="mobile-detail-item">
                              <span className="mobile-detail-label">{col.header}:</span>
                              <span className="mobile-detail-value">{renderCellContent(col, row)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {renderActions && (
                        <div className="mobile-row-actions">
                          {renderActions(row)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PAGINATION CONTROLS ── */}
      {sortedData.length > 0 && (
        <div className="datatable-pagination">
          <div className="pagination-info">
            <strong>{paginatedData.length}</strong> {paginatedData.length === 1 ? 'entry' : 'entries'}
          </div>

          <div className="pagination-buttons">
            <button
              className="pag-btn"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className="pag-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validCurrentPage === 1}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="page-indicator">
              Page {validCurrentPage} of {totalPages}
            </span>

            <button
              className="pag-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage === totalPages}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="pag-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
