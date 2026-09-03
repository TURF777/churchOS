/* ===================================================
   ChurchOS — Shared Activity Log Module (activityLog.js)
   Now uses Firestore for storage with real-time listeners.
   Universal tracking, role-scoped feeds, real-time sync,
   filtering, search, CSV/PDF export, and printing.
   =================================================== */

(function () {
  'use strict';

  const { dbAdd, dbGetAll, dbListen } = window.ChurchOS;

  // In-memory cache of activities (populated by Firestore listener)
  let cachedActivities = null;
  let activeUnsubscribe = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function nowString() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function getSeedActivities() {
    return [
      // ── Youth Ministry entries (visible in Leader → Department Activity) ──
      { id: uid(), timestamp: '2026-08-05 10:15:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'create', module: 'Attendance', record: 'Recorded Youth Ministry attendance for 2026-08-03 — 13/15 present', recordId: 'att-y01', isMemberFacing: true, memberSummary: 'Youth Ministry attendance recorded for Sunday.' },
      { id: uid(), timestamp: '2026-08-03 11:45:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'create', module: 'Members', record: 'Registered visitor: Emmanuel Tetteh (055 111 2233)', recordId: 'v-y01', isMemberFacing: true, memberSummary: 'New visitor Emmanuel Tetteh welcomed to Youth Ministry!' },
      { id: uid(), timestamp: '2026-08-02 14:30:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'create', module: 'Members', record: 'Flagged Solomon Kwarteng for follow-up: "Absent 3 consecutive meetings, needs a friendly check-in call."', recordId: 'fu-y01', isMemberFacing: false, memberSummary: '' },
      { id: uid(), timestamp: '2026-07-30 09:20:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'edit', module: 'Members', record: 'Converted visitor Priscilla Kumi to active Youth Ministry member', recordId: 'v-y02', isMemberFacing: true, memberSummary: 'Priscilla Kumi is now a full Youth Ministry member!' },
      { id: uid(), timestamp: '2026-07-28 16:00:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'send', module: 'Communications', record: 'Broadcasted message to Youth Ministry: "Friday Bible Study moved to 6pm"', recordId: 'msg-y01', isMemberFacing: true, memberSummary: 'Youth Ministry announcement: Friday Bible Study moved to 6pm.' },
      { id: uid(), timestamp: '2026-07-27 10:30:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'create', module: 'Attendance', record: 'Recorded Youth Ministry attendance for 2026-07-27 — 11/15 present', recordId: 'att-y02', isMemberFacing: true, memberSummary: 'Youth Ministry attendance recorded for Sunday.' },
      { id: uid(), timestamp: '2026-07-25 11:00:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'edit', module: 'Attendance', record: 'Updated Youth Ministry roster — added 3 members', recordId: 'd-404', isMemberFacing: true, memberSummary: 'Youth Ministry added 3 new members to the roster!' },
      { id: uid(), timestamp: '2026-07-22 09:45:00', user: 'Kofi Darko', role: 'leader', department: 'Youth Ministry', action: 'edit', module: 'Members', record: 'Updated task status for Justice Amoah to Completed', recordId: 'fu-y02', isMemberFacing: false, memberSummary: '' },

      // ── Admin / Church-wide entries ──
      { id: uid(), timestamp: '2026-08-04 14:30:00', user: 'Admin User', role: 'admin', department: 'Administration', action: 'create', module: 'Members', record: 'Added new member: Justice Amponsah', recordId: 'm-101', isMemberFacing: true, memberSummary: 'Welcome our new member Justice Amponsah to the church family!' },
      { id: uid(), timestamp: '2026-08-03 12:15:00', user: 'Abena Osei', role: 'finance', department: 'Finance Team', action: 'create', module: 'Finance', record: 'Recorded 12 tithe entries for Sunday 2nd Service', recordId: 'f-202', isMemberFacing: false, memberSummary: '' },
      { id: uid(), timestamp: '2026-08-02 18:30:00', user: 'System', role: 'system', department: 'IT', action: 'system', module: 'Communications', record: 'Sent 145 bulk SMS for Sunday service reminder', recordId: 'c-303', isMemberFacing: true, memberSummary: 'Sunday Service reminder sent to all congregation members.' },
      { id: uid(), timestamp: '2026-07-31 14:00:00', user: 'Rev. Daniel Mensah', role: 'pastor', department: 'Pastoral', action: 'edit', module: 'Members', record: 'Flagged Ama Serwaa for pastoral follow-up', recordId: 'm-102', isMemberFacing: false, memberSummary: '' },
      { id: uid(), timestamp: '2026-07-29 09:30:00', user: 'Admin User', role: 'admin', department: 'Administration', action: 'create', module: 'Giving', record: 'Added new giving category: Welfare Fund', recordId: 'g-505', isMemberFacing: true, memberSummary: 'New Giving Category added: Welfare Fund for member support.' },
      { id: uid(), timestamp: '2026-07-26 15:00:00', user: 'Admin User', role: 'admin', department: 'Administration', action: 'edit', module: 'Settings', record: 'Updated church profile address and contact phone', recordId: 's-606', isMemberFacing: false, memberSummary: '' },
      { id: uid(), timestamp: '2026-07-24 10:20:00', user: 'System', role: 'system', department: 'IT', action: 'system', module: 'Members', record: 'Auto-flagged 2 members as inactive (4+ weeks absent)', recordId: 'm-103', isMemberFacing: false, memberSummary: '' },
      { id: uid(), timestamp: '2026-07-23 08:00:00', user: 'Rev. Daniel Mensah', role: 'pastor', department: 'Pastoral', action: 'login', module: 'Auth', record: 'Pastor logged into dashboard', recordId: '', isMemberFacing: false, memberSummary: '' },
      { id: uid(), timestamp: '2026-07-21 14:45:00', user: 'Akosua Mensah', role: 'leader', department: "Women's Ministry", action: 'edit', module: 'Members', record: "Updated Women's Ministry roster and assigned co-leader", recordId: 'd-405', isMemberFacing: true, memberSummary: "Women's Ministry updated meeting roster for August." },
      { id: uid(), timestamp: '2026-07-20 09:10:00', user: 'Admin User', role: 'admin', department: 'Administration', action: 'create', module: 'User Accounts', record: 'Created user account: Akosua Mensah (Leader)', recordId: 'u-707', isMemberFacing: false, memberSummary: '' },
      { id: uid(), timestamp: '2026-07-19 11:30:00', user: 'Abena Osei', role: 'finance', department: 'Finance Team', action: 'create', module: 'Finance', record: 'Recorded offering entries for Friday Prayer Service', recordId: 'f-203', isMemberFacing: false, memberSummary: '' },
    ];
  }

  /**
   * Initialize Firestore data — seed if empty, then start real-time listener
   */
  async function initFirestoreData() {
    try {
      await window.ChurchOS.dbSeedIfEmpty('activityLog', getSeedActivities());
    } catch (err) {
      console.warn('[ActivityLog] Seed failed, using cached data:', err);
    }
  }

  /**
   * Load activities from Firestore (one-time fetch)
   */
  async function loadActivitiesFromFirestore() {
    try {
      const results = await dbGetAll('activityLog', null, {
        includeDeleted: false,
        orderBy: 'timestamp',
        orderDir: 'desc',
        limitTo: 300,
      });
      cachedActivities = results;
      return results;
    } catch (err) {
      console.warn('[ActivityLog] Firestore fetch failed, using seed:', err);
      cachedActivities = getSeedActivities();
      return cachedActivities;
    }
  }

  /**
   * Get the current activities list (cached or fresh from Firestore)
   */
  async function ensureActivities() {
    if (cachedActivities !== null) return cachedActivities;
    return await loadActivitiesFromFirestore();
  }

  /**
   * Log an action from anywhere in the app — writes to Firestore
   * @param {Object} opts
   */
  async function logActivity(opts = {}) {
    const entry = {
      timestamp: opts.timestamp || nowString(),
      user: opts.user || 'Admin User',
      role: opts.role || 'admin',
      department: opts.department || 'Administration',
      action: opts.action || 'edit',
      module: opts.module || 'General',
      record: opts.record || opts.description || 'Performed an action',
      recordId: opts.recordId || '',
      isMemberFacing: opts.isMemberFacing !== undefined ? opts.isMemberFacing : true,
      memberSummary: opts.memberSummary || opts.record || 'Church activity recorded.',
    };

    // Write to Firestore
    try {
      const docId = await dbAdd('activityLog', entry);
      entry.id = docId;
    } catch (err) {
      console.warn('[ActivityLog] Failed to write to Firestore:', err);
      entry.id = uid();
    }

    // Update cache
    if (cachedActivities) {
      cachedActivities.unshift(entry);
      if (cachedActivities.length > 300) cachedActivities.length = 300;
    }

    // Cross-module notification integration
    if (window.ChurchNotifications && (entry.isMemberFacing || entry.action === 'create' || entry.action === 'send')) {
      try {
        window.ChurchNotifications.notify({
          title: `Activity: ${entry.module}`,
          message: entry.record,
          type: entry.action === 'delete' ? 'warning' : 'info',
          role: 'all'
        });
      } catch (err) {
        // Notification system silent fail guard
      }
    }

    // Dispatch local event for any open tabs
    window.dispatchEvent(new CustomEvent('churchos:activity_updated', { detail: entry }));

    return entry;
  }

  /**
   * Filter activities based on user role and filter criteria
   */
  function filterActivities(activities, role = 'admin', filters = {}, userContext = {}) {
    return activities.filter(item => {
      // 1. Role-based Scoping
      if (role === 'leader' && userContext.department) {
        const itemDept = (item.department || '').toLowerCase();
        const userDept = (userContext.department || '').toLowerCase();
        if (itemDept && userDept && !itemDept.includes(userDept) && !userDept.includes(itemDept) && item.role !== 'admin' && item.role !== 'pastor') {
          if (item.module !== 'Communications' && item.module !== 'Services') return false;
        }
      } else if (role === 'finance') {
        const mod = (item.module || '').toLowerCase();
        if (mod !== 'finance' && mod !== 'giving' && mod !== 'categories' && item.action !== 'export') {
          return false;
        }
      } else if (role === 'member') {
        if (!item.isMemberFacing) return false;
      }

      // 2. Action Filter
      if (filters.action && filters.action !== 'all') {
        if (item.action !== filters.action) return false;
      }

      // 3. Module Filter
      if (filters.module && filters.module !== 'all') {
        if ((item.module || '').toLowerCase() !== filters.module.toLowerCase()) return false;
      }

      // 4. Date Range Filter
      if (filters.fromDate) {
        const itemDate = (item.timestamp || '').slice(0, 10);
        if (itemDate < filters.fromDate) return false;
      }
      if (filters.toDate) {
        const itemDate = (item.timestamp || '').slice(0, 10);
        if (itemDate > filters.toDate) return false;
      }

      // 5. Search Keyword
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchUser = (item.user || '').toLowerCase().includes(q);
        const matchRecord = (item.record || '').toLowerCase().includes(q);
        const matchDept = (item.department || '').toLowerCase().includes(q);
        const matchModule = (item.module || '').toLowerCase().includes(q);
        const matchSummary = (item.memberSummary || '').toLowerCase().includes(q);
        if (!matchUser && !matchRecord && !matchDept && !matchModule && !matchSummary) return false;
      }

      return true;
    });
  }

  /**
   * Get filtered activities (async — fetches from Firestore if needed)
   */
  async function getActivities(role = 'admin', filters = {}, userContext = {}) {
    const activities = await ensureActivities();
    return filterActivities(activities, role, filters, userContext);
  }

  /**
   * Get filtered activities (sync — uses cache only)
   */
  function getActivitiesSync(role = 'admin', filters = {}, userContext = {}) {
    const activities = cachedActivities || getSeedActivities();
    return filterActivities(activities, role, filters, userContext);
  }

  /**
   * Export filtered log to CSV file download
   */
  function exportCSV(role = 'admin', filters = {}, userContext = {}) {
    const list = getActivitiesSync(role, filters, userContext);
    if (list.length === 0) {
      alert('No activity log entries match your current filter.');
      return;
    }

    const headers = ['Timestamp', 'User', 'Role', 'Department', 'Action', 'Module', 'Description'];
    const rows = list.map(item => [
      `"${item.timestamp || ''}"`,
      `"${(item.user || '').replace(/"/g, '""')}"`,
      `"${(item.role || '').replace(/"/g, '""')}"`,
      `"${(item.department || '').replace(/"/g, '""')}"`,
      `"${(item.action || '').replace(/"/g, '""')}"`,
      `"${(item.module || '').replace(/"/g, '""')}"`,
      `"${(item.record || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ChurchOS_ActivityLog_${role}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logActivity({
      user: userContext.name || 'User',
      role: role,
      action: 'export',
      module: 'ActivityLog',
      record: `Exported ${list.length} Activity Log records to CSV`,
      isMemberFacing: false
    });
  }

  /**
   * Print current activity log view
   */
  function printLog(role = 'admin', filters = {}, userContext = {}) {
    const list = getActivitiesSync(role, filters, userContext);
    if (list.length === 0) {
      alert('No activity log entries match your current filter.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to open the print view.');
      return;
    }

    const rowsHtml = list.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; white-space: nowrap;">${item.timestamp}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; font-weight: 600;">${item.user}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${item.role}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${item.module}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${item.record}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Activity Log Report — ChurchOS</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111827; }
          h2 { margin-bottom: 4px; color: #1e293b; }
          p { margin-top: 0; color: #64748b; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { text-align: left; background: #f8fafc; padding: 8px; font-size: 12px; border-bottom: 2px solid #cbd5e1; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h2>ChurchOS — Activity Log Report</h2>
        <p>Generated for role: <strong>${role.toUpperCase()}</strong> | Date: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Module</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  /**
   * Render complete Activity Log UI component with Firestore real-time listener
   */
  async function renderActivityFeed(containerId, role = 'admin', userContext = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Initialize Firestore data (seed if needed)
    await initFirestoreData();

    // Load initial data
    await loadActivitiesFromFirestore();

    const actionBadgeClasses = {
      create: 'badge--success',
      edit: 'badge--info',
      delete: 'badge--danger',
      restore: 'badge--success',
      send: 'badge--navy',
      system: 'badge--warning',
      login: 'badge--ghost',
      export: 'badge--info'
    };

    function updateView() {
      const search = container.querySelector('.js-act-search')?.value || '';
      const action = container.querySelector('.js-act-action')?.value || 'all';
      const moduleFilter = container.querySelector('.js-act-module')?.value || 'all';
      const fromDate = container.querySelector('.js-act-from')?.value || '';
      const toDate = container.querySelector('.js-act-to')?.value || '';

      const filters = { search, action, module: moduleFilter, fromDate, toDate };
      const items = getActivitiesSync(role, filters, userContext);
      const feedEl = container.querySelector('.js-act-list');

      if (!feedEl) return;

      if (items.length === 0) {
        feedEl.innerHTML = `
          <div class="empty-state" style="padding: 2rem; text-align: center;">
            <div class="empty-state__icon"><i data-lucide="clipboard-list"></i></div>
            <div class="empty-state__title">No activity entries found</div>
            <div class="empty-state__text">Try clearing search terms or adjusting filters.</div>
          </div>
        `;
        return;
      }

      if (role === 'member') {
        // Warm, simple cards for members
        feedEl.innerHTML = items.map(item => `
          <div class="activity-card activity-card--member">
            <div class="activity-card__icon"><i data-lucide="church"></i></div>
            <div class="activity-card__body">
              <div class="activity-card__title">${item.memberSummary || item.record}</div>
              <div class="activity-card__meta">
                <span>📍 ${item.module}</span> • <span>🕒 ${item.timestamp}</span>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        // Detailed feed for Admin, Pastor, Leader, Finance
        feedEl.innerHTML = items.map(item => `
          <div class="activity-card">
            <div class="activity-card__dot activity-card__dot--${item.action}"></div>
            <div class="activity-card__content">
              <div class="activity-card__header">
                <div>
                  <strong class="activity-card__user">${item.user}</strong>
                  <span class="badge ${actionBadgeClasses[item.action] || 'badge--info'}">${item.action}</span>
                  <span class="badge badge--navy">${item.module}</span>
                </div>
                <div class="activity-card__time">${item.timestamp}</div>
              </div>
              <div class="activity-card__desc">${item.record}</div>
              <div class="activity-card__subtext">Role: ${item.role} ${item.department ? '• Dept: ' + item.department : ''}</div>
            </div>
          </div>
        `).join('');
      }

      // Re-create lucide icons for new DOM elements
      if (window.lucide) window.lucide.createIcons();
    }

    // Render Container Toolbar + Feed Skeleton
    container.innerHTML = `
      <div class="activity-log-component">
        <div class="activity-log-toolbar">
          <div class="activity-log-toolbar__filters">
            <input type="text" class="form-input form-input--sm js-act-search" placeholder="🔍 Search activity logs...">
            
            <select class="form-select form-select--sm js-act-action">
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="edit">Edit</option>
              <option value="delete">Delete / Soft-Delete</option>
              <option value="restore">Restore</option>
              <option value="send">Send / Broadcast</option>
              <option value="system">System / Auto</option>
              <option value="export">Export / Backup</option>
            </select>

            <select class="form-select form-select--sm js-act-module">
              <option value="all">All Modules</option>
              <option value="Members">Members</option>
              <option value="Attendance">Attendance</option>
              <option value="Finance">Finance / Giving</option>
              <option value="Communications">Communications</option>
              <option value="User Accounts">User Accounts</option>
              <option value="Settings">Settings / System</option>
            </select>

            <input type="date" class="form-input form-input--sm js-act-from" title="From Date">
            <input type="date" class="form-input form-input--sm js-act-to" title="To Date">
          </div>

          <div class="activity-log-toolbar__actions">
            <button class="btn btn--ghost btn--sm js-act-btn-csv">📥 Export CSV</button>
            <button class="btn btn--ghost btn--sm js-act-btn-print">🖨️ Print Log</button>
          </div>
        </div>

        <div class="activity-feed js-act-list"></div>
      </div>
    `;

    // Attach Event Listeners inside container
    container.querySelector('.js-act-search')?.addEventListener('input', updateView);
    container.querySelector('.js-act-action')?.addEventListener('change', updateView);
    container.querySelector('.js-act-module')?.addEventListener('change', updateView);
    container.querySelector('.js-act-from')?.addEventListener('change', updateView);
    container.querySelector('.js-act-to')?.addEventListener('change', updateView);

    container.querySelector('.js-act-btn-csv')?.addEventListener('click', () => {
      const search = container.querySelector('.js-act-search')?.value || '';
      const action = container.querySelector('.js-act-action')?.value || 'all';
      const moduleFilter = container.querySelector('.js-act-module')?.value || 'all';
      const fromDate = container.querySelector('.js-act-from')?.value || '';
      const toDate = container.querySelector('.js-act-to')?.value || '';
      exportCSV(role, { search, action, module: moduleFilter, fromDate, toDate }, userContext);
    });

    container.querySelector('.js-act-btn-print')?.addEventListener('click', () => {
      const search = container.querySelector('.js-act-search')?.value || '';
      const action = container.querySelector('.js-act-action')?.value || 'all';
      const moduleFilter = container.querySelector('.js-act-module')?.value || 'all';
      const fromDate = container.querySelector('.js-act-from')?.value || '';
      const toDate = container.querySelector('.js-act-to')?.value || '';
      printLog(role, { search, action, module: moduleFilter, fromDate, toDate }, userContext);
    });

    // Initial render
    updateView();

    // ★ Set up Firestore real-time listener for live updates across devices
    if (activeUnsubscribe) activeUnsubscribe(); // Clean up previous listener
    activeUnsubscribe = dbListen('activityLog', null, {
      orderBy: 'timestamp',
      orderDir: 'desc',
      limitTo: 300,
    }, (activities) => {
      cachedActivities = activities;
      updateView();
    });

    // Also listen for local custom events (from same-tab updates)
    window.addEventListener('churchos:activity_updated', () => updateView());
  }

  // Export Singleton to global window
  window.ChurchActivityLog = {
    logActivity,
    getActivities,
    getActivitiesSync,
    exportCSV,
    printLog,
    renderActivityFeed,
    init: renderActivityFeed,
  };

})();
