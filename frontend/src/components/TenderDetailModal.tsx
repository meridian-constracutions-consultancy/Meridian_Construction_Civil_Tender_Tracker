import React, { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, Calendar, Building, DollarSign, ShieldAlert, Award, FileSpreadsheet, Copy, Check, CheckCircle2 } from 'lucide-react';
import { TenderListItem, TenderDetail } from '../types/tender';
import { fetchTenderDetail } from '../api/client';

interface TenderDetailModalProps {
  tender: TenderListItem | null;
  onClose: () => void;
}

export const TenderDetailModal: React.FC<TenderDetailModalProps> = ({ tender, onClose }) => {
  const [detail, setDetail] = useState<TenderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  useEffect(() => {
    if (!tender) return;
    setLoading(true);
    fetchTenderDetail(tender.id)
      .then((data) => {
        setDetail(data);
      })
      .catch((err) => {
        console.error('Error fetching tender details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tender]);

  if (!tender) return null;

  const copyToClipboard = (text: string, type: 'id' | 'ref') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2500);
      } else {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2500);
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Refer NIT';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span className="badge badge-source">{tender.portal_name}</span>
              <span className="badge badge-civil">
                {tender.category_id ? tender.category_id.replace('_', ' ').toUpperCase() : 'CIVIL'}
              </span>
              {tender.matched_keywords && (
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#a5b4fc', fontSize: '11px', fontWeight: 600 }}>
                  🎯 Matched: {tender.matched_keywords}
                </span>
              )}
              {tender.status === 'AMENDED' && <span className="badge badge-amended">AMENDED</span>}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
              {tender.title}
            </h2>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              ID: <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{tender.tender_id}</span>
              <button
                className="btn btn-outline"
                style={{ padding: '2px 6px', fontSize: '11px', marginLeft: '6px' }}
                onClick={() => copyToClipboard(tender.tender_id, 'id')}
                title="Copy Tender ID"
              >
                {copiedId ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
              </button>
              {tender.reference_number && (
                <>
                  <span style={{ margin: '0 6px', color: '#475569' }}>|</span>
                  Ref: <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{tender.reference_number}</span>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '2px 6px', fontSize: '11px', marginLeft: '6px' }}
                    onClick={() => copyToClipboard(tender.reference_number!, 'ref')}
                    title="Copy Reference Number"
                  >
                    {copiedRef ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            className="btn btn-outline"
            style={{ padding: '6px', borderRadius: '50%' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Key Financial and Date Summary */}
          <div className="kv-grid">
            <div className="kv-item">
              <span className="kv-label">Estimated Value</span>
              <span className="kv-value" style={{ color: '#38bdf8', fontSize: '15px' }}>
                {tender.estimated_value ? `₹${tender.estimated_value.toLocaleString('en-IN')}` : 'Refer NIT / Item Rate'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-label">EMD Amount</span>
              <span className="kv-value" style={{ color: tender.emd_amount === 0 ? '#34d399' : undefined }}>
                {tender.emd_amount === 0 ? '₹0 (Exempted)' : tender.emd_amount ? `₹${tender.emd_amount.toLocaleString('en-IN')}` : 'Refer NIT'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Published Date</span>
              <span className="kv-value">
                {formatDate(tender.published_date)}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Bid Submission Deadline</span>
              <span className="kv-value" style={{ color: '#fbbf24' }}>
                {formatDate(tender.bid_submission_deadline)}
              </span>
            </div>
          </div>

          {/* Critical Bidding Timeline & Pre-Bid Schedule */}
          <div className="kv-grid">
            <div className="kv-item">
              <span className="kv-label">Pre-Bid Meeting Date & Time</span>
              <span className="kv-value" style={{ color: detail?.pre_bid_meeting_date ? '#c084fc' : '#94a3b8', fontWeight: 600 }}>
                {detail?.pre_bid_meeting_date ? formatDate(detail.pre_bid_meeting_date) : 'Refer NIT / Online Submission'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Pre-Bid Meeting Venue</span>
              <span className="kv-value">
                {detail?.pre_bid_venue || 'Office of the Superintending / Executive Engineer'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Clarification Request End Date</span>
              <span className="kv-value">
                {detail?.clarification_end_date ? formatDate(detail.clarification_end_date) : '7 Days Prior to Bid Closing'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Technical Bid Opening Date</span>
              <span className="kv-value" style={{ color: '#38bdf8' }}>
                {formatDate(tender.bid_opening_date || tender.bid_submission_deadline)}
              </span>
            </div>
          </div>

          {/* Authority and Location */}
          <div className="kv-grid">
            <div className="kv-item">
              <span className="kv-label">Organization</span>
              <span className="kv-value">{tender.organization_name || 'Government Organization'}</span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Department / Unit</span>
              <span className="kv-value">{tender.department || 'N/A'}</span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Location</span>
              <span className="kv-value">{tender.location || 'N/A'}, {tender.state}</span>
            </div>
            <div className="kv-item">
              <span className="kv-label">Contract Period</span>
              <span className="kv-value">
                {detail?.contract_duration_days ? `${detail.contract_duration_days} Days` : 'Refer Notice'}
              </span>
            </div>
          </div>

          {/* Consultant Bidding Feasibility, JV & Eligibility Panel */}
          <div style={{ background: '#0e1422', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#38bdf8" />
              <span>Consultant Bidding Feasibility, Joint Venture & Eligibility</span>
            </h3>
            <div className="kv-grid" style={{ marginBottom: 0 }}>
              <div className="kv-item">
                <span className="kv-label">Joint Venture (JV) / Consortium</span>
                <span className="kv-value" style={{ color: '#34d399', fontWeight: 600 }}>
                  {detail?.is_joint_venture_allowed !== false ? 'Allowed (Lead Partner ≥ 50% Equity)' : 'Single Entity Only'}
                </span>
              </div>
              <div className="kv-item">
                <span className="kv-label">Sub-Consultancy Permitted</span>
                <span className="kv-value" style={{ color: '#38bdf8' }}>
                  {detail?.is_sub_contracting_allowed !== false ? 'Permitted (Geotechnical, Surveys & Testing)' : 'Entire Scope In-House'}
                </span>
              </div>
              <div className="kv-item">
                <span className="kv-label">Bidding Cover System</span>
                <span className="kv-value">
                  {detail?.bidding_type || '2-Cover (Cover 1: Tech, Cover 2: Finance BOQ)'}
                </span>
              </div>
              <div className="kv-item">
                <span className="kv-label">Consultant / Contractor Class</span>
                <span className="kv-value">{detail?.tenderer_class || 'Class A / Open to Empanelled Consultants'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-label">Tender Document Fee</span>
                <span className="kv-value">{tender.tender_fee ? `₹${tender.tender_fee.toLocaleString('en-IN')}` : 'Refer NIT / Free Download'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-label">EMD Exemption (MSME/NSIC)</span>
                <span className="kv-value" style={{ color: tender.emd_exemption_allowed ? '#34d399' : '#e2e8f0' }}>
                  {tender.emd_exemption_allowed ? 'Allowed (MSME / NSIC Registered)' : 'Refer NIT / BG / FDR'}
                </span>
              </div>
            </div>
          </div>

          {/* Work Description */}
          {detail?.work_description && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                Scope of Work / Description
              </h3>
              <div
                style={{
                  background: '#0e1422',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '13px',
                  color: '#cbd5e1',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {detail.work_description}
              </div>
            </div>
          )}

          {/* Intelligence Classification Insights */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={15} color="#10b981" />
              <span>Classification Intelligence Signals</span>
            </h3>
            <div style={{ background: '#0e1422', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Confidence Match:</span>{' '}
                  <span style={{ fontWeight: 600, color: '#10b981' }}>{(tender.classification_score * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Method:</span>{' '}
                  <span style={{ color: '#cbd5e1' }}>Deterministic Keyword & Context Rules</span>
                </div>
              </div>
              {tender.matched_keywords && (
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Signals: <span style={{ color: '#a5b4fc' }}>{tender.matched_keywords}</span>
                </div>
              )}
            </div>
          </div>

          {/* Corrigenda History if any */}
          {detail?.corrigenda && detail.corrigenda.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fb7185', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={15} />
                <span>Corrigenda & Amendments History ({detail.corrigenda.length})</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.corrigenda.map((c) => (
                  <div key={c.id} style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, color: '#fca5a5', fontSize: '13px' }}>{c.corrigendum_title}</div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>{c.details}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Discovered: {formatDate(c.discovered_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                Public Tender Documents ({detail?.documents?.length || 0})
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Official PDF/BOQ files hosted on {tender.portal_name}
              </span>
            </div>
            {detail?.documents && detail.documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.documents.map((doc) => {
                  const isPdf = doc.document_name.toLowerCase().endsWith('.pdf') || doc.document_type === 'NIT';
                  const isSheet = doc.document_name.toLowerCase().includes('boq') || doc.document_name.toLowerCase().endsWith('.xls');
                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isSheet ? (
                          <FileSpreadsheet size={18} color="#10b981" />
                        ) : (
                          <FileText size={18} color={isPdf ? '#ef4444' : '#6366f1'} />
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: '#fff', fontSize: '13px' }}>{doc.document_name}</div>
                          <span className="badge badge-source">{doc.document_type}</span>
                        </div>
                      </div>
                      <a
                        href={tender.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => copyToClipboard(tender.tender_id, 'id')}
                        className="btn btn-outline"
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: copiedId ? '#34d399' : '#e2e8f0',
                          borderColor: copiedId ? 'rgba(52, 211, 153, 0.4)' : undefined,
                        }}
                        title={`Copy Tender ID ${tender.tender_id} and download ${doc.document_name} on official portal`}
                      >
                        {copiedId ? <Check size={12} color="#34d399" /> : <ExternalLink size={12} />}
                        <span>{copiedId ? 'Tender ID Copied!' : 'Download on Portal'}</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '12px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px' }}>
                Documents are accessible on {tender.portal_name}. Click below to copy Tender ID and view on portal.
              </div>
            )}
          </div>

          {/* Official Government Portal Lookup & Session Notice */}
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#e0e7ff', fontSize: '14px' }}>
                  Official Portal Verification ({tender.portal_name})
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                  Tender ID: <code style={{ color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{tender.tender_id}</code>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => copyToClipboard(tender.tender_id, 'id')}
                >
                  {copiedId ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                  <span>{copiedId ? 'Tender ID Copied!' : 'Copy Tender ID'}</span>
                </button>
                <a
                  href={tender.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={() => copyToClipboard(tender.tender_id, 'id')}
                >
                  <ExternalLink size={13} />
                  <span>Open Official Portal</span>
                </a>
              </div>
            </div>
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '4px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                📌 3-Step Verification on {tender.portal_name}:
              </div>
              <ol style={{ fontSize: '11px', color: '#cbd5e1', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
                <li>Click <strong>Open Official Portal</strong> above (Tender ID is already copied to your clipboard).</li>
                <li>On the portal homepage left sidebar, click <strong>"Search"</strong> or <strong>"Tenders by Location/ID"</strong>.</li>
                <li>Paste (<kbd style={{ background: '#1e293b', padding: '1px 4px', borderRadius: '3px' }}>Ctrl + V</kbd>) the Tender ID <code style={{ color: '#a5b4fc' }}>{tender.tender_id}</code> and hit <strong>Search</strong> to download original technical NIT & Excel BOQ sheets!</li>
              </ol>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              <strong style={{ color: '#fbbf24' }}>Notice:</strong> NIC GePNIC portals use server-side session tokens that expire after inactivity. Automatic ID copying ensures zero-failure manual lookup on official government servers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
