import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, RefreshCw, AlertCircle, Sparkles, Sliders } from 'lucide-react';
import { KeywordsConfig, KeywordCategoryConfig } from '../types/tender';
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

  // Input states
  const [newSearchKeyword, setNewSearchKeyword] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('consultancy_pmc_dpr');
  const [newCategoryKeyword, setNewCategoryKeyword] = useState<string>('');

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

  // Add search keyword
  const handleAddSearchKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newSearchKeyword.trim().toLowerCase();
    if (!clean || !config) return;

    if (!config.search_keywords.includes(clean)) {
      setConfig({
        ...config,
        search_keywords: [...config.search_keywords, clean],
      });
      setNewSearchKeyword('');
    }
  };

  // Remove search keyword
  const handleRemoveSearchKeyword = (keywordToRemove: string) => {
    if (!config) return;
    setConfig({
      ...config,
      search_keywords: config.search_keywords.filter((kw) => kw !== keywordToRemove),
    });
  };

  // Add category keyword
  const handleAddCategoryKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryKeyword.trim().toLowerCase();
    if (!clean || !config) return;

    const updatedCategories = config.categories.map((cat) => {
      if (cat.id === selectedCategoryId) {
        if (!cat.positive_keywords.includes(clean)) {
          return {
            ...cat,
            positive_keywords: [...cat.positive_keywords, clean],
          };
        }
      }
      return cat;
    });

    setConfig({
      ...config,
      categories: updatedCategories,
    });
    setNewCategoryKeyword('');
  };

  // Remove category keyword
  const handleRemoveCategoryKeyword = (catId: string, keywordToRemove: string) => {
    if (!config) return;
    const updatedCategories = config.categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          positive_keywords: cat.positive_keywords.filter((kw) => kw !== keywordToRemove),
        };
      }
      return cat;
    });

    setConfig({
      ...config,
      categories: updatedCategories,
    });
  };

  // Save changes to database and code
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

      setSuccessMsg(res.message || 'Keywords saved successfully!');
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

  const selectedCategory = config?.categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Manage Tender Discovery Keywords
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Add or edit keywords. System code and database automatically update upon saving.
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
              <span>Loading active keywords from database...</span>
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

              {/* Section 1: Portal Crawler Keywords */}
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                      🔍 GePNIC Portal Search Keywords (Crawler Engine)
                    </h3>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      Keywords automatically searched on Rajasthan eProc & Central CPPP to discover new candidate tenders.
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600, background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                    {config?.search_keywords.length || 0} Keywords
                  </span>
                </div>

                {/* Add search keyword input */}
                <form onSubmit={handleAddSearchKeyword} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    placeholder="Type a new search keyword (e.g. soil investigation, drone survey)..."
                    value={newSearchKeyword}
                    onChange={(e) => setNewSearchKeyword(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
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
                      borderRadius: '6px',
                      padding: '0 16px',
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

                {/* Keywords Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {config?.search_keywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        color: '#c7d2fe',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px'
                      }}
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSearchKeyword(kw)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#a5b4fc',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={`Remove "${kw}"`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Section 2: Domain Specific Classification Keywords */}
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                    🎯 Civil Domain Classification Keywords
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Keywords used to match tenders to specific engineering disciplines (DPR, Structural, Highways, etc.).
                  </p>
                </div>

                {/* Category Selector Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {config?.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      style={{
                        background: selectedCategoryId === cat.id ? '#4f46e5' : 'rgba(15, 23, 42, 0.7)',
                        color: selectedCategoryId === cat.id ? '#ffffff' : '#94a3b8',
                        border: selectedCategoryId === cat.id ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat.name} ({cat.positive_keywords.length})
                    </button>
                  ))}
                </div>

                {/* Selected Category Keywords Panel */}
                {selectedCategory && (
                  <div>
                    <form onSubmit={handleAddCategoryKeyword} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                      <input
                        type="text"
                        placeholder={`Add positive keyword to "${selectedCategory.name}"...`}
                        value={newCategoryKeyword}
                        onChange={(e) => setNewCategoryKeyword(e.target.value)}
                        style={{
                          flex: 1,
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#f8fafc',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0 16px',
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

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
                      {selectedCategory.positive_keywords.map((kw) => (
                        <span
                          key={kw}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(2, 132, 199, 0.15)',
                            border: '1px solid rgba(2, 132, 199, 0.35)',
                            color: '#7dd3fc',
                            padding: '3px 8px',
                            borderRadius: '16px',
                            fontSize: '11px'
                          }}
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategoryKeyword(selectedCategory.id, kw)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#38bdf8',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={`Remove "${kw}"`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer with Save and Cancel buttons */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            💾 Changes are written to database & rules.json automatically.
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
                  <span>Saving & Updating...</span>
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
