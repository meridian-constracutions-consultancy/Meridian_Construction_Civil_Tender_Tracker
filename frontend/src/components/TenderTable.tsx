import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Eye,
  Building,
  MapPin,
  Check,
  LayoutList,
  LayoutGrid,
  Search,
  X,
  ChevronDown,
  Star,
  Trash2,
  RotateCcw,
  XCircle
} from 'lucide-react';
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
  currentView?: 'main' | 'special' | 'declined';
  onViewChange?: (view: 'main' | 'special' | 'declined') => void;
  viewCounts?: {
    main: number;
    special: number;
    declined: number;
  };
  onToggleSpecial?: (tender: TenderListItem) => void;
  onDeclineTender?: (tender: TenderListItem) => void;
  onRestoreTender?: (tender: TenderListItem) => void;
  onPermanentDelete?: (tender: TenderListItem) => void;
}

interface CityOption {
  name: string;
  state: string;
  region: 'primary' | 'other';
}

const ALL_CITIES_CATALOG: CityOption[] = [
  // 1. RAJASTHAN (Primary State - All Major Cities & Districts)
  { name: 'Jaipur', state: 'Rajasthan', region: 'primary' },
  { name: 'Sawai Madhopur', state: 'Rajasthan', region: 'primary' },
  { name: 'Jodhpur', state: 'Rajasthan', region: 'primary' },
  { name: 'Kota', state: 'Rajasthan', region: 'primary' },
  { name: 'Ajmer', state: 'Rajasthan', region: 'primary' },
  { name: 'Udaipur', state: 'Rajasthan', region: 'primary' },
  { name: 'Bhilwara', state: 'Rajasthan', region: 'primary' },
  { name: 'Bhiwadi', state: 'Rajasthan', region: 'primary' },
  { name: 'Bundi', state: 'Rajasthan', region: 'primary' },
  { name: 'Dausa', state: 'Rajasthan', region: 'primary' },
  { name: 'Dungarpur', state: 'Rajasthan', region: 'primary' },
  { name: 'Sumerpur', state: 'Rajasthan', region: 'primary' },
  { name: 'Hindaun', state: 'Rajasthan', region: 'primary' },
  { name: 'Chaksu', state: 'Rajasthan', region: 'primary' },
  { name: 'Alwar', state: 'Rajasthan', region: 'primary' },
  { name: 'Bikaner', state: 'Rajasthan', region: 'primary' },
  { name: 'Bharatpur', state: 'Rajasthan', region: 'primary' },
  { name: 'Sikar', state: 'Rajasthan', region: 'primary' },
  { name: 'Pali', state: 'Rajasthan', region: 'primary' },
  { name: 'Sri Ganganagar', state: 'Rajasthan', region: 'primary' },
  { name: 'Barmer', state: 'Rajasthan', region: 'primary' },
  { name: 'Jhunjhunu', state: 'Rajasthan', region: 'primary' },
  { name: 'Churu', state: 'Rajasthan', region: 'primary' },
  { name: 'Nagaur', state: 'Rajasthan', region: 'primary' },
  { name: 'Hanumangarh', state: 'Rajasthan', region: 'primary' },
  { name: 'Chittorgarh', state: 'Rajasthan', region: 'primary' },
  { name: 'Jalore', state: 'Rajasthan', region: 'primary' },
  { name: 'Sirohi', state: 'Rajasthan', region: 'primary' },
  { name: 'Tonk', state: 'Rajasthan', region: 'primary' },
  { name: 'Banswara', state: 'Rajasthan', region: 'primary' },
  { name: 'Rajsamand', state: 'Rajasthan', region: 'primary' },
  { name: 'Baran', state: 'Rajasthan', region: 'primary' },
  { name: 'Dholpur', state: 'Rajasthan', region: 'primary' },
  { name: 'Jhalawar', state: 'Rajasthan', region: 'primary' },
  { name: 'Pratapgarh', state: 'Rajasthan', region: 'primary' },
  { name: 'Karauli', state: 'Rajasthan', region: 'primary' },
  { name: 'Balotra', state: 'Rajasthan', region: 'primary' },
  { name: 'Beawar', state: 'Rajasthan', region: 'primary' },
  { name: 'Deeg', state: 'Rajasthan', region: 'primary' },
  { name: 'Didwana', state: 'Rajasthan', region: 'primary' },
  { name: 'Dudu', state: 'Rajasthan', region: 'primary' },
  { name: 'Gangapur City', state: 'Rajasthan', region: 'primary' },
  { name: 'Kekri', state: 'Rajasthan', region: 'primary' },
  { name: 'Kotputli', state: 'Rajasthan', region: 'primary' },
  { name: 'Khairthal', state: 'Rajasthan', region: 'primary' },
  { name: 'Neem Ka Thana', state: 'Rajasthan', region: 'primary' },
  { name: 'Phalodi', state: 'Rajasthan', region: 'primary' },
  { name: 'Salumbar', state: 'Rajasthan', region: 'primary' },
  { name: 'Sanchore', state: 'Rajasthan', region: 'primary' },
  { name: 'Shahpura', state: 'Rajasthan', region: 'primary' },
  { name: 'Anupgarh', state: 'Rajasthan', region: 'primary' },
  { name: 'Kishangarh', state: 'Rajasthan', region: 'primary' },
  { name: 'Makrana', state: 'Rajasthan', region: 'primary' },
  { name: 'Sujangarh', state: 'Rajasthan', region: 'primary' },
  { name: 'Abu Road', state: 'Rajasthan', region: 'primary' },

  // 2. DELHI / NCR
  { name: 'Delhi', state: 'Delhi/NCR', region: 'primary' },
  { name: 'New Delhi', state: 'Delhi/NCR', region: 'primary' },
  { name: 'Noida', state: 'Delhi/NCR', region: 'primary' },
  { name: 'Greater Noida', state: 'Delhi/NCR', region: 'primary' },
  { name: 'Ghaziabad', state: 'Delhi/NCR', region: 'primary' },
  { name: 'Gurugram', state: 'Delhi/NCR', region: 'primary' },
  { name: 'Faridabad', state: 'Delhi/NCR', region: 'primary' },
  { name: 'Sonipat', state: 'Delhi/NCR', region: 'primary' },
  { name: 'Meerut', state: 'Delhi/NCR', region: 'primary' },

  // 3. UTTAR PRADESH
  { name: 'Lucknow', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Kanpur', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Varanasi', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Agra', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Prayagraj', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Bareilly', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Aligarh', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Moradabad', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Saharanpur', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Mathura', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Ayodhya', state: 'Uttar Pradesh', region: 'primary' },
  { name: 'Jhansi', state: 'Uttar Pradesh', region: 'primary' },

  // 4. MADHYA PRADESH
  { name: 'Bhopal', state: 'Madhya Pradesh', region: 'primary' },
  { name: 'Indore', state: 'Madhya Pradesh', region: 'primary' },
  { name: 'Gwalior', state: 'Madhya Pradesh', region: 'primary' },
  { name: 'Jabalpur', state: 'Madhya Pradesh', region: 'primary' },
  { name: 'Ujjain', state: 'Madhya Pradesh', region: 'primary' },

  // 5. HARYANA
  { name: 'Chandigarh', state: 'Haryana/Punjab', region: 'primary' },
  { name: 'Panipat', state: 'Haryana', region: 'primary' },
  { name: 'Ambala', state: 'Haryana', region: 'primary' },
  { name: 'Rohtak', state: 'Haryana', region: 'primary' },
  { name: 'Hisar', state: 'Haryana', region: 'primary' },
  { name: 'Karnal', state: 'Haryana', region: 'primary' },

  // 6. BIHAR
  { name: 'Patna', state: 'Bihar', region: 'primary' },
  { name: 'Gaya', state: 'Bihar', region: 'primary' },
  { name: 'Bhagalpur', state: 'Bihar', region: 'primary' },
  { name: 'Muzaffarpur', state: 'Bihar', region: 'primary' },

  // 7. UTTARAKHAND
  { name: 'Dehradun', state: 'Uttarakhand', region: 'primary' },
  { name: 'Haridwar', state: 'Uttarakhand', region: 'primary' },
  { name: 'Rishikesh', state: 'Uttarakhand', region: 'primary' },
  { name: 'Roorkee', state: 'Uttarakhand', region: 'primary' },
  { name: 'Haldwani', state: 'Uttarakhand', region: 'primary' },

  // 8. OTHER STATES
  { name: 'Mumbai', state: 'Maharashtra', region: 'other' },
  { name: 'Pune', state: 'Maharashtra', region: 'other' },
  { name: 'Nagpur', state: 'Maharashtra', region: 'other' },
  { name: 'Ahmedabad', state: 'Gujarat', region: 'other' },
  { name: 'Surat', state: 'Gujarat', region: 'other' },
  { name: 'Gandhinagar', state: 'Gujarat', region: 'other' },
  { name: 'Vadodara', state: 'Gujarat', region: 'other' },
  { name: 'Kolkata', state: 'West Bengal', region: 'other' },
  { name: 'Bangalore', state: 'Karnataka', region: 'other' },
  { name: 'Hyderabad', state: 'Telangana', region: 'other' },
  { name: 'Chennai', state: 'Tamil Nadu', region: 'other' },
  { name: 'Bhubaneswar', state: 'Odisha', region: 'other' },
  { name: 'Ranchi', state: 'Jharkhand', region: 'other' },
  { name: 'Raipur', state: 'Chhattisgarh', region: 'other' },
  { name: 'Guwahati', state: 'Assam', region: 'other' },
  { name: 'Imphal', state: 'Manipur', region: 'other' },
  { name: 'Shillong', state: 'Meghalaya', region: 'other' },
  { name: 'Shimla', state: 'Himachal Pradesh', region: 'other' },
  { name: 'Srinagar', state: 'Jammu & Kashmir', region: 'other' },
  { name: 'Jammu', state: 'Jammu & Kashmir', region: 'other' },
  { name: 'Goa', state: 'Goa', region: 'other' },
];

