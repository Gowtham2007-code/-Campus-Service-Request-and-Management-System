import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/* ─── Constants ────────────────────────────────────────────────────────────── */
const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Resolved'];
const CATEGORIES = [
  'IT Support',
  'Hostel Maintenance',
  'Electrical',
  'Plumbing',
  'Cleaning',
  'Classroom',
  'Library',
  'Administration',
  'Other',
];
const DEPARTMENTS = [
  'IT Department',
  'Hostel Maintenance',
  'Electrical Department',
  'Plumbing Department',
  'Housekeeping',
  'Academic Facilities',
  'Library Administration',
  'Administration Office',
  'General Services',
];
const PRIORITIES = ['Low', 'Medium', 'High'];

const NEXT_STATUS = {
  'Pending': 'Assigned',
  'Assigned': 'In Progress',
  'In Progress': 'Resolved',
  'Resolved': null,
};

const NEXT_ACTION_LABEL = {
  'Pending': 'Assign to Department',
  'Assigned': 'Mark In Progress',
  'In Progress': 'Mark Resolved',
};

const STATUS_CONFIG = {
  'Pending':     { cls: 'status-pending',    icon: '🕐', label: 'Pending' },
  'Assigned':    { cls: 'status-assigned',   icon: '📋', label: 'Assigned' },
  'In Progress': { cls: 'status-inprogress', icon: '⚙️', label: 'In Progress' },
  'Resolved':    { cls: 'status-resolved',   icon: '✅', label: 'Resolved' },
};

