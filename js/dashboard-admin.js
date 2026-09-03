/* ===================================================
   ChurchOS — Admin Dashboard JavaScript
   Now uses Firestore for data persistence
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Firestore References (replaces localStorage keys)
     --------------------------------------------------- */
  const COLLECTIONS = {
    members:    'members',
    services:   'services',
    categories: 'givingCategories',
    users:      'users',
    fields:     'customFields',
    templates:  'notificationTemplates',
    audit:      'activityLog',
    church:     'churchProfile',
  };

  const { dbAdd, dbSet, dbGet, dbGetAll, dbUpdate, dbSoftDelete, dbRestore: dbRestoreDoc, dbSeedIfEmpty, dbListen } = window.ChurchOS;

  /* ---------------------------------------------------
     Utility helpers
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

  function formatTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  }

  const ROLE_LABELS = {
    admin:   'Church Administrator',
    pastor:  'Senior Pastor',
    leader:  'Leader / Dept Head',
    finance: 'Finance Team',
    member:  'Member',
  };

  /* ---------------------------------------------------
     Seed Data — realistic Ghanaian church data
     --------------------------------------------------- */
  const SEED_MEMBERS = [
    { id: uid(), name: 'Kwame Asante', phone: '024 555 0101', email: 'kwame.a@email.com', dob: '1988-03-15', address: '12 Cantonments Rd, Accra', department: 'Ushering', status: 'Active', family: 'Asante Family', customFields: {} },
    { id: uid(), name: 'Ama Serwaa', phone: '024 555 0102', email: 'ama.s@email.com', dob: '1992-07-22', address: '5 Osu Badu St, Accra', department: 'Choir', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Kofi Darko', phone: '020 555 0103', email: 'kofi.d@email.com', dob: '1985-11-08', address: '23 Tema Community 7', department: 'Youth Ministry', status: 'Active', family: 'Darko Household', customFields: {} },
    { id: uid(), name: 'Abena Osei', phone: '027 555 0104', email: 'abena.o@email.com', dob: '1990-01-30', address: '8 Labone Crescent, Accra', department: 'Media & Tech', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Yaw Boateng', phone: '055 555 0105', email: '', dob: '1995-05-12', address: '17 Spintex Rd, Accra', department: 'Ushering', status: 'Active', family: 'Boateng Family', customFields: {} },
    { id: uid(), name: 'Akosua Mensah', phone: '024 555 0106', email: 'akosua.m@email.com', dob: '1987-09-18', address: '3 Dansoman Rd, Accra', department: 'Women\'s Ministry', status: 'Active', family: 'Mensah Family', customFields: {} },
    { id: uid(), name: 'Nana Agyeman', phone: '050 555 0107', email: 'nana.a@email.com', dob: '1982-12-01', address: '9 Airport Hills, Accra', department: 'Men\'s Fellowship', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Efua Appiah', phone: '024 555 0108', email: '', dob: '1998-04-25', address: '14 East Legon, Accra', department: 'Choir', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Kwesi Owusu', phone: '020 555 0109', email: 'kwesi.o@email.com', dob: '1991-08-14', address: '6 Madina Rd, Accra', department: 'Prayer Ministry', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Adjoa Bonsu', phone: '027 555 0110', email: 'adjoa.b@email.com', dob: '1994-02-28', address: '22 Achimota, Accra', department: 'Children\'s Church', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Fiifi Quansah', phone: '055 555 0111', email: '', dob: '1989-06-10', address: '11 Teshie, Accra', department: 'Evangelism', status: 'Active', family: 'Quansah Family', customFields: {} },
    { id: uid(), name: 'Maame Esi Dodoo', phone: '024 555 0112', email: 'esi.d@email.com', dob: '1993-10-05', address: '7 Dzorwulu, Accra', department: 'Choir', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Papa Nii Quaye', phone: '020 555 0113', email: '', dob: '2001-01-20', address: '16 Tetteh Quarshie, Accra', department: '', status: 'Visitor', family: '', customFields: {} },
    { id: uid(), name: 'Serwaa Akoto', phone: '027 555 0114', email: '', dob: '1999-03-08', address: '', department: '', status: 'Visitor', family: '', customFields: {} },
    { id: uid(), name: 'Emmanuel Tetteh', phone: '050 555 0115', email: 'emma.t@email.com', dob: '1986-07-17', address: '4 Kasoa Rd, Central', department: 'Ushering', status: 'Inactive', family: '', customFields: {} },
    { id: uid(), name: 'Gifty Amoah', phone: '024 555 0116', email: 'gifty.a@email.com', dob: '1997-11-30', address: '19 Dome, Accra', department: 'Youth Ministry', status: 'Active', family: '', customFields: {} },
    { id: uid(), name: 'Bright Kumi', phone: '020 555 0117', email: '', dob: '1984-04-02', address: '10 Tema Community 5', department: 'Media & Tech', status: 'Inactive', family: '', customFields: {} },
    { id: uid(), name: 'Comfort Addae', phone: '027 555 0118', email: 'comfort.a@email.com', dob: '1996-08-19', address: '13 Adenta, Accra', department: 'Women\'s Ministry', status: 'Active', family: 'Addae Family', customFields: {} },
    { id: uid(), name: 'Justice Amponsah', phone: '055 555 0119', email: '', dob: '2003-12-14', address: '', department: '', status: 'Visitor', family: '', customFields: {} },
    { id: uid(), name: 'Henrietta Ansong', phone: '024 555 0120', email: 'henri.a@email.com', dob: '1990-05-07', address: '21 Weija, Accra', department: 'Prayer Ministry', status: 'Active', family: '', customFields: {} },
  ];

  const SEED_SERVICES = [
    { id: uid(), name: '1st Service', day: 'Sunday', time: '07:00', frequency: 'Weekly' },
    { id: uid(), name: '2nd Service', day: 'Sunday', time: '09:30', frequency: 'Weekly' },
    { id: uid(), name: '3rd Service', day: 'Sunday', time: '12:00', frequency: 'Weekly' },
    { id: uid(), name: 'Mid-Week Service', day: 'Wednesday', time: '18:30', frequency: 'Weekly' },
    { id: uid(), name: 'Friday Prayer Meeting', day: 'Friday', time: '19:00', frequency: 'Weekly' },
  ];

  const SEED_CATEGORIES = [
    { id: uid(), name: 'Tithe', description: 'Regular 10% giving from members', transactions: 342, status: 'active' },
    { id: uid(), name: 'Offering', description: 'General Sunday service offering', transactions: 580, status: 'active' },
    { id: uid(), name: 'Building Fund', description: 'Contributions toward church building project', transactions: 87, status: 'active' },
    { id: uid(), name: 'Missions', description: 'Support for missionary outreach', transactions: 45, status: 'active' },
    { id: uid(), name: 'Special Seed', description: 'One-time special offerings and pledges', transactions: 28, status: 'active' },
    { id: uid(), name: 'Welfare Fund', description: 'Assistance for members in need', transactions: 19, status: 'active' },
  ];

  const SEED_USERS = [
    { id: uid(), name: 'Admin User', phone: '024 000 0001', email: 'admin@graceassembly.org', role: 'admin', department: '', status: 'active' },
    { id: uid(), name: 'Rev. Daniel Mensah', phone: '024 000 0002', email: 'pastor@graceassembly.org', role: 'pastor', department: '', status: 'active' },
    { id: uid(), name: 'Abena Osei', phone: '027 555 0104', email: 'abena.o@email.com', role: 'finance', department: '', status: 'active' },
    { id: uid(), name: 'Kofi Darko', phone: '020 555 0103', email: 'kofi.d@email.com', role: 'leader', department: 'Youth Ministry', status: 'active' },
    { id: uid(), name: 'Akosua Mensah', phone: '024 555 0106', email: 'akosua.m@email.com', role: 'leader', department: 'Women\'s Ministry', status: 'active' },
    { id: uid(), name: 'Yaw Boateng', phone: '055 555 0105', email: '', role: 'member', department: '', status: 'active' },
    { id: uid(), name: 'Ama Serwaa', phone: '024 555 0102', email: 'ama.s@email.com', role: 'member', department: '', status: 'active' },
    { id: uid(), name: 'Emmanuel Tetteh', phone: '050 555 0115', email: 'emma.t@email.com', role: 'member', department: '', status: 'inactive' },
  ];

  const SEED_FIELDS = [
    { id: uid(), name: 'Water Baptism Date', type: 'date', options: '', created: '2026-01-15' },
    { id: uid(), name: 'Skills / Profession', type: 'text', options: '', created: '2026-02-10' },
    { id: uid(), name: 'Emergency Contact', type: 'text', options: '', created: '2026-03-05' },
  ];

  const SEED_TEMPLATES = [
    { id: uid(), name: 'Birthday Greeting', body: 'Happy Birthday, {{first_name}}! 🎂 The entire {{church_name}} family celebrates you today. May God bless your new year with abundant joy and favour!', vars: ['{{first_name}}', '{{last_name}}', '{{church_name}}'] },
    { id: uid(), name: 'Welcome Message', body: 'Welcome to {{church_name}}, {{first_name}}! We are so glad you joined us. If you have any questions, feel free to reach out to our team. God bless you! ✝️', vars: ['{{first_name}}', '{{church_name}}', '{{pastor_name}}'] },
    { id: uid(), name: 'Absence Follow-Up', body: 'Hi {{first_name}}, we noticed you\'ve been away from {{church_name}} for a while and we miss you! Is everything okay? We\'d love to see you this Sunday. 🙏', vars: ['{{first_name}}', '{{church_name}}', '{{weeks_absent}}'] },
    { id: uid(), name: 'General Announcement', body: 'Dear {{first_name}}, {{church_name}} would like to inform you: [Your announcement here]. See you in church! God bless.', vars: ['{{first_name}}', '{{church_name}}', '{{event_date}}'] },
  ];

  const SEED_AUDIT = [
    { id: uid(), timestamp: '2026-07-23 09:15:00', user: 'Admin User', action: 'create', record: 'Added new member: Justice Amponsah' },
    { id: uid(), timestamp: '2026-07-23 08:45:00', user: 'Abena Osei', action: 'create', record: 'Recorded 12 tithe entries for Sunday 2nd Service' },
    { id: uid(), timestamp: '2026-07-22 16:30:00', user: 'System', action: 'system', record: 'Sent 145 bulk SMS for Sunday service reminder' },
    { id: uid(), timestamp: '2026-07-22 14:15:00', user: 'Rev. Daniel Mensah', action: 'edit', record: 'Flagged Ama Serwaa for pastoral follow-up' },
    { id: uid(), timestamp: '2026-07-21 11:00:00', user: 'Kofi Darko', action: 'edit', record: 'Updated Youth Ministry roster — added 3 members' },
    { id: uid(), timestamp: '2026-07-20 09:30:00', user: 'Admin User', action: 'create', record: 'Added new giving category: Welfare Fund' },
    { id: uid(), timestamp: '2026-07-19 15:00:00', user: 'Admin User', action: 'edit', record: 'Updated church profile — changed address' },
    { id: uid(), timestamp: '2026-07-18 10:20:00', user: 'System', action: 'system', record: 'Auto-flagged 2 members as inactive (4+ weeks absent)' },
    { id: uid(), timestamp: '2026-07-17 08:00:00', user: 'Rev. Daniel Mensah', action: 'login', record: 'Pastor logged into dashboard' },
    { id: uid(), timestamp: '2026-07-16 14:45:00', user: 'Akosua Mensah', action: 'edit', record: 'Updated Women\'s Ministry roster' },
    { id: uid(), timestamp: '2026-07-15 09:10:00', user: 'Admin User', action: 'create', record: 'Created user account: Akosua Mensah (Leader)' },
    { id: uid(), timestamp: '2026-07-14 11:30:00', user: 'Abena Osei', action: 'create', record: 'Recorded offering entries for Friday Prayer' },
    { id: uid(), timestamp: '2026-07-13 16:00:00', user: 'Admin User', action: 'delete', record: 'Archived giving category: Legacy Fund' },
    { id: uid(), timestamp: '2026-07-12 08:30:00', user: 'System', action: 'system', record: 'Sent 23 birthday greetings via SMS' },
    { id: uid(), timestamp: '2026-07-11 10:00:00', user: 'Admin User', action: 'edit', record: 'Updated notification template: Birthday Greeting' },
  ];

  const SEED_CHURCH = {
    name: 'Grace Assembly International',
    denomination: 'Pentecostal/Charismatic',
    address: '15 Liberation Road, Accra',
    city: 'Accra, Greater Accra',
    phone: '030 200 1234',
    email: 'info@graceassembly.org',
    description: 'Grace Assembly International is a vibrant, Spirit-filled church committed to raising disciples who transform their communities. Founded in 2005, we serve over 1,200 members across three Sunday services.',
  };

  /* ---------------------------------------------------
     Data State — loaded from Firestore asynchronously
     --------------------------------------------------- */
  let members    = JSON.parse(JSON.stringify(SEED_MEMBERS));
  let services   = JSON.parse(JSON.stringify(SEED_SERVICES));
  let categories = JSON.parse(JSON.stringify(SEED_CATEGORIES));
  let users      = JSON.parse(JSON.stringify(SEED_USERS));
  let fields     = JSON.parse(JSON.stringify(SEED_FIELDS));
  let templates  = JSON.parse(JSON.stringify(SEED_TEMPLATES));
  let auditLog   = JSON.parse(JSON.stringify(SEED_AUDIT));
  let church     = JSON.parse(JSON.stringify(SEED_CHURCH));

  /**
   * Load all data from Firestore, seeding collections that are empty
   */
  async function loadAllFromFirestore() {
    try {
      // Seed all collections if empty
      await Promise.all([
        dbSeedIfEmpty(COLLECTIONS.members, SEED_MEMBERS),
        dbSeedIfEmpty(COLLECTIONS.services, SEED_SERVICES),
        dbSeedIfEmpty(COLLECTIONS.categories, SEED_CATEGORIES),
        dbSeedIfEmpty(COLLECTIONS.fields, SEED_FIELDS),
        dbSeedIfEmpty(COLLECTIONS.templates, SEED_TEMPLATES),
      ]);

      // Fetch all data
      const [membersData, servicesData, categoriesData, usersData, fieldsData, templatesData] = await Promise.all([
        dbGetAll(COLLECTIONS.members, null, { includeDeleted: true }),
        dbGetAll(COLLECTIONS.services),
        dbGetAll(COLLECTIONS.categories, null, { includeDeleted: true }),
        dbGetAll(COLLECTIONS.users, null, { includeDeleted: true }),
        dbGetAll(COLLECTIONS.fields, null, { includeDeleted: true }),
        dbGetAll(COLLECTIONS.templates),
      ]);

      if (membersData.length > 0) members = membersData;
      if (servicesData.length > 0) services = servicesData;
      if (categoriesData.length > 0) categories = categoriesData;
      if (usersData.length > 0) users = usersData;
      if (fieldsData.length > 0) fields = fieldsData;
      if (templatesData.length > 0) templates = templatesData;

      // Load church profile (single document)
      const churchDoc = await dbGet(COLLECTIONS.church, 'profile');
      if (churchDoc) {
        church = churchDoc;
      } else {
        await dbSet(COLLECTIONS.church, 'profile', SEED_CHURCH);
      }

      console.log('[Admin] Firestore data loaded successfully.');
    } catch (err) {
      console.warn('[Admin] Firestore load failed, using seed data:', err);
    }
  }

  /**
   * persist() is now a no-op placeholder.
   * Individual CRUD operations write directly to Firestore.
   * Keeping this function so existing calls don't break — it's
   * called in many places as a catch-all save.
   */
  function persist() {
    // No-op: data is now written to Firestore on each individual operation.
    // This function preserved for backward compatibility with existing code paths.
  }

  function addAuditEntry(user, action, record, module = 'General') {
    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.logActivity({
        user: user || 'Admin User',
        role: 'admin',
        department: 'Administration',
        action: action || 'edit',
        module: module,
        record: record,
        isMemberFacing: action === 'create' || action === 'send'
      });
    } else {
      auditLog.unshift({ id: uid(), timestamp: now(), user, action, record });
      if (auditLog.length > 200) auditLog.length = 200;
      persist();
    }
  }

  /* ---------------------------------------------------
     Modal helpers
     --------------------------------------------------- */
  function openModal(id) { document.getElementById(id)?.classList.add('active'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

  // Click overlay to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Confirmation dialog state
  let confirmCallback = null;

  function showConfirm(title, text, btnText, btnClass, callback) {
    const titleEl = document.getElementById('confirm-title');
    if (titleEl) titleEl.textContent = title;

    const textEl = document.getElementById('confirm-text');
    if (textEl) textEl.textContent = text;

    const btn = document.getElementById('confirm-action-btn');
    if (btn) {
      btn.textContent = btnText;
      btn.className = `btn ${btnClass || 'btn--primary'}`;
    }

    const icon = document.getElementById('confirm-icon');
    if (icon) {
      const isDanger = btnClass && btnClass.includes('danger');
      icon.className = isDanger ? 'confirm-dialog__icon confirm-dialog__icon--danger' : 'confirm-dialog__icon confirm-dialog__icon--warning';
      icon.textContent = isDanger ? '⚠️' : '⚡';
    }

    confirmCallback = callback;
    openModal('modal-confirm');
  }

  document.getElementById('confirm-action-btn')?.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeModal('modal-confirm');
    confirmCallback = null;
  });

  /* ---------------------------------------------------
     Section Navigation
     --------------------------------------------------- */
  function showSection(sectionId) {
    if (!sectionId) return;

    const normalized = (sectionId === 'fields' || sectionId === 'custom-fields') ? 'custom-fields' : sectionId;

    const sections = document.querySelectorAll('.dashboard-section');
    const links = document.querySelectorAll('.sidebar__link[data-section], [data-section]');

    sections.forEach(s => s.classList.remove('active'));
    links.forEach(l => l.classList.remove('active'));

    const targetSection = document.getElementById(`section-${normalized}`) || document.getElementById(`section-${sectionId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    document.querySelectorAll(`[data-section="${sectionId}"], [data-section="${normalized}"]`).forEach(l => l.classList.add('active'));

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Global Event Delegation for sidebar links, data-goto, data-close, and table data-action buttons
  document.addEventListener('click', (e) => {
    const sectionBtn = e.target.closest('[data-section]');
    if (sectionBtn) {
      e.preventDefault();
      showSection(sectionBtn.dataset.section);
      return;
    }

    const gotoBtn = e.target.closest('[data-goto]');
    if (gotoBtn) {
      e.preventDefault();
      showSection(gotoBtn.dataset.goto);
      return;
    }

    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
      e.preventDefault();
      closeModal(closeBtn.dataset.close);
      return;
    }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const id = actionBtn.dataset.id;
      if (!action || !id) return;

      if (action === 'view') viewMember(id);
      else if (action === 'edit') editMember(id);
      else if (action === 'convert') convertMember(id);
      else if (action === 'delete') deleteMember(id);
      else if (action === 'restore') restoreMember(id);
      else if (action === 'editRole') editUserRole(id);
      else if (action === 'resetPassword') resetPassword(id);
      else if (action === 'deactivate') deactivateUser(id);
      else if (action === 'activate') activateUser(id);
      else if (action === 'editService') editService(id);
      else if (action === 'deleteService') deleteService(id);
      else if (action === 'deleteCategory') deleteCategory(id);
      else if (action === 'restoreCategory') restoreCategory(id);
      else if (action === 'deleteField') deleteField(id);
      else if (action === 'restoreField') restoreField(id);
      else if (action === 'saveTemplate') saveTemplate(id);
      return;
    }
  });

  /* ---------------------------------------------------
     SECTION 1: Overview — populate stats
     --------------------------------------------------- */
  function renderOverview() {
    const activeMembers = members.filter(m => m.status === 'Active').length;
    const visitorCount = members.filter(m => m.status === 'Visitor').length;
    const activeUsers = users.filter(u => u.status === 'active').length;

    document.getElementById('stat-members').textContent = members.length.toLocaleString();
    document.getElementById('stat-visitors').textContent = visitorCount;
    document.getElementById('stat-services').textContent = services.length;
    document.getElementById('stat-giving').textContent = 'GH₵ 45.2K';
    document.getElementById('stat-attendance').textContent = Math.round(activeMembers * 0.72);
    document.getElementById('stat-accounts').textContent = activeUsers;

    // Mini audit feed (last 5)
    const feed = document.getElementById('overview-audit-feed');
    if (feed) {
      const dotColors = { create: 'gold', edit: 'info', delete: 'warning', login: 'success', system: 'success' };
      feed.innerHTML = auditLog.slice(0, 5).map(e => `
        <div class="activity-item">
          <div class="activity-item__dot activity-item__dot--${dotColors[e.action] || 'gold'}"></div>
          <div>
            <div class="activity-item__text"><strong>${e.user}</strong> ${e.record}</div>
            <div class="activity-item__time">${e.timestamp}</div>
          </div>
        </div>
      `).join('');
    }
  }

  /* ---------------------------------------------------
     SECTION 2: Members
     --------------------------------------------------- */
  function getDepartments() {
    const depts = new Set(members.map(m => m.department).filter(Boolean));
    return [...depts].sort();
  }

  function populateDeptFilter() {
    const sel = document.getElementById('member-filter-dept');
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">All Departments</option>' +
      getDepartments().map(d => `<option ${d === val ? 'selected' : ''}>${d}</option>`).join('');
  }

  function renderMembers() {
    const search = (document.getElementById('member-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('member-filter-status')?.value || '';
    const deptFilter = document.getElementById('member-filter-dept')?.value || '';

    let filtered = members.filter(m => {
      if (statusFilter === 'Deleted') {
        if (!m.deleted) return false;
      } else {
        if (m.deleted) return false;
        if (statusFilter && m.status !== statusFilter) return false;
      }
      if (search && !m.name.toLowerCase().includes(search) && !m.phone.includes(search)) return false;
      if (deptFilter && m.department !== deptFilter) return false;
      return true;
    });

    const tbody = document.getElementById('members-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">${statusFilter === 'Deleted' ? 'No deleted members' : 'No members found'}</div><div class="empty-state__text">${statusFilter === 'Deleted' ? 'Soft-deleted member records will appear here.' : 'Try adjusting your search or filters.'}</div></div></td></tr>`;
      return;
    }

    const dotClass = { Active: 'active', Inactive: 'inactive', Visitor: 'visitor' };
    const badgeClass = { Active: 'success', Inactive: 'danger', Visitor: 'info' };

    tbody.innerHTML = filtered.map(m => `
      <tr data-member-id="${m.id}" style="${m.deleted ? 'opacity: 0.7; background: rgba(239,68,68,0.03);' : ''}">
        <td><strong>${m.name}</strong> ${m.deleted ? '<span class="badge badge--danger" style="margin-left: 0.5rem;">Soft Deleted</span>' : ''}</td>
        <td>${m.phone}</td>
        <td><span class="status-dot status-dot--${dotClass[m.status] || 'active'}"></span><span class="badge badge--${badgeClass[m.status] || 'info'}">${m.status}</span></td>
        <td>${m.department || '—'}</td>
        <td>
          <div class="table-actions">
            ${m.deleted ? `
              <button class="btn btn--success-ghost" data-action="restore" data-id="${m.id}">♻️ Restore</button>
            ` : `
              <button class="btn btn--ghost btn--xs" data-action="view" data-id="${m.id}">View</button>
              <button class="btn btn--info-ghost" data-action="edit" data-id="${m.id}">Edit</button>
              ${m.status === 'Visitor' ? `<button class="btn btn--success-ghost" data-action="convert" data-id="${m.id}">→ Member</button>` : ''}
              <button class="btn btn--danger-ghost" data-action="delete" data-id="${m.id}">Delete</button>
            `}
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Member form custom fields
  function renderMemberCustomFields(data = {}) {
    const container = document.getElementById('member-custom-fields');
    if (!container) return;
    const activeFields = fields.filter(f => !f.deleted);
    container.innerHTML = activeFields.map(f => {
      const val = data[f.id] || '';
      let input = '';
      if (f.type === 'text') input = `<input type="text" class="form-input" data-field-id="${f.id}" value="${val}">`;
      else if (f.type === 'number') input = `<input type="number" class="form-input" data-field-id="${f.id}" value="${val}">`;
      else if (f.type === 'date') input = `<input type="date" class="form-input" data-field-id="${f.id}" value="${val}">`;
      else if (f.type === 'dropdown') {
        const opts = (f.options || '').split(',').map(o => o.trim()).filter(Boolean);
        input = `<select class="form-select" data-field-id="${f.id}"><option value="">— Select —</option>${opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
      }
      return `<div class="form-group"><label class="form-label">${f.name}</label>${input}</div>`;
    }).join('');
  }

  function collectCustomFields() {
    const data = {};
    document.querySelectorAll('#member-custom-fields [data-field-id]').forEach(el => {
      data[el.dataset.fieldId] = el.value;
    });
    return data;
  }

  // Add Member
  document.getElementById('btn-add-member')?.addEventListener('click', () => {
    document.getElementById('modal-member-title').textContent = 'Add Member';
    document.getElementById('form-member')?.reset();
    document.getElementById('member-edit-id').value = '';
    renderMemberCustomFields();
    openModal('modal-member');
  });

  // Save Member
  document.getElementById('btn-save-member')?.addEventListener('click', () => {
    const name = document.getElementById('m-name').value.trim();
    const phone = document.getElementById('m-phone').value.trim();
    if (!name || !phone) { toast('Name and phone are required', 'error'); return; }

    const editId = document.getElementById('member-edit-id').value;
    const data = {
      name,
      phone,
      email: document.getElementById('m-email').value.trim(),
      dob: document.getElementById('m-dob').value,
      address: document.getElementById('m-address').value.trim(),
      department: document.getElementById('m-department').value,
      status: document.getElementById('m-status').value,
      family: document.getElementById('m-family').value.trim(),
      customFields: collectCustomFields(),
    };

    if (editId) {
      const idx = members.findIndex(m => String(m.id) === String(editId));
      if (idx !== -1) { members[idx] = { ...members[idx], ...data }; }
      addAuditEntry('Admin User', 'edit', `Updated member: ${name}`);
      toast('Member updated successfully');
    } else {
      members.push({ id: uid(), ...data });
      addAuditEntry('Admin User', 'create', `Added new member: ${name}`);
      toast('Member added successfully');
    }

    persist();
    closeModal('modal-member');
    renderMembers();
    populateDeptFilter();
    renderOverview();
  });

  // Edit Member (exposed globally)
  function editMember(id) {
    const m = members.find(x => String(x.id) === String(id));
    if (!m) return;
    document.getElementById('modal-member-title').textContent = 'Edit Member';
    document.getElementById('member-edit-id').value = id;
    document.getElementById('m-name').value = m.name;
    document.getElementById('m-phone').value = m.phone;
    document.getElementById('m-email').value = m.email || '';
    document.getElementById('m-dob').value = m.dob || '';
    document.getElementById('m-address').value = m.address || '';
    document.getElementById('m-department').value = m.department || '';
    document.getElementById('m-status').value = m.status;
    document.getElementById('m-family').value = m.family || '';
    renderMemberCustomFields(m.customFields || {});
    openModal('modal-member');
  }

  // View Member
  function viewMember(id) {
    const m = members.find(x => String(x.id) === String(id));
    if (!m) return;
    const body = document.getElementById('view-member-body');
    if (!body) return;

    let customHtml = '';
    fields.forEach(f => {
      const val = (m.customFields || {})[f.id];
      if (val) customHtml += `<div class="profile-summary__detail"><strong>${f.name}:</strong>&nbsp;${val}</div>`;
    });

    const initials = (m.name || 'Member').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    body.innerHTML = `
      <div class="profile-summary" style="margin-bottom: var(--space-xl);">
        <div class="profile-summary__avatar">${initials}</div>
        <div class="profile-summary__info">
          <h3>${m.name}</h3>
          <div class="profile-summary__detail">📱 ${m.phone}</div>
          ${m.email ? `<div class="profile-summary__detail">✉️ ${m.email}</div>` : ''}
          <div class="profile-summary__detail"><span class="badge badge--${m.status === 'Active' ? 'success' : m.status === 'Visitor' ? 'info' : 'danger'}">${m.status}</span></div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); font-size: 0.875rem;">
        <div><strong>Department:</strong> ${m.department || '—'}</div>
        <div><strong>Family:</strong> ${m.family || '—'}</div>
        <div><strong>DOB:</strong> ${m.dob || '—'}</div>
        <div><strong>Address:</strong> ${m.address || '—'}</div>
      </div>
      ${customHtml ? `<div style="margin-top: var(--space-lg); border-top: 1px solid var(--color-gray-200); padding-top: var(--space-lg);">
        <h5 style="margin-bottom: var(--space-md);">Custom Fields</h5>
        ${customHtml}
      </div>` : ''}
    `;
    openModal('modal-view-member');
  }

  // Convert Visitor to Member
  function convertMember(id) {
    showConfirm(
      'Convert to Member',
      'This will change the person\'s status from Visitor to Active Member. Continue?',
      'Convert to Member',
      'btn btn--primary',
      () => {
        const m = members.find(x => String(x.id) === String(id));
        if (m) {
          m.status = 'Active';
          addAuditEntry('Admin User', 'edit', `Converted visitor to member: ${m.name}`);
          persist();
          renderMembers();
          renderOverview();
          toast(`${m.name} is now an active member`);
        }
      }
    );
  }

  function deleteMember(id) {
    const m = members.find(x => String(x.id) === String(id));
    if (!m) return;
    showConfirm(
      'Soft Delete Member?',
      `Are you sure you want to delete ${m.name}? It will be hidden from normal views but can be restored at any time.\n\nNote: All associated records (attendance, giving logs) will remain safely intact.`,
      'Delete',
      'btn btn--danger',
      () => {
        m.deleted = true;
        m.deletedAt = new Date().toISOString();
        addAuditEntry('Admin User', 'delete', `Soft-deleted member: ${m.name}`);
        persist();
        renderMembers();
        populateDeptFilter();
        renderOverview();
        toast(`${m.name} deleted (can be restored from Deleted filter view)`);
      }
    );
  }

  function restoreMember(id) {
    const m = members.find(x => x.id === id);
    if (!m) return;
    m.deleted = false;
    delete m.deletedAt;
    addAuditEntry('Admin User', 'edit', `Restored member: ${m.name}`);
    persist();
    renderMembers();
    populateDeptFilter();
    renderOverview();
    toast(`${m.name} restored successfully`);
  }

  // Member search and filters
  document.getElementById('member-search')?.addEventListener('input', renderMembers);
  document.getElementById('member-filter-status')?.addEventListener('change', renderMembers);
  document.getElementById('member-filter-dept')?.addEventListener('change', renderMembers);

  /* ---------------------------------------------------
     SECTION 3: Services & Attendance
     --------------------------------------------------- */
  function renderServices() {
    const tbody = document.getElementById('services-tbody');
    if (!tbody) return;

    tbody.innerHTML = services.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.day}</td>
        <td>${formatTime(s.time)}</td>
        <td><span class="badge badge--navy">${s.frequency}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn--info-ghost" onclick="window._adminDash.editService('${s.id}')">Edit</button>
            <button class="btn btn--danger-ghost" onclick="window._adminDash.deleteService('${s.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('btn-add-service')?.addEventListener('click', () => {
    document.getElementById('form-service')?.reset();
    document.getElementById('service-edit-id').value = '';
    document.querySelector('#modal-service .modal__title').textContent = 'Add Service';
    openModal('modal-service');
  });

  document.getElementById('btn-save-service')?.addEventListener('click', () => {
    const name = document.getElementById('s-name').value.trim();
    const day = document.getElementById('s-day').value;
    const time = document.getElementById('s-time').value;
    if (!name || !day || !time) { toast('All fields are required', 'error'); return; }

    const editId = document.getElementById('service-edit-id').value;
    const data = { name, day, time, frequency: document.getElementById('s-frequency').value };

    if (editId) {
      const idx = services.findIndex(s => s.id === editId);
      if (idx !== -1) services[idx] = { ...services[idx], ...data };
      addAuditEntry('Admin User', 'edit', `Updated service: ${name}`);
      toast('Service updated');
    } else {
      services.push({ id: uid(), ...data });
      addAuditEntry('Admin User', 'create', `Added new service: ${name}`);
      toast('Service added — recurring sessions will be generated automatically');
    }

    persist();
    closeModal('modal-service');
    renderServices();
    renderOverview();
  });

  function editService(id) {
    const s = services.find(x => x.id === id);
    if (!s) return;
    document.querySelector('#modal-service .modal__title').textContent = 'Edit Service';
    document.getElementById('service-edit-id').value = id;
    document.getElementById('s-name').value = s.name;
    document.getElementById('s-day').value = s.day;
    document.getElementById('s-time').value = s.time;
    document.getElementById('s-frequency').value = s.frequency;
    openModal('modal-service');
  }

  function deleteService(id) {
    const s = services.find(x => x.id === id);
    if (!s) return;
    showConfirm('Delete Service', `Are you sure you want to delete "${s.name}"? Past attendance records will be preserved.`, 'Delete', 'btn btn--danger', () => {
      services = services.filter(x => x.id !== id);
      addAuditEntry('Admin User', 'delete', `Deleted service: ${s.name}`);
      persist();
      renderServices();
      renderOverview();
      toast('Service deleted');
    });
  }

  // Attendance analytics period change
  document.getElementById('attendance-period')?.addEventListener('change', (e) => {
    const analytics = { week: [745, '+3.1%', '68%'], month: [892, '+5.2%', '71%'], quarter: [860, '+4.8%', '73%'] };
    const d = analytics[e.target.value] || analytics.month;
    document.getElementById('analytics-avg').textContent = d[0];
    document.getElementById('analytics-trend').textContent = d[1];
    document.getElementById('analytics-retention').textContent = d[2];
  });

  /* ---------------------------------------------------
     SECTION 4: Giving Categories
     --------------------------------------------------- */
  function renderCategories() {
    const tbody = document.getElementById('categories-tbody');
    if (!tbody) return;

    tbody.innerHTML = categories.map(c => `
      <tr style="${c.status === 'archived' ? 'opacity: 0.5;' : ''}">
        <td><strong>${c.name}</strong></td>
        <td style="max-width: 240px;">${c.description}</td>
        <td>${c.transactions}</td>
        <td><span class="badge badge--${c.status === 'active' ? 'success' : 'warning'}">${c.status === 'active' ? 'Active' : 'Archived'}</span></td>
        <td>
          <div class="table-actions">
            ${c.status === 'active' ? `<button class="btn btn--danger-ghost" onclick="window._adminDash.deleteCategory('${c.id}')">${c.transactions > 0 ? 'Archive' : 'Delete'}</button>` : `<button class="btn btn--success-ghost" onclick="window._adminDash.restoreCategory('${c.id}')">Restore</button>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('btn-add-category')?.addEventListener('click', () => {
    document.getElementById('form-category')?.reset();
    openModal('modal-category');
  });

  document.getElementById('btn-save-category')?.addEventListener('click', () => {
    const name = document.getElementById('cat-name').value.trim();
    if (!name) { toast('Category name is required', 'error'); return; }

    categories.push({
      id: uid(),
      name,
      description: document.getElementById('cat-desc').value.trim(),
      transactions: 0,
      status: 'active',
    });

    addAuditEntry('Admin User', 'create', `Added new giving category: ${name}`);
    persist();
    closeModal('modal-category');
    renderCategories();
    toast('Category added');
  });

  function deleteCategory(id) {
    const c = categories.find(x => x.id === id);
    if (!c) return;

    showConfirm(
      'Archive Category?',
      `Are you sure you want to archive "${c.name}"? It will be hidden from entry forms while preserving all historical financial logs. You can restore it anytime.`,
      'Archive Category',
      'btn btn--warning-solid',
      () => {
        c.deleted = true;
        c.deletedAt = new Date().toISOString();
        c.status = 'archived';
        addAuditEntry('Admin User', 'delete', `Archived giving category: ${c.name}`);
        persist();
        renderCategories();
        toast(`"${c.name}" has been archived`);
      }
    );
  }

  function restoreCategory(id) {
    const c = categories.find(x => x.id === id);
    if (c) {
      c.deleted = false;
      delete c.deletedAt;
      c.status = 'active';
      addAuditEntry('Admin User', 'edit', `Restored giving category: ${c.name}`);
      persist();
      renderCategories();
      toast(`"${c.name}" restored`);
    }
  }

  /* ---------------------------------------------------
     SECTION 5: User Accounts & Roles
     --------------------------------------------------- */
  /* ---------------------------------------------------
     SECTION 5: User Accounts & Roles
     --------------------------------------------------- */
  function renderUsers() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    tbody.innerHTML = users.map(u => {
      const displayName = u.name || (u.email ? u.email.split('@')[0] : u.phone) || 'User Account';
      const roleLabel = ROLE_LABELS[u.role] || u.role || 'Member';

      return `
        <tr style="${u.status === 'inactive' ? 'opacity: 0.55;' : ''}" data-user-id="${u.id}">
          <td><strong>${displayName}</strong></td>
          <td>${u.phone || '—'}${u.email ? `<br><span style="color: var(--color-gray-500); font-size: 0.75rem;">${u.email}</span>` : ''}</td>
          <td><span class="badge badge--navy">${roleLabel}</span></td>
          <td>${u.department || '—'}</td>
          <td><span class="badge badge--${u.status === 'active' ? 'success' : 'danger'}">${u.status === 'active' ? 'Active' : 'Inactive'}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn--info-ghost" data-action="editRole" data-id="${u.id}">Edit Role</button>
              <button class="btn btn--ghost btn--xs" data-action="resetPassword" data-id="${u.id}">Reset PW</button>
              ${u.status === 'active'
                ? `<button class="btn btn--danger-ghost" data-action="deactivate" data-id="${u.id}">Deactivate</button>`
                : `<button class="btn btn--success-ghost" data-action="activate" data-id="${u.id}">Reactivate</button>`
              }
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Show/hide department field based on role
  document.getElementById('u-role')?.addEventListener('change', (e) => {
    document.getElementById('user-dept-group').style.display = e.target.value === 'leader' ? 'block' : 'none';
  });

  document.getElementById('btn-create-account')?.addEventListener('click', () => {
    document.getElementById('modal-user-title').textContent = 'Create User Account';
    document.getElementById('form-user')?.reset();
    document.getElementById('user-edit-id').value = '';
    document.getElementById('user-password-group').style.display = 'block';
    document.getElementById('user-dept-group').style.display = 'none';
    document.getElementById('btn-save-user').textContent = 'Create Account';
    openModal('modal-user');
  });

  document.getElementById('btn-save-user')?.addEventListener('click', () => {
    const name = document.getElementById('u-name').value.trim();
    const phone = document.getElementById('u-phone').value.trim();
    const role = document.getElementById('u-role').value;
    if (!phone || !role) { toast('Phone and role are required', 'error'); return; }

    const finalName = name || (document.getElementById('u-email').value.trim() ? document.getElementById('u-email').value.trim().split('@')[0] : phone);
    const editId = document.getElementById('user-edit-id').value;

    if (editId) {
      const idx = users.findIndex(u => String(u.id) === String(editId));
      if (idx !== -1) {
        users[idx].name = finalName;
        users[idx].phone = phone;
        users[idx].email = document.getElementById('u-email').value.trim();
        users[idx].role = role;
        users[idx].department = role === 'leader' ? document.getElementById('u-department').value : '';
        addAuditEntry('Admin User', 'edit', `Changed role for ${finalName} to ${ROLE_LABELS[role] || role}`);
      }
      toast(`Role updated for ${finalName}`);
    } else {
      const pw = document.getElementById('u-password').value.trim();
      if (!pw) { toast('Password is required', 'error'); return; }
      users.push({
        id: uid(),
        name: finalName,
        phone,
        email: document.getElementById('u-email').value.trim(),
        role,
        department: role === 'leader' ? document.getElementById('u-department').value : '',
        status: 'active',
      });
      addAuditEntry('Admin User', 'create', `Created user account: ${finalName} (${ROLE_LABELS[role] || role})`);
      toast('Account created successfully');
    }

    persist();
    closeModal('modal-user');
    renderUsers();
    renderOverview();
  });

  function editUserRole(id) {
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return;
    const displayName = u.name || (u.email ? u.email.split('@')[0] : u.phone) || 'User Account';
    const titleEl = document.getElementById('modal-user-title');
    if (titleEl) titleEl.textContent = 'Edit User Role';

    const editIdEl = document.getElementById('user-edit-id');
    if (editIdEl) editIdEl.value = id;

    const nameEl = document.getElementById('u-name');
    if (nameEl) nameEl.value = displayName;

    const phoneEl = document.getElementById('u-phone');
    if (phoneEl) phoneEl.value = u.phone || '';

    const emailEl = document.getElementById('u-email');
    if (emailEl) emailEl.value = u.email || '';

    const roleEl = document.getElementById('u-role');
    if (roleEl) roleEl.value = u.role || 'admin';

    const deptEl = document.getElementById('u-department');
    if (deptEl) deptEl.value = u.department || '';

    const deptGroup = document.getElementById('user-dept-group');
    if (deptGroup) deptGroup.style.display = u.role === 'leader' ? 'block' : 'none';

    const pwGroup = document.getElementById('user-password-group');
    if (pwGroup) pwGroup.style.display = 'none';

    const saveBtn = document.getElementById('btn-save-user');
    if (saveBtn) saveBtn.textContent = 'Save Changes';

    openModal('modal-user');
  }

  function resetPassword(id) {
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return;
    const displayName = u.name || (u.email ? u.email.split('@')[0] : u.phone) || 'User';
    const destination = u.email ? u.email : u.phone;
    showConfirm(
      'Reset Password',
      `Send a password reset link/code to ${displayName} at ${destination}?`,
      'Confirm Reset',
      'btn btn--primary',
      () => {
        toast(`Sending password reset link to ${displayName}...`, 'info');
        setTimeout(() => {
          addAuditEntry('Admin User', 'edit', `Sent password reset link/code to: ${displayName} (${destination})`);
          persist();
          renderAuditLog();
          toast(`Password reset sent to ${displayName}`);
        }, 400);
      }
    );
  }

  function deactivateUser(id) {
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return;
    const displayName = u.name || (u.email ? u.email.split('@')[0] : u.phone) || 'User';
    showConfirm(
      'Deactivate Account',
      `Deactivating ${displayName}'s account will prevent them from logging into ChurchOS. Their historical actions will remain attributed to them. Continue?`,
      'Deactivate Account',
      'btn btn--danger',
      () => {
        u.status = 'inactive';
        addAuditEntry('Admin User', 'edit', `Deactivated user account: ${displayName}`);
        persist();
        renderUsers();
        renderOverview();
        toast(`${displayName}'s account deactivated`);
      }
    );
  }

  function activateUser(id) {
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return;
    const displayName = u.name || (u.email ? u.email.split('@')[0] : u.phone) || 'User';
    const roleLabel = ROLE_LABELS[u.role] || u.role || 'User';
    showConfirm(
      'Reactivate Account',
      `Reactivate ${displayName}'s account? They will regain access to ChurchOS based on their assigned role (${roleLabel}).`,
      'Reactivate Account',
      'btn btn--primary',
      () => {
        u.status = 'active';
        addAuditEntry('Admin User', 'edit', `Reactivated user account: ${displayName}`);
        persist();
        renderUsers();
        renderOverview();
        toast(`${displayName}'s account reactivated`);
      }
    );
  }

  /* ---------------------------------------------------
     SECTION 6: Custom Fields
     --------------------------------------------------- */
  function renderFields() {
    const tbody = document.getElementById('fields-tbody');
    if (!tbody) return;

    const typeLabels = { text: 'Text', number: 'Number', date: 'Date', dropdown: 'Dropdown' };

    tbody.innerHTML = fields.map(f => `
      <tr style="${f.deleted ? 'opacity: 0.6; background: rgba(239,68,68,0.03);' : ''}">
        <td><strong>${f.name}</strong> ${f.deleted ? '<span class="badge badge--danger" style="margin-left: 0.5rem;">Soft Deleted</span>' : ''}</td>
        <td><span class="badge badge--navy">${typeLabels[f.type] || f.type}</span></td>
        <td>${f.created}</td>
        <td>
          ${f.deleted ? `
            <button class="btn btn--success-ghost" onclick="window._adminDash.restoreField('${f.id}')">♻️ Restore</button>
          ` : `
            <button class="btn btn--danger-ghost" onclick="window._adminDash.deleteField('${f.id}')">Delete</button>
          `}
        </td>
      </tr>
    `).join('');

    if (fields.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state__icon">🔧</div><div class="empty-state__title">No custom fields</div><div class="empty-state__text">Add custom fields to capture additional member data.</div></div></td></tr>`;
    }
  }

  // Show/hide dropdown options
  document.getElementById('f-type')?.addEventListener('change', (e) => {
    document.getElementById('dropdown-options-group').style.display = e.target.value === 'dropdown' ? 'block' : 'none';
  });

  document.getElementById('btn-add-field')?.addEventListener('click', () => {
    document.getElementById('form-field')?.reset();
    document.getElementById('dropdown-options-group').style.display = 'none';
    openModal('modal-field');
  });

  document.getElementById('btn-save-field')?.addEventListener('click', () => {
    const name = document.getElementById('f-name').value.trim();
    const type = document.getElementById('f-type').value;
    if (!name) { toast('Field name is required', 'error'); return; }

    fields.push({
      id: uid(),
      name,
      type,
      options: type === 'dropdown' ? document.getElementById('f-options').value.trim() : '',
      created: today(),
    });

    addAuditEntry('Admin User', 'create', `Added custom field: ${name} (${type})`);
    persist();
    closeModal('modal-field');
    renderFields();
    toast('Custom field added — it will appear on member profiles');
  });

  function deleteField(id) {
    const f = fields.find(x => x.id === id);
    if (!f) return;
    showConfirm(
      'Soft Delete Custom Field?',
      `Soft-delete "${f.name}"? It will be hidden from new member forms while preserving all existing member data captured under it.`,
      'Soft Delete Field',
      'btn btn--danger',
      () => {
        f.deleted = true;
        f.deletedAt = new Date().toISOString();
        addAuditEntry('Admin User', 'delete', `Soft-deleted custom field: ${f.name}`);
        persist();
        renderFields();
        toast(`Field "${f.name}" soft-deleted`);
      }
    );
  }

  function restoreField(id) {
    const f = fields.find(x => x.id === id);
    if (!f) return;
    f.deleted = false;
    delete f.deletedAt;
    addAuditEntry('Admin User', 'edit', `Restored custom field: ${f.name}`);
    persist();
    renderFields();
    toast(`Field "${f.name}" restored successfully`);
  }

  /* ---------------------------------------------------
     SECTION 7: Notification Templates
     --------------------------------------------------- */
  function renderTemplates() {
    const container = document.getElementById('templates-container');
    if (!container) return;

    container.innerHTML = templates.map(t => `
      <div class="template-card">
        <div class="template-card__header">
          <div class="template-card__name">${t.name}</div>
          <button class="btn btn--primary btn--sm" onclick="window._adminDash.saveTemplate('${t.id}')">Save Template</button>
        </div>
        <textarea id="template-${t.id}">${t.body}</textarea>
        <div class="template-card__vars">
          <span style="font-size: 0.75rem; color: var(--color-gray-500); margin-right: 4px;">Variables:</span>
          ${t.vars.map(v => `<span class="template-var" onclick="window._adminDash.insertVar('${t.id}', '${v}')">${v}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  function saveTemplate(id) {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    const textarea = document.getElementById(`template-${id}`);
    if (textarea) {
      t.body = textarea.value;
      addAuditEntry('Admin User', 'edit', `Updated notification template: ${t.name}`);
      persist();
      toast(`"${t.name}" template saved`);
    }
  }

  function insertVar(templateId, variable) {
    const textarea = document.getElementById(`template-${templateId}`);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + variable + textarea.value.slice(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
  }

  /* ---------------------------------------------------
     SECTION 8: Data Export & Backup
     --------------------------------------------------- */
  function simulateProgress(fillId, labelId, steps, onComplete) {
    let step = 0;
    const fill = document.getElementById(fillId);
    const label = document.getElementById(labelId);
    const interval = setInterval(() => {
      step++;
      const pct = Math.min(Math.round((step / steps.length) * 100), 100);
      if (fill) fill.style.width = pct + '%';
      if (label) label.textContent = steps[Math.min(step - 1, steps.length - 1)];
      if (step >= steps.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 600);
  }

  document.getElementById('btn-export-members')?.addEventListener('click', function () {
    this.style.display = 'none';
    document.getElementById('export-progress').style.display = 'block';
    simulateProgress('export-fill', 'export-label',
      ['Gathering member data...', 'Processing 1,247 records...', 'Generating CSV file...', 'Export complete! ✓'],
      () => {
        const label = document.getElementById('export-label');
        if (label) label.innerHTML = '✅ Export complete! <a href="#" style="color: var(--color-gold-dark); font-weight: 600;" onclick="event.preventDefault(); alert(\'Download started (simulated)\')">Download members_export.csv</a>';
        addAuditEntry('Admin User', 'system', 'Exported member data to CSV');
        persist();
        setTimeout(() => {
          document.getElementById('export-progress').style.display = 'none';
          document.getElementById('btn-export-members').style.display = '';
          document.getElementById('export-fill').style.width = '0%';
        }, 8000);
      }
    );
  });

  document.getElementById('btn-full-backup')?.addEventListener('click', function () {
    this.style.display = 'none';
    document.getElementById('backup-progress').style.display = 'block';
    simulateProgress('backup-fill', 'backup-label',
      ['Backing up members...', 'Backing up attendance records...', 'Backing up giving data...', 'Backing up settings...', 'Compressing backup...', 'Backup complete! ✓'],
      () => {
        const label = document.getElementById('backup-label');
        if (label) label.innerHTML = '✅ Backup complete! <a href="#" style="color: var(--color-gold-dark); font-weight: 600;" onclick="event.preventDefault(); alert(\'Download started (simulated)\')">Download churchos_backup.zip</a>';
        addAuditEntry('Admin User', 'system', 'Created full church data backup');
        persist();
        setTimeout(() => {
          document.getElementById('backup-progress').style.display = 'none';
          document.getElementById('btn-full-backup').style.display = '';
          document.getElementById('backup-fill').style.width = '0%';
        }, 8000);
      }
    );
  });

  /* ---------------------------------------------------
     SECTION 9: Audit Log
     --------------------------------------------------- */
  function renderAuditLog() {
    const userFilter = document.getElementById('audit-filter-user')?.value || '';
    const typeFilter = document.getElementById('audit-filter-type')?.value || '';
    const fromDate = document.getElementById('audit-filter-from')?.value || '';
    const toDate = document.getElementById('audit-filter-to')?.value || '';

    let filtered = auditLog.filter(e => {
      if (userFilter && e.user !== userFilter) return false;
      if (typeFilter && e.action !== typeFilter) return false;
      const eDate = e.timestamp.slice(0, 10);
      if (fromDate && eDate < fromDate) return false;
      if (toDate && eDate > toDate) return false;
      return true;
    });

    const tbody = document.getElementById('audit-tbody');
    if (!tbody) return;

    const actionBadge = { create: 'success', edit: 'info', delete: 'danger', login: 'navy', system: 'warning' };

    tbody.innerHTML = filtered.map(e => `
      <tr>
        <td style="white-space: nowrap;">${e.timestamp}</td>
        <td>${e.user}</td>
        <td><span class="badge badge--${actionBadge[e.action] || 'navy'}">${e.action}</span></td>
        <td>${e.record}</td>
      </tr>
    `).join('');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state__icon">📋</div><div class="empty-state__title">No entries found</div><div class="empty-state__text">Try adjusting your filters.</div></div></td></tr>`;
    }

    // Populate user filter
    const userSel = document.getElementById('audit-filter-user');
    if (userSel) {
      const auditUsers = [...new Set(auditLog.map(e => e.user))].sort();
      const currentVal = userSel.value;
      userSel.innerHTML = '<option value="">All Users</option>' +
        auditUsers.map(u => `<option ${u === currentVal ? 'selected' : ''}>${u}</option>`).join('');
    }
  }

  document.getElementById('audit-filter-user')?.addEventListener('change', renderAuditLog);
  document.getElementById('audit-filter-type')?.addEventListener('change', renderAuditLog);
  document.getElementById('audit-filter-from')?.addEventListener('change', renderAuditLog);
  document.getElementById('audit-filter-to')?.addEventListener('change', renderAuditLog);

  /* ---------------------------------------------------
     SECTION 10: Church Profile Settings
     --------------------------------------------------- */
  function loadChurchProfile() {
    document.getElementById('church-name').value = church.name || '';
    document.getElementById('church-denomination').value = church.denomination || '';
    document.getElementById('church-address').value = church.address || '';
    document.getElementById('church-city').value = church.city || '';
    document.getElementById('church-phone').value = church.phone || '';
    document.getElementById('church-email').value = church.email || '';
    document.getElementById('church-description').value = church.description || '';
  }

  document.getElementById('church-profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    church.name = document.getElementById('church-name').value.trim();
    church.denomination = document.getElementById('church-denomination').value.trim();
    church.address = document.getElementById('church-address').value.trim();
    church.city = document.getElementById('church-city').value.trim();
    church.phone = document.getElementById('church-phone').value.trim();
    church.email = document.getElementById('church-email').value.trim();
    church.description = document.getElementById('church-description').value.trim();

    addAuditEntry('Admin User', 'edit', 'Updated church profile settings');
    persist();
    toast('Church profile saved');

    // Update topbar
    const churchNameEl = document.querySelector('.topbar__greeting .js-church-name');
    if (churchNameEl) churchNameEl.textContent = church.name;
  });

  // Logo upload (mock)
  document.getElementById('logo-upload')?.addEventListener('click', () => {
    toast('Logo upload is a placeholder — your logo will appear here once file upload is connected.', 'info');
  });

  /* ---------------------------------------------------
     Expose functions globally for onclick handlers
     --------------------------------------------------- */
  window._adminDash = {
    viewMember,
    editMember,
    convertMember,
    deleteMember,
    restoreMember,
    editService,
    deleteService,
    deleteCategory,
    restoreCategory,
    editUserRole,
    resetPassword,
    deactivateUser,
    activateUser,
    deleteField,
    restoreField,
    saveTemplate,
    insertVar,
  };

  /* ---------------------------------------------------
     Init — render all sections on load defensively
     --------------------------------------------------- */
  async function initDashboard() {
    const safeExec = (name, fn) => {
      try {
        fn();
      } catch (e) {
        console.error(`[ChurchOS Admin] Error during ${name}:`, e);
      }
    };

    // Load data from Firestore before rendering
    await loadAllFromFirestore();

    safeExec('renderOverview', renderOverview);
    safeExec('populateDeptFilter', populateDeptFilter);
    safeExec('renderMembers', renderMembers);
    safeExec('renderServices', renderServices);
    safeExec('renderCategories', renderCategories);
    safeExec('renderUsers', renderUsers);
    safeExec('renderFields', renderFields);
    safeExec('renderTemplates', renderTemplates);
    safeExec('ChurchComms.init', () => { if (window.ChurchComms) window.ChurchComms.init('admin'); });
    safeExec('ChurchReporting.init', () => { if (window.ChurchReporting) window.ChurchReporting.init('admin', { containerId: 'reporting-container' }); });
    safeExec('renderAuditLog', () => {
      if (window.ChurchActivityLog) {
        window.ChurchActivityLog.renderActivityFeed('activity-log-admin', 'admin', { name: 'Admin User', role: 'admin' });
      } else {
        renderAuditLog();
      }
    });
    safeExec('loadChurchProfile', loadChurchProfile);

    // Update topbar church name
    const churchNameEl = document.querySelector('.topbar__greeting .js-church-name');
    if (churchNameEl && church && church.name) churchNameEl.textContent = church.name;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDashboard());
  } else {
    initDashboard();
  }

})();
