import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ExternalLink, Eye, Building, MapPin, Check, LayoutList, LayoutGrid, Calendar, AlertTriangle, ChevronDown, Search, X } from 'lucide-react';
import { TenderListItem } from '../types/tender';
import { fetchLocations } from '../api/client';

interface TenderTableProps {
  tenders: TenderListItem[];
  isLoading: boolean;
  onSelectTender: (tender: TenderListItem) => void;
  sortBy: string;
  order: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  isCivilOnly?: boolean;
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
}

interface CityOption {
  name: string;
  state?: string;
  region: 'rajasthan' | 'other';
}

const ALL_CITIES_CATALOG: CityOption[] = [
  // Rajasthan Major Cities & Districts (All 50 Districts / Prominent Locations)
  { name: 'Jaipur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Sawai Madhopur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Jodhpur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Kota', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Ajmer', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Udaipur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Bhilwara', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Bhiwadi', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Bundi', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Dausa', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Dungarpur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Sumerpur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Hindaun', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Chaksu', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Alwar', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Bikaner', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Bharatpur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Sikar', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Pali', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Sri Ganganagar', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Barmer', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Jhunjhunu', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Churu', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Nagaur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Hanumangarh', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Chittorgarh', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Jalore', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Sirohi', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Tonk', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Banswara', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Rajsamand', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Baran', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Dholpur', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Jhalawar', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Pratapgarh', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Karauli', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Balotra', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Beawar', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Deeg', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Didwana', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Dudu', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Gangapur City', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Kekri', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Kotputli', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Khairthal', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Neem Ka Thana', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Phalodi', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Salumbar', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Sanchore', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Shahpura', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Anupgarh', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Kishangarh', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Makrana', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Sujangarh', state: 'Rajasthan', region: 'rajasthan' },
  { name: 'Abu Road', state: 'Rajasthan', region: 'rajasthan' },
  
  // All States & Major Cities
  { name: 'Delhi', state: 'National Capital Region', region: 'other' },
  { name: 'Manipur', state: 'Northeast India', region: 'other' },
  { name: 'Imphal', state: 'Manipur', region: 'other' },
  { name: 'Dehradun', state: 'Uttarakhand', region: 'other' },
  { name: 'Patna', state: 'Bihar', region: 'other' },
  { name: 'Bhubaneswar', state: 'Odisha', region: 'other' },
  { name: 'Mumbai', state: 'Maharashtra', region: 'other' },
  { name: 'Chandigarh', state: 'Punjab / Haryana', region: 'other' },
  { name: 'Kolkata', state: 'West Bengal', region: 'other' },
  { name: 'Lucknow', state: 'Uttar Pradesh', region: 'other' },
  { name: 'Pune', state: 'Maharashtra', region: 'other' },
  { name: 'Bangalore', state: 'Karnataka', region: 'other' },
  { name: 'Gandhinagar', state: 'Gujarat', region: 'other' },
  { name: 'Guwahati', state: 'Assam', region: 'other' },
  { name: 'Ahmedabad', state: 'Gujarat', region: 'other' },
  { name: 'Hyderabad', state: 'Telangana', region: 'other' },
  { name: 'Chennai', state: 'Tamil Nadu', region: 'other' },
  { name: 'Bhopal', state: 'Madhya Pradesh', region: 'other' },
  { name: 'Indore', state: 'Madhya Pradesh', region: 'other' },
  { name: 'Raipur', state: 'Chhattisgarh', region: 'other' },
  { name: 'Ranchi', state: 'Jharkhand', region: 'other' },
  { name: 'Noida', state: 'Uttar Pradesh', region: 'other' },
  { name: 'Kanpur', state: 'Uttar Pradesh', region: 'other' },
  { name: 'Varanasi', state: 'Uttar Pradesh', region: 'other' },
  { name: 'Shimla', state: 'Himachal Pradesh', region: 'other' },
  { name: 'Jammu', state: 'Jammu & Kashmir', region: 'other' },
  { name: 'Srinagar', state: 'Jammu & Kashmir', region: 'other' },
  { name: 'Goa', state: 'Goa', region: 'other' },
  { name: 'Kochi', state: 'Kerala', region: 'other' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', region: 'other' },
  { name: 'Surat', state: 'Gujarat', region: 'other' },
  { name: 'Vadodara', state: 'Gujarat', region: 'other' },
];

const PAGE_SIZE = 10;

export const TenderTable: React.FC<TenderTableProps> = ({
  tenders,
  isLoading,
  onSelectTender,
  sortBy,
  order,
  onSortChange,
  isCivilOnly = true,
  selectedLocation = '',
  onLocationChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // View mode: 'auto' (cards on mobile, table on desktop), or explicit 'table' / 'cards'
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Location Column Filter Dropdown State
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState<boolean>(false);
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [locationTab, setLocationTab] = useState<'all' | 'rajasthan' | 'other'>('all');
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>({});
  const locationMenuRef = useRef<HTMLTableCellElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch live location tender counts from backend
  useEffect(() => {
    fetchLocations().then((locs) => {
      const counts: Record<string, number> = {};
      locs.forEach((l) => {
        counts[l.name] = l.count;
      });
      setLocationCounts(counts);
    });
  }, []);

  // Handle click outside to close location menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) {
        setIsLocationMenuOpen(false);
      }
    };
    if (isLocationMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLocationMenuOpen]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isLocationMenuOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isLocationMenuOpen]);

  // Compute filtered city options based on search query and region tab
  const filteredCities = useMemo(() => {
    // 1. Start with base catalog
    const knownNames = new Set(ALL_CITIES_CATALOG.map((c) => c.name.toLowerCase()));
    const dynamicList = [...ALL_CITIES_CATALOG];

    // 2. Add any locations discovered dynamically from backend tender counts
    Object.keys(locationCounts).forEach((locName) => {
      if (!knownNames.has(locName.toLowerCase()) && locName.length > 2) {
        knownNames.add(locName.toLowerCase());
        dynamicList.push({
          name: locName,
          state: 'Discovered Location',
          region: 'other'
        });
      }
    });

    let list = dynamicList;
    if (locationTab === 'rajasthan') {
      list = list.filter((c) => c.region === 'rajasthan');
    } else if (locationTab === 'other') {
      list = list.filter((c) => c.region === 'other');
    }

    if (locationSearch.trim()) {
      const q = locationSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.state && c.state.toLowerCase().includes(q))
      );
    }

    // Sort by count descending, then alphabetically
    return [...list].sort((a, b) => {
      const countA = locationCounts[a.name] || 0;
      const countB = locationCounts[b.name] || 0;
      if (countA !== countB) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [locationTab, locationSearch, locationCounts]);

  // Automatically reset to page 1 when data or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [tenders, sortBy, order, selectedLocation]);

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

  // Format date and time (e.g. 22-10-2026, 6.30 pm)
  const formatDateTime = useCallback((dateStr?: string) => {
    if (!dateStr) return { date: 'Refer NIT', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const date = `${day}-${month}-${year}`;

      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const time = `${hours}.${minutes} ${ampm}`;

      return { date, time, full: `${date} ${time}` };
    } catch {
      return { date: dateStr, time: '' };
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
      // Strictly match today's calendar date (avoid labeling yesterday's tenders as Listed Today)
      const pubDatePrefix = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayPrefix = `${year}-${month}-${day}`;

      if (pubDatePrefix === todayPrefix) {
        return true;
      }

      const pub = new Date(dateStr);
      return (
        pub.getFullYear() === now.getFullYear() &&
        pub.getMonth() === now.getMonth() &&
        pub.getDate() === now.getDate()
      );
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
      formattedPublished: formatDateTime(t.published_date),
      formattedClosing: formatDateTime(t.bid_submission_deadline),
    }));
  }, [tenders, isClosingSoon, isListedToday, getCategoryLabel, formatIndianCurrency, formatDateTime]);

  // Strict chronological sorting: newest published date & time always first (down to the exact minute)
  const sortedProcessedTenders = useMemo(() => {
    if (sortBy === 'published_date') {
      return [...processedTenders].sort((a, b) => {
        const timeA = a.published_date ? new Date(a.published_date).getTime() : 0;
        const timeB = b.published_date ? new Date(b.published_date).getTime() : 0;
        return order === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }
    return processedTenders;
  }, [processedTenders, sortBy, order]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedProcessedTenders.length / PAGE_SIZE));
  const paginatedTenders = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedProcessedTenders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedProcessedTenders, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

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
              <th className={`location-header-th ${selectedLocation ? 'is-filtered' : ''}`} ref={locationMenuRef}>
                <div 
                  className="location-header-btn" 
                  onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                  title="Click to filter by Rajasthan or All Indian Cities/States"
                >
                  <div className="location-header-text">
                    <MapPin size={12} className="loc-pin-icon" />
                    <span>LOCATION</span>
                  </div>
                  {selectedLocation ? (
                    <span 
                      className="location-pill-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLocationChange?.('');
                      }}
                      title={`Active filter: ${selectedLocation}. Click to clear.`}
                    >
                      <span className="loc-pill-name">{selectedLocation}</span>
                      <X size={11} className="loc-pill-x" />
                    </span>
                  ) : (
                    <ChevronDown size={12} className={`loc-chevron ${isLocationMenuOpen ? 'open' : ''}`} />
                  )}
                </div>

                {isLocationMenuOpen && (
                  <div className="location-dropdown-panel" onClick={(e) => e.stopPropagation()}>
                    {/* Header bar */}
                    <div className="loc-panel-header">
                      <div className="loc-panel-title">Filter by City / State</div>
                      {selectedLocation && (
                        <button 
                          type="button" 
                          className="loc-panel-clear-btn" 
                          onClick={() => {
                            onLocationChange?.('');
                            setIsLocationMenuOpen(false);
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Search box */}
                    <div className="loc-panel-search">
                      <Search size={13} className="loc-panel-search-icon" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="loc-panel-search-input"
                        placeholder="Search city/state (e.g. Jaipur, Delhi, Sawai)..."
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                      />
                      {locationSearch && (
                        <button 
                          type="button" 
                          className="loc-panel-search-clear" 
                          onClick={() => setLocationSearch('')}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Region Tabs */}
                    <div className="loc-panel-tabs">
                      <button 
                        type="button"
                        className={`loc-tab-btn ${locationTab === 'all' ? 'active' : ''}`}
                        onClick={() => setLocationTab('all')}
                      >
                        All
                      </button>
                      <button 
                        type="button"
                        className={`loc-tab-btn ${locationTab === 'rajasthan' ? 'active' : ''}`}
                        onClick={() => setLocationTab('rajasthan')}
                      >
                        Rajasthan (50+)
                      </button>
                      <button 
                        type="button"
                        className={`loc-tab-btn ${locationTab === 'other' ? 'active' : ''}`}
                        onClick={() => setLocationTab('other')}
                      >
                        Other States / Metros
                      </button>
                    </div>

                    {/* Items List */}
                    <div className="loc-panel-list">
                      {/* Show All Reset Item */}
                      <div 
                        className={`loc-list-item ${!selectedLocation ? 'selected' : ''}`}
                        onClick={() => {
                          onLocationChange?.('');
                          setIsLocationMenuOpen(false);
                        }}
                      >
                        <span className="loc-list-name">📍 All Locations (Show All)</span>
                        {!selectedLocation && <Check size={13} className="loc-check-icon" />}
                      </div>

                      {/* If user typed a search term not in list */}
                      {locationSearch.trim() && !filteredCities.some(c => c.name.toLowerCase() === locationSearch.trim().toLowerCase()) && (
                        <div 
                          className="loc-list-item custom-search-item"
                          onClick={() => {
                            onLocationChange?.(locationSearch.trim());
                            setIsLocationMenuOpen(false);
                          }}
                        >
                          <span className="loc-list-name">🔍 Filter tenders matching &quot;<b>{locationSearch.trim()}</b>&quot;</span>
                        </div>
                      )}

                      {filteredCities.map((city) => {
                        const isSelected = selectedLocation?.toLowerCase() === city.name.toLowerCase();
                        const count = locationCounts[city.name] || 0;
                        return (
                          <div 
                            key={city.name}
                            className={`loc-list-item ${isSelected ? 'selected' : ''} ${count > 0 ? 'has-tenders' : ''}`}
                            onClick={() => {
                              onLocationChange?.(city.name);
                              setIsLocationMenuOpen(false);
                            }}
                          >
                            <div className="loc-item-info">
                              <span className="loc-list-name">{city.name}</span>
                              {city.state && <span className="loc-list-state">({city.state})</span>}
                            </div>
                            <div className="loc-item-meta">
                              {count > 0 && (
                                <span className="loc-tender-count-badge">
                                  {count} {count === 1 ? 'tender' : 'tenders'}
                                </span>
                              )}
                              {isSelected && <Check size={13} className="loc-check-icon" />}
                            </div>
                          </div>
                        );
                      })}

                      {filteredCities.length === 0 && (
                        <div className="loc-empty-hint">
                          No pre-catalogued city found. Click above to search &quot;{locationSearch}&quot;.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </th>
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
              paginatedTenders.map((t) => (
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
                    {t.matched_keywords && (
                      <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '4px', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`Matched Keywords: ${t.matched_keywords}`}>
                        🎯 {t.matched_keywords}
                      </div>
                    )}
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
                  <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                    <div className="datetime-wrapper">
                      <span className="datetime-date">{t.formattedPublished.date}</span>
                      {t.formattedPublished.time && (
                        <span className="datetime-time">{t.formattedPublished.time}</span>
                      )}
                    </div>
                    {t.isToday && (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', marginTop: '3px', fontSize: '10px', padding: '1px 5px', display: 'inline-block' }}>
                        🔥 Listed Today
                      </span>
                    )}
                  </td>

                  {/* Closing Date */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="datetime-wrapper">
                      <span className="datetime-date" style={{ color: t.closingSoon ? '#fbbf24' : '#e2e8f0', fontWeight: t.closingSoon ? 600 : 400 }}>
                        {t.formattedClosing.date}
                      </span>
                      {t.formattedClosing.time && (
                        <span className="datetime-time" style={{ color: t.closingSoon ? '#fde68a' : '#94a3b8' }}>
                          {t.formattedClosing.time}
                        </span>
                      )}
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
                    {t.is_joint_venture_allowed !== false && (
                      <div style={{ marginTop: '3px' }}>
                        <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '10px' }}>
                          🤝 JV Allowed
                        </span>
                      </div>
                    )}
                    {t.pre_bid_meeting_date && (
                      <div style={{ marginTop: '2px' }}>
                        <span className="badge" style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.3)', fontSize: '10px' }}>
                          📅 Pre-Bid Active
                        </span>
                      </div>
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
            {paginatedTenders.map((t) => (
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
                    {t.is_joint_venture_allowed !== false && (
                      <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                        🤝 JV
                      </span>
                    )}
                    {t.pre_bid_meeting_date && (
                      <span className="badge" style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                        📅 Pre-Bid
                      </span>
                    )}
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
                      {t.formattedClosing.full}
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

      {/* 3. TABLE PAGINATION BAR (10 rows per page, 1 2 3 4 5 buttons, max 100 tenders) */}
      {processedTenders.length > 0 && (
        <div className="table-pagination-bar">
          <div className="pagination-info">
            Showing <span className="pagination-highlight">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="pagination-highlight">{Math.min(currentPage * PAGE_SIZE, processedTenders.length)}</span> of <span className="pagination-highlight">{processedTenders.length}</span> latest design tenders (Max 100)
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`pagination-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                  aria-label={`Page ${pageNum}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