const PRIORITY_CONFIG = {
  'Low':    { cls: 'priority-low',    icon: '🔵' },
  'Medium': { cls: 'priority-medium', icon: '🟡' },
  'High':   { cls: 'priority-high',   icon: '🔴' },
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const shortId = (id = '') => id.slice(-6).toUpperCase();
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/* ─── Confirmation Modal ───────────────────────────────────────────────────── */
const ConfirmModal = ({ title, message, onConfirm, onCancel, confirming }) => (
  <div className="modal-overlay" role="dialog" aria-modal="true">
    <div className="modal-box">
      <div className="modal-icon">⚠️</div>
      <h3 className="modal-title">{title || 'Confirm Action'}</h3>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel} disabled={confirming}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={confirming}>
          {confirming ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

/* ─── Request Details Modal ────────────────────────────────────────────────── */
const RequestDetailModal = ({
  requestId,
  onClose,
  onAdvanceStatus,
  onUpdateDepartment,
  onDeleteRequest,
  actionLoading,
}) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptMessage, setDeptMessage] = useState({ text: '', isError: false });

  // Fetch single request by ID
  const fetchDetail = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/api/requests/${requestId}`);
      if (data.success && data.request) {
        setDetail(data.request);
        setSelectedDept(data.request.department || '');
      } else {
        setError(data.message || 'Failed to load request details');
      }
    } catch (err) {
      setError(err.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDeptSave = async () => {
    if (!selectedDept || selectedDept === detail.department) return;
    setDeptSaving(true);
    setDeptMessage({ text: '', isError: false });
    try {
      const res = await onUpdateDepartment(detail._id, selectedDept);
      if (res && res.success) {
        setDeptMessage({ text: 'Department updated successfully', isError: false });
        setDetail((prev) => ({ ...prev, department: selectedDept }));
      }
    } catch (err) {
      setDeptMessage({ text: err.message || 'Failed to update department', isError: true });
    } finally {
      setDeptSaving(false);
    }
  };

  if (!requestId) return null;

  const sc = detail ? STATUS_CONFIG[detail.status] || STATUS_CONFIG['Pending'] : null;
  const pc = detail ? PRIORITY_CONFIG[detail.priority] || PRIORITY_CONFIG['Medium'] : null;
  const nextStatus = detail ? NEXT_STATUS[detail.status] : null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="detail-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="detail-modal-header">
          <div>
            <span className="ticket-id">#{shortId(detail?._id || requestId)}</span>
            <h3 style={{ marginTop: '8px', fontSize: '18px', fontWeight: '700' }}>
              {detail ? detail.title : 'Request Details'}
            </h3>
          </div>
          <button className="btn btn-outline btn-xs" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="detail-modal-body">
          {loading && (
            <div className="inline-loading">
              <div className="spinner spinner-sm"></div>
              <span>Loading details…</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
              <button className="btn btn-outline btn-xs" onClick={fetchDetail} style={{ marginLeft: 'auto' }}>
                Retry
              </button>
            </div>
          )}

          {!loading && detail && (
            <>
              {/* Status Workflow Stepper */}
              <div>
                <span className="detail-meta-label">Workflow Progress</span>
                <div className="detail-stepper" style={{ marginTop: '6px' }}>
                  {STATUSES.map((step, idx) => {
                    const currentIdx = STATUSES.indexOf(detail.status);
                    const isDone = currentIdx > idx;
                    const isActive = detail.status === step;
                    return (
                      <React.Fragment key={step}>
                        <div
                          className={`stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                        >
                          <span>{STATUS_CONFIG[step]?.icon}</span>
                          <span>{step}</span>
                        </div>
                        {idx < STATUSES.length - 1 && <span className="stepper-arrow">→</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Status Action Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <span className="detail-meta-label">Current Status: </span>
                  <span className={`status-badge ${sc?.cls}`} style={{ marginLeft: '6px' }}>
                    {sc?.icon} {sc?.label}
                  </span>
                </div>

                {nextStatus ? (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading}
                    onClick={async () => {
                      await onAdvanceStatus(detail._id, detail.status, nextStatus);
                      fetchDetail();
                    }}
                  >
                    {actionLoading ? 'Updating…' : `➔ ${NEXT_ACTION_LABEL[detail.status]}`}
                  </button>
                ) : (
                  <span className="completed-tag">✓ Completed — No Further Actions</span>
                )}
              </div>

              {/* Details Grid */}
              <div className="detail-meta-grid">
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Category</span>
                  <span className="detail-meta-val">{detail.category}</span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Priority</span>
                  <span className={`priority-badge ${pc?.cls}`} style={{ width: 'fit-content' }}>
                    {pc?.icon} {detail.priority}
                  </span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Location</span>
                  <span className="detail-meta-val">{detail.location}</span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Department</span>
                  <span className="detail-meta-val">{detail.department}</span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Submitted By</span>
                  <span className="detail-meta-val">
                    {detail.createdBy?.name || 'Unknown Student'}
                  </span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Student Email</span>
                  <span className="detail-meta-val">
                    {detail.createdBy?.email || '—'}
                  </span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Created At</span>
                  <span className="detail-meta-val">{formatDateTime(detail.createdAt)}</span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Last Updated</span>
                  <span className="detail-meta-val">{formatDateTime(detail.updatedAt)}</span>
                </div>
              </div>

              {/* Department Reassignment */}
              <div>
                <span className="detail-meta-label">Department Assignment</span>
                <div className="dept-edit-row" style={{ marginTop: '6px' }}>
                  <select
                    className="filter-select"
                    style={{ flex: 1 }}
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    disabled={deptSaving}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleDeptSave}
                    disabled={deptSaving || selectedDept === detail.department}
                  >
                    {deptSaving ? 'Saving…' : 'Save Department'}
                  </button>
                </div>
                {deptMessage.text && (
                  <p
                    style={{
                      fontSize: '12px',
                      marginTop: '6px',
                      color: deptMessage.isError ? 'var(--danger)' : 'var(--success)',
                    }}
                  >
                    {deptMessage.text}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <span className="detail-meta-label">Description</span>
                <div className="detail-desc-box" style={{ marginTop: '6px' }}>
                  {detail.description || 'No additional description provided.'}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="detail-modal-footer">
          {detail && (
            <button
              className="btn btn-danger-outline btn-sm"
              onClick={() => onDeleteRequest(detail)}
              disabled={actionLoading}
            >
              🗑️ Delete Request
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Admin Dashboard Component ───────────────────────────────────────── */
const AdminDashboard = () => {
  const { user, logout } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals & Active state
  const [activeDetailId, setActiveDetailId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await api.get('/api/requests');
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
      } else {
        setFetchError(data.message || 'Failed to fetch requests');
      }
    } catch (err) {
      setFetchError(err.message || 'Network error while fetching requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Calculate KPI counts directly from actual requests
  const kpis = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'Pending').length;
    const assigned = requests.filter((r) => r.status === 'Assigned').length;
    const inProgress = requests.filter((r) => r.status === 'In Progress').length;
    const resolved = requests.filter((r) => r.status === 'Resolved').length;
    return { total, pending, assigned, inProgress, resolved };
  }, [requests]);

  // Combined Search & Filter logic
  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return requests.filter((req) => {
      // Search check across title, student name, location
      if (term) {
        const titleMatch = req.title?.toLowerCase().includes(term);
        const nameMatch = req.createdBy?.name?.toLowerCase().includes(term);
        const locationMatch = req.location?.toLowerCase().includes(term);
        if (!titleMatch && !nameMatch && !locationMatch) return false;
      }

      // Filter checks
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && req.category !== categoryFilter) return false;
      if (deptFilter !== 'ALL' && req.department !== deptFilter) return false;
      if (priorityFilter !== 'ALL' && req.priority !== priorityFilter) return false;

      return true;
    });
  }, [requests, searchTerm, statusFilter, categoryFilter, deptFilter, priorityFilter]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    deptFilter !== 'ALL' ||
    priorityFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setDeptFilter('ALL');
    setPriorityFilter('ALL');
  };

  // Status workflow advance action
  const handleAdvanceStatus = async (requestId, currentStatus, targetNextStatus) => {
    const validNext = NEXT_STATUS[currentStatus];
    if (!validNext || validNext !== targetNextStatus) {
      showToast(`Invalid transition from ${currentStatus} to ${targetNextStatus}`);
      return;
    }

    setActionLoading(true);
    try {
      const data = await api.put(`/api/requests/${requestId}`, { status: targetNextStatus });
      if (data.success) {
        showToast(`Request #${shortId(requestId)} updated to "${targetNextStatus}"`);
        await fetchRequests();
      } else {
        showToast(data.message || 'Failed to update status');
      }
    } catch (err) {
      showToast(err.message || 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  // Department update action
  const handleUpdateDepartment = async (requestId, newDepartment) => {
    const data = await api.put(`/api/requests/${requestId}`, { department: newDepartment });
    if (data.success) {
      showToast(`Department updated to "${newDepartment}"`);
      await fetchRequests();
      return data;
    } else {
      throw new Error(data.message || 'Failed to update department');
    }
  };

  // Delete request action
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const data = await api.delete(`/api/requests/${deleteTarget._id}`);
      if (data.success) {
        showToast(`Request #${shortId(deleteTarget._id)} deleted successfully`);
        if (activeDetailId === deleteTarget._id) {
          setActiveDetailId(null);
        }
        setDeleteTarget(null);
        await fetchRequests();
      } else {
        showToast(data.message || 'Failed to delete request');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting request');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* ── Top Header / Navbar ────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="header-logo">🛡️</span>
          <div>
            <h1 className="header-title">Campus Service Request</h1>
            <span className="header-subtitle">Admin Portal</span>
          </div>
        </div>
        <div className="header-user">
          <div className="user-info">
            <span className="user-name">{user?.name || 'Administrator'}</span>
            <span className="user-email">{user?.email || 'admin@campus.edu'}</span>
          </div>
          <div className="user-avatar" style={{ background: 'var(--purple)' }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <span className="admin-badge">Admin</span>
          <button id="logout-btn" className="btn btn-outline btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* ── Toast Notification ─────────────────────────────────────────────── */}
      {toast && (
        <div className="toast-banner" role="status">
          {toast}
        </div>
      )}

      {/* ── Main Dashboard Content ─────────────────────────────────────────── */}
      <main className="dashboard-content">
        {/* KPI / Statistics Cards */}
        <div className="kpi-bar">
          <div
            className={`kpi-card kpi-total ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
            title="Show all requests"
          >
            <div className="kpi-icon-wrap">📊</div>
            <div className="kpi-data">
              <span className="kpi-value">{kpis.total}</span>
              <span className="kpi-title">Total Requests</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-pending ${statusFilter === 'Pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
            title="Filter by Pending"
          >
            <div className="kpi-icon-wrap">🕐</div>
            <div className="kpi-data">
              <span className="kpi-value">{kpis.pending}</span>
              <span className="kpi-title">Pending</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-assigned ${statusFilter === 'Assigned' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Assigned' ? 'ALL' : 'Assigned')}
            title="Filter by Assigned"
          >
            <div className="kpi-icon-wrap">📋</div>
            <div className="kpi-data">
              <span className="kpi-value">{kpis.assigned}</span>
              <span className="kpi-title">Assigned</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-inprogress ${statusFilter === 'In Progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'ALL' : 'In Progress')}
            title="Filter by In Progress"
          >
            <div className="kpi-icon-wrap">⚙️</div>
            <div className="kpi-data">
              <span className="kpi-value">{kpis.inProgress}</span>
              <span className="kpi-title">In Progress</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-resolved ${statusFilter === 'Resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Resolved' ? 'ALL' : 'Resolved')}
            title="Filter by Resolved"
          >
            <div className="kpi-icon-wrap">✅</div>
            <div className="kpi-data">
              <span className="kpi-value">{kpis.resolved}</span>
              <span className="kpi-title">Resolved</span>
            </div>
          </div>
        </div>

        {/* Requests Management Section Card */}
        <section className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Request Management Console</h2>
              <p className="section-desc">
                {loading
                  ? 'Loading requests…'
                  : `Showing ${filteredRequests.length} of ${requests.length} total request${
                      requests.length !== 1 ? 's' : ''
                    }`}
              </p>
            </div>
            <div className="section-actions">
              <button
                id="refresh-btn"
                className="btn btn-outline btn-sm"
                onClick={fetchRequests}
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="toolbar-container">
            {/* Search Input */}
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                id="admin-search-input"
                type="text"
                className="search-input"
                placeholder="Search by title, student name, location…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              id="admin-filter-status"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              id="admin-filter-category"
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              id="admin-filter-department"
              className="filter-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              id="admin-filter-priority"
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                id="reset-filters-btn"
                className="btn btn-outline btn-xs"
                onClick={resetFilters}
                style={{ padding: '8px 12px' }}
              >
                ✕ Reset
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="inline-loading">
              <div className="spinner spinner-sm"></div>
              <span>Loading campus requests…</span>
            </div>
          )}

          {/* Error State */}
          {!loading && fetchError && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{fetchError}</span>
              <button
                className="btn btn-outline btn-xs"
                onClick={fetchRequests}
                style={{ marginLeft: 'auto' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !fetchError && filteredRequests.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>No requests found</h3>
              <p>
                {hasActiveFilters
                  ? 'No service requests match your search and filter criteria.'
                  : 'There are currently no service requests in the system.'}
              </p>
              {hasActiveFilters && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: '16px' }}
                  onClick={resetFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Requests Table */}
          {!loading && !fetchError && filteredRequests.length > 0 && (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Student</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Department</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG['Pending'];
                    const pc = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG['Medium'];
                    const nextStatus = NEXT_STATUS[req.status];

                    return (
                      <tr key={req._id}>
                        <td>
                          <span className="ticket-id">#{shortId(req._id)}</span>
                        </td>
                        <td>
                          <span className="table-student-name">
                            {req.createdBy?.name || '—'}
                          </span>
                        </td>
                        <td>
                          <div className="table-req-title" title={req.title}>
                            {req.title}
                          </div>
                        </td>
                        <td>{req.category}</td>
                        <td>{req.location}</td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {req.department || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`priority-badge ${pc.cls}`}>
                            {pc.icon} {req.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${sc.cls}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatDate(req.createdAt)}
                        </td>
                        <td>
                          <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                            {/* View Details */}
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => setActiveDetailId(req._id)}
                              title="View full request details"
                            >
                              👁️ View
                            </button>

                            {/* Workflow Advance Button */}
                            {nextStatus ? (
                              <button
                                className={`btn ${
                                  nextStatus === 'Resolved' ? 'btn-primary' : 'btn-outline'
                                } btn-xs`}
                                disabled={actionLoading}
                                onClick={() =>
                                  handleAdvanceStatus(req._id, req.status, nextStatus)
                                }
                                title={`Advance status to "${nextStatus}"`}
                              >
                                {NEXT_ACTION_LABEL[req.status]}
                              </button>
                            ) : (
                              <span className="completed-tag">✓ Done</span>
                            )}

                            {/* Delete Button */}
                            <button
                              className="btn btn-danger-outline btn-xs"
                              onClick={() => setDeleteTarget(req)}
                              title="Delete request"
                              disabled={actionLoading}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ── Request Details Modal ─────────────────────────────────────────── */}
      {activeDetailId && (
        <RequestDetailModal
          requestId={activeDetailId}
          onClose={() => setActiveDetailId(null)}
          onAdvanceStatus={handleAdvanceStatus}
          onUpdateDepartment={handleUpdateDepartment}
          onDeleteRequest={(req) => setDeleteTarget(req)}
          actionLoading={actionLoading}
        />
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmModal
          title="Confirm Request Deletion"
          message={`Are you sure you want to delete request "${deleteTarget.title}" (#${shortId(
            deleteTarget._id
          )})? This will remove the request permanently.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          confirming={deleting}
        />
      )}
    </div>
  );
};

export default AdminDashboard;