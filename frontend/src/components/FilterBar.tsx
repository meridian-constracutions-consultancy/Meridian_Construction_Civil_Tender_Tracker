import React, { useState, useEffect, useRef } from 'react';
import { Search, FileSpreadsheet, FileText, CheckCircle2, X, MapPin } from 'lucide-react';
import { FilterState, LocationItem } from '../types/tender';
import { getExportUrl, fetchLocations } from '../api/client';

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
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const debounceTimerRef = useRef<number | null>(null);

  // Sync if external filters change (e.g. Reset)
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Load available locations dynamically from database
  useEffect(() => {
    fetchLocations().then((locs) => {
      if (locs && locs.length > 0) {
        setLocations(locs);
      }
    });
  }, []);

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
    filters.location ||
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

        {/* Location Dropdown Button / Select */}
        <div className="location-select-wrapper">
          <MapPin size={14} className="location-icon" />
          <select
            className={`select-input select-location ${filters.location ? 'active-location-select' : ''}`}
            value={filters.location || ''}
            onChange={(e) => onFilterChange({ location: e.target.value })}
            aria-label="Filter by location"
          >
            <option value="">📍 All Locations / Cities</option>
            {locations.length > 0 ? (
              <>
                <optgroup label="⭐ Top Project Locations">
                  {locations.slice(0, 7).map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name} ({loc.count})
                    </option>
                  ))}
                </optgroup>
                {locations.length > 7 && (
                  <optgroup label="🏛️ Other Available Locations">
                    {locations.slice(7).map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name} ({loc.count})
                      </option>
                    ))}
                  </optgroup>
                )}
              </>
            ) : (
              <>
                <optgroup label="⭐ Popular Locations">
                  <option value="Jaipur">Jaipur (5)</option>
                  <option value="Delhi">Delhi (6)</option>
                  <option value="Sawai Madhopur">Sawai Madhopur (1)</option>
                  <option value="Jodhpur">Jodhpur (2)</option>
                  <option value="Kota">Kota (1)</option>
                  <option value="Ajmer">Ajmer (2)</option>
                  <option value="Udaipur">Udaipur (1)</option>
                </optgroup>
              </>
            )}
          </select>
          {filters.location && (
            <button
              type="button"
              className="location-clear-btn"
              onClick={() => onFilterChange({ location: '' })}
              title="Clear selected location"
              aria-label="Clear selected location"
            >
              <X size={12} />
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
            className={`toggle-filter-chip ${filters.under_15_days ? 'active' : ''}`}
            onClick={() => onFilterChange({ under_15_days: !filters.under_15_days })}
          >
            <span>📅 Under 15 Days</span>
          </button>

          <button
            className={`toggle-filter-chip ${filters.closing_soon ? 'active' : ''}`}
            onClick={() => onFilterChange({ closing_soon: !filters.closing_soon })}
          >
            <span>⏰ Closing in 7 Days</span>
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
