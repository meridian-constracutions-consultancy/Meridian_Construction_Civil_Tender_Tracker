import React, { useState, useMemo, useCallback } from 'react';
import { ExternalLink, Eye, Building, MapPin, Check, LayoutList, LayoutGrid, Calendar, AlertTriangle } from 'lucide-react';
import { TenderListItem } from '../types/tender';

interface TenderTableProps {
  tenders: TenderListItem[];
  isLoading: boolean;
  onSelectTender: (tender: TenderListItem) => void;
  sortBy: string;
  order: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  isCivilOnly?: boolean;
}

export const TenderTable: React.FC<TenderTableProps> = ({
  tenders,
  isLoading,
  onSelectTender,
  sortBy,
  order,
  onSortChange,
  isCivilOnly = true,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // View mode: 'auto' (cards on mobile, table on desktop), or explicit 'table' / 'cards'
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');

  const handleCopyAndOpenPortal = useCallback((e: React.MouseEvent, t: TenderListItem) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t.tender_id);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  }, []);

  // Format numbers into Indian Lakhs and Crores
  const formatIndianCurrency = useCallback((amount?: number | null) => {
    if (amount === undefined || amount === null) {
      return <span className="text-subtle-sm">Refer NIT</span>;
    }
    if (amount === 0) {
      return <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 600 }}>₹0 (Nil/Exempt)</span>;
    }
    if (amount >= 10000000) {
      return (
        <span className="amount-val">
          ₹{(amount / 10000000).toFixed(2)} <span className="amount-lakhs">Cr</span>
        </span>
      );
    }
    if (amount >= 100000) {
      return (
        <span className="amount-val">
          ₹{(amount / 100000).toFixed(2)} <span className="amount-lakhs">L</span>
        </span>
      );
    }
    return <span className="amount-val">₹{amount.toLocaleString('en-IN')}</span>;
  }, []);

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return <span className="text-subtle-sm">Refer NIT</span>;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  const isClosingSoon = useCallback((dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const closing = new Date(dateStr).getTime();
      const now = Date.now();
      const diffDays = (closing - now) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    } catch {
      return false;
    }
  }, []);

  const getCategoryLabel = useCallback((id?: string) => {
    switch (id) {
      case 'roads_highways': return 'Roads & Highways Design';
      case 'bridges_flyovers': return 'Bridges & ROBs Design';
      case 'metro_railways': return 'Metro & Railways Design';
      case 'water_supply_drainage': return 'Water & Drainage Design';
      case 'structural_engineering': return 'Structural Design';
      case 'consultancy_pmc_dpr': return 'PMC / DPR Consultancy';
      default: return 'Design & Consultancy';
    }
  }, []);

  const isListedToday = useCallback((dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const pub = new Date(dateStr);
      const now = new Date();
      // Within last 24 hours
      return (now.getTime() - pub.getTime()) <= 24 * 3600 * 1000;
    } catch {
      return false;
    }
  }, []);

  // Compute rendered items with precomputed flags to ensure 0-lag 60fps rendering
  const processedTenders = useMemo(() => {
    return tenders.map((t) => ({
      ...t,
      closingSoon: isClosingSoon(t.bid_submission_deadline),
      isToday: isListedToday(t.published_date),
      categoryLabel: getCategoryLabel(t.category_id),
      formattedValue: formatIndianCurrency(t.estimated_value),
      formattedEmd: formatIndianCurrency(t.emd_amount),
      formattedPublished: formatDate(t.published_date),
      formattedClosing: formatDate(t.bid_submission_deadline),
    }));
  }, [tenders, isClosingSoon, isListedToday, getCategoryLabel, formatIndianCurrency, formatDate]);

  return (
    <div className={`table-container view-mode-${viewMode}`}>
      {/* Header Bar with View Switcher */}
      <div className="table-header-bar">
        <div className="table-title-group">
          <h2 className="table-title">
            <Building size={18} color="#6366f1" />
            <span>{isCivilOnly ? 'Latest Discovered Design & Consultancy Tenders' : 'Latest Discovered Government Tenders (All Categories)'}</span>
            <span className="table-count-badge">
              {tenders.length} displayed
            </span>
          </h2>
        </div>

        {/* View Mode Controls (Card view vs Table view) */}
        <div className="table-view-controls">
          <button
            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Force Table View"
            aria-label="Table View"
          >
            <LayoutList size={14} />
            <span className="view-toggle-label">Table</span>
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Force Card View (Optimized for Mobile/Touch)"
            aria-label="Card View"
          >
            <LayoutGrid size={14} />
            <span className="view-toggle-label">Cards</span>
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'auto' ? 'active' : ''}`}
            onClick={() => setViewMode('auto')}
            title="Auto-responsive (Cards on Mobile, Table on Desktop)"
            aria-label="Auto Responsive View"
          >
            <span className="view-toggle-label">Auto</span>
          </button>
        </div>
      </div>

      {/* 1. DESKTOP / LAPTOP / TABLET TABULAR VIEW */}
      <div className="table-wrapper desktop-table-view">
        <table className="tender-table">
          <thead>
            <tr>
              <th onClick={() => onSortChange('tender_id')}>
                Tender ID {sortBy === 'tender_id' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>Work Details & Authority</th>
              <th>Location</th>
              <th>Category</th>
              <th onClick={() => onSortChange('estimated_value')} style={{ textAlign: 'right' }}>
                Value (INR) {sortBy === 'estimated_value' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ textAlign: 'right' }}>EMD</th>
              <th onClick={() => onSortChange('published_date')}>
                Published {sortBy === 'published_date' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => onSortChange('bid_submission_deadline')}>
                Closing Date {sortBy === 'bid_submission_deadline' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && tenders.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty-cell">
                  Loading latest tenders from intelligence registry...
                </td>
              </tr>
            ) : tenders.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty-cell">
                  No tenders match the specified filters. Try adjusting your search criteria.
                </td>
              </tr>
            ) : (
              processedTenders.map((t) => (
                <tr key={t.id} className={t.isNewArrival ? 'new-arrival' : ''}>
                  {/* Tender ID */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="tender-id-text">{t.tender_id}</div>
                    {t.reference_number && (
                      <div className="tender-ref-text">Ref: {t.reference_number}</div>
                    )}
                    <span className="badge badge-source" style={{ marginTop: '4px' }}>
                      {t.source_id === 'rajasthan_eproc' ? 'Rajasthan' : 'CPPP Central'}
                    </span>
                  </td>

                  {/* Title & Organization */}
                  <td style={{ minWidth: '220px', maxWidth: '380px' }}>
                    <div className="tender-title-clamp" title={t.title}>
                      {t.title}
                    </div>
                    <div className="tender-org-text">
                      {t.organization_name || t.department || 'Government Department'}
                    </div>
                  </td>

                  {/* Location */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="tender-location-row">
                      <MapPin size={13} color="#94a3b8" />
                      <span>{t.location || t.state || 'India'}</span>
                    </div>
                    {t.state && t.location !== t.state && (
                      <div className="tender-state-text">{t.state}</div>
                    )}
                  </td>

                  {/* Category */}
                  <td>
                    <span className="badge badge-civil">
                      {t.categoryLabel}
                    </span>
                  </td>

                  {/* Estimated Value */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {t.formattedValue}
                  </td>

                  {/* EMD */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: '#cbd5e1' }}>
                    {t.formattedEmd}
                  </td>

                  {/* Published Date */}
                  <td style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '12px' }}>
                    <div>{t.formattedPublished}</div>
                    {t.isToday && (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', marginTop: '3px', fontSize: '10px', padding: '1px 5px', display: 'inline-block' }}>
                        🔥 Listed Today
                      </span>
                    )}
                  </td>

                  {/* Closing Date */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ color: t.closingSoon ? '#fbbf24' : '#e2e8f0', fontSize: '12px', fontWeight: t.closingSoon ? 600 : 400 }}>
                      {t.formattedClosing}
                    </div>
                    {t.closingSoon && (
                      <span className="badge badge-closing-soon" style={{ marginTop: '2px' }}>
                        Closing Soon
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {t.status === 'AMENDED' ? (
                      <span className="badge badge-amended">Amended</span>
                    ) : (
                      <span className="badge badge-civil">Active</span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <div className="table-actions-cell">
                      <button
                        className="btn btn-outline btn-table-action"
                        onClick={() => onSelectTender(t)}
                        title="Inspect tender specifications & documents"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                      <a
                        href={t.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleCopyAndOpenPortal(e, t)}
                        className={`btn btn-outline btn-table-action ${copiedId === t.id ? 'btn-copied' : ''}`}
                        title={copiedId === t.id ? `Tender ID copied!` : `Copy Tender ID and open ${t.portal_name}`}
                      >
                        {copiedId === t.id ? <Check size={13} color="#34d399" /> : <ExternalLink size={13} />}
                        <span>{copiedId === t.id ? 'Copied ID' : 'Portal'}</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 2. MOBILE / TOUCH-OPTIMIZED CARD VIEW */}
      <div className="mobile-cards-view">
        {isLoading && tenders.length === 0 ? (
          <div className="table-empty-cell">
            Loading latest tenders from intelligence registry...
          </div>
        ) : tenders.length === 0 ? (
          <div className="table-empty-cell">
            No tenders match the specified filters. Try adjusting your search criteria.
          </div>
        ) : (
          <div className="tender-cards-grid">
            {processedTenders.map((t) => (
              <div key={`card-${t.id}`} className={`tender-mobile-card ${t.isNewArrival ? 'new-arrival' : ''}`}>
                {/* Card Top Badges & Meta */}
                <div className="mobile-card-header">
                  <div className="mobile-card-badges">
                    <span className="badge badge-source">
                      {t.source_id === 'rajasthan_eproc' ? 'Rajasthan' : 'CPPP Central'}
                    </span>
                    <span className="badge badge-civil">
                      {t.categoryLabel}
                    </span>
                    {t.isToday && (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                        🔥 Listed Today
                      </span>
                    )}
                    {t.status === 'AMENDED' && <span className="badge badge-amended">Amended</span>}
                    {t.closingSoon && <span className="badge badge-closing-soon">Closing Soon</span>}
                  </div>
                  <div className="mobile-card-id">{t.tender_id}</div>
                </div>

                {/* Card Title & Org */}
                <h3 className="mobile-card-title" onClick={() => onSelectTender(t)}>
                  {t.title}
                </h3>
                <div className="mobile-card-org">
                  {t.organization_name || t.department || 'Government Department'}
                </div>

                {/* Card Key Metrics Grid */}
                <div className="mobile-card-metrics">
                  <div className="metric-box">
                    <span className="metric-label">Estimated Value</span>
                    <div className="metric-value">{t.formattedValue}</div>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">EMD Amount</span>
                    <div className="metric-value">{t.formattedEmd}</div>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Closing Date</span>
                    <div className={`metric-value ${t.closingSoon ? 'text-closing-soon' : ''}`}>
                      {t.formattedClosing}
                    </div>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Location</span>
                    <div className="metric-value-location">
                      <MapPin size={11} color="#94a3b8" />
                      <span>{t.location || t.state || 'India'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mobile-card-actions">
                  <button
                    className="btn btn-primary mobile-action-btn"
                    onClick={() => onSelectTender(t)}
                  >
                    <Eye size={14} />
                    <span>Inspect Details</span>
                  </button>
                  <a
                    href={t.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleCopyAndOpenPortal(e, t)}
                    className={`btn btn-outline mobile-action-btn ${copiedId === t.id ? 'btn-copied' : ''}`}
                  >
                    {copiedId === t.id ? <Check size={14} color="#34d399" /> : <ExternalLink size={14} />}
                    <span>{copiedId === t.id ? 'Copied ID' : 'Open Portal'}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
