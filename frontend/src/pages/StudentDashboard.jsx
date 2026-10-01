import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CATEGORY_DEPARTMENT_MAP = {
  'IT Support': 'IT Department',
  'Hostel Maintenance': 'Hostel Maintenance',
  'Electrical': 'Electrical Department',
  'Plumbing': 'Plumbing Department',
  'Cleaning': 'Housekeeping',
  'Classroom': 'Academic Facilities',
  'Library': 'Library Administration',
  'Administration': 'Administration Office',
  'Other': 'General Services',
};

const CATEGORIES = Object.keys(CATEGORY_DEPARTMENT_MAP);
const PRIORITIES = ['Low', 'Medium', 'High'];

const STATUS_CONFIG = {
  'Pending':     { cls: 'status-pending',    icon: '\u{1F550}', label: 'Pending' },
  'Assigned':    { cls: 'status-assigned',   icon: '\u{1F4CB}', label: 'Assigned' },
  'In Progress': { cls: 'status-inprogress', icon: '\u2699\uFE0F', label: 'In Progress' },
  'Resolved':    { cls: 'status-resolved',   icon: '\u2705', label: 'Resolved' },
};

const PRIORITY_CONFIG = {
  'Low':    { cls: 'priority-low',    icon: '\u{1F535}' },
  'Medium': { cls: 'priority-medium', icon: '\u{1F7E1}' },
  'High':   { cls: 'priority-high',   icon: '\u{1F534}' },
};

const EMPTY_FORM = { title: '', category: 'IT Support', location: '', priority: 'Medium', description: '' };

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay" role="dialog" aria-modal="true">
    <div className="modal-box">
      <div className="modal-icon">⚠️</div>
      <h3 className="modal-title">Confirm Deletion</h3>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

