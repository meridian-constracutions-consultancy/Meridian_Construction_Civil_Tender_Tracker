import React, { useState, useEffect, useRef } from 'react';
import { Search, FileSpreadsheet, FileText, CheckCircle2, X } from 'lucide-react';
import { FilterState } from '../types/tender';
import { getExportUrl } from '../api/client';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  // Local state for 0-lag instant typing feedback
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debounceTimerRef = useRef<number | null>(null);

  // Sync if external filters change (e.g. Reset)
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      onFilterChange({ search: value });
    }, 280);
  };

  const clearSearch = () => {
    setLocalSearch('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onFilterChange({ search: '' });
  };

  const handleExport = (type: 'csv' | 'excel') => {
    const url = getExportUrl(type, filters);
    window.open(url, '_blank');
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category_id ||
    filters.state ||
    filters.value_range ||
    filters.closing_soon ||
    filters.listed_today ||
    filters.has_pre_bid ||
    filters.jv_allowed ||
    filters.source_id
  );

  return (
    <div className="filter-section">
      {/* Primary search and dropdown controls */}
      <div className="filter-row filter-row-primary">
        {/* Full-Text Search Input */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search design & consultancy tender title, ID, ref no, department, location..."
            value={localSearch}
            onChange={handleSearchChange}
            aria-label="Search tenders"
          />
          {localSearch && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={clearSearch}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <select
          className="select-input select-category"
          value={filters.category_id}
          onChange={(e) => onFilterChange({ category_id: e.target.value })}
          aria-label="Select design category"
        >
          <option value="">All Design & Consultancy Categories</option>
          <option value="structural_engineering">Structural Engineering & Design</option>
          <option value="consultancy_pmc_dpr">Architecture, PMC & DPR Consultancy</option>
          <option value="bridges_flyovers">Bridges, ROBs & Flyovers Design</option>
          <option value="metro_railways">Metro & Railway Design / Consultancy</option>
          <option value="roads_highways">Highways & Roads Design / DPR</option>
          <option value="water_supply_drainage">Water Supply & Drainage Design</option>
        </select>

        {/* State Dropdown */}
        <select
          className="select-input select-state"
          value={filters.state}
          onChange={(e) => onFilterChange({ state: e.target.value })}
          aria-label="Select state or authority"
        >
          <option value="">All States / Authorities</option>
          <option value="Rajasthan">Rajasthan</option>
          <option value="Central">Central / All India</option>
        </select>

        {/* Value Range Dropdown */}
        <select
          className="select-input select-value"
          value={filters.value_range}
          onChange={(e) => onFilterChange({ value_range: e.target.value })}
          aria-label="Select estimated value range"
        >
          <option value="">Any Estimated Value</option>
          <option value="under_50l">Under ₹50 Lakhs</option>
          <option value="50l_2cr">₹50 Lakhs - ₹2 Crores</option>
          <option value="2cr_10cr">₹2 Crores - ₹10 Crores</option>
          <option value="above_10cr">Above ₹10 Crores</option>
        </select>

        {/* Export Buttons */}
        <div className="filter-export-group">
          <button
            className="btn btn-outline btn-export"
            onClick={() => handleExport('csv')}
            title="Export filtered records to CSV"
          >
            <FileText size={14} />
            <span>CSV</span>
          </button>
          <button
            className="btn btn-primary btn-export"
            onClick={() => handleExport('excel')}
            title="Export filtered records to formatted Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Toggles & Chips */}
      <div className="filter-row filter-row-chips">
        <div className="chips-scroll-container">
          <button
            type="button"
            className="toggle-filter-chip active"
            style={{ cursor: 'default' }}
            title="Registry is strictly isolated to Civil Design, Architecture & Consultancy Tenders"
          >
            <CheckCircle2 size={13} color="#34d399" />
            <span>Design & Consultancy (Verified)</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.listed_today ? 'active' : ''}`}
            onClick={() => onFilterChange({ listed_today: !filters.listed_today })}
          >
            <span>🔥 Listed Today</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.closing_soon ? 'active' : ''}`}
            onClick={() => onFilterChange({ closing_soon: !filters.closing_soon })}
          >
            <span>⏰ Closing in 7 Days</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.jv_allowed ? 'active' : ''}`}
            onClick={() => onFilterChange({ jv_allowed: !filters.jv_allowed })}
          >
            <span>🤝 JV Allowed</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.has_pre_bid ? 'active' : ''}`}
            onClick={() => onFilterChange({ has_pre_bid: !filters.has_pre_bid })}
          >
            <span>📅 Pre-Bid Active</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.category_id === 'bridges_flyovers' ? 'active' : ''}`}
            onClick={() => onFilterChange({ category_id: filters.category_id === 'bridges_flyovers' ? '' : 'bridges_flyovers' })}
          >
            <span>🌉 ROB & Bridges</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.category_id === 'metro_railways' ? 'active' : ''}`}
            onClick={() => onFilterChange({ category_id: filters.category_id === 'metro_railways' ? '' : 'metro_railways' })}
          >
            <span>🚇 Metro & Railways (JMRC/IRCON/DFCCIL)</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.category_id === 'structural_engineering' ? 'active' : ''}`}
            onClick={() => onFilterChange({ category_id: filters.category_id === 'structural_engineering' ? '' : 'structural_engineering' })}
          >
            <span>🏛️ Architecture & Structure Design</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.category_id === 'water_supply_drainage' ? 'active' : ''}`}
            onClick={() => onFilterChange({ category_id: filters.category_id === 'water_supply_drainage' ? '' : 'water_supply_drainage' })}
          >
            <span>💧 Water Supply & Drainage Design</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.category_id === 'consultancy_pmc_dpr' ? 'active' : ''}`}
            onClick={() => onFilterChange({ category_id: filters.category_id === 'consultancy_pmc_dpr' ? '' : 'consultancy_pmc_dpr' })}
          >
            <span>📐 PMC & Consultancy</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.search === 'PWD' ? 'active' : ''}`}
            onClick={() => onFilterChange({ search: filters.search === 'PWD' ? '' : 'PWD' })}
          >
            <span>🛣️ PWD / RSRDC</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.search === 'NHAI' ? 'active' : ''}`}
            onClick={() => onFilterChange({ search: filters.search === 'NHAI' ? '' : 'NHAI' })}
          >
            <span>🛣️ NHAI</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.search === 'JDA' ? 'active' : ''}`}
            onClick={() => onFilterChange({ search: filters.search === 'JDA' ? '' : 'JDA' })}
          >
            <span>🏢 JDA</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.source_id === 'rajasthan_eproc' ? 'active' : ''}`}
            onClick={() => onFilterChange({ source_id: filters.source_id === 'rajasthan_eproc' ? '' : 'rajasthan_eproc' })}
          >
            <span>Rajasthan eProc</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.source_id === 'central_cppp' ? 'active' : ''}`}
            onClick={() => onFilterChange({ source_id: filters.source_id === 'central_cppp' ? '' : 'central_cppp' })}
          >
            <span>Central CPPP</span>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            className="btn btn-outline btn-reset-filters"
            onClick={onReset}
            title="Clear all active filters"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};
