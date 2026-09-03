/* ===================================================
   ChurchOS — Shared Notifications Module (Receiving Side)
   Bell icon dropdown + Full Center + Member Preferences
   Reused across Admin, Pastor, Leader, Finance, Member

   TODO: Migrate notification feeds from localStorage to Firestore.
         Currently uses localStorage for per-device ephemeral storage,
         which works fine for launch but won't sync across devices.
         Priority: Low (notifications are supplementary UX, not core data).
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Category Definitions & Config
     --------------------------------------------------- */
  const CATEGORIES = {
    announcement: { label: 'Announcement', icon: '<i data-lucide="megaphone"></i>', color: '#D97706', bg: '#FEF3C7' },
    followup:     { label: 'Follow-up', icon: '<i data-lucide="pin"></i>', color: '#2563EB', bg: '#DBEAFE' },
    pastoral:     { label: 'Pastoral', icon: '<i data-lucide="hand-heart"></i>', color: '#7C3AED', bg: '#F3E8FF' },
    financial:    { label: 'Financial', icon: '<i data-lucide="wallet"></i>', color: '#059669', bg: '#D1FAE5' },
    system:       { label: 'System', icon: '<i data-lucide="shield"></i>', color: '#475569', bg: '#F1F5F9' },
    reminder:     { label: 'Reminder', icon: '<i data-lucide="clock"></i>', color: '#0D9488', bg: '#CCFBF1' },
  };

  /* ---------------------------------------------------
     Firestore References
     --------------------------------------------------- */
  const COLLECTION_NAME = 'notifications';
  const { dbAdd, dbGetAll, dbUpdate, dbListen } = window.ChurchOS;
  const SEED_FEEDS = {
    admin: [
      {
        id: 'notif_adm_1',
        category: 'system',
        title: 'New Staff Account Created',
        message: 'Pastor Emmanuel Appiah registered and was assigned to Senior Pastor role.',
        time: '15m ago',
        timestamp: Date.now() - 15 * 60 * 1000,
        read: false,
        targetSection: 'members'
      },
      {
        id: 'notif_adm_2',
        category: 'system',
        title: 'Data Export Ready',
        message: 'Quarterly Financial & Attendance CSV backup package is ready for download.',
        time: '1h ago',
        timestamp: Date.now() - 60 * 60 * 1000,
        read: false,
        targetSection: 'audit'
      },
      {
        id: 'notif_adm_3',
        category: 'system',
        title: 'Low SMS Credit Alert',
        message: 'Church SMS credit balance is low (42 credits remaining). Click to top up.',
        time: '3h ago',
        timestamp: Date.now() - 3 * 60 * 60 * 1000,
        read: false,
        targetSection: 'settings'
      },
      {
        id: 'notif_adm_4',
        category: 'system',
        title: 'Security Audit Flag',
        message: 'Notice: 3 failed login attempts detected from IP 192.168.1.45.',
        time: 'Yesterday',
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        read: true,
        targetSection: 'audit'
      }
    ],
    pastor: [
      {
        id: 'notif_pas_1',
        category: 'pastoral',
        title: 'New Prayer Request',
        message: 'Sister Grace K. submitted a prayer request: "Prayer for family healing and peace."',
        time: '30m ago',
        timestamp: Date.now() - 30 * 60 * 1000,
        read: false,
        targetSection: 'pastoral'
      },
      {
        id: 'notif_pas_2',
        category: 'followup',
        title: 'Member Flagged for Follow-up',
        message: 'Brother Michael Osei missed 3 consecutive Sunday services.',
        time: '2h ago',
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        read: false,
        targetSection: 'pastoral'
      },
      {
        id: 'notif_pas_3',
        category: 'pastoral',
        title: 'Monthly Vitality Summary Ready',
        message: 'June Congregation Vitality & Attendance Summary report has been generated.',
        time: 'Yesterday',
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        read: false,
        targetSection: 'overview'
      },
      {
        id: 'notif_pas_4',
        category: 'announcement',
        title: 'Announcement Delivery Summary',
        message: 'Your "Joint Night of Worship" announcement reached 214 members via App & SMS.',
        time: '2 days ago',
        timestamp: Date.now() - 48 * 60 * 60 * 1000,
        read: true,
        targetSection: 'communications'
      }
    ],
    leader: [
      {
        id: 'notif_ldr_1',
        category: 'followup',
        title: 'New Visitor in Youth Ministry',
        message: 'First-time visitor Yaw Mensah registered and joined Youth Ministry.',
        time: '25m ago',
        timestamp: Date.now() - 25 * 60 * 1000,
        read: false,
        targetSection: 'roster'
      },
      {
        id: 'notif_ldr_2',
        category: 'followup',
        title: 'Follow-up Task Assigned',
        message: 'Task: Contact Daniel Kwakye regarding baptism class onboarding schedule.',
        time: '1h ago',
        timestamp: Date.now() - 60 * 60 * 1000,
        read: false,
        targetSection: 'followups'
      },
      {
        id: 'notif_ldr_3',
        category: 'reminder',
        title: 'Attendance Recording Reminder',
        message: 'Reminder: Record attendance for today\'s Youth Bible Study session.',
        time: '3h ago',
        timestamp: Date.now() - 3 * 60 * 60 * 1000,
        read: false,
        targetSection: 'attendance'
      },
      {
        id: 'notif_ldr_4',
        category: 'system',
        title: 'Accountability Report Confirmation',
        message: 'Weekly ministry accountability report auto-sent to Senior Pastor.',
        time: '3 days ago',
        timestamp: Date.now() - 72 * 60 * 60 * 1000,
        read: true,
        targetSection: 'overview'
      }
    ],
    finance: [
      {
        id: 'notif_fin_1',
        category: 'financial',
        title: 'Member Transaction Dispute',
        message: 'Member flagged GHS 250 tithe entry #TRX-8902 for review.',
        time: '45m ago',
        timestamp: Date.now() - 45 * 60 * 1000,
        read: false,
        targetSection: 'transactions'
      },
      {
        id: 'notif_fin_2',
        category: 'reminder',
        title: 'Service Collection Reconciliation',
        message: 'Reconciliation due for 2nd Service offering collection & cash count.',
        time: '2h ago',
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        read: false,
        targetSection: 'transactions'
      },
      {
        id: 'notif_fin_3',
        category: 'financial',
        title: 'Monthly Giving Report Ready',
        message: 'July Tithes, Offerings & Building Pledges summary report generated.',
        time: 'Yesterday',
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        read: true,
        targetSection: 'reports'
      }
    ],
    member: [
      {
        id: 'notif_mem_welcome',
        category: 'announcement',
        title: 'Welcome to Grace Assembly! 🎉',
        message: 'Welcome to Grace Assembly International! We\'re glad you\'re here. Tap to view your member profile.',
        time: 'Just now',
        timestamp: Date.now(),
        read: false,
        targetSection: 'profile'
      },
      {
        id: 'notif_mem_1',
        category: 'announcement',
        title: 'Church-Wide Announcement',
        message: 'Join us for a Joint Night of Worship & Breakthrough this Friday at 6:30 PM.',
        time: '1h ago',
        timestamp: Date.now() - 60 * 60 * 1000,
        read: false,
        targetSection: 'announcements'
      },
      {
        id: 'notif_mem_2',
        category: 'pastoral',
        title: 'Birthday Greeting 🎂',
        message: 'Happy Birthday! Grace Assembly International wishes you God\'s richest blessings today.',
        time: 'Yesterday',
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        read: false,
        targetSection: 'profile'
      },
      {
        id: 'notif_mem_3',
        category: 'pastoral',
        title: 'Prayer Request Answered',
        message: 'Praise God! Your prayer request "Healing for Mom" was marked as answered.',
        time: '2 days ago',
        timestamp: Date.now() - 48 * 60 * 60 * 1000,
        read: true,
        targetSection: 'prayers'
      },
      {
        id: 'notif_mem_4',
        category: 'reminder',
        title: 'Upcoming Service Reminder',
        message: 'Sunday First Service begins tomorrow at 7:00 AM. Sanctuary doors open at 6:30 AM.',
        time: '3 days ago',
        timestamp: Date.now() - 72 * 60 * 60 * 1000,
        read: true,
        targetSection: 'giving'
      }
    ]
  };

  /* Default Member Preferences (PRD 10.3) */
  const DEFAULT_MEMBER_PREFS = {
    announcements: true,
    eventReminders: true,
    birthdayGreetings: true,
    prayerUpdates: true
  };

  /* ---------------------------------------------------
     State Variables
     --------------------------------------------------- */
  let currentRole = 'admin';
  let notifications = [];
  let currentFilter = 'all';
  let isPanelOpen = false;
  let notifEl = null;
  let badgeEl = null;
  let dropdownEl = null;
  let backdropEl = null;

  /* ---------------------------------------------------
     Helper Functions
     --------------------------------------------------- */
  function getStorageKey(role) {
    return `cp_notifications_v2_${role}`;
  }

  function getPrefsKey() {
    return `cp_notif_prefs_member`;
  }

  function detectRole() {
    // 1. Try logged in user from localStorage
    try {
      const stored = localStorage.getItem('churchos_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.role && SEED_FEEDS[u.role]) return u.role;
      }
    } catch (e) {}

    // 2. Infer from HTML filename
    const path = window.location.pathname.toLowerCase();
    if (path.includes('dashboard-admin')) return 'admin';
    if (path.includes('dashboard-pastor')) return 'pastor';
    if (path.includes('dashboard-leader')) return 'leader';
    if (path.includes('dashboard-finance')) return 'finance';
    if (path.includes('dashboard-member')) return 'member';

    return 'admin';
  }

  function loadNotifications() {
    const key = getStorageKey(currentRole);
    try {
      const data = localStorage.getItem(key);
      if (data) {
        notifications = JSON.parse(data);
      } else {
        notifications = Array.from(SEED_FEEDS[currentRole] || []);
        saveNotifications();
      }
    } catch (e) {
      notifications = Array.from(SEED_FEEDS[currentRole] || []);
    }

    // Ensure member role has welcome notification per PRD 10.5
    if (currentRole === 'member') {
      const hasWelcome = notifications.some(n => n.id === 'notif_mem_welcome');
      if (!hasWelcome) {
        notifications.unshift(SEED_FEEDS.member[0]);
        saveNotifications();
      }
    }
  }

  function saveNotifications() {
    try {
      localStorage.setItem(getStorageKey(currentRole), JSON.stringify(notifications));
    } catch (e) {}
  }

  function loadMemberPrefs() {
    try {
      const data = localStorage.getItem(getPrefsKey());
      return data ? { ...DEFAULT_MEMBER_PREFS, ...JSON.parse(data) } : { ...DEFAULT_MEMBER_PREFS };
    } catch (e) {
      return { ...DEFAULT_MEMBER_PREFS };
    }
  }

  function saveMemberPrefs(prefs) {
    try {
      localStorage.setItem(getPrefsKey(), JSON.stringify(prefs));
    } catch (e) {}
  }

  function getUnreadCount() {
    return notifications.filter(n => !n.read && !n.deleted).length;
  }

  function updateBadge() {
    if (!badgeEl) return;
    const count = getUnreadCount();
    badgeEl.textContent = count > 99 ? '99+' : count;
    badgeEl.setAttribute('data-count', count.toString());

    if (count > 0) {
      badgeEl.classList.add('pulse');
      setTimeout(() => badgeEl.classList.remove('pulse'), 400);
    }

    // Update title group count pill in dropdown if exists
    const pill = dropdownEl?.querySelector('.notif-dropdown__count-pill');
    if (pill) {
      pill.textContent = `${count} unread`;
      pill.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  function toast(message, type = 'success') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = `toast-notification toast--${type}`;
    el.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--color-navy, #0F172A);
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
      z-index: 3000;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: notif-toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    el.innerHTML = `<span>${type === 'error' ? '⚠️' : '✓'}</span> ${message}`;
    document.body.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s ease';
      setTimeout(() => el.remove(), 250);
    }, 3000);
  }

  /* ---------------------------------------------------
     Render Dropdown Component
     --------------------------------------------------- */
  function buildDropdown() {
    if (dropdownEl) return;

    dropdownEl = document.createElement('div');
    dropdownEl.className = 'notif-dropdown';
    dropdownEl.setAttribute('role', 'dialog');
    dropdownEl.setAttribute('aria-label', 'Notifications Dropdown');

    const count = getUnreadCount();

    backdropEl = document.createElement('div');
    backdropEl.className = 'notif-backdrop';

    document.body.appendChild(backdropEl);

    // Structure
    dropdownEl.innerHTML = `
      <div class="notif-dropdown__header">
        <div class="notif-dropdown__title-group">
          <h3 class="notif-dropdown__title">Notifications</h3>
          <span class="notif-dropdown__count-pill" style="${count > 0 ? '' : 'display:none;'}">${count} unread</span>
        </div>
        <div class="notif-dropdown__actions">
          <button type="button" class="notif-btn-text js-mark-all-read" title="Mark all as read">Mark all read</button>
          <button type="button" class="notif-btn-icon js-close-panel" title="Close">✕</button>
        </div>
      </div>
      <div class="notif-dropdown__filters">
        <button type="button" class="notif-filter-chip active" data-filter="all">All</button>
        <button type="button" class="notif-filter-chip" data-filter="unread">Unread</button>
        <button type="button" class="notif-filter-chip" data-filter="announcement"><i data-lucide="megaphone" style="width:14px;height:14px;"></i> Announcements</button>
        <button type="button" class="notif-filter-chip" data-filter="followup">📌 Tasks</button>
        <button type="button" class="notif-filter-chip" data-filter="pastoral"><i data-lucide="hand-heart" style="width:14px;height:14px;"></i> Pastoral</button>
        <button type="button" class="notif-filter-chip" data-filter="financial">💼 Finance</button>
      </div>
      <div class="notif-dropdown__body" id="notif-list-container">
        <!-- Rendered via JS -->
      </div>
      <div class="notif-dropdown__footer">
        <button type="button" class="notif-footer-link js-view-all">View Notification Center →</button>
      </div>
    `;

    notifEl.appendChild(dropdownEl);

    // Attach listeners
    dropdownEl.querySelector('.js-close-panel').addEventListener('click', closePanel);
    dropdownEl.querySelector('.js-mark-all-read').addEventListener('click', markAllAsRead);
    dropdownEl.querySelector('.js-view-all').addEventListener('click', () => {
      closePanel();
      openNotificationCenterModal();
    });

    // Filter chip handlers
    dropdownEl.querySelectorAll('.notif-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownEl.querySelectorAll('.notif-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        renderListItems();
      });
    });

    backdropEl.addEventListener('click', closePanel);
  }

  function renderSkeleton() {
    const listContainer = dropdownEl?.querySelector('#notif-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = Array(3).fill(0).map(() => `
      <div class="notif-skeleton-item">
        <div class="notif-skeleton-icon"></div>
        <div class="notif-skeleton-content">
          <div class="notif-skeleton-line"></div>
          <div class="notif-skeleton-line notif-skeleton-line--short"></div>
        </div>
      </div>
    `).join('');
  }

  function renderListItems() {
    const listContainer = dropdownEl?.querySelector('#notif-list-container');
    if (!listContainer) return;

    let filtered = notifications.filter(n => !n.deleted);
    if (currentFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(n => n.category === currentFilter);
    }

    if (!filtered.length) {
      listContainer.innerHTML = `
        <div class="notif-empty">
          <div class="notif-empty__icon"><i data-lucide="sparkles"></i></div>
          <h4 class="notif-empty__title">You're all caught up!</h4>
          <p class="notif-empty__desc">${currentFilter === 'unread' ? 'No unread notifications at the moment.' : 'No notifications in this category.'}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(n => {
      const cat = CATEGORIES[n.category] || CATEGORIES.system;
      return `
        <div class="notif-item ${!n.read ? 'notif-item--unread' : ''}" data-id="${n.id}">
          <div class="notif-item__icon-badge" style="background: ${cat.bg}; color: ${cat.color};">
            ${cat.icon}
          </div>
          <div class="notif-item__body">
            <div class="notif-item__header-row">
              <h4 class="notif-item__title">${escapeHtml(n.title)}</h4>
              <span class="notif-item__time">${escapeHtml(n.time)}</span>
            </div>
            <p class="notif-item__message">${escapeHtml(n.message)}</p>
            <div class="notif-item__footer-row">
              <span class="notif-item__category-tag" style="background: ${cat.bg}; color: ${cat.color};">
                ${cat.label}
              </span>
              ${n.targetSection ? '<span class="notif-item__action-hint">View →</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach row click listeners
    listContainer.querySelectorAll('.notif-item').forEach(itemEl => {
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = itemEl.dataset.id;
        handleItemClick(id);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function handleItemClick(id) {
    const item = notifications.find(n => n.id === id);
    if (!item) return;

    if (!item.read) {
      item.read = true;
      saveNotifications();
      updateBadge();
      renderListItems();
    }

    // Navigate to target section if present
    if (item.targetSection) {
      closePanel();
      navigateToSection(item.targetSection);
    }
  }

  function navigateToSection(sectionId) {
    // 1. Try finding nav link or tab button
    const navBtn = document.querySelector(`[data-section="${sectionId}"], [data-tab="${sectionId}"], a[href="#${sectionId}"]`);
    if (navBtn) {
      navBtn.click();
      return;
    }

    // 2. Try element ID directly
    const targetEl = document.getElementById(sectionId) || document.querySelector(`.${sectionId}-section`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetEl.classList.add('highlight-pulse');
      setTimeout(() => targetEl.classList.remove('highlight-pulse'), 1500);
      return;
    }

    toast(`Opening ${sectionId} view…`, 'info');
  }

  function togglePanel() {
    if (isPanelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    buildDropdown();
    isPanelOpen = true;
    dropdownEl.classList.add('active');
    backdropEl.classList.add('active');

    // Shimmer effect on first load
    renderSkeleton();
    setTimeout(() => {
      renderListItems();
    }, 220);
  }

  function closePanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;
    dropdownEl?.classList.remove('active');
    backdropEl?.classList.remove('active');
  }

  function markAllAsRead() {
    let count = 0;
    notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });

    if (count > 0) {
      saveNotifications();
      updateBadge();
      renderListItems();
      toast(`Marked ${count} notification${count > 1 ? 's' : ''} as read`);
    } else {
      toast('All notifications are already marked as read', 'info');
    }
  }

  /* ---------------------------------------------------
     Full Notification Center Modal
     --------------------------------------------------- */
  function openNotificationCenterModal() {
    const existing = document.getElementById('notif-modal-center');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'notif-modal-center';
    overlay.className = 'notif-modal-overlay';

    overlay.innerHTML = `
      <div class="notif-modal-card">
        <div class="notif-modal__header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">🔔</span>
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--color-navy, #0F172A);">Notification Center</h3>
          </div>
          <button type="button" class="notif-btn-text js-modal-close" style="font-size: 16px;">✕</button>
        </div>
        <div class="notif-modal__toolbar">
          <input type="text" id="notif-search" class="notif-search-input" placeholder="🔍 Search notifications...">
          <button type="button" class="notif-btn-text js-modal-mark-all">Mark all read</button>
          <button type="button" class="notif-btn-text js-modal-clear" style="color: var(--color-danger, #EF4444);">Clear read</button>
        </div>
        <div class="notif-dropdown__filters" style="padding: 10px 24px;">
          <button type="button" class="notif-filter-chip active" data-modal-cat="all">All</button>
          <button type="button" class="notif-filter-chip" data-modal-cat="unread">Unread</button>
          <button type="button" class="notif-filter-chip" data-modal-cat="announcement">📢 Announcements</button>
          <button type="button" class="notif-filter-chip" data-modal-cat="followup">📌 Tasks</button>
          <button type="button" class="notif-filter-chip" data-modal-cat="pastoral">🙏 Pastoral</button>
          <button type="button" class="notif-filter-chip" data-modal-cat="financial">💼 Financial</button>
          <button type="button" class="notif-filter-chip" data-modal-cat="system">🛡 System</button>
          <button type="button" class="notif-filter-chip" data-modal-cat="deleted"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> Cleared</button>
        </div>
        <div class="notif-modal__body" id="notif-modal-list">
          <!-- Render items -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('active'), 10);

    let modalCategory = 'all';
    let modalQuery = '';

    function renderModalItems() {
      const listEl = overlay.querySelector('#notif-modal-list');
      if (!listEl) return;

      let list = Array.from(notifications);

      if (modalCategory === 'deleted') {
        list = list.filter(n => n.deleted);
      } else {
        list = list.filter(n => !n.deleted);
        if (modalCategory === 'unread') {
          list = list.filter(n => !n.read);
        } else if (modalCategory !== 'all') {
          list = list.filter(n => n.category === modalCategory);
        }
      }

      if (modalQuery) {
        const q = modalQuery.toLowerCase();
        list = list.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
      }

      if (!list.length) {
        listEl.innerHTML = `
          <div class="notif-empty" style="padding: 60px 20px;">
            <div class="notif-empty__icon"><i data-lucide="inbox"></i></div>
            <h4 class="notif-empty__title">${modalCategory === 'deleted' ? 'No cleared notifications' : 'No matching notifications'}</h4>
            <p class="notif-empty__desc">${modalCategory === 'deleted' ? 'Soft-deleted / cleared notifications will appear here.' : 'Try adjusting your category filter or search terms.'}</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = list.map(n => {
        const cat = CATEGORIES[n.category] || CATEGORIES.system;
        return `
          <div class="notif-item ${!n.read ? 'notif-item--unread' : ''}" data-modal-id="${n.id}" style="padding: 16px 24px; ${n.deleted ? 'opacity: 0.65; background: rgba(239,68,68,0.03);' : ''}">
            <div class="notif-item__icon-badge" style="background: ${cat.bg}; color: ${cat.color};">
              ${cat.icon}
            </div>
            <div class="notif-item__body">
              <div class="notif-item__header-row">
                <h4 class="notif-item__title">${escapeHtml(n.title)} ${n.deleted ? '<span class="badge badge--danger" style="margin-left: 6px;">Cleared</span>' : ''}</h4>
                <span class="notif-item__time">${escapeHtml(n.time)}</span>
              </div>
              <p class="notif-item__message" style="-webkit-line-clamp: 3;">${escapeHtml(n.message)}</p>
              <div class="notif-item__footer-row">
                <span class="notif-item__category-tag" style="background: ${cat.bg}; color: ${cat.color};">
                  ${cat.label}
                </span>
                ${n.deleted ? `
                  <button type="button" class="btn btn--success-ghost btn--xs js-restore-notif" data-id="${n.id}"><i data-lucide="rotate-ccw" style="width:12px;height:12px;"></i> Restore</button>
                ` : n.targetSection ? '<span class="notif-item__action-hint">Open Section →</span>' : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.js-restore-notif').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          restoreNotification(id);
          renderModalItems();
        });
      });

      listEl.querySelectorAll('[data-modal-id]').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.js-restore-notif')) return;
          const id = el.dataset.modalId;
          handleItemClick(id);
          overlay.classList.remove('active');
          setTimeout(() => overlay.remove(), 200);
        });
      });
    }

    function restoreNotification(id) {
      const n = notifications.find(x => x.id === id);
      if (n) {
        n.deleted = false;
        delete n.deletedAt;
        saveNotifications();
        updateBadge();
        if (window.SoftDeleteUtils) window.SoftDeleteUtils.addGlobalAuditLog(currentRole, 'edit', `Restored cleared notification: ${n.title}`);
        toast('Notification restored ✓');
      }
    }

    renderModalItems();

    // Event listeners
    overlay.querySelector('.js-modal-close')?.addEventListener('click', () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
      }
    });

    overlay.querySelector('#notif-search')?.addEventListener('input', (e) => {
      modalQuery = e.target.value.trim();
      renderModalItems();
    });

    overlay.querySelector('.js-modal-mark-all')?.addEventListener('click', () => {
      markAllAsRead();
      renderModalItems();
    });

    overlay.querySelector('.js-modal-clear')?.addEventListener('click', () => {
      let count = 0;
      notifications.forEach(n => {
        if (n.read && !n.deleted) {
          n.deleted = true;
          n.deletedAt = new Date().toISOString();
          count++;
        }
      });
      saveNotifications();
      updateBadge();
      renderModalItems();
      toast(`Cleared ${count} read notification${count > 1 ? 's' : ''} (soft-deleted, can be restored from Cleared filter)`);
    });

    overlay.querySelectorAll('[data-modal-cat]').forEach(chip => {
      chip.addEventListener('click', () => {
        overlay.querySelectorAll('[data-modal-cat]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        modalCategory = chip.dataset.modalCat;
        renderModalItems();
      });
    });
  }

  /* ---------------------------------------------------
     Member Notification Preferences Panel (PRD 10.3)
     --------------------------------------------------- */
  function initMemberPreferences() {
    if (currentRole !== 'member') return;

    const container = document.getElementById('member-notif-prefs') || document.querySelector('.js-member-notif-prefs');
    if (!container) return;

    const prefs = loadMemberPrefs();

    container.innerHTML = `
      <div class="notif-prefs-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--color-navy, #0F172A);">Notification Preferences</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--color-gray-500, #64748B);">Manage which updates you receive from Grace Assembly International.</p>
          </div>
          <span style="font-size: 20px;"><i data-lucide="settings"></i></span>
        </div>

        <form id="notif-prefs-form">
          <div class="notif-pref-item">
            <div>
              <p class="notif-pref-title">📢 Church Announcements</p>
              <p class="notif-pref-note">Delivered via in-app notification + SMS (if enabled by church)</p>
            </div>
            <label class="switch">
              <input type="checkbox" name="announcements" ${prefs.announcements ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="notif-pref-item">
            <div>
              <p class="notif-pref-title">📅 Service & Event Reminders</p>
              <p class="notif-pref-note">Delivered via in-app notification</p>
            </div>
            <label class="switch">
              <input type="checkbox" name="eventReminders" ${prefs.eventReminders ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="notif-pref-item">
            <div>
              <p class="notif-pref-title">🎂 Birthday & Anniversary Greetings</p>
              <p class="notif-pref-note">Delivered via in-app notification + SMS</p>
            </div>
            <label class="switch">
              <input type="checkbox" name="birthdayGreetings" ${prefs.birthdayGreetings ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="notif-pref-item">
            <div>
              <p class="notif-pref-title">🙏 Prayer Request Updates</p>
              <p class="notif-pref-note">Delivered via in-app notification</p>
            </div>
            <label class="switch">
              <input type="checkbox" name="prayerUpdates" ${prefs.prayerUpdates ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div style="margin-top: 16px; text-align: right;">
            <button type="submit" class="btn btn--primary btn--sm">
              💾 Save Preferences
            </button>
          </div>
        </form>
      </div>
    `;

    const form = container.querySelector('#notif-prefs-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        announcements: form.elements['announcements'].checked,
        eventReminders: form.elements['eventReminders'].checked,
        birthdayGreetings: form.elements['birthdayGreetings'].checked,
        prayerUpdates: form.elements['prayerUpdates'].checked,
      };
      saveMemberPrefs(updated);
      toast('Notification preferences saved successfully!');
    });
  }

  /* ---------------------------------------------------
     Cross-Module Push API
     --------------------------------------------------- */
  function pushNotification(targetRole, notifData) {
    const role = targetRole || currentRole;
    const targetKey = getStorageKey(role);

    let targetFeed = [];
    try {
      const data = localStorage.getItem(targetKey);
      targetFeed = data ? JSON.parse(data) : Array.from(SEED_FEEDS[role] || []);
    } catch (e) {
      targetFeed = Array.from(SEED_FEEDS[role] || []);
    }

    const newItem = {
      id: 'notif_push_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      category: notifData.category || 'announcement',
      title: notifData.title || 'Notification',
      message: notifData.message || '',
      time: notifData.time || 'Just now',
      timestamp: Date.now(),
      read: false,
      targetSection: notifData.targetSection || notifData.target || ''
    };

    targetFeed.unshift(newItem);

    try {
      localStorage.setItem(targetKey, JSON.stringify(targetFeed));
    } catch (e) {}

    // If pushed to current role, update live state
    if (role === currentRole) {
      notifications = targetFeed;
      updateBadge();
      if (isPanelOpen) {
        renderListItems();
      }
    }
  }

  /* ---------------------------------------------------
     Initialization
     --------------------------------------------------- */
  function init() {
    currentRole = detectRole();
    loadNotifications();

    notifEl = document.querySelector('.topbar__notification');
    if (notifEl) {
      // Ensure badge element exists
      badgeEl = notifEl.querySelector('.topbar__notification-badge');
      if (!badgeEl) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'topbar__notification-badge';
        notifEl.appendChild(badgeEl);
      }

      updateBadge();

      notifEl.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
    }

    // Document click to close panel if clicked outside
    document.addEventListener('click', (e) => {
      if (isPanelOpen && notifEl && !notifEl.contains(e.target) && !dropdownEl.contains(e.target)) {
        closePanel();
      }
    });

    // Initialize Member Preferences panel if on Member Dashboard
    initMemberPreferences();
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------------------------------------------------
     Export Public API
     --------------------------------------------------- */
  window.NotificationsModule = {
    pushNotification,
    getUnreadCount,
    markAllAsRead,
    openNotificationCenter: openNotificationCenterModal,
    initMemberPreferences
  };

})();
