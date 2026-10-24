import React, { useState, useEffect } from 'react';
import { X, Plus, Check, RefreshCw, AlertCircle, Key, RotateCcw } from 'lucide-react';
import { KeywordsConfig } from '../types/tender';
import { fetchKeywords, saveKeywords } from '../api/client';

interface KeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const KeywordsModal: React.FC<KeywordsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<KeywordsConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState<string>('');

  // Official 25 Keywords requested by the user
  const OFFICIAL_KEYWORDS = [
    "Consultancy", "Survey", "design", "soil", "geotech", "audit", "testing", "ndt",
    "beutification", "landscapping", "landaqusition (la)", "dpr", "study", "physibility",
    "plan", "pmc", "architecture", "structure", "bus stop", "railway", "dam", "bridge",
    "highway", "station", "terminal"
  ];

  // Load active keywords whenever modal opens
  useEffect(() => {
    if (isOpen) {
      loadKeywordsData();
    }
  }, [isOpen]);

  const loadKeywordsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchKeywords();
      setConfig(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load keyword settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Add a new keyword
  const handleAddKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newKeyword.trim();
    if (!clean || !config) return;

    if (!config.search_keywords.some(k => k.toLowerCase() === clean.toLowerCase())) {
      setConfig({
        ...config,
        search_keywords: [...config.search_keywords, clean],
      });
      setNewKeyword('');
    }
  };

  // Remove a keyword
  const handleRemoveKeyword = (keywordToRemove: string) => {
    if (!config) return;
    setConfig({
      ...config,
      search_keywords: config.search_keywords.filter((kw) => kw.toLowerCase() !== keywordToRemove.toLowerCase()),
    });
  };

  // Reset strictly to the 25 official keywords
  const handleResetToOfficial = () => {
    if (!config) return;
    setConfig({
      ...config,
      search_keywords: OFFICIAL_KEYWORDS,
    });
  };

  // Save changes to JSON database and trigger real-time re-classification
  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await saveKeywords({
        search_keywords: config.search_keywords,
        categories: config.categories,
        disqualifying_negative_keywords: config.disqualifying_negative_keywords,
      });

      setSuccessMsg(res.message || 'Keywords saved successfully! Tenders re-evaluated.');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save keywords');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Key size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Tender Search & Match Keywords
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                Only tenders matching these keywords will be collected and displayed in the software.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="modal-close-btn"
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 0' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px', color: '#94a3b8' }}>
              <RefreshCw size={20} className="animate-spin" />
              <span>Loading keywords from database...</span>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', fontSize: '13px' }}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', fontSize: '13px' }}>
                  <Check size={18} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Keyword Manager Box */}
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
                      Active Keywords
                    </span>
                    <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600, background: 'rgba(99, 102, 241, 0.18)', padding: '2px 9px', borderRadius: '12px' }}>
                      {config?.search_keywords.length || 0} Total
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToOfficial}
                    style={{
                      fontSize: '12px',
                      color: '#a5b4fc',
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Reset to official 25 keywords"
                  >
                    <RotateCcw size={13} />
                    <span>Reset to 25 Default Keywords</span>
                  </button>
                </div>

                {/* Add keyword input form */}
                <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Type keyword to add (e.g. soil, dpr, geotech, bridge)..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 18px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </form>

                {/* Keywords Chips Container */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '320px', overflowY: 'auto', padding: '4px 0' }}>
                  {config?.search_keywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(99, 102, 241, 0.18)',
                        border: '1px solid rgba(99, 102, 241, 0.38)',
                        color: '#e0e7ff',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#a5b4fc',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '50%',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#a5b4fc')}
                        title={`Remove "${kw}"`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: '14px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
                  ℹ️ Click <strong>Save Changes</strong> below to commit your keywords to the JSON database and automatically update visible tenders.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            💾 Syncs directly with rules.json and database
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (isSaving || isLoading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Saving & Re-evaluating...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
