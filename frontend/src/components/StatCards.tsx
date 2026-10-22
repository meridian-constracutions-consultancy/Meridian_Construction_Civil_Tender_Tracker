import React from 'react';
import { Database, HardHat, Clock, Globe, Flame } from 'lucide-react';

interface StatCardsProps {
  totalCount: number;
  civilCount: number;
  closingSoonCount: number;
  activeSourcesCount: number;
  todayCount?: number;
  onFilterToday?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalCount,
  civilCount,
  closingSoonCount,
  activeSourcesCount,
  todayCount = 0,
  onFilterToday
}) => {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-total">
          <Database size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{totalCount.toLocaleString()}</span>
          <span className="stat-label">Total Ingested</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-civil">
          <HardHat size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{civilCount.toLocaleString()}</span>
          <span className="stat-label">Civil & Structural</span>
        </div>
      </div>

      <div 
        className="stat-card stat-card-clickable" 
        onClick={onFilterToday}
        style={{ cursor: onFilterToday ? 'pointer' : 'default', border: todayCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : undefined }}
        title="Click to view all tenders listed today"
      >
        <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
          <Flame size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-value" style={{ color: '#ef4444' }}>{todayCount.toLocaleString()}</span>
          <span className="stat-label">🔥 Listed Today</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-closing">
          <Clock size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{closingSoonCount.toLocaleString()}</span>
          <span className="stat-label">Closing in 7 Days</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-portals">
          <Globe size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{activeSourcesCount}</span>
          <span className="stat-label">Live Active Portals</span>
        </div>
      </div>
    </div>
  );
};
