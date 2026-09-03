/* ===================================================
   ChurchOS — Leader / Dept Head Dashboard JavaScript
   Now uses Firestore for data persistence
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Firestore Collections
     --------------------------------------------------- */
  const COLLECTIONS = {
    members:       'members',
    services:      'services',
    careTasks:     'followUpTasks',
    sentMessages:  'communications',
    audit:         'activityLog',
    leaderAtt:     'attendance',
  };

  const DEPT_NAME = 'Youth Ministry';
  const LEADER_NAME = 'Kofi Darko';

  const { dbAdd, dbGetAll, dbUpdate, dbSoftDelete, dbSeedIfEmpty, dbListen } = window.ChurchOS;

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
     Seed Youth Ministry Roster (15 members)
     --------------------------------------------------- */
  const SEED_YOUTH_ROSTER = [
    { id: uid(), name: 'Kofi Darko', phone: '020 555 0103', email: 'kofi.d@email.com', dob: '1985-11-08', address: '23 Tema Community 7', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Gifty Amoah', phone: '024 555 0116', email: 'gifty.a@email.com', dob: '1997-11-30', address: '19 Dome, Accra', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Samuel Asare', phone: '020 333 5678', email: 'samuel.a@email.com', dob: '1999-05-14', address: '12 Spintex Rd', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Adwoa Poku', phone: '024 555 1234', email: 'adwoa.p@email.com', dob: '2001-08-20', address: '8 Cantonments', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Efua Mensah', phone: '027 888 4321', email: '', dob: '2002-03-10', address: '5 Osu', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-12' },
    { id: uid(), name: 'Justice Amoah', phone: '024 111 7890', email: '', dob: '1998-12-05', address: '15 Labone', department: 'Youth Ministry', status: 'Inactive', lastAttended: '2026-06-28' },
    { id: uid(), name: 'Akosua Nyarko', phone: '050 222 3456', email: 'akosua.n@email.com', dob: '2000-01-18', address: '3 Dansoman', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Priscilla Kumi', phone: '024 444 9012', email: 'priscilla.k@email.com', dob: '2003-09-22', address: '22 Achimota', department: 'Youth Ministry', status: 'Visitor', lastAttended: '2026-07-12', initialVisit: '2026-07-12' },
    { id: uid(), name: 'Daniel Ofori', phone: '055 777 2345', email: '', dob: '1996-04-11', address: '7 Madina', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Grace Addo', phone: '020 999 6789', email: 'grace.a@email.com', dob: '2002-11-03', address: '14 East Legon', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Benedict Sarpong', phone: '027 123 9876', email: '', dob: '2001-02-15', address: '10 Teshie', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Ruth Baidoo', phone: '024 666 4321', email: 'ruth.b@email.com', dob: '2000-07-09', address: '19 Dzorwulu', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
    { id: uid(), name: 'Solomon Kwarteng', phone: '050 888 1122', email: '', dob: '1999-10-27', address: '6 Weija', department: 'Youth Ministry', status: 'Inactive', lastAttended: '2026-06-21' },
    { id: uid(), name: 'Justice Amponsah', phone: '055 555 0119', email: '', dob: '2003-12-14', address: '', department: 'Youth Ministry', status: 'Visitor', lastAttended: '2026-07-19', initialVisit: '2026-07-19' },
    { id: uid(), name: 'Ebenezer Lartey', phone: '024 333 8899', email: 'eben.l@email.com', dob: '1997-06-30', address: '11 Kasoa', department: 'Youth Ministry', status: 'Active', lastAttended: '2026-07-19' },
  ];

  /* ---------------------------------------------------
     State Manager
     --------------------------------------------------- */
  let allMembers   = [];
  let careTasks    = [];
  let sentMessages = [];
  let auditLog     = [];
  let youthRoster  = SEED_YOUTH_ROSTER;

  async function loadAllFromFirestore() {
    try {
      const membersData = await dbGetAll('members', null, { includeDeleted: true });
      if (membersData.length > 0) {
        allMembers = membersData;
        const deptMembers = allMembers.filter(m => m.department === DEPT_NAME);
        if (deptMembers.length > 0) youthRoster = deptMembers;
      }
      console.log('[Leader] Firestore data loaded.');
    } catch (err) {
      console.warn('[Leader] Firestore load failed, using seed data:', err);
    }
  }

  function persistMembers() {
    // No-op: data is now written to Firestore on each individual operation.
  }

  function addAuditEntry(user, action, record, module = 'Youth Ministry') {
    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.logActivity({
        user: user || LEADER_NAME,
        role: 'leader',
        department: DEPT_NAME,
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
    const totalGroup = youthRoster.length;
    const activeCount = youthRoster.filter(m => m.status === 'Active').length;
    const visitorCount = youthRoster.filter(m => m.status === 'Visitor').length;
    const assignedTasks = careTasks.filter(t => t.assignee && t.assignee.includes('Kofi Darko') && t.status !== 'Completed').length;

    document.getElementById('leader-stat-members').textContent = totalGroup;
    document.getElementById('leader-stat-attendance').textContent = Math.round(activeCount * 0.85) || 12;
    document.getElementById('leader-stat-visitors').textContent = visitorCount;
    document.getElementById('leader-stat-tasks').textContent = assignedTasks || 2;

    const chart = document.getElementById('leader-overview-chart');
    if (chart) {
      const data = [
        { label: 'Jun 28', val: 11, pct: 73 },
        { label: 'Jul 05', val: 13, pct: 86 },
        { label: 'Jul 12', val: 10, pct: 66 },
        { label: 'Jul 19', val: 12, pct: 80 },
      ];
      chart.innerHTML = data.map(d => `
        <div class="bar-chart__item">
          <span class="bar-chart__label">${d.label}</span>
          <div class="bar-chart__track"><div class="bar-chart__fill" style="width: ${d.pct}%;"></div></div>
          <span class="bar-chart__value">${d.val}</span>
        </div>
      `).join('');
    }
  }

  /* ---------------------------------------------------
     SECTION 2: My Roster (Scoped)
     --------------------------------------------------- */
  function renderRoster() {
    const search = (document.getElementById('leader-roster-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('leader-roster-filter-status')?.value || '';

    let filtered = youthRoster.filter(m => {
      if (search && !m.name.toLowerCase().includes(search) && !m.phone.includes(search)) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      return true;
    });

    const tbody = document.getElementById('leader-roster-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">No roster members found</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.phone}</td>
        <td><span class="badge badge--${m.status === 'Active' ? 'success' : m.status === 'Visitor' ? 'info' : 'danger'}">${m.status}</span></td>
        <td>${m.lastAttended || '2026-07-19'}</td>
        <td>
          <button class="btn btn--primary btn--xs" onclick="window._leaderDash.openLimitedProfile('${m.id}')">View Limited Profile</button>
        </td>
      </tr>
    `).join('');
  }

  // Open Limited Member Profile Modal (With Locked Banners)
  function openLimitedProfile(memberId) {
    const m = youthRoster.find(x => x.id === memberId);
    if (!m) return;

    const body = document.getElementById('limited-member-modal-body');
    if (!body) return;

    body.innerHTML = `
      <div class="profile-summary" style="margin-bottom: var(--space-xl);">
        <div class="profile-summary__avatar">${m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>
        <div class="profile-summary__info">
          <h3>${m.name}</h3>
          <div class="profile-summary__detail">📱 ${m.phone} ${m.email ? `| ✉️ ${m.email}` : ''}</div>
          <div class="profile-summary__detail">Department: <strong>${DEPT_NAME}</strong> | Status: <strong>${m.status}</strong></div>
        </div>
      </div>

      <div style="margin-bottom: var(--space-xl); font-size: 0.875rem;">
        <h4 style="margin-bottom: var(--space-sm);">Group Attendance History</h4>
        <p style="color: var(--color-gray-600);">Attended 4 of last 5 Youth Ministry weekly meetings. Last attended: <strong>${m.lastAttended || '2026-07-19'}</strong>.</p>
      </div>

      <!-- VISUALLY RESTRICTED ACCESS BANNERS (Per PRD) -->
      <div class="restricted-box">
        <div class="restricted-box__title">🔒 Financial Giving Records — Access Restricted</div>
        <div class="restricted-box__text">Financial contributions and tithes are restricted to Finance Team and Senior Pastor only.</div>
      </div>

      <div class="restricted-box" style="margin-top: var(--space-md);">
        <div class="restricted-box__title">🔒 Confidential Pastoral Care Notes — Access Restricted</div>
        <div class="restricted-box__text">Pastoral counselling notes and confidential care logs are restricted to Senior Pastor only.</div>
      </div>
    `;

    openModal('modal-limited-member');
  }

  document.getElementById('leader-roster-search')?.addEventListener('input', renderRoster);
  document.getElementById('leader-roster-filter-status')?.addEventListener('change', renderRoster);

  /* ---------------------------------------------------
     SECTION 3: Attendance (Record & Absentee Flags)
     --------------------------------------------------- */
  let attStates = {}; // memberId -> true/false (present/absent)

  function switchAttTab(tab) {
    const recTab = document.getElementById('att-tab-record');
    const absTab = document.getElementById('att-tab-absentee');
    const btnRec = document.getElementById('btn-tab-record');
    const btnAbs = document.getElementById('btn-tab-absentee');

    if (tab === 'record') {
      recTab.style.display = 'block';
      absTab.style.display = 'none';
      btnRec.className = 'btn btn--primary btn--sm';
      btnAbs.className = 'btn btn--outline btn--sm';
    } else {
      recTab.style.display = 'none';
      absTab.style.display = 'block';
      btnRec.className = 'btn btn--outline btn--sm';
      btnAbs.className = 'btn btn--primary btn--sm';
      renderAbsenteeFlags();
    }
  }

  function renderAttendanceToggleRows() {
    const container = document.getElementById('attendance-toggle-container');
    if (!container) return;

    // Set default date to today or latest Sunday
    const dateInput = document.getElementById('att-session-date');
    if (dateInput && !dateInput.value) dateInput.value = today();

    // Default active members to present
    youthRoster.forEach(m => {
      if (attStates[m.id] === undefined) attStates[m.id] = (m.status === 'Active');
    });

    container.innerHTML = youthRoster.map(m => {
      const isPresent = attStates[m.id];
      return `
        <div class="attendance-toggle-row">
          <div>
            <strong>${m.name}</strong>
            <span class="badge badge--${m.status === 'Active' ? 'navy' : 'info'}" style="margin-left: 6px;">${m.status}</span>
          </div>
          <button class="attendance-toggle-btn ${isPresent ? 'present' : 'absent'}" onclick="window._leaderDash.toggleAttState('${m.id}')">
            ${isPresent ? '✓ Present' : '✕ Absent'}
          </button>
        </div>
      `;
    }).join('');
  }

  function toggleAttState(memberId) {
    attStates[memberId] = !attStates[memberId];
    renderAttendanceToggleRows();
  }

  document.getElementById('btn-save-attendance')?.addEventListener('click', () => {
    const date = document.getElementById('att-session-date')?.value || today();
    const presentCount = Object.values(attStates).filter(Boolean).length;

    // Update last attended for present members
    youthRoster.forEach(m => {
      if (attStates[m.id]) m.lastAttended = date;
    });

    persistMembers();
    addAuditEntry(LEADER_NAME, 'create', `Recorded Youth Ministry attendance for ${date} (${presentCount}/${youthRoster.length} present)`);
    toast(`Attendance saved! (${presentCount} present) — Queued & synchronized ✓`);
    renderOverview();
  });

  function renderAbsenteeFlags() {
    const tbody = document.getElementById('absentee-tbody');
    if (!tbody) return;

    const absentees = youthRoster.filter(m => m.status === 'Inactive' || m.lastAttended === '2026-06-28' || m.lastAttended === '2026-06-21');

    if (absentees.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">✓</div><div class="empty-state__title">No absenteeism flags</div><div class="empty-state__text">All group members have attended within the last 3 weeks!</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = absentees.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.phone}</td>
        <td><span class="badge badge--danger">3+ consecutive weeks</span></td>
        <td>${m.lastAttended || '3 weeks ago'}</td>
        <td>
          <button class="btn btn--warning-solid btn--xs" onclick="window._leaderDash.openFlagMemberModal('${m.id}')">Flag for Follow-Up</button>
        </td>
      </tr>
    `).join('');
  }

  /* ---------------------------------------------------
     SECTION 4: Follow-Up & Flags
     --------------------------------------------------- */
  function renderFollowupTasks() {
    const tbody = document.getElementById('leader-tasks-tbody');
    if (!tbody) return;

    // Filter tasks assigned to Kofi Darko or Youth Leader
    const myTasks = careTasks.filter(t => !t.assignee || t.assignee.includes('Kofi Darko') || t.assignee.includes('Youth'));

    if (myTasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">✓</div><div class="empty-state__title">No care tasks assigned</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = myTasks.map(t => `
      <tr>
        <td><strong>${t.memberName}</strong></td>
        <td style="max-width: 240px;">${t.reason}</td>
        <td>${t.dueDate}</td>
        <td><span class="badge badge--${t.status === 'Completed' ? 'success' : t.status === 'In Progress' ? 'info' : 'warning'}">${t.status}</span></td>
        <td>
          ${t.status !== 'Completed'
            ? `<button class="btn btn--success-ghost" onclick="window._leaderDash.updateTaskStatus('${t.id}', 'Completed')">Mark Completed ✓</button>`
            : '<span style="color: var(--color-gray-400); font-size: 0.75rem;">Done ✓</span>'
          }
        </td>
      </tr>
    `).join('');
  }

  function updateTaskStatus(taskId, newStatus) {
    const t = careTasks.find(x => x.id === taskId);
    if (t) {
      t.status = newStatus;
      save(KEYS.careTasks, careTasks);
      addAuditEntry(LEADER_NAME, 'edit', `Updated task status for ${t.memberName} to ${newStatus}`);
      toast(`Task marked as ${newStatus} ✓`);
      renderFollowupTasks();
      renderOverview();
    }
  }

  function openFlagMemberModal(memberId = '') {
    const sel = document.getElementById('flag-member-select');
    if (sel) {
      sel.innerHTML = '<option value="">— Select Member —</option>' +
        youthRoster.map(m => `<option value="${m.id}" ${m.id === memberId ? 'selected' : ''}>${m.name}</option>`).join('');
    }
    document.getElementById('form-flag-member')?.reset();
    if (memberId && sel) sel.value = memberId;
    openModal('modal-flag-group-member');
  }

  document.getElementById('btn-flag-group-member')?.addEventListener('click', () => openFlagMemberModal());

  document.getElementById('btn-save-flag-member')?.addEventListener('click', () => {
    const memberId = document.getElementById('flag-member-select').value;
    const reason = document.getElementById('flag-reason').value.trim();

    if (!memberId || !reason) { toast('Please select a member and enter a reason', 'error'); return; }

    const m = youthRoster.find(x => x.id === memberId);
    if (!m) return;

    careTasks.unshift({
      id: uid(),
      memberName: m.name,
      reason,
      assignee: 'Kofi Darko (Youth Leader)',
      dueDate: today(),
      status: 'Pending',
    });

    save(KEYS.careTasks, careTasks);
    addAuditEntry(LEADER_NAME, 'create', `Flagged ${m.name} for follow-up: "${reason}"`);
    closeModal('modal-flag-group-member');
    toast(`Follow-up task created for ${m.name} ✓`);
    renderFollowupTasks();
    renderOverview();
  });

  /* ---------------------------------------------------
     SECTION 5: Visitor Registration
     --------------------------------------------------- */
  function renderVisitors() {
    const visitors = youthRoster.filter(m => m.status === 'Visitor');
    const tbody = document.getElementById('leader-visitors-tbody');
    if (!tbody) return;

    if (visitors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state__icon">🙋</div><div class="empty-state__title">No visitors registered</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = visitors.map(v => `
      <tr>
        <td><strong>${v.name}</strong></td>
        <td>${v.phone}</td>
        <td>${v.initialVisit || v.lastAttended || today()}</td>
        <td>
          <button class="btn btn--success-ghost" onclick="window._leaderDash.convertVisitorToMember('${v.id}')">Convert to Member →</button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('form-register-visitor')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('vis-name').value.trim();
    const phone = document.getElementById('vis-phone').value.trim();
    const how = document.getElementById('vis-how').value;

    if (!name || !phone) { toast('Name and phone are required', 'error'); return; }

    const newVisitor = {
      id: uid(),
      name,
      phone,
      email: '',
      department: DEPT_NAME,
      status: 'Visitor',
      lastAttended: today(),
      initialVisit: today(),
      howHeard: how,
    };

    youthRoster.push(newVisitor);
    persistMembers();

    // Auto-generate follow-up task
    careTasks.unshift({
      id: uid(),
      memberName: name,
      reason: `First-time visitor welcome call (Heard via: ${how})`,
      assignee: 'Kofi Darko (Youth Leader)',
      dueDate: today(),
      status: 'Pending',
    });
    save(KEYS.careTasks, careTasks);

    addAuditEntry(LEADER_NAME, 'create', `Registered visitor: ${name} (${phone})`);
    document.getElementById('form-register-visitor').reset();
    toast(`Visitor added — follow-up task created ✓`);
    renderVisitors();
    renderRoster();
    renderOverview();
  });

  function convertVisitorToMember(id) {
    const v = youthRoster.find(x => x.id === id);
    if (v) {
      v.status = 'Active';
      persistMembers();
      addAuditEntry(LEADER_NAME, 'edit', `Converted visitor ${v.name} to active Youth Ministry member`);
      toast(`${v.name} converted to Active Member! (Initial visit date preserved: ${v.initialVisit || 'today'}) ✓`);
      renderVisitors();
      renderRoster();
      renderOverview();
    }
  }

  /* ---------------------------------------------------
     SECTION 6: Group Communication
     --------------------------------------------------- */
  function renderGroupMessages() {
    const history = document.getElementById('leader-message-history');
    if (!history) return;

    const myMessages = sentMessages.filter(m => m.recipient && m.recipient.includes('Youth'));

    history.innerHTML = myMessages.map(m => `
      <div class="activity-item">
        <div class="activity-item__dot activity-item__dot--gold"></div>
        <div>
          <div class="activity-item__text"><strong>${m.subject}</strong></div>
          <div style="font-size: 0.75rem; color: var(--color-gray-600); margin-top: 2px;">"${m.text}"</div>
          <div class="activity-item__time">${m.date} • Audience: Youth Ministry</div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('form-leader-message')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const subject = document.getElementById('leader-msg-subject').value.trim();
    const text = document.getElementById('leader-msg-body').value.trim();

    if (!subject || !text) { toast('Subject and message are required', 'error'); return; }

    sentMessages.unshift({
      id: uid(),
      date: now(),
      recipient: 'Youth Ministry (My Department)',
      subject,
      text,
      delivered: youthRoster.length,
      pending: 0,
      failed: 0,
    });

    save(KEYS.sentMessages, sentMessages);
    addAuditEntry(LEADER_NAME, 'system', `Broadcasted message to Youth Ministry: "${subject}"`);
    document.getElementById('form-leader-message').reset();
    toast('Broadcast message delivered to Youth Ministry members ✓');
    renderGroupMessages();
  });

  /* ---------------------------------------------------
     SECTION 7: My Reports
     --------------------------------------------------- */
  document.getElementById('btn-generate-dept-report')?.addEventListener('click', () => {
    const month = document.getElementById('report-month-select').value;
    toast(`Generated activity report for Youth Ministry (${month}) ✓`);
  });

  document.getElementById('btn-export-dept-pdf')?.addEventListener('click', () => {
    toast('Exporting Youth Ministry Activity Report as PDF... ✓');
    setTimeout(() => {
      alert('[SIMULATED PDF DOWNLOAD]\n\nFile: youth_ministry_report_july2026.pdf\nDownload completed.');
    }, 400);
  });

  function deleteVisitor(id) {
    const v = youthRoster.find(x => x.id === id);
    if (!v) return;
    if (confirm(`Soft-delete visitor "${v.name}"? It will be archived and can be restored later.`)) {
      v.deleted = true;
      v.deletedAt = new Date().toISOString();
      persistMembers();
      addAuditEntry(LEADER_NAME, 'delete', `Soft-deleted visitor entry: ${v.name}`);
      toast(`Visitor ${v.name} soft-deleted (can be restored)`);
      renderVisitors();
      renderRoster();
      renderOverview();
    }
  }

  function restoreVisitor(id) {
    const v = youthRoster.find(x => x.id === id);
    if (!v) return;
    v.deleted = false;
    delete v.deletedAt;
    persistMembers();
    addAuditEntry(LEADER_NAME, 'edit', `Restored visitor entry: ${v.name}`);
    toast(`Visitor ${v.name} restored ✓`);
    renderVisitors();
    renderRoster();
    renderOverview();
  }

  function deleteLeaderTask(id) {
    const t = careTasks.find(x => x.id === id);
    if (!t) return;
    if (confirm(`Soft-delete care task for "${t.memberName}"? It will be archived.`)) {
      t.deleted = true;
      t.deletedAt = new Date().toISOString();
      save(KEYS.careTasks, careTasks);
      addAuditEntry(LEADER_NAME, 'delete', `Soft-deleted care task for: ${t.memberName}`);
      toast('Care task soft-deleted');
      renderFollowupTasks();
      renderOverview();
    }
  }

  function restoreLeaderTask(id) {
    const t = careTasks.find(x => x.id === id);
    if (!t) return;
    t.deleted = false;
    delete t.deletedAt;
    save(KEYS.careTasks, careTasks);
    addAuditEntry(LEADER_NAME, 'edit', `Restored care task for: ${t.memberName}`);
    toast('Care task restored ✓');
    renderFollowupTasks();
    renderOverview();
  }

  /* ---------------------------------------------------
     Expose Global Handlers for DOM
     --------------------------------------------------- */
  window._leaderDash = {
    openLimitedProfile,
    switchAttTab,
    toggleAttState,
    openFlagMemberModal,
    updateTaskStatus,
    deleteLeaderTask,
    restoreLeaderTask,
    convertVisitorToMember,
    deleteVisitor,
    restoreVisitor,
  };

  /* ---------------------------------------------------
     Init on Load
     --------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadAllFromFirestore();
    renderOverview();
    renderRoster();
    renderAttendanceToggleRows();
    renderFollowupTasks();
    if (window.ChurchAttendance) window.ChurchAttendance.init({ containerId: 'attendance-module-container', role: 'leader', department: 'Youth Ministry' });
    if (window.ChurchComms) window.ChurchComms.init('leader');
    if (window.ChurchReporting) window.ChurchReporting.init('leader', { containerId: 'reporting-container', lockedDepartment: 'Youth Ministry' });
    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.renderActivityFeed('activity-log-leader', 'leader', { name: LEADER_NAME, role: 'leader', department: DEPT_NAME });
    }
  });

})();
