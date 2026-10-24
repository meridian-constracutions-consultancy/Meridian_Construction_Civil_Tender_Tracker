import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, HelpCircle, AlertCircle, ArrowRight, Train, UploadCloud } from 'lucide-react';

interface IrepsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const IrepsSyncModal: React.FC<IrepsSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [copiedBookmark, setCopiedBookmark] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Production HTTPS API endpoint (Required because IREPS is HTTPS and blocks insecure HTTP localhost)
  const apiEndpoint = 'https://meridian-construction-tender-tracker.onrender.com/api/tenders/import';

  // Bookmarklet JavaScript Code
  const bookmarkletCode = `javascript:(function(){
    try {
      const rows = document.querySelectorAll('table tr');
      const tenders = [];
      rows.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        if (cells.length >= 4) {
          const catNum = cells.find(c => /^[0-9A-Za-z_\\-\\/]{4,35}$/.test(c) && !c.toLowerCase().includes('auction') && !c.toLowerCase().includes('zone'));
          const descCell = cells.find(c => c.length > 25);
          let tId = '';
          let title = '';
          let org = 'Indian Railways';
          let dept = '';
          
          if (descCell) {
            title = descCell;
            tId = catNum || ('IREPS_' + Math.floor(Math.random()*100000));
            org = cells.find(c => c.toLowerCase().includes('railway')) || 'Indian Railways';
          } else if (catNum) {
            tId = catNum;
            const category = cells[4] || cells[3] || 'Railway Tender / Auction';
            const unit = cells[1] || cells[0] || 'Division';
            title = unit + ' - ' + category + ' (' + catNum + ')';
            dept = unit;
            org = (cells[0] && cells[0].toLowerCase().includes('railway')) ? cells[0] : 'Indian Railways';
          }

          if (title && title.length > 8 && !title.toLowerCase().includes('catalogue no') && !title.toLowerCase().includes('tender title')) {
            const valCell = cells.find(c => /(?:₹|rs|inr|\\d{1,3}(?:,\\d{2,3})*(?:\\.\\d{2})?)/i.test(c) && /\\d/.test(c));
            let val = null;
            if (valCell) {
              const numStr = valCell.replace(/[^0-9.]/g, '');
              if (numStr) val = parseFloat(numStr);
            }
            tenders.push({
              tender_id: 'IREPS_' + tId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 35) + '_' + Math.floor(Math.random()*1000),
              title: title,
              work_description: cells.join(' | '),
              organization_name: org,
              department: dept,
              source_id: 'ireps',
              portal_name: 'Indian Railways E-Procurement System (IREPS)',
              original_url: window.location.href,
              estimated_value: val
            });
          }
        }
      });

      if (tenders.length === 0) {
        alert('⚠️ No tenders found on this table. Please navigate to an IREPS Search Results page first.');
        return;
      }

      const notif = document.createElement('div');
      notif.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999999;background:#1e1b4b;border:2px solid #818cf8;color:#fff;padding:16px 22px;border-radius:12px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.6);font-size:14px;max-width:380px;';
      notif.innerHTML = '⏳ <b>Syncing ' + tenders.length + ' Railway Tenders to Meridian...</b>';
      document.body.appendChild(notif);

      fetch('${apiEndpoint}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenders: tenders })
      })
      .then(r => r.json())
      .then(data => {
        notif.style.background = '#064e3b';
        notif.style.borderColor = '#10b981';
        notif.innerHTML = '✅ <b>Sync Complete!</b><br>' + (data.message || 'Imported successfully!') + '<br><small style=\"color:#a7f3d0\">Open Meridian Dashboard to view matching tenders.</small>';
        setTimeout(() => notif.remove(), 7000);
      })
      .catch(err => {
        notif.style.background = '#7f1d1d';
        notif.style.borderColor = '#ef4444';
        notif.innerHTML = '❌ <b>Sync Error:</b> ' + err.message + '<br><small>Make sure Meridian backend is reachable.</small>';
        setTimeout(() => notif.remove(), 8000);
      });
    } catch(e) {
      alert('Sync script error: ' + e.message);
    }
  })();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmark(true);
    setTimeout(() => setCopiedBookmark(false), 2500);
  };

  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      // Basic parser for pasted text lines
      const lines = manualText.split('\n').map(l => l.trim()).filter(Boolean);
      const tenders: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length > 15) {
          tenders.push({
            tender_id: `IREPS_MANUAL_${Date.now()}_${i}`,
            title: line,
            work_description: line,
            organization_name: 'Indian Railways / IREPS',
            source_id: 'ireps',
            portal_name: 'Indian Railways E-Procurement System (IREPS)',
            original_url: 'https://www.ireps.gov.in/'
          });
        }
      }

      if (tenders.length === 0) {
        throw new Error('No valid tender titles found in pasted text. Paste at least one line with a tender description.');
      }

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenders })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Import failed');

      setStatusMsg({
        type: 'success',
        text: data.message || `Successfully synced ${tenders.length} tenders!`
      });
      setManualText('');
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to import tenders'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', width: '92%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(234, 88, 12, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
              <Train size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Indian Railways (IREPS) 1-Click Sync
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                Seamlessly import Railway tenders from your active IREPS session directly into Meridian Tracker.
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

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 0' }}>
          {statusMsg && (
            <div style={{
              background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: statusMsg.type === 'success' ? '#34d399' : '#f87171',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {statusMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Section 1: The 1-Click Bookmarklet Tool */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  🚀 1-Click Browser Bookmarklet
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Drag this button to your browser bookmarks bar (Chrome, Edge, or Firefox).
                </p>
              </div>

              <button
                type="button"
                onClick={copyBookmarklet}
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: '#c7d2fe',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {copiedBookmark ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copiedBookmark ? 'Code Copied!' : 'Copy Bookmarklet Code'}</span>
              </button>
            </div>

            {/* Big Draggable Button */}
            <div style={{ textAlign: 'center', padding: '16px 0', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', border: '1px dashed rgba(99, 102, 241, 0.4)', marginBottom: '16px' }}>
              <a
                href={bookmarkletCode}
                onClick={(e) => {
                  e.preventDefault();
                  alert('👉 Drag this button to your Chrome Bookmarks Bar (Ctrl + Shift + B to show bar), or click "Copy Bookmarklet Code" above!');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '30px',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                  cursor: 'grab'
                }}
                title="Drag this button to your browser bookmarks bar"
              >
                <span>📥 Sync IREPS to Meridian</span>
              </a>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                Tip: Press <strong>Ctrl + Shift + B</strong> (Windows) to show your Chrome bookmarks bar, then drag the button up into it.
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f97316', marginBottom: '4px' }}>
                  Step 1
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc', marginBottom: '4px' }}>
                  Open IREPS in Chrome
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  Go to <a href="https://www.ireps.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>ireps.gov.in <ExternalLink size={10} style={{ display: 'inline' }} /></a> and log in with your phone OTP.
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>
                  Step 2
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc', marginBottom: '4px' }}>
                  Search for Tenders
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  Search any Railway works, bridge, consultancy, or station tenders you want to view.
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', marginBottom: '4px' }}>
                  Step 3
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc', marginBottom: '4px' }}>
                  Click the Bookmark!
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  Click <strong>📥 Sync IREPS to Meridian</strong>. All matching tenders will instantly appear on your dashboard!
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Fast Manual Paste Box (Alternative) */}
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 4px 0' }}>
              📋 Alternative: Paste Tender Titles Directly
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Don't want to use a bookmarklet? Just copy any tender titles from IREPS and paste them here (one per line).
            </p>

            <form onSubmit={handleManualImport}>
              <textarea
                rows={3}
                placeholder="Paste tender titles from IREPS here (e.g. Consultancy Services for DPR of ROB Bridge Kota Division)..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  marginBottom: '10px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !manualText.trim()}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: (isSubmitting || !manualText.trim()) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UploadCloud size={16} />
                  <span>{isSubmitting ? 'Syncing...' : 'Sync Pasted Tenders'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            🔒 All imported tenders are automatically filtered through your strict 25 civil keywords.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
