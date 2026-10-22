import React, { useState } from 'react';
import { Globe, RefreshCw, CheckCircle, AlertTriangle, XCircle, Play } from 'lucide-react';
import { SourceRead } from '../types/tender';
import { triggerSourceScan } from '../api/client';

interface SourcesHealthProps {
  sources: SourceRead[];
  onReloadSources: () => void;
  onRefreshTenders?: () => void;
}

export const SourcesHealth: React.FC<SourcesHealthProps> = ({ sources, onReloadSources, onRefreshTenders }) => {
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});

  const handleTrigger = async (sourceId: string) => {
    setTriggering((prev) => ({ ...prev, [sourceId]: true }));
    try {
      await triggerSourceScan(sourceId);
      onReloadSources();
      if (onRefreshTenders) {
        onRefreshTenders();
      }
    } catch (err) {
      console.error(`Failed to trigger scan for ${sourceId}:`, err);
    } finally {
      setTriggering((prev) => ({ ...prev, [sourceId]: false }));
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never checked';
    try {
      let clean = dateStr.trim();
      if (!clean.endsWith('Z') && !clean.includes('+') && !/[-+]\d{2}:\d{2}$/.test(clean)) {
        clean = clean.replace(' ', 'T') + 'Z';
      }
      const d = new Date(clean);
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ' IST';
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="source-status-badge badge-healthy">
            <CheckCircle size={13} /> Healthy
          </span>
        );
      case 'RUNNING':
        return (
          <span className="source-status-badge badge-running">
            <RefreshCw size={13} className="spin" /> Scanning
          </span>
        );
      case 'WARNING':
        return (
          <span className="source-status-badge badge-warning">
            <AlertTriangle size={13} /> Warning
          </span>
        );
      case 'ERROR':
        return (
          <span className="source-status-badge badge-error">
            <XCircle size={13} /> Error
          </span>
        );
      default:
        return <span className="source-status-badge badge-ready">Ready</span>;
    }
  };

  return (
    <div className="sources-health-card">
      <div className="sources-health-header">
        <h3 className="sources-health-title">
          <Globe size={18} color="#06b6d4" />
          <span>Active Government Source Registries</span>
        </h3>
        <span className="sources-health-subtitle">
          Autonomous background collection running
        </span>
      </div>

      <div className="sources-grid">
        {sources.map((src) => (
          <div key={src.id} className="source-item-card">
            <div className="source-item-body">
              <div className="source-item-top">
                <div className="source-name">{src.name}</div>
                {getStatusBadge(src.health_status)}
              </div>
              <div className="source-url">
                {src.base_url}
              </div>
            </div>

            <div className="source-item-footer">
              <div className="source-last-scan">
                <span className="scan-label">Last Scan: </span>
                <span className="scan-time">{formatDate(src.last_successful_check)}</span>
              </div>
              <button
                className="btn btn-outline btn-scan-now"
                onClick={() => handleTrigger(src.id)}
                disabled={triggering[src.id] || src.health_status === 'RUNNING'}
                title="Manually trigger immediate collection"
                aria-label={`Trigger manual scan for ${src.name}`}
              >
                <Play size={11} />
                <span>{triggering[src.id] ? 'Scanning...' : 'Scan Now'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
