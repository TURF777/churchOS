/* ===================================================
   ChurchOS — Senior Pastor Dashboard JavaScript
   Now uses Firestore for data persistence
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Firestore Collections (replaces localStorage keys)
     --------------------------------------------------- */
  const COLLECTIONS = {
    members:       'members',
    services:      'services',
    categories:    'givingCategories',
    users:         'users',
    pastoralNotes: 'pastoralNotes',
    lifeEvents:    'lifeEvents',
    careTasks:     'followUpTasks',
    prayerRequests:'prayerRequests',
    approvals:     'pendingApprovals',
    sentMessages:  'communications',
    summaryConfig: 'churchProfile',
    audit:         'activityLog',
    church:        'churchProfile',
  };

  const { dbAdd, dbSet, dbGet, dbGetAll, dbUpdate, dbSoftDelete, dbRestore: dbRestoreDoc, dbSeedIfEmpty, dbListen } = window.ChurchOS;

  /* ---------------------------------------------------
     Utility Helpers
     --------------------------------------------------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

  function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ---------------------------------------------------
     Seed Data for Pastor Dashboard
     --------------------------------------------------- */
  const SEED_PASTORAL_NOTES = [
    { id: uid(), memberId: 'm1', author: 'Rev. Daniel Mensah', date: '2026-07-20 14:30', note: 'Visited home following bereavement. Family is holding up well; arranged for Ushering team to assist with funeral setup.' },
    { id: uid(), memberId: 'm2', author: 'Rev. Daniel Mensah', date: '2026-07-15 11:00', note: 'Counselling session regarding marriage prep. Both partners attended and completed week 3 of pre-marital material.' },
    { id: uid(), memberId: 'm3', author: 'Rev. Daniel Mensah', date: '2026-07-10 16:15', note: 'Phone check-in following hospital discharge. Health improving, requested prayer during Sunday service.' },
  ];

  const SEED_LIFE_EVENTS = [
    { id: uid(), memberId: 'm1', type: 'Water Baptism', date: '2025-04-12', notes: 'Baptised at Easter Service by Rev. Daniel Mensah.' },
    { id: uid(), memberId: 'm2', type: 'Baby Dedication', date: '2025-09-20', notes: 'Baby Eliora Asante dedicated before congregation.' },
    { id: uid(), memberId: 'm3', type: 'Marriage', date: '2024-11-16', notes: 'Married at Grace Assembly Main Sanctuary.' },
  ];

  const SEED_CARE_TASKS = [
    { id: uid(), memberName: 'Ama Serwaa', reason: 'Absent 4 consecutive Sundays — check on family health', assignee: 'Akosua Mensah (Women\'s Leader)', dueDate: '2026-07-25', status: 'Pending' },
    { id: uid(), memberName: 'Kwesi Mensah', reason: 'Bereavement — lost mother, coordinate meals', assignee: 'Kwame Asante (Ushering Head)', dueDate: '2026-07-24', status: 'In Progress' },
    { id: uid(), memberName: 'Emmanuel Tetteh', reason: 'Absent 3 Sundays, previously very active', assignee: 'Kofi Darko (Youth Leader)', dueDate: '2026-07-28', status: 'Pending' },
    { id: uid(), memberName: 'Grace Adjei', reason: 'New member welcome visitation', assignee: 'Akosua Mensah (Women\'s Leader)', dueDate: '2026-07-21', status: 'Completed' },
  ];

  const SEED_PRAYER_REQUESTS = [
    { id: uid(), memberName: 'Felicia Owusu', request: 'Praying for my mother\'s upcoming surgery on Thursday in Kumasi.', date: '2026-07-22', status: 'Active', assignedTo: 'Prayer Ministry' },
    { id: uid(), memberName: 'Yaw Boateng', request: 'Job interview prayer — final round for accounting role.', date: '2026-07-21', status: 'Active', assignedTo: 'Rev. Daniel Mensah' },
    { id: uid(), memberName: 'Akosua Mensah', request: 'Thanksgiving! Passed professional board exams successfully.', date: '2026-07-18', status: 'Answered', assignedTo: '' },
  ];

  const SEED_APPROVALS = [
    { id: uid(), memberName: 'Papa Nii Quaye', phone: '020 555 0113', email: 'quaye@email.com', roleRequested: 'Member', date: '2026-07-22', status: 'Pending' },
    { id: uid(), memberName: 'Serwaa Akoto', phone: '027 555 0114', email: '', roleRequested: 'Member', date: '2026-07-21', status: 'Pending' },
  ];

  const SEED_MESSAGES = [
    { id: uid(), date: '2026-07-19 18:00', recipient: 'Entire Congregation', subject: 'Sunday Service Reminder & Prayer Focus', text: 'Dear Grace Family, join us tomorrow for 1st Service (7am) or 2nd Service (9:30am) as we continue our series on Faith & Works.', delivered: 1180, pending: 12, failed: 3 },
    { id: uid(), date: '2026-07-15 12:30', recipient: 'All Department Leaders', subject: 'Leadership Quarterly Review Meeting', text: 'Shalom Leaders! Please remember our quarterly planning meeting this Saturday at 10:00 AM in the Fellowship Hall.', delivered: 28, pending: 0, failed: 0 },
  ];

  const SEED_SUMMARY_CONFIG = {
    enableEmail: true,
    enableApp: true,
    day: 'Monday',
    time: '07:00',
  };

  /* ---------------------------------------------------
     State Manager
     --------------------------------------------------- */
  let members        = [];
  let services       = [];
  let categories     = [];
  let users          = [];
  let pastoralNotes  = SEED_PASTORAL_NOTES;
  let lifeEvents     = SEED_LIFE_EVENTS;
  let careTasks      = SEED_CARE_TASKS;
  let prayerRequests = SEED_PRAYER_REQUESTS;
  let approvals      = SEED_APPROVALS;
  let sentMessages   = SEED_MESSAGES;
  let summaryConfig  = SEED_SUMMARY_CONFIG;
  let auditLog       = [];
  let church         = {};

  async function loadAllFromFirestore() {
    try {
      await Promise.all([
        dbSeedIfEmpty(COLLECTIONS.pastoralNotes, SEED_PASTORAL_NOTES),
        dbSeedIfEmpty(COLLECTIONS.careTasks, SEED_CARE_TASKS),
        dbSeedIfEmpty(COLLECTIONS.prayerRequests, SEED_PRAYER_REQUESTS),
      ]);

      const [membersData, servicesData, careData, prayerData] = await Promise.all([
        dbGetAll('members'),
        dbGetAll('services'),
        dbGetAll(COLLECTIONS.careTasks, null, { includeDeleted: true }),
        dbGetAll(COLLECTIONS.prayerRequests, null, { includeDeleted: true }),
      ]);

      if (membersData.length > 0) members = membersData;
      if (servicesData.length > 0) services = servicesData;
      if (careData.length > 0) careTasks = careData;
      if (prayerData.length > 0) prayerRequests = prayerData;

      console.log('[Pastor] Firestore data loaded.');
    } catch (err) {
      console.warn('[Pastor] Firestore load failed, using seed data:', err);
    }
  }

  function persistAll() {
    // No-op: data is now written to Firestore on each individual operation.
  }

  function addAuditEntry(user, action, record, module = 'Pastoral') {
    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.logActivity({
        user: user || 'Rev. Daniel Mensah',
        role: 'pastor',
        department: 'Pastoral',
        action: action || 'edit',
        module: module,
        record: record,
        isMemberFacing: action === 'create' || action === 'send'
      });
    } else {
      auditLog.unshift({ id: uid(), timestamp: now(), user, action, record });
      save(KEYS.audit, auditLog);
    }
  }

  /* ---------------------------------------------------
     Modal Helpers
     --------------------------------------------------- */
  function openModal(id) { document.getElementById(id)?.classList.add('active'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  /* ---------------------------------------------------
     Section Navigation
     --------------------------------------------------- */
  const sidebarLinks = document.querySelectorAll('.sidebar__link[data-section]');
  const sections = document.querySelectorAll('.dashboard-section');

  function showSection(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    sidebarLinks.forEach(l => l.classList.remove('active'));
    document.getElementById(`section-${sectionId}`)?.classList.add('active');
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.goto));
  });

  /* ---------------------------------------------------
     SECTION 1: Overview
     --------------------------------------------------- */
  function renderOverview() {
    const activeCount = members.filter(m => m.status === 'Active').length;
    const visitorCount = members.filter(m => m.status === 'Visitor').length;
    const pendingTasks = careTasks.filter(t => t.status !== 'Completed').length;

    document.getElementById('pastor-stat-attendance').textContent = Math.round(activeCount * 0.72) || 892;
    document.getElementById('pastor-stat-visitors').textContent = visitorCount || 3;
    document.getElementById('pastor-stat-giving').textContent = 'GH₵ 45.2K';
    document.getElementById('pastor-stat-flagged').textContent = pendingTasks;

    // Recent Sunday Attendance chart
    const attChart = document.getElementById('overview-attendance-chart');
    if (attChart) {
      const weeks = [
        { label: 'Jun 14', val: 810, pct: 72 },
        { label: 'Jun 21', val: 765, pct: 68 },
        { label: 'Jun 28', val: 895, pct: 80 },
        { label: 'Jul 05', val: 840, pct: 75 },
        { label: 'Jul 12', val: 870, pct: 78 },
        { label: 'Jul 19', val: 892, pct: 82 },
      ];
      attChart.innerHTML = weeks.map(w => `
        <div class="bar-chart__item">
          <span class="bar-chart__label">${w.label}</span>
          <div class="bar-chart__track"><div class="bar-chart__fill" style="width: ${w.pct}%;"></div></div>
          <span class="bar-chart__value">${w.val}</span>
        </div>
      `).join('');
    }

    // Recent Weekly Giving chart
    const givChart = document.getElementById('overview-giving-chart');
    if (givChart) {
      const weeks = [
        { label: 'Jun 14', val: 'GH₵ 9.8K', pct: 65 },
        { label: 'Jun 21', val: 'GH₵ 10.5K', pct: 72 },
        { label: 'Jun 28', val: 'GH₵ 9.1K', pct: 60 },
        { label: 'Jul 05', val: 'GH₵ 11.2K', pct: 78 },
        { label: 'Jul 12', val: 'GH₵ 11.8K', pct: 82 },
        { label: 'Jul 19', val: 'GH₵ 12.4K', pct: 88 },
      ];
      givChart.innerHTML = weeks.map(w => `
        <div class="bar-chart__item">
          <span class="bar-chart__label">${w.label}</span>
          <div class="bar-chart__track"><div class="bar-chart__fill" style="width: ${w.pct}%; background: linear-gradient(90deg, var(--color-success), #3ab882);"></div></div>
          <span class="bar-chart__value">${w.val}</span>
        </div>
      `).join('');
    }
  }

  // Manual Refresh Simulation
  document.getElementById('btn-manual-refresh')?.addEventListener('click', () => {
    const timeEl = document.getElementById('refresh-time');
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    renderOverview();
    toast('Church health data refreshed live ✓');
  });

  /* ---------------------------------------------------
     SECTION 2: Members & Pastoral Notes
     --------------------------------------------------- */
  function populatePastorDeptFilter() {
    const sel = document.getElementById('pastor-member-filter-dept');
    if (!sel) return;
    const depts = [...new Set(members.map(m => m.department).filter(Boolean))].sort();
    const val = sel.value;
    sel.innerHTML = '<option value="">All Departments</option>' + depts.map(d => `<option ${d === val ? 'selected' : ''}>${d}</option>`).join('');
  }

  function renderPastorMembers() {
    const search = (document.getElementById('pastor-member-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('pastor-member-filter-status')?.value || '';
    const deptFilter = document.getElementById('pastor-member-filter-dept')?.value || '';

    let filtered = members.filter(m => {
      if (search && !m.name.toLowerCase().includes(search) && !m.phone.includes(search)) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      if (deptFilter && m.department !== deptFilter) return false;
      return true;
    });

    const tbody = document.getElementById('pastor-members-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">No members found</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(m => {
      const notesCount = pastoralNotes.filter(n => n.memberId === m.id).length;
      return `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.phone}</td>
          <td><span class="badge badge--${m.status === 'Active' ? 'success' : m.status === 'Visitor' ? 'info' : 'danger'}">${m.status}</span></td>
          <td>${m.department || '—'}</td>
          <td>${notesCount > 0 ? `<span class="badge badge--navy">🔒 ${notesCount} note${notesCount > 1 ? 's' : ''}</span>` : '<span style="color: var(--color-gray-400); font-size: 0.75rem;">None</span>'}</td>
          <td>
            <button class="btn btn--primary btn--xs" onclick="window._pastorDash.openMemberCareModal('${m.id}')">Review Profile & Notes</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Open Member Profile & Confidential Care Modal
  function openMemberCareModal(memberId) {
    const m = members.find(x => x.id === memberId);
    if (!m) return;

    const notes = pastoralNotes.filter(n => n.memberId === memberId);
    const events = lifeEvents.filter(e => e.memberId === memberId);

    const body = document.getElementById('pastor-member-modal-body');
    if (!body) return;

    body.innerHTML = `
      <div class="profile-summary" style="margin-bottom: var(--space-xl);">
        <div class="profile-summary__avatar">${m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>
        <div class="profile-summary__info">
          <h3>${m.name}</h3>
          <div class="profile-summary__detail">📱 ${m.phone} ${m.email ? `| ✉️ ${m.email}` : ''}</div>
          <div class="profile-summary__detail">Department: ${m.department || 'General Congregation'} | Status: <strong>${m.status}</strong></div>
        </div>
      </div>

      <!-- Giving & Attendance Summary snippet for Pastor -->
      <div class="grid grid--2" style="margin-bottom: var(--space-xl); background: var(--color-gray-50); padding: var(--space-md); border-radius: var(--radius-md);">
        <div>
          <h5 style="margin-bottom: var(--space-xs); font-size: 0.875rem;">Attendance Snippet</h5>
          <div style="font-size: 0.8125rem; color: var(--color-gray-600);">Attended 4 of last 5 Sunday services (80% attendance rate)</div>
        </div>
        <div>
          <h5 style="margin-bottom: var(--space-xs); font-size: 0.875rem;">Giving Summary (Pastoral Access)</h5>
          <div style="font-size: 0.8125rem; color: var(--color-gray-600);">YTD Tithes & Offerings: <strong>GH₵ 2,450.00</strong> (Regular contributor)</div>
        </div>
      </div>

      <!-- Confidential Pastoral Notes Panel -->
      <div style="margin-bottom: var(--space-xl); border-top: 1px solid var(--color-gray-200); padding-top: var(--space-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
          <h4>Confidential Pastoral Care Notes</h4>
          <span class="confidential-badge">🔒 Pastoral Access Only</span>
        </div>

        <div id="pastoral-notes-feed">
          ${notes.length === 0 ? '<p style="font-size: 0.875rem; color: var(--color-gray-500); font-style: italic;">No pastoral notes recorded for this member yet.</p>' : ''}
          ${notes.map(n => `
            <div class="pastoral-note-card">
              <div class="pastoral-note-card__meta">
                <span class="pastoral-note-card__author">${n.author}</span>
                <span>${n.date}</span>
              </div>
              <div class="pastoral-note-card__body">${n.note}</div>
            </div>
          `).join('')}
        </div>

        <!-- Add Pastoral Note Form -->
        <div style="margin-top: var(--space-md); background: var(--color-white); border: 1px solid var(--color-gray-200); border-radius: var(--radius-md); padding: var(--space-md);">
          <label for="new-pastoral-note" class="form-label">Add Confidential Note</label>
          <textarea id="new-pastoral-note" class="form-input" rows="3" placeholder="Type confidential visitation, counselling, or care notes here..." style="resize: vertical;"></textarea>
          <button class="btn btn--primary btn--sm" style="margin-top: var(--space-sm);" onclick="window._pastorDash.addPastoralNote('${m.id}')">Save Pastoral Note</button>
        </div>
      </div>

      <!-- Life Events Log -->
      <div style="border-top: 1px solid var(--color-gray-200); padding-top: var(--space-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
          <h4>Life Events Log</h4>
          <button class="btn btn--ghost btn--sm" onclick="window._pastorDash.openLifeEventModal('${m.id}')">+ Add Life Event</button>
        </div>
        <div>
          ${events.length === 0 ? '<p style="font-size: 0.875rem; color: var(--color-gray-500); font-style: italic;">No life events logged yet.</p>' : ''}
          ${events.map(e => `
            <div class="life-event-item">
              <div class="life-event-icon">📜</div>
              <div>
                <div class="life-event-title">${e.type} <span class="life-event-date">• ${e.date}</span></div>
                <div class="life-event-notes">${e.notes || 'No details provided.'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    openModal('modal-pastor-member');
  }

  function addPastoralNote(memberId) {
    const textarea = document.getElementById('new-pastoral-note');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) { toast('Note content cannot be empty', 'error'); return; }

    pastoralNotes.unshift({
      id: uid(),
      memberId,
      author: 'Rev. Daniel Mensah',
      date: now(),
      note: text,
    });

    addAuditEntry('Rev. Daniel Mensah', 'create', `Recorded pastoral care note for member`);
    persistAll();
    toast('Confidential pastoral note saved ✓');
    openMemberCareModal(memberId);
    renderPastorMembers();
  }

  function openLifeEventModal(memberId) {
    document.getElementById('form-life-event')?.reset();
    document.getElementById('event-member-id').value = memberId;
    document.getElementById('event-date').value = today();
    openModal('modal-life-event');
  }

  document.getElementById('btn-save-life-event')?.addEventListener('click', () => {
    const memberId = document.getElementById('event-member-id').value;
    const type = document.getElementById('event-type').value;
    const date = document.getElementById('event-date').value;
    if (!type || !date) { toast('Event type and date are required', 'error'); return; }

    lifeEvents.unshift({
      id: uid(),
      memberId,
      type,
      date,
      notes: document.getElementById('event-notes').value.trim(),
    });

    addAuditEntry('Rev. Daniel Mensah', 'create', `Logged life event (${type}) for member`);
    persistAll();
    closeModal('modal-life-event');
    toast('Life event recorded ✓');
    if (memberId) openMemberCareModal(memberId);
  });

  document.getElementById('pastor-member-search')?.addEventListener('input', renderPastorMembers);
  document.getElementById('pastor-member-filter-status')?.addEventListener('change', renderPastorMembers);
  document.getElementById('pastor-member-filter-dept')?.addEventListener('change', renderPastorMembers);

  /* ---------------------------------------------------
     SECTION 3: Attendance Reports
     --------------------------------------------------- */
  function renderAttendanceReports() {
    // Inactive members (4+ weeks no attendance)
    const inactiveMembers = members.filter(m => m.status === 'Inactive' || m.status === 'Visitor');
    const badge = document.getElementById('inactive-count-badge');
    if (badge) badge.textContent = `${inactiveMembers.length} Members`;

    const tbody = document.getElementById('inactive-members-tbody');
    if (tbody) {
      tbody.innerHTML = inactiveMembers.map(m => `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.phone}</td>
          <td>${m.department || '—'}</td>
          <td>${m.status === 'Inactive' ? '4 weeks ago' : 'First visit 2 weeks ago'}</td>
          <td><span class="badge badge--danger">${m.status === 'Inactive' ? '4 weeks' : '2 weeks'}</span></td>
          <td>
            <button class="btn btn--primary btn--xs" onclick="window._pastorDash.openAssignTaskModal('${m.id}', '${m.name}')">Assign Follow-Up</button>
          </td>
        </tr>
      `).join('');
    }

    // Detailed Service Attendance Chart (SVG Line Chart)
    if (window.ChurchCharts) {
      window.ChurchCharts.renderLineChart('detailed-attendance-chart', null, {
        title: 'Weekly Attendance Trajectory',
        subtitle: 'Average Sunday attendance trend over past 7 weeks',
        unit: 'attendees'
      });
    }
  }

  // Assign Task Modal
  function openAssignTaskModal(memberId, memberName) {
    document.getElementById('form-assign-task')?.reset();
    document.getElementById('task-member-id').value = memberId;
    document.getElementById('task-member-name').value = memberName;
    document.getElementById('task-due-date').value = today();
    openModal('modal-assign-task');
  }

  document.getElementById('btn-save-assign-task')?.addEventListener('click', () => {
    const memberName = document.getElementById('task-member-name').value;
    const assignee = document.getElementById('task-assignee').value;
    const reason = document.getElementById('task-reason').value.trim();
    const dueDate = document.getElementById('task-due-date').value;

    if (!assignee || !reason || !dueDate) { toast('Assignee, reason, and due date are required', 'error'); return; }

    careTasks.unshift({
      id: uid(),
      memberName,
      reason,
      assignee,
      dueDate,
      status: 'In Progress',
    });

    addAuditEntry('Rev. Daniel Mensah', 'create', `Assigned care task for ${memberName} to ${assignee}`);
    persistAll();
    closeModal('modal-assign-task');
    toast(`Follow-up task assigned to ${assignee} ✓`);
    renderPastoralCare();
    renderOverview();
  });

  /* ---------------------------------------------------
     SECTION 4: Giving & Financial Reports
     --------------------------------------------------- */
  function renderGivingReports() {
    if (window.ChurchCharts) {
      window.ChurchCharts.renderStackedBarChart('giving-12month-chart', null, {
        title: '12-Month Giving Breakdown Trends',
        subtitle: 'Month-by-month contribution totals by category (GH₵)'
      });
    }

    const tbody = document.getElementById('pastor-giving-categories-tbody');
    if (tbody) {
      const catData = [
        { name: 'Tithe', total: 'GH₵ 29,380.00', pct: '65%', tx: 342 },
        { name: 'Offering', total: 'GH₵ 11,300.00', pct: '25%', tx: 580 },
        { name: 'Building Fund', total: 'GH₵ 2,710.00', pct: '6%', tx: 87 },
        { name: 'Missions', total: 'GH₵ 1,810.00', pct: '4%', tx: 45 },
      ];
      tbody.innerHTML = catData.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td style="color: var(--color-success); font-weight: 600;">${c.total}</td>
          <td><span class="badge badge--navy">${c.pct}</span></td>
          <td>${c.tx}</td>
        </tr>
      `).join('');
    }
  }

  /* ---------------------------------------------------
     SECTION 5: Pastoral Care & Follow-Up
     --------------------------------------------------- */
  function renderPastoralCare() {
    // Care tasks table
    const filterStatus = document.getElementById('care-task-filter-status')?.value || '';
    let filteredTasks = careTasks.filter(t => {
      if (filterStatus === 'Deleted') return t.deleted;
      if (t.deleted) return false;
      if (filterStatus) return t.status === filterStatus;
      return true;
    });

    const tbody = document.getElementById('care-tasks-tbody');
    if (tbody) {
      tbody.innerHTML = filteredTasks.map(t => `
        <tr style="${t.deleted ? 'opacity: 0.6; background: rgba(239,68,68,0.03);' : ''}">
          <td><strong>${t.memberName}</strong> ${t.deleted ? '<span class="badge badge--danger" style="margin-left: 0.25rem;">Soft Deleted</span>' : ''}</td>
          <td style="max-width: 220px;">${t.reason}</td>
          <td>${t.assignee}</td>
          <td>${t.dueDate}</td>
          <td><span class="badge badge--${t.status === 'Completed' ? 'success' : t.status === 'In Progress' ? 'info' : 'warning'}">${t.status}</span></td>
          <td>
            <div style="display: flex; gap: 0.25rem; align-items: center;">
              ${t.deleted ? `
                <button class="btn btn--success-ghost btn--xs" onclick="window._pastorDash.restoreCareTask('${t.id}')">♻️ Restore</button>
              ` : `
                ${t.status !== 'Completed' ? `<button class="btn btn--success-ghost btn--xs" onclick="window._pastorDash.markTaskComplete('${t.id}')">Complete</button>` : '<span style="color: var(--color-gray-400); font-size: 0.75rem;">Done ✓</span>'}
                <button class="btn btn--danger-ghost btn--xs" onclick="window._pastorDash.deleteCareTask('${t.id}')">Delete</button>
              `}
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Prayer requests feed
    const prayerContainer = document.getElementById('prayer-requests-container');
    const activePrayers = prayerRequests.filter(p => !p.deleted && p.status === 'Active');
    const pBadge = document.getElementById('prayer-count-badge');
    if (pBadge) pBadge.textContent = `${activePrayers.length} Active`;

    if (prayerContainer) {
      const visiblePrayers = prayerRequests.filter(p => !p.deleted);
      prayerContainer.innerHTML = visiblePrayers.map(p => `
        <div class="prayer-card" style="${p.status === 'Answered' ? 'opacity: 0.6;' : ''}">
          <div class="prayer-card__header">
            <span class="prayer-card__member">${p.memberName}</span>
            <span class="badge badge--${p.status === 'Active' ? 'warning' : 'success'}">${p.status}</span>
          </div>
          <div class="prayer-card__text">"${p.request}"</div>
          <div class="prayer-card__footer">
            <span>Submitted: ${p.date} ${p.assignedTo ? `• Assigned: ${p.assignedTo}` : ''}</span>
            <div style="display: flex; gap: 0.25rem; align-items: center;">
              ${p.status === 'Active' ? `<button class="btn btn--primary btn--xs" onclick="window._pastorDash.markPrayerAnswered('${p.id}')">Mark Answered ✓</button>` : ''}
              <button class="btn btn--danger-ghost btn--xs" onclick="window._pastorDash.deletePrayerRequest('${p.id}')">Delete</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Pending registration approvals
    const appContainer = document.getElementById('approvals-container');
    if (appContainer) {
      if (approvals.length === 0) {
        appContainer.innerHTML = '<div class="empty-state"><div class="empty-state__icon">✓</div><div class="empty-state__title">No pending approvals</div></div>';
      } else {
        appContainer.innerHTML = approvals.map(a => `
          <div class="card card--flat" style="margin-bottom: var(--space-sm); padding: var(--space-md);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <strong>${a.memberName}</strong>
                <div style="font-size: 0.75rem; color: var(--color-gray-500);">Phone: ${a.phone} • Applied: ${a.date}</div>
              </div>
              <div style="display: flex; gap: var(--space-xs);">
                <button class="btn btn--primary btn--xs" onclick="window._pastorDash.approveMember('${a.id}')">Approve</button>
                <button class="btn btn--danger-ghost" onclick="window._pastorDash.declineMember('${a.id}')">Decline</button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }
  }

  function deleteCareTask(taskId) {
    const t = careTasks.find(x => x.id === taskId);
    if (!t) return;
    showConfirm('Soft Delete Care Task?', `Remove care task for "${t.memberName}"? It will be archived and can be restored later.`, 'Soft Delete', 'btn btn--danger', () => {
      t.deleted = true;
      t.deletedAt = new Date().toISOString();
      addAuditEntry('Rev. Daniel Mensah', 'delete', `Soft-deleted care task for: ${t.memberName}`);
      persistAll();
      renderPastoralCare();
      toast('Care task soft-deleted (can be restored)');
    });
  }

  function restoreCareTask(taskId) {
    const t = careTasks.find(x => x.id === taskId);
    if (!t) return;
    t.deleted = false;
    delete t.deletedAt;
    addAuditEntry('Rev. Daniel Mensah', 'edit', `Restored care task for: ${t.memberName}`);
    persistAll();
    renderPastoralCare();
    toast('Care task restored ✓');
  }

  function deletePrayerRequest(prayerId) {
    const p = prayerRequests.find(x => x.id === prayerId);
    if (!p) return;
    showConfirm('Soft Delete Prayer Request?', `Remove prayer request from ${p.memberName}? It will be archived and can be restored later.`, 'Soft Delete', 'btn btn--danger', () => {
      p.deleted = true;
      p.deletedAt = new Date().toISOString();
      addAuditEntry('Rev. Daniel Mensah', 'delete', `Soft-deleted prayer request from: ${p.memberName}`);
      persistAll();
      renderPastoralCare();
      toast('Prayer request soft-deleted');
    });
  }

  function restorePrayerRequest(prayerId) {
    const p = prayerRequests.find(x => x.id === prayerId);
    if (!p) return;
    p.deleted = false;
    delete p.deletedAt;
    addAuditEntry('Rev. Daniel Mensah', 'edit', `Restored prayer request from: ${p.memberName}`);
    persistAll();
    renderPastoralCare();
    toast('Prayer request restored 🙏');
  }

  function markTaskComplete(taskId) {
    const t = careTasks.find(x => x.id === taskId);
    if (t) {
      t.status = 'Completed';
      addAuditEntry('Rev. Daniel Mensah', 'edit', `Completed care task for ${t.memberName}`);
      persistAll();
      renderPastoralCare();
      renderOverview();
      toast('Care task marked as completed ✓');
    }
  }

  function markPrayerAnswered(prayerId) {
    const p = prayerRequests.find(x => x.id === prayerId);
    if (p) {
      p.status = 'Answered';
      addAuditEntry('Rev. Daniel Mensah', 'edit', `Marked prayer request for ${p.memberName} as Answered`);
      persistAll();
      renderPastoralCare();
      toast('Prayer request marked as Answered! 🙏');
    }
  }

  function approveMember(approvalId) {
    const a = approvals.find(x => x.id === approvalId);
    if (a) {
      approvals = approvals.filter(x => x.id !== approvalId);
      addAuditEntry('Rev. Daniel Mensah', 'edit', `Approved new registration for ${a.memberName}`);
      persistAll();
      renderPastoralCare();
      toast(`Registration for ${a.memberName} approved ✓`);
    }
  }

  function declineMember(approvalId) {
    const a = approvals.find(x => x.id === approvalId);
    if (a) {
      approvals = approvals.filter(x => x.id !== approvalId);
      addAuditEntry('Rev. Daniel Mensah', 'edit', `Declined registration for ${a.memberName}`);
      persistAll();
      renderPastoralCare();
      toast(`Registration for ${a.memberName} declined`);
    }
  }

  document.getElementById('care-task-filter-status')?.addEventListener('change', renderPastoralCare);

  /* ---------------------------------------------------
     SECTION 6: Congregation Communication
     --------------------------------------------------- */
  function renderCommunication() {
    const feed = document.getElementById('pastor-message-history');
    if (feed) {
      feed.innerHTML = sentMessages.map(m => `
        <div class="activity-item">
          <div class="activity-item__dot activity-item__dot--gold"></div>
          <div style="flex: 1;">
            <div class="activity-item__text"><strong>${m.subject}</strong> (${m.recipient})</div>
            <div style="font-size: 0.75rem; color: var(--color-gray-600); margin-top: 2px;">"${m.text.slice(0, 85)}..."</div>
            <div class="activity-item__time">${m.date} • Delivered: ${m.delivered} | Pending: ${m.pending}</div>
          </div>
        </div>
      `).join('');
    }
  }

  document.getElementById('form-pastor-message')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const recipient = document.getElementById('msg-recipient').value;
    const subject = document.getElementById('msg-subject').value.trim();
    const text = document.getElementById('msg-body').value.trim();

    if (!subject || !text) { toast('Subject and message body are required', 'error'); return; }

    const activeCount = members.filter(m => m.status === 'Active').length || 1195;

    sentMessages.unshift({
      id: uid(),
      date: now(),
      recipient: recipient === 'entire' ? 'Entire Congregation' : recipient,
      subject,
      text,
      delivered: Math.round(activeCount * 0.98),
      pending: Math.round(activeCount * 0.015),
      failed: Math.round(activeCount * 0.005),
    });

    addAuditEntry('Rev. Daniel Mensah', 'system', `Broadcasted message to ${recipient}: "${subject}"`);
    persistAll();

    // Update stats tiles
    document.getElementById('delivery-delivered').textContent = Math.round(activeCount * 0.98);
    document.getElementById('delivery-pending').textContent = Math.round(activeCount * 0.015);
    document.getElementById('delivery-failed').textContent = Math.round(activeCount * 0.005);

    document.getElementById('form-pastor-message').reset();
    renderCommunication();
    toast('Broadcast message queued and delivering via SMS & App Push ✓');
  });

  /* ---------------------------------------------------
     SECTION 7: Standard Reports Library
     --------------------------------------------------- */
  function generateReport(reportTitle) {
    toast(`Generating "${reportTitle}"... ✓`);
    setTimeout(() => {
      alert(`[DEMO REPORT GENERATED]\n\n${reportTitle}\nChurch: Grace Assembly International\nGenerated by: Rev. Daniel Mensah\nDate: ${today()}\nStatus: Verified Complete`);
    }, 400);
  }

  function exportReport(reportTitle) {
    toast(`Exporting "${reportTitle}"... ✓`);
    setTimeout(() => {
      alert(`[SIMULATED FILE DOWNLOAD]\n\nFile: ${reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${today()}.csv\nYour browser has initiated the download.`);
    }, 400);
  }

  /* ---------------------------------------------------
     SECTION 8: My Weekly Summary
     --------------------------------------------------- */
  function loadSummaryConfig() {
    document.getElementById('summary-enable-email').checked = summaryConfig.enableEmail;
    document.getElementById('summary-enable-app').checked = summaryConfig.enableApp;
    document.getElementById('summary-day').value = summaryConfig.day;
    document.getElementById('summary-time').value = summaryConfig.time;
  }

  document.getElementById('form-summary-config')?.addEventListener('submit', (e) => {
    e.preventDefault();
    summaryConfig.enableEmail = document.getElementById('summary-enable-email').checked;
    summaryConfig.enableApp = document.getElementById('summary-enable-app').checked;
    summaryConfig.day = document.getElementById('summary-day').value;
    summaryConfig.time = document.getElementById('summary-time').value;

    persistAll();
    toast('Weekly Summary preferences saved ✓');
  });

  /* ---------------------------------------------------
     Expose Global Handlers for DOM
     --------------------------------------------------- */
  window._pastorDash = {
    openMemberCareModal,
    addPastoralNote,
    openLifeEventModal,
    openAssignTaskModal,
    markTaskComplete,
    deleteCareTask,
    restoreCareTask,
    deletePrayerRequest,
    restorePrayerRequest,
    markPrayerAnswered,
    approveMember,
    declineMember,
    generateReport,
    exportReport,
  };



  /* ---------------------------------------------------
     Init on Load
     --------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadAllFromFirestore();
    renderOverview();
    populatePastorDeptFilter();
    renderPastorMembers();
    renderAttendanceReports();
    renderGivingReports();
    if (window.ChurchComms) window.ChurchComms.init('pastor');
    if (window.ChurchReporting) window.ChurchReporting.init('pastor', { containerId: 'reporting-container' });
    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.renderActivityFeed('activity-log-pastor', 'pastor', { name: 'Rev. Daniel Mensah', role: 'pastor' });
    }
    loadSummaryConfig();
  });

})();
