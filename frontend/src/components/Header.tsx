import React from 'react';
import { RefreshCw, HardHat } from 'lucide-react';
import { SSEConnectionStatus } from '../api/sse';

interface HeaderProps {
  sseStatus: SSEConnectionStatus;
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sseStatus,
  lastUpdated,
  onRefresh,
  isRefreshing
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
      </div>
    </header>
  );
};
