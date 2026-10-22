import React from 'react';
import { Database, HardHat, Clock, Globe } from 'lucide-react';

interface StatCardsProps {
  totalCount: number;
  civilCount: number;
  closingSoonCount: number;
  activeSourcesCount: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalCount,
  civilCount,
  closingSoonCount,
  activeSourcesCount
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
          <span className="stat-label">Active Portals</span>
        </div>
      </div>
    </div>
  );
};