const RequestForm = ({ initial, onSubmit, onCancel, submitting, error }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const dept = CATEGORY_DEPARTMENT_MAP[form.category] || '—';
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };

  return (
    <form className="req-form" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span><span>{error}</span>
        </div>
      )}
      <div className="form-grid-2">
        <div className="form-group form-col-2">
          <label htmlFor="rf-title">Title <span className="req-star">*</span></label>
          <input id="rf-title" type="text" className="form-control" placeholder="Brief description of your issue"
            value={form.title} onChange={set('title')} disabled={submitting} required maxLength={100} />
        </div>
        <div className="form-group">
          <label htmlFor="rf-category">Category <span className="req-star">*</span></label>
          <select id="rf-category" className="form-control" value={form.category} onChange={set('category')} disabled={submitting} required>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="rf-priority">Priority <span className="req-star">*</span></label>
          <select id="rf-priority" className="form-control" value={form.priority} onChange={set('priority')} disabled={submitting} required>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group form-col-2">
          <label htmlFor="rf-location">Location <span className="req-star">*</span></label>
          <input id="rf-location" type="text" className="form-control" placeholder="e.g. Block B, Room 204"
            value={form.location} onChange={set('location')} disabled={submitting} required maxLength={120} />
        </div>
        <div className="form-group form-col-2">
          <label htmlFor="rf-description">Description</label>
          <textarea id="rf-description" className="form-control" placeholder="Additional details"
            value={form.description} onChange={set('description')} disabled={submitting} rows={4} maxLength={1000} />
        </div>
      </div>
      <div className="dept-preview">
        <span className="dept-preview-label">📍 Auto-assigned Department:</span>
        <span className="dept-preview-value">{dept}</span>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? (initial ? 'Saving…' : 'Submitting…') : (initial ? 'Save Changes' : 'Submit Request')}
        </button>
      </div>
    </form>
  );
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchRequests = useCallback(async () => {
    setLoadingReqs(true); setFetchError('');
    try {
      const data = await api.get('/api/requests/my');
      setRequests(data.requests || []);
    } catch (err) {
      setFetchError(err.message || 'Failed to load your requests.');
    } finally { setLoadingReqs(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreate = async (form) => {
    if (!form.title.trim() || !form.location.trim()) { setFormError('Title and Location are required.'); return; }
    setSubmitting(true); setFormError('');
    try {
      await api.post('/api/requests', {
        title: form.title.trim(), category: form.category,
        location: form.location.trim(), priority: form.priority,
        description: form.description.trim(),
      });
      setView('list'); await fetchRequests(); showToast('✅ Request submitted successfully!');
    } catch (err) { setFormError(err.message || 'Failed to submit request.'); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (form) => {
    if (!form.title.trim() || !form.location.trim()) { setFormError('Title and Location are required.'); return; }
    setSubmitting(true); setFormError('');
    try {
      await api.put(`/api/requests/${editTarget._id}`, {
        title: form.title.trim(), category: form.category,
        location: form.location.trim(), priority: form.priority,
        description: form.description.trim(),
      });
      setView('list'); setEditTarget(null); await fetchRequests(); showToast('✅ Request updated successfully!');
    } catch (err) { setFormError(err.message || 'Failed to update request.'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/requests/${deleteTarget._id}`);
      setDeleteTarget(null); await fetchRequests(); showToast('🗑️ Request deleted.');
    } catch (err) { setDeleteTarget(null); showToast('❌ ' + (err.message || 'Failed to delete.')); }
    finally { setDeleting(false); }
  };

  const openEdit = (req) => { setEditTarget(req); setFormError(''); setView('edit'); };
  const cancelForm = () => { setView('list'); setEditTarget(null); setFormError(''); };
  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="header-logo">🎓</span>
          <div>
            <h1 className="header-title">Campus Service Request</h1>
            <span className="header-subtitle">Student Portal</span>
          </div>
        </div>
        <div className="header-user">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <button id="logout-btn" className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      {toast && <div className="toast-banner" role="status">{toast}</div>}

      <main className="dashboard-content">
        {view === 'create' && (
          <section className="section-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">Submit a New Request</h2>
                <p className="section-desc">Describe your issue and it will be routed to the right department automatically.</p>
              </div>
            </div>
            <RequestForm initial={null} onSubmit={handleCreate} onCancel={cancelForm} submitting={submitting} error={formError} />
          </section>
        )}

        {view === 'edit' && editTarget && (
          <section className="section-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">Edit Request</h2>
                <p className="section-desc">Update your pending request details below.</p>
              </div>
            </div>
            <RequestForm
              initial={{ title: editTarget.title, category: editTarget.category,
                location: editTarget.location, priority: editTarget.priority,
                description: editTarget.description || '' }}
              onSubmit={handleUpdate} onCancel={cancelForm} submitting={submitting} error={formError}
            />
          </section>
        )}

        {view === 'list' && (
          <>
            {!loadingReqs && requests.length > 0 && (
              <div className="stats-bar">
                {['Pending', 'Assigned', 'In Progress', 'Resolved'].map((s) => {
                  const count = requests.filter((r) => r.status === s).length;
                  return (
                    <div key={s} className={`stat-chip stat-chip-${s.replace(' ', '')}`}>
                      <span className="stat-icon">{STATUS_CONFIG[s]?.icon}</span>
                      <span className="stat-count">{count}</span>
                      <span className="stat-label">{s}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <section className="section-card">
              <div className="section-header">
                <div>
                  <h2 className="section-title">My Service Requests</h2>
                  <p className="section-desc">
                    {loadingReqs ? 'Loading…' : `${requests.length} request${requests.length !== 1 ? 's' : ''} found`}
                  </p>
                </div>
                <div className="section-actions">
                  <button id="refresh-btn" className="btn btn-outline btn-sm" onClick={fetchRequests} disabled={loadingReqs}>
                    🔄 Refresh
                  </button>
                  <button id="new-request-btn" className="btn btn-primary btn-sm"
                    onClick={() => { setFormError(''); setView('create'); }}>
                    + New Request
                  </button>
                </div>
              </div>

              {loadingReqs && (
                <div className="inline-loading">
                  <div className="spinner spinner-sm"></div>
                  <span>Loading your requests…</span>
                </div>
              )}

              {!loadingReqs && fetchError && (
                <div className="alert alert-error" role="alert">
                  <span className="alert-icon">⚠️</span>
                  <span>{fetchError}</span>
                  <button className="btn btn-outline btn-xs" onClick={fetchRequests} style={{ marginLeft: 'auto' }}>Retry</button>
                </div>
              )}

              {!loadingReqs && !fetchError && requests.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No requests yet</h3>
                  <p>You haven&apos;t submitted any service requests. Click <strong>+ New Request</strong> to get started.</p>
                  <button className="btn btn-primary" style={{ marginTop: '16px' }}
                    onClick={() => { setFormError(''); setView('create'); }}>
                    Submit Your First Request
                  </button>
                </div>
              )}

              {!loadingReqs && !fetchError && requests.length > 0 && (
                <div className="request-list">
                  {requests.map((req) => {
                    const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG['Pending'];
                    const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG['Medium'];
                    const isPending = req.status === 'Pending';
                    return (
                      <div key={req._id} className="request-card">
                        <div className="req-card-top">
                          <div className="req-card-meta">
                            <span className={`status-badge ${statusCfg.cls}`}>{statusCfg.icon} {statusCfg.label}</span>
                            <span className={`priority-badge ${priorityCfg.cls}`}>{priorityCfg.icon} {req.priority}</span>
                          </div>
                          <div className="req-card-actions">
                            {isPending ? (
                              <>
                                <button className="btn btn-outline btn-xs" onClick={() => openEdit(req)}>✏️ Edit</button>
                                <button className="btn btn-danger-outline btn-xs" onClick={() => setDeleteTarget(req)}>🗑️ Delete</button>
                              </>
                            ) : (
                              <>
                                <span className="locked-label">🔒 Read-only</span>
                                <button className="btn btn-danger-outline btn-xs" onClick={() => setDeleteTarget(req)}>🗑️ Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                        <h3 className="req-card-title">{req.title}</h3>
                        <div className="req-card-details">
                          <span className="req-detail"><span className="req-detail-icon">🏷️</span>{req.category}</span>
                          <span className="req-detail"><span className="req-detail-icon">🏢</span>{req.department}</span>
                          <span className="req-detail"><span className="req-detail-icon">📍</span>{req.location}</span>
                          <span className="req-detail"><span className="req-detail-icon">📅</span>{formatDate(req.createdAt)}</span>
                        </div>
                        {req.description && <p className="req-card-desc">{req.description}</p>}
                        {!isPending && (
                          <div className="edit-locked-notice">
                            <span>ℹ️</span>
                            <span>This request is <strong>{req.status}</strong> and can no longer be edited.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {deleteTarget && !deleting && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {deleting && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p>Deleting…</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;