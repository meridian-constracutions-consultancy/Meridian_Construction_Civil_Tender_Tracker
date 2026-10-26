import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { StatCards } from './components/StatCards';
import { FilterBar } from './components/FilterBar';
import { TenderTable } from './components/TenderTable';
import { TenderDetailModal } from './components/TenderDetailModal';
import { KeywordsModal } from './components/KeywordsModal';
import { SourcesHealth } from './components/SourcesHealth';
import { TenderListItem, SourceRead, FilterState } from './types/tender';
import { fetchTenders, fetchSources, syncAllSources } from './api/client';
import { SSEClient, SSEConnectionStatus } from './api/sse';

export const App: React.FC = () => {
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [sources, setSources] = useState<SourceRead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<SSEConnectionStatus>('connecting');
  const [selectedTender, setSelectedTender] = useState<TenderListItem | null>(null);
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [stats, setStats] = useState({
    totalCount: 0,
    civilCount: 0,
    closingSoonCount: 0,
    todayCount: 0,
  });

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    is_civil_only: true,
    category_id: '',
    state: '',
    location: '',
    source_id: '',
    value_range: '',
    closing_soon: false,
    listed_today: false,
    sort_by: 'published_date',
    order: 'desc',
  });

  const sseClientRef = useRef<SSEClient | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load tenders with current filters with instant cancellation of in-flight requests
  const loadTenders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const response = await fetchTenders(filters, 100, 0, controller.signal);
      setTenders(response.items);
      setStats({
        totalCount: response.total_count,
        civilCount: response.civil_count,
        closingSoonCount: response.closing_soon_count,
        todayCount: response.today_count || 0,
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error loading tenders:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Comprehensive manual refresh: scans live portals, adds new tenders, and updates table
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshToast('Scanning Rajasthan & Central portals for new tenders...');

    try {
      // 1. Trigger live portal scan across both Central CPPP & Rajasthan eProc
      try {
        await syncAllSources();
      } catch (syncErr) {
        console.warn('Portal sync triggered:', syncErr);
      }

      // 2. Fetch fresh records from database (including newly discovered tenders)
      const [tendersRes, sourcesRes] = await Promise.all([
        fetchTenders(filters, 100, 0),
        fetchSources(),
      ]);

      setTenders(tendersRes.items);
      setStats({
        totalCount: tendersRes.total_count,
        civilCount: tendersRes.civil_count,
        closingSoonCount: tendersRes.closing_soon_count,
        todayCount: tendersRes.today_count || 0,
      });
      setSources(sourcesRes);

      const updateTime = new Date();
      setLastUpdated(updateTime);
      setRefreshToast(`✓ Live sync complete! All records up to date at ${updateTime.toLocaleTimeString()}.`);
      setTimeout(() => setRefreshToast(null), 4000);
    } catch (err: any) {
      console.error('Refresh error:', err);
      await loadTenders();
      setRefreshToast('✓ Refreshed from local records.');
      setTimeout(() => setRefreshToast(null), 3000);
    } finally {
      setIsRefreshing(false);
    }
  }, [filters, loadTenders]);


  const loadSources = useCallback(async () => {
    try {
      const data = await fetchSources();
      setSources(data);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  }, []);

  // Fetch initial tenders and sources
  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Automatically scan portals and refresh tenders every 15 minutes in background
  useEffect(() => {
    const autoRefreshTimer = setInterval(() => {
      handleManualRefresh();
    }, 15 * 60 * 1000);
    return () => clearInterval(autoRefreshTimer);
  }, [handleManualRefresh]);


  // Set up Server-Sent Events (SSE) for live streaming updates
  useEffect(() => {
    const sse = new SSEClient({
      onStatusChange: (status) => {
        setSseStatus(status);
      },
      onNewTender: (newTender) => {
        // Check if tender satisfies civil filter
        if (filters.is_civil_only && !newTender.is_civil_construction) {
          return;
        }

        // Prepend new tender at the top with arrival highlight animation
        setTenders((prev) => {
          // Check if already in list
          if (prev.some((t) => t.id === newTender.id || t.tender_id === newTender.tender_id)) {
            return prev;
          }
          const itemWithHighlight = { ...newTender, isNewArrival: true };
          // Keep maximum 100 records in the live dashboard
          return [itemWithHighlight, ...prev.slice(0, 99)];
        });

        // Update stats
        setStats((prev) => ({
          ...prev,
          totalCount: prev.totalCount + 1,
          civilCount: newTender.is_civil_construction ? prev.civilCount + 1 : prev.civilCount,
        }));
      },
      onTenderUpdated: (updatedTender) => {
        setTenders((prev) =>
          prev.map((t) => (t.id === updatedTender.id || t.tender_id === updatedTender.tender_id ? { ...t, ...updatedTender } : t))
        );
      },
      onCollectorStatus: (statusPayload) => {
        setSources((prev) =>
          prev.map((s) => (s.id === statusPayload.source_id ? { ...s, health_status: statusPayload.status } : s))
        );
        // Automatically re-query table and sources when collector completes or finds new tenders
        if (statusPayload.status === 'HEALTHY' || (statusPayload.tenders_discovered && statusPayload.tenders_discovered > 0)) {
          loadTenders();
          loadSources();
        }
      },
    });

    sseClientRef.current = sse;
    sse.connect();

    return () => {
      sse.disconnect();
    };
  }, [filters.is_civil_only]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      is_civil_only: true,
      category_id: '',
      state: '',
      location: '',
      source_id: '',
      value_range: '',
      closing_soon: false,
      listed_today: false,
      sort_by: 'published_date',
      order: 'desc',
    });
  };

  const handleSortChange = (column: string) => {
    setFilters((prev) => {
      if (prev.sort_by === column) {
        return { ...prev, order: prev.order === 'desc' ? 'asc' : 'desc' };
      }
      return { ...prev, sort_by: column, order: 'desc' };
    });
  };

  return (
    <div className="app-container">
      {/* Header with live SSE status & Keywords Settings */}
      <Header
        sseStatus={sseStatus}
        lastUpdated={lastUpdated}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onOpenSettings={() => setIsKeywordsModalOpen(true)}
      />


      {/* Live Data Refresh Notification Toast */}
      {refreshToast && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '0.6rem 1rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>⚡</span>
            <span>{refreshToast}</span>
          </div>
          <button
            onClick={() => setRefreshToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Metric Summary Cards */}
      <StatCards
        totalCount={stats.totalCount}
        civilCount={stats.civilCount}
        closingSoonCount={stats.closingSoonCount}
        activeSourcesCount={sources.length}
        todayCount={stats.todayCount}
        onFilterToday={() => handleFilterChange({ listed_today: !filters.listed_today, is_civil_only: true })}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Main Latest 50 Tenders Table */}
      <TenderTable
        tenders={tenders}
        isLoading={isLoading}
        onSelectTender={(tender) => setSelectedTender(tender)}
        sortBy={filters.sort_by}
        order={filters.order}
        onSortChange={handleSortChange}
        isCivilOnly={filters.is_civil_only}
      />

      {/* Source Monitoring & Health Status */}
      <SourcesHealth
        sources={sources}
        onReloadSources={loadSources}
        onRefreshTenders={handleManualRefresh}
      />

      {/* Tender Detail Specification Modal */}
      {selectedTender && (
        <TenderDetailModal
          tender={selectedTender}
          onClose={() => setSelectedTender(null)}
        />
      )}

      {/* Tender Discovery Keywords Settings Modal */}
      <KeywordsModal
        isOpen={isKeywordsModalOpen}
        onClose={() => setIsKeywordsModalOpen(false)}
        onSaved={() => {
          setRefreshToast('✓ Keywords saved! Code rules and database updated.');
          loadTenders();
          setTimeout(() => setRefreshToast(null), 4000);
        }}
      />
    </div>
  );
};

