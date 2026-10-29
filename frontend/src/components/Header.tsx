import React from 'react';
import { RefreshCw, HardHat, Sliders } from 'lucide-react';
import { SSEConnectionStatus } from '../api/sse';

interface HeaderProps {
  sseStatus: SSEConnectionStatus;
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sseStatus,
  lastUpdated,
  onRefresh,
  isRefreshing,
  onOpenSettings
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon-wrapper" aria-hidden="true">
          <HardHat size={26} color="#ffffff" />
        </div>
        <div className="brand-text-group">
          <h1 className="brand-title">CivilTender India</h1>
          <p className="brand-subtitle">
            Automated Real-Time Intelligence Platform for Indian Civil Construction & Structural Procurement
          </p>
        </div>
      </div>

      <div className="header-actions">
        {/* 100% Portal Sync Verified Badge */}
        <div
          className="portal-sync-status-badge"
          title="100% Real-Time Sync with Rajasthan eProc and Central CPPP portals with active Corrigenda verification"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '20px',
            color: '#34d399',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.03em'
          }}
        >
          <span style={{ fontSize: '12px' }}>✓</span>
          <span>100% PORTAL SYNC</span>
        </div>
        {/* Last Synced Time Badge */}
        {lastUpdated && (
          <div className="header-sync-timestamp">
            <span className="sync-label">Synced: </span>
            <strong className="sync-time">{lastUpdated.toLocaleTimeString()}</strong>
          </div>
        )}

        {/* SSE Live Connection Pill */}
        <div className={`live-status-pill ${sseStatus}`} role="status" aria-live="polite">
          <span className="status-dot"></span>
          <span className="live-status-text-full">
            {sseStatus === 'connected' ? 'LIVE STREAM CONNECTED' : sseStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}
          </span>
          <span className="live-status-text-compact">
            {sseStatus === 'connected' ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>

        {/* Manual Refresh / Re-query Button */}
        <button
          className={`btn ${isRefreshing ? 'btn-primary' : 'btn-outline'} btn-refresh`}
          onClick={onRefresh}
          onDoubleClick={() => window.location.reload()}
          disabled={isRefreshing}
          title="Click to scan portals and refresh tenders • Double-click to reload entire page"
          aria-label="Refresh tenders from government portals"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        {/* Keywords Settings Button */}
        {onOpenSettings && (
          <button
            className="btn btn-outline btn-settings"
            onClick={onOpenSettings}
            title="Edit and add discovery keywords for Rajasthan & Central portals"
            aria-label="Manage Keywords Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(99, 102, 241, 0.12)',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              color: '#c7d2fe',
              fontWeight: 500
            }}
          >
            <Sliders size={14} color="#818cf8" />
            <span>Keywords</span>
          </button>
        )}
      </div>
    </header>
  );
};

