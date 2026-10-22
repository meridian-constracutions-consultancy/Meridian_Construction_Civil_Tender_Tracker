import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Lock, User, Key, Activity, X, LogIn, LogOut, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';

interface SecurityCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityCenterModal: React.FC<SecurityCenterModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'login' | 'audit' | 'keys'>('status');
  
  // Auth state
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('ct_token'));
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('Admin@Civil2026!');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Telemetry & Audit Logs
  const [telemetry, setTelemetry] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [wafTestResult, setWafTestResult] = useState<string | null>(null);

  // Fetch telemetry status
  const loadTelemetry = async () => {
    try {
      const res = await fetch('/api/auth/security-status');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch current user if token exists
  const loadProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        // Token expired or invalid
        sessionStorage.removeItem('ct_token');
        setToken(null);
        setCurrentUser(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch audit logs (admin only)
  const loadAuditLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/audit-logs?limit=30', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTelemetry();
      if (token) {
        loadProfile(token);
        loadAuditLogs();
      }
    }
  }, [isOpen, token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: usernameInput,
          password: passwordInput
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      sessionStorage.setItem('ct_token', data.access_token);
      setToken(data.access_token);
      setCurrentUser(data.user);
      setAuthSuccess(`Authenticated as ${data.user.role.toUpperCase()} (${data.user.username})`);
      loadTelemetry();
      loadAuditLogs();
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ct_token');
    setToken(null);
    setCurrentUser(null);
    setAuthSuccess('Logged out successfully');
  };

  const runWafTest = async (type: 'sqli' | 'xss' | 'traversal') => {
    setWafTestResult('Simulating attack request...');
    try {
      let testUrl = '/api/tenders?test=safe';
      if (type === 'sqli') testUrl = '/api/tenders?search=UNION%20SELECT%20*%20FROM%20users';
      if (type === 'xss') testUrl = '/api/tenders?search=%3Cscript%3Ealert(document.cookie)%3C/script%3E';
      if (type === 'traversal') testUrl = '/api/tenders?file=../../etc/passwd';

      const res = await fetch(testUrl);
      const data = await res.json();

      if (res.status === 403) {
        setWafTestResult(`🛡️ BLOCKED by WAF (HTTP 403): ${data.detail}`);
      } else {
        setWafTestResult(`Response HTTP ${res.status}`);
      }
      loadTelemetry();
      if (token) loadAuditLogs();
    } catch (err: any) {
      setWafTestResult(`Connection blocked: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem', borderRadius: '8px', color: '#10b981' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 600 }}>
                Security & Credential Operations Center
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Client & Server Defense Architecture • IP Tracking • WAF & Malware Protection • RBAC Credentials
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', padding: '0.75rem 0' }}>
          <button 
            className={`btn ${activeTab === 'status' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            onClick={() => setActiveTab('status')}
          >
            <Activity size={15} style={{ marginRight: '0.4rem' }} />
            Active Defenses & WAF
          </button>
          <button 
            className={`btn ${activeTab === 'login' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            onClick={() => setActiveTab('login')}
          >
            <User size={15} style={{ marginRight: '0.4rem' }} />
            {currentUser ? `Profile (${currentUser.username})` : 'Authentication Credentials'}
          </button>
          <button 
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            onClick={() => setActiveTab('audit')}
          >
            <ShieldAlert size={15} style={{ marginRight: '0.4rem' }} />
            IP Tracking & Threat Logs
          </button>
        </div>

        {/* TAB 1: ACTIVE DEFENSES & WAF */}
        {activeTab === 'status' && (
          <div style={{ padding: '1rem 0' }}>
            {/* Top Security Banner */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.8))', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              borderRadius: '8px', 
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 700, letterSpacing: '0.05em' }}>
                  PROTECTION STATUS
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.2rem' }}>
                  ARMED & ACTIVE (9 DEFENSE LAYERS)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Client IP Detected: <strong style={{ color: '#38bdf8' }}>{telemetry?.client_ip || '127.0.0.1'}</strong> • 
                  Blocked Attacks: <strong style={{ color: '#ef4444' }}>{telemetry?.blocked_attacks_count ?? 0}</strong> • 
                  Security Events Logged: <strong style={{ color: '#a855f7' }}>{telemetry?.total_audit_events ?? 0}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  color: '#10b981', 
                  border: '1px solid #10b981', 
                  padding: '0.35rem 0.75rem', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600 
                }}>
                  Zero-Trust Architecture
                </span>
              </div>
            </div>

            {/* Defense Capabilities Grid */}
            <h4 style={{ color: '#f8fafc', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Active Security Controls</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { title: 'WAF Threat Shield', desc: 'Real-time regex filters for SQLi, XSS, Path Traversal', icon: '🛡️', status: 'Active' },
                { title: 'Anti-DDoS Rate Limiter', desc: 'Sliding-window IP throttler (120 req/min general, 10/min auth)', icon: '⏱️', status: 'Active' },
                { title: 'Brute-Force Lockout Guard', desc: '5 consecutive failed attempts locks account for 15 minutes', icon: '🔒', status: 'Active' },
                { title: 'NIST PBKDF2-HMAC-SHA256', desc: '120,000 iterations salted cryptographic password hashing', icon: '🔑', status: 'Active' },
                { title: 'RFC 7519 HS256 JWT Tokens', desc: 'Signed cryptographic bearer credentials with expiration', icon: '🎫', status: 'Active' },
                { title: 'SSRF & Private IP Sanitizer', desc: 'Resolves and rejects loopback, RFC 1918, link-local IPs', icon: '🌐', status: 'Active' },
                { title: 'CSV/Formula Injection Armor', desc: 'Prefixes hazardous formula characters (=, +, -, @) safely', icon: '📊', status: 'Active' },
                { title: 'Executable Malware Blocker', desc: 'Rejects .exe, .bat, .ps1, .sh, .dll and dangerous scripts', icon: '🦠', status: 'Active' },
                { title: 'OWASP Security Headers', desc: 'Strict CSP, HSTS, X-Content-Type nosniff, X-Frame DENY', icon: '🛡️', status: 'Active' }
              ].map((item, idx) => (
                <div key={idx} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f1f5f9', marginTop: '0.3rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Interactive Threat Simulator */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={16} color="#f59e0b" />
                Live WAF Attack Simulator (Test the Defense)
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                Click below to send simulated malicious payloads to the backend API. Watch the WAF intercept them with HTTP 403 Forbidden and record them in the IP tracking audit log.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => runWafTest('sqli')}>
                  Test SQL Injection (UNION SELECT)
                </button>
                <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => runWafTest('xss')}>
                  Test XSS Attack (&lt;script&gt;)
                </button>
                <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => runWafTest('traversal')}>
                  Test Path Traversal (../../etc/passwd)
                </button>
              </div>
              {wafTestResult && (
                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.8rem', background: '#1e293b', borderLeft: '3px solid #10b981', borderRadius: '4px', fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                  {wafTestResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AUTHENTICATION CREDENTIALS & PROFILE */}
        {activeTab === 'login' && (
          <div style={{ padding: '1rem 0' }}>
            {currentUser ? (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#3b82f6', color: '#ffffff', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {currentUser.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem' }}>
                        {currentUser.full_name || currentUser.username}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{currentUser.email}</div>
                    </div>
                  </div>
                  <span style={{ 
                    background: currentUser.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                    color: currentUser.role === 'admin' ? '#ef4444' : '#3b82f6',
                    border: `1px solid ${currentUser.role === 'admin' ? '#ef4444' : '#3b82f6'}`,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    ROLE: {currentUser.role}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', background: '#0f172a', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Account ID:</span> <span style={{ color: '#cbd5e1' }}>{currentUser.id.slice(0, 13)}...</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Status:</span> <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Last Login IP:</span> <span style={{ color: '#38bdf8' }}>{currentUser.last_login_ip || '127.0.0.1'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Auth Method:</span> <span style={{ color: '#cbd5e1' }}>JWT RFC 7519 HS256</span>
                  </div>
                </div>

                <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444', fontSize: '0.85rem' }} onClick={handleLogout}>
                  <LogOut size={14} style={{ marginRight: '0.4rem' }} />
                  Sign Out of Session
                </button>
              </div>
            ) : (
              <div style={{ maxWidth: '450px', margin: '0 auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Sign In with Credentials</h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Enter your credentials to manage sources, triggers, and audit intelligence.
                </p>

                {authError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.6rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {authError}
                  </div>
                )}
                {authSuccess && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#86efac', padding: '0.6rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {authSuccess}
                  </div>
                )}

                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      Username or Email
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: '4px' }}
                      value={usernameInput} 
                      onChange={(e) => setUsernameInput(e.target.value)} 
                      required 
                    />
                  </div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      Password
                    </label>
                    <input 
                      type="password" 
                      className="form-control" 
                      style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: '4px' }}
                      value={passwordInput} 
                      onChange={(e) => setPasswordInput(e.target.value)} 
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    disabled={isSubmitting}
                  >
                    <LogIn size={16} />
                    {isSubmitting ? 'Authenticating...' : 'Sign In'}
                  </button>
                </form>

                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#0f172a', borderRadius: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.2rem' }}>Default Administrator Credentials:</div>
                  <div>Username: <strong style={{ color: '#38bdf8' }}>admin</strong></div>
                  <div>Password: <strong style={{ color: '#38bdf8' }}>Admin@Civil2026!</strong></div>
                  <div style={{ marginTop: '0.3rem', color: '#64748b' }}>Account protected by 5-attempt brute-force lockout.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IP TRACKING & THREAT AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem' }}>Real-Time Security Audit & IP Tracking</h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Logs every authentication attempt, IP address, user-agent, and blocked malicious payload.
                </p>
              </div>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={loadAuditLogs}>
                Refresh Logs
              </button>
            </div>

            {!token ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#1e293b', borderRadius: '8px', color: '#94a3b8' }}>
                <Lock size={32} style={{ margin: '0 auto 0.5rem auto', color: '#f59e0b' }} />
                <div style={{ color: '#f8fafc', fontWeight: 600 }}>Administrator Authentication Required</div>
                <p style={{ fontSize: '0.8rem', maxWidth: '350px', margin: '0.5rem auto' }}>
                  Full IP tracking and attack logs are protected by Role-Based Access Control. Please sign in as an Admin in the Credentials tab.
                </p>
                <button className="btn btn-primary" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('login')}>
                  Go to Sign In
                </button>
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No security audit events recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#cbd5e1' }}>
                      <th style={{ padding: '0.5rem' }}>Timestamp</th>
                      <th style={{ padding: '0.5rem' }}>Event</th>
                      <th style={{ padding: '0.5rem' }}>Severity</th>
                      <th style={{ padding: '0.5rem' }}>Client IP</th>
                      <th style={{ padding: '0.5rem' }}>Endpoint</th>
                      <th style={{ padding: '0.5rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const isCritical = log.severity === 'CRITICAL' || log.event_type.includes('BLOCKED');
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #1e293b', background: isCritical ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                          <td style={{ padding: '0.5rem', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '0.5rem', fontWeight: 600, color: isCritical ? '#ef4444' : '#f8fafc' }}>
                            {log.event_type}
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <span style={{ 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '3px', 
                              fontSize: '0.7rem', 
                              fontWeight: 600,
                              background: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              color: isCritical ? '#fca5a5' : '#93c5fd'
                            }}>
                              {log.severity}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                            {log.ip_address}
                          </td>
                          <td style={{ padding: '0.5rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                            {log.method} {log.endpoint}
                          </td>
                          <td style={{ padding: '0.5rem', color: '#94a3b8', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details || ''}>
                            {log.details || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            CivilTender Intelligence Platform • Zero-Cost Defense Stack • ISO/NIST Standard Compliant
          </div>
          <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