export const TenderTable: React.FC<TenderTableProps> = ({
  tenders,
  isLoading,
  onSelectTender,
  sortBy,
  order,
  onSortChange,
  isCivilOnly = true,
  selectedLocation,
  onLocationChange,
  currentView = 'main',
  onViewChange,
  viewCounts,
  onToggleSpecial,
  onDeclineTender,
  onRestoreTender,
  onPermanentDelete,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Location selector state
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState<boolean>(false);
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [locationTab, setLocationTab] = useState<'all' | 'primary' | 'other'>('all');
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>({});
  const locationMenuRef = useRef<HTMLTableHeaderCellElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close location menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationMenuRef.current && !locationMenuRef.current.contains(e.target as Node)) {
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

  // Fetch backend count statistics for locations
  useEffect(() => {
    fetchLocations().then((locs) => {
      const countsMap: Record<string, number> = {};
      locs.forEach((item) => {
        countsMap[item.name] = item.count;
      });
      setLocationCounts(countsMap);
    });
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isLocationMenuOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isLocationMenuOpen]);

  // Compute filtered city options based on search query and region tab
  const filteredCities = useMemo(() => {
    // 1. Start with base catalog (7 Selected Hindi States: Rajasthan, UP, MP, Haryana, Delhi/NCR, Bihar, Uttarakhand)
    const knownNames = new Set(ALL_CITIES_CATALOG.map((c) => c.name.toLowerCase()));
    const dynamicList = [...ALL_CITIES_CATALOG];

    // 2. Auto-discover from backend count API
    Object.keys(locationCounts).forEach((locName) => {
      if (!knownNames.has(locName.toLowerCase()) && locName.length > 2) {
        knownNames.add(locName.toLowerCase());
        dynamicList.push({
          name: locName,
          state: 'Other',
          region: 'other'
        });
      }
    });

    // 3. AUTO-DETECT: Inspect all active tenders in table
    // If any tender has a city/location not in the list (e.g. Kerala), auto-add into 'Other'!
    tenders.forEach((t) => {
      const candidates = [t.location, t.district, t.state].filter(
        (loc): loc is string => Boolean(loc && loc.trim().length > 1)
      );

      candidates.forEach((loc) => {
        const cleanName = loc.trim();
        const lowerName = cleanName.toLowerCase();
        if (!knownNames.has(lowerName)) {
          knownNames.add(lowerName);
          dynamicList.push({
            name: cleanName,
            state: t.state || 'Other',
            region: 'other'
          });
        }
      });
    });

    let list = dynamicList;

    // Filter by Region Tabs ('all' vs 'primary' vs 'other')
    if (locationTab === 'primary') {
      list = list.filter((c) => c.region === 'primary');
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

    // Helper to calculate tender count for any city
    const getTenderCount = (cityName: string) => {
      if (locationCounts[cityName] !== undefined) return locationCounts[cityName];
      const lower = cityName.toLowerCase();
      return tenders.filter((t) =>
        (t.location && t.location.toLowerCase().includes(lower)) ||
        (t.district && t.district.toLowerCase().includes(lower)) ||
        (t.state && t.state.toLowerCase().includes(lower))
      ).length;
    };

    // Strict Sorting: The 7 Selected Hindi States ALWAYS show at the TOP, 'other' at the bottom
    return [...list].sort((a, b) => {
      const aIsPrimary = a.region === 'primary' ? 0 : 1;
      const bIsPrimary = b.region === 'primary' ? 0 : 1;
      if (aIsPrimary !== bIsPrimary) return aIsPrimary - bIsPrimary;

      const countA = getTenderCount(a.name);
      const countB = getTenderCount(b.name);
      if (countA !== countB) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [locationTab, locationSearch, locationCounts, tenders]);

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
          ₹{(amount / 100000).toFixed(2)} <span className="amount-lakhs">Lakh</span>
        </span>
      );
    }
    return (
      <span className="amount-val">
        ₹{amount.toLocaleString('en-IN')}
      </span>
    );
  }, []);

  const formatDateTime = useCallback((dateStr?: string) => {
    if (!dateStr) return { date: '-', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const date = `${day.toString().padStart(2, '0')}-${month}-${year}`;

      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const time = `${hours}:${minutes} ${ampm}`;

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
      case 'soil_geotech_testing': return 'Geotechnical & NDT Testing';
      case 'survey_investigation': return 'Survey & Investigation';
      case 'bridges_flyovers': return 'Bridges & ROBs Design';
      case 'roads_highways': return 'Highways & Expressways Design';
      case 'metro_railways': return 'Railways & Station Design';
      case 'dam_water': return 'Dam & Water Structures Design';
      case 'landscaping_beautification': return 'Landscaping & Beautification';
      case 'land_acquisition': return 'Land Acquisition Consultancy';
      case 'structural_audit': return 'Safety & Structural Audit';
      case 'architecture_design': return 'Architecture & Design';
      case 'pmc_consultancy': return 'Project Management (PMC)';
      case 'dpr_feasibility': return 'DPR & Feasibility Study';
      case 'structural_engineering': return 'Structural Design';
      case 'consultancy_general': return 'Consultancy Services';
      default: return 'Design & Consultancy';
    }
  }, []);

  // Pre-process items
  const processedTenders = useMemo(() => {
    return tenders.map((t) => ({
      ...t,
      categoryLabel: getCategoryLabel(t.category_id),
      formattedValue: formatIndianCurrency(t.estimated_value),
      formattedEmd: formatIndianCurrency(t.emd_amount),
      formattedPublished: formatDateTime(t.published_date),
      formattedClosing: formatDateTime(t.bid_submission_deadline),
      closingSoon: isClosingSoon(t.bid_submission_deadline),
    }));
  }, [tenders, getCategoryLabel, formatIndianCurrency, formatDateTime, isClosingSoon]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedTenders.length / PAGE_SIZE));
  const paginatedTenders = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return processedTenders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [processedTenders, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <div className={`table-container view-mode-${viewMode}`}>
      {/* 1. THREE ACTION VIEW NAVIGATION TABS */}
      <div className="tender-view-navigation">
        <button
          type="button"
          className={`tender-nav-tab ${currentView === 'main' ? 'active' : ''}`}
          onClick={() => onViewChange?.('main')}
        >
          <Building size={16} />
          <span>📋 Main Tenders</span>
          <span className="nav-tab-badge">{viewCounts?.main ?? 0}</span>
        </button>

        <button
          type="button"
          className={`tender-nav-tab special-nav-tab ${currentView === 'special' ? 'active' : ''}`}
          onClick={() => onViewChange?.('special')}
        >
          <Star size={16} fill={currentView === 'special' ? '#fbbf24' : 'none'} color="#fbbf24" />
          <span>⭐ Special Tenders (Never Expire)</span>
          <span className="nav-tab-badge special-badge">{viewCounts?.special ?? 0}</span>
        </button>

        <button
          type="button"
          className={`tender-nav-tab declined-nav-tab ${currentView === 'declined' ? 'active' : ''}`}
          onClick={() => onViewChange?.('declined')}
        >
          <Trash2 size={16} color="#f87171" />
          <span>🗑️ Declined / Recycle Bin</span>
          <span className="nav-tab-badge declined-badge">{viewCounts?.declined ?? 0}</span>
        </button>
      </div>

      {/* Info Notice Banners for Special & Declined views */}
      {currentView === 'special' && (
        <div className="view-info-banner special-info-banner">
          <Star size={16} color="#fbbf24" fill="#fbbf24" />
          <span>
            <strong>Special Tenders are permanently preserved in your database</strong> and will NEVER be auto-deleted even after closing.
          </span>
        </div>
      )}

      {currentView === 'declined' && (
        <div className="view-info-banner declined-info-banner">
          <Trash2 size={16} color="#f87171" />
          <span>
            <strong>Declined Tenders</strong> are hidden from your main list. They remain here until their deadline passes,
            after which they are <strong>automatically purged from the database</strong>. You can restore or permanently delete them below.
          </span>
        </div>
      )}

      {/* Header Bar with View Switcher */}
      <div className="table-header-bar">
        <div className="table-title-group">
          <h2 className="table-title">
            {currentView === 'special' ? (
              <Star size={18} color="#fbbf24" fill="#fbbf24" />
            ) : currentView === 'declined' ? (
              <Trash2 size={18} color="#f87171" />
            ) : (
              <Building size={18} color="#6366f1" />
            )}
            <span>
              {currentView === 'special'
                ? '⭐ Special Saved Tenders'
                : currentView === 'declined'
                  ? '🗑️ Declined Tenders (Recycle Bin)'
                  : 'Latest Discovered Design & Consultancy Tenders'}
            </span>
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

      {/* 2. DESKTOP / LAPTOP / TABLET TABULAR VIEW */}
      <div className="table-wrapper desktop-table-view">
        <table className="tender-table">
          <thead>
            <tr>
              {/* Checkbox column for Special in Main and Special views */}
              {currentView !== 'declined' && (
                <th style={{ textAlign: 'center', width: '56px' }} title="Mark as Special / Important">
                  ⭐ Special
                </th>
              )}
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
                        className={`loc-tab-btn ${locationTab === 'primary' ? 'active' : ''}`}
                        onClick={() => setLocationTab('primary')}
                        title="Rajasthan, UP, MP, Haryana, Delhi/NCR, Bihar, Uttarakhand"
                      >
                        Selected States (Top)
                      </button>
                      <button
                        type="button"
                        className={`loc-tab-btn ${locationTab === 'other' ? 'active' : ''}`}
                        onClick={() => setLocationTab('other')}
                        title="Other States & Cities"
                      >
                        Other
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
                        const count = locationCounts[city.name] !== undefined
                          ? locationCounts[city.name]
                          : tenders.filter(t =>
                            (t.location && t.location.toLowerCase().includes(city.name.toLowerCase())) ||
                            (t.district && t.district.toLowerCase().includes(city.name.toLowerCase())) ||
                            (t.state && t.state.toLowerCase().includes(city.name.toLowerCase()))
                          ).length;
                        const isOther = city.region === 'other';
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
                              {isOther && (
                                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginRight: '5px' }}>
                                  [OTHER]
                                </span>
                              )}
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
                <td colSpan={11} className="table-empty-cell">
                  Loading latest tenders from intelligence registry...
                </td>
              </tr>
            ) : tenders.length === 0 ? (
              <tr>
                <td colSpan={11} className="table-empty-cell">
                  {currentView === 'special'
                    ? '⭐ No Special Tenders saved yet. Click the ⭐ star on any tender to save it here forever!'
                    : currentView === 'declined'
                      ? '🗑️ No declined tenders. Tenders declined will appear here until auto-deleted on expiry.'
                      : 'No tenders match the specified filters. Try adjusting your search criteria.'}
                </td>
              </tr>
            ) : (
              paginatedTenders.map((t) => (
                <tr key={t.id} className={t.isNewArrival ? 'new-arrival' : ''}>
                  {/* Checkbox column for Special in Main and Special views */}
                  {currentView !== 'declined' && (
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        className={`star-checkbox-btn ${t.is_special ? 'is-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSpecial?.(t);
                        }}
                        title={t.is_special ? 'Remove from Special Tenders' : '⭐ Save to Special Tenders (Never Expire)'}
                      >
                        <Star
                          size={18}
                          color={t.is_special ? '#fbbf24' : '#64748b'}
                          fill={t.is_special ? '#fbbf24' : 'none'}
                        />
                      </button>
                    </td>
                  )}

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
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="badge badge-civil">
                      {t.categoryLabel}
                    </span>
                  </td>

                  {/* Value */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {t.formattedValue}
                  </td>

                  {/* EMD */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {t.formattedEmd}
                  </td>

                  {/* Published Date */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="datetime-display">
                      <span className="datetime-date">{t.formattedPublished.date}</span>
                      {t.formattedPublished.time && (
                        <span className="datetime-time">{t.formattedPublished.time}</span>
                      )}
                    </div>
                  </td>

                  {/* Closing Date */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="datetime-display">
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
                    {t.status === 'DECLINED' ? (
                      <span className="badge badge-declined" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                        Declined
                      </span>
                    ) : t.status === 'AMENDED' ? (
                      <span className="badge badge-amended">Amended</span>
                    ) : (
                      <span className="badge badge-civil">Active</span>
                    )}
                  </td>

                  {/* Action Buttons depending on current view */}
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <div className="table-actions-cell">
                      {currentView === 'main' && (
                        <>
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
                          <button
                            className="btn btn-outline btn-table-action btn-action-decline"
                            onClick={() => onDeclineTender?.(t)}
                            title="Decline this tender (Moves to Declined / Recycle Bin)"
                          >
                            <Trash2 size={13} color="#f87171" />
                            <span>Decline</span>
                          </button>
                        </>
                      )}

                      {currentView === 'special' && (
                        <>
                          <button
                            className="btn btn-outline btn-table-action"
                            onClick={() => onSelectTender(t)}
                            title="Inspect tender specifications"
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
                            title={`Open portal ${t.portal_name}`}
                          >
                            <ExternalLink size={13} />
                            <span>Portal</span>
                          </a>
                        </>
                      )}

                      {currentView === 'declined' && (
                        <>
                          <button
                            className="btn btn-outline btn-table-action btn-action-restore"
                            onClick={() => onRestoreTender?.(t)}
                            title="Restore back to Main Tenders list"
                          >
                            <RotateCcw size={13} color="#34d399" />
                            <span>Restore</span>
                          </button>
                          <button
                            className="btn btn-outline btn-table-action btn-action-permanent-delete"
                            onClick={() => onPermanentDelete?.(t)}
                            title="Permanently delete tender from database forever"
                          >
                            <XCircle size={13} color="#ef4444" />
                            <span>Delete Forever</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. MOBILE / TOUCH-OPTIMIZED CARD VIEW */}
      <div className="mobile-cards-view">
        {isLoading && tenders.length === 0 ? (
          <div className="table-empty-cell">
            Loading latest tenders from intelligence registry...
          </div>
        ) : tenders.length === 0 ? (
          <div className="table-empty-cell">
            {currentView === 'special'
              ? '⭐ No Special Tenders saved yet.'
              : currentView === 'declined'
                ? '🗑️ No declined tenders.'
                : 'No tenders match the specified filters.'}
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
                    {t.status === 'DECLINED' && (
                      <span className="badge badge-declined" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                        Declined
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
                  {currentView === 'main' && (
                    <>
                      <button
                        className="btn btn-primary mobile-action-btn"
                        onClick={() => onSelectTender(t)}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                      <button
                        className="btn btn-outline mobile-action-btn"
                        onClick={() => onToggleSpecial?.(t)}
                        title="Save to Special Tenders"
                      >
                        <Star size={14} color="#fbbf24" />
                        <span>Save Special</span>
                      </button>
                      <button
                        className="btn btn-outline mobile-action-btn btn-action-decline"
                        onClick={() => onDeclineTender?.(t)}
                      >
                        <Trash2 size={14} color="#f87171" />
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {currentView === 'special' && (
                    <>
                      <button
                        className="btn btn-primary mobile-action-btn"
                        onClick={() => onSelectTender(t)}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                      <button
                        className="btn btn-outline mobile-action-btn"
                        onClick={() => onToggleSpecial?.(t)}
                        title="Remove from Special Tenders"
                      >
                        <Star size={14} color="#fbbf24" fill="#fbbf24" />
                        <span>Remove</span>
                      </button>
                    </>
                  )}

                  {currentView === 'declined' && (
                    <>
                      <button
                        className="btn btn-outline mobile-action-btn btn-action-restore"
                        onClick={() => onRestoreTender?.(t)}
                      >
                        <RotateCcw size={14} color="#34d399" />
                        <span>Restore to Main</span>
                      </button>
                      <button
                        className="btn btn-outline mobile-action-btn btn-action-permanent-delete"
                        onClick={() => onPermanentDelete?.(t)}
                      >
                        <XCircle size={14} color="#ef4444" />
                        <span>Delete Forever</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. TABLE PAGINATION BAR (10 rows per page) */}
      {processedTenders.length > 0 && (
        <div className="table-pagination-bar">
          <div className="pagination-info">
            Showing <span className="pagination-highlight">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="pagination-highlight">{Math.min(currentPage * PAGE_SIZE, processedTenders.length)}</span> of <span className="pagination-highlight">{processedTenders.length}</span> {currentView === 'special' ? 'special tenders' : currentView === 'declined' ? 'declined tenders' : 'design tenders'}
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
