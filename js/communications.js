/* ===================================================
   ChurchOS — Shared Communications Module
   Compose → Send → Deliver lifecycle simulation
   Reused across Admin, Pastor, Leader, Member dashboards
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Constants & Firestore
     --------------------------------------------------- */
  const COLLECTION_NAME = 'communications';
  const AUTO_MSG_KEY = 'cp_auto_messages';
  const { dbAdd, dbGetAll } = window.ChurchOS;

  const DEPARTMENTS = [
    'Ushering Department', 'Choir', 'Youth Ministry', 'Media & Tech',
    "Women's Ministry", "Men's Fellowship", 'Children Ministry',
    'Prayer Warriors', 'Evangelism Team'
  ];

  const FILTER_PRESETS = [
    { id: 'visitors', label: '🆕 First-time Visitors (Last 2 weeks)', count: 14 },
    { id: 'inactive', label: '⚠️ No Attendance Past Month', count: 47 },
    { id: 'birthdays', label: '🎂 Birthdays This Month', count: 23 },
  ];

  const SEED_MESSAGES = [
    {
      id: _uid(), title: 'Annual Harvest Thanksgiving Service',
      body: 'Join us on Sunday, August 3rd for our Annual Harvest Thanksgiving. Bring your offerings and come with a heart of gratitude! All services will be combined into one grand service at 9:00 AM.',
      link: '', audience: 'Entire Congregation', audienceType: 'all',
      channels: { push: true, sms: true }, scheduled: false, scheduledAt: '',
      sentAt: '2026-07-21 09:00', status: 'Sent', sentBy: 'Admin',
      delivery: { total: 1195, delivered: 1172, pending: 18, failed: 5, viaPush: 762, viaSms: 410 }
    },
    {
      id: _uid(), title: 'Youth Camp Registration Open',
      body: 'Registration for the 2026 Youth Summer Camp (August 15-19) is now open. Register at the youth desk or through the church app. GH₵ 150 covers meals, accommodation, and all activities.',
      link: 'https://graceassembly.org/youthcamp2026', audience: 'Youth Ministry', audienceType: 'department',
      channels: { push: true, sms: false }, scheduled: false, scheduledAt: '',
      sentAt: '2026-07-19 14:30', status: 'Sent', sentBy: 'Pastor',
      delivery: { total: 34, delivered: 32, pending: 2, failed: 0, viaPush: 28, viaSms: 4 }
    },
    {
      id: _uid(), title: 'Mid-Week Bible Study Resumes',
      body: 'Our mid-week Bible study resumes this Wednesday at 6:30 PM. Pastor Mensah will be teaching through the book of Romans. Bring your Bible and a friend!',
      link: '', audience: 'Entire Congregation', audienceType: 'all',
      channels: { push: true, sms: true }, scheduled: false, scheduledAt: '',
      sentAt: '2026-07-16 10:00', status: 'Sent', sentBy: 'Pastor',
      delivery: { total: 1195, delivered: 1140, pending: 30, failed: 25, viaPush: 720, viaSms: 420 }
    },
    {
      id: _uid(), title: 'Church Building Fund Update',
      body: 'We are pleased to announce that we have raised 78% of our building fund target! Thank you for your continued generosity. The new sanctuary construction is progressing well.',
      link: '', audience: 'Entire Congregation', audienceType: 'all',
      channels: { push: true, sms: true }, scheduled: false, scheduledAt: '',
      sentAt: '2026-07-10 08:00', status: 'Sent', sentBy: 'Admin',
      delivery: { total: 1195, delivered: 1188, pending: 4, failed: 3, viaPush: 750, viaSms: 438 }
    },
    {
      id: _uid(), title: 'Prayer & Fasting Week Reminder',
      body: 'The church will observe a week of prayer and fasting from July 28 - August 1. Daily prayer sessions at 5:30 AM and 6:00 PM. Let us seek God together for breakthrough and direction.',
      link: '', audience: 'Entire Congregation', audienceType: 'all',
      channels: { push: true, sms: true }, scheduled: true, scheduledAt: '2026-07-27T06:00',
      sentAt: '', status: 'Scheduled', sentBy: 'Pastor',
      delivery: { total: 0, delivered: 0, pending: 0, failed: 0, viaPush: 0, viaSms: 0 }
    },
  ];

  const SEED_AUTO_MESSAGES = [
    { id: 'auto_birthday', name: 'Birthday Greeting', desc: 'Automatically sends "Happy Birthday" to members on their birthday.', enabled: true, template: 'Happy birthday, {{first_name}}! 🎂 Grace Assembly International wishes you God\'s richest blessings today. Have a wonderful day!' },
    { id: 'auto_anniversary', name: 'Membership Anniversary', desc: 'Congratulates members on their membership anniversary date.', enabled: true, template: 'Congratulations {{first_name}}! Today marks your {{years}} year anniversary as a member of {{church_name}}. Thank you for being part of our family! 🎉' },
    { id: 'auto_welcome', name: 'Welcome Message', desc: 'Sent to new visitors after their first visit is recorded.', enabled: true, template: 'Welcome to {{church_name}}, {{first_name}}! We\'re so glad you visited us. We hope you felt at home and we look forward to seeing you again soon. 🙏' },
    { id: 'auto_absence', name: 'Absence Follow-Up', desc: 'Sent to members absent for 3+ consecutive weeks.', enabled: false, template: 'Hi {{first_name}}, we\'ve missed you at {{church_name}}! We hope everything is well. Please know that you are always welcome. If there\'s anything we can help with, don\'t hesitate to reach out. God bless you! ❤️' },
  ];

  /* ---------------------------------------------------
     Helpers
     --------------------------------------------------- */
  function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function _now() { return new Date().toISOString().replace('T', ' ').slice(0, 16); }
  function _today() { return new Date().toISOString().slice(0, 10); }
  // localStorage helpers removed — data now persists via Firestore (see db.js)

  function _toast(message, type) {
    const el = document.createElement('div');
    el.className = `toast toast--${type || 'success'}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function _formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function _formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  /* ---------------------------------------------------
     State
     --------------------------------------------------- */
  let messages = _load(STORAGE_KEY) || SEED_MESSAGES;
  let autoMessages = _load(AUTO_MSG_KEY) || SEED_AUTO_MESSAGES;
  let currentRole = 'member';
  let activeFilters = [];
  let readMessages = _load('cp_comm_read') || {};

  function persist() {
    _save(STORAGE_KEY, messages);
    _save(AUTO_MSG_KEY, autoMessages);
    _save('cp_comm_read', readMessages);
  }

  /* ---------------------------------------------------
     Audience Count Calculator (Mock)
     --------------------------------------------------- */
  function getEstimatedCount(audienceType, value) {
    const BASE = 1195;
    if (audienceType === 'all') return BASE;
    if (audienceType === 'department') {
      const sizes = { 'Ushering Department': 42, 'Choir': 38, 'Youth Ministry': 34, 'Media & Tech': 18, "Women's Ministry": 65, "Men's Fellowship": 52, 'Children Ministry': 28, 'Prayer Warriors': 22, 'Evangelism Team': 15 };
      return sizes[value] || 30;
    }
    if (audienceType === 'filter') {
      let count = 0;
      activeFilters.forEach(f => { const preset = FILTER_PRESETS.find(p => p.id === f); if (preset) count += preset.count; });
      return count || 0;
    }
    if (audienceType === 'individual') return 1;
    return 0;
  }

  /* ---------------------------------------------------
     COMPOSE PANEL — Role-Aware
     --------------------------------------------------- */
  function renderComposePanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isLeader = currentRole === 'leader';
    const isFullAccess = currentRole === 'admin' || currentRole === 'pastor';

    container.innerHTML = `
      <div class="widget">
        <div class="widget__header">
          <h3 class="widget__title">📨 Compose Announcement</h3>
        </div>
        <div class="widget__body comm-compose-wrapper" id="comm-compose-body">
          <form id="comm-compose-form">
            <!-- Audience Selector -->
            <div class="form-group">
              <label class="form-label">Audience <span class="required">*</span></label>
              ${isLeader ? `
                <input type="text" class="form-input" value="Youth Ministry (My Department)" readonly style="background: var(--color-gray-100); color: var(--color-navy); font-weight: 600;">
                <p class="form-hint" style="color: var(--color-gray-400);">🔒 Leaders can only message their own department group.</p>
                <input type="hidden" id="comm-audience-type" value="department">
                <input type="hidden" id="comm-audience-value" value="Youth Ministry">
              ` : `
                <select id="comm-audience-type" class="form-select" style="margin-bottom: var(--space-sm);">
                  <option value="all">📢 Entire Congregation</option>
                  <option value="department">🏷 Specific Department / Group</option>
                  <option value="filter">🎯 Filtered Audience</option>
                  <option value="individual">👤 Individual Member</option>
                </select>

                <!-- Department Selector (shown when department selected) -->
                <div id="comm-dept-selector" style="display: none; margin-top: var(--space-sm);">
                  <select id="comm-dept-value" class="form-select">
                    ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
                  </select>
                </div>

                <!-- Filter Chips (shown when filter selected) -->
                <div id="comm-filter-selector" style="display: none; margin-top: var(--space-sm);">
                  <div class="audience-chips" id="comm-filter-chips">
                    ${FILTER_PRESETS.map(f => `
                      <span class="audience-chip" data-filter-id="${f.id}">${f.label}</span>
                    `).join('')}
                  </div>
                </div>

                <!-- Individual Member Search (shown when individual selected) -->
                <div id="comm-individual-selector" style="display: none; margin-top: var(--space-sm);">
                  <select id="comm-individual-value" class="form-select">
                    <option value="">— Search & Select Member —</option>
                    <option value="Kwame Asante">Kwame Asante (024 555 0101)</option>
                    <option value="Ama Serwaa">Ama Serwaa (024 555 0102)</option>
                    <option value="Kofi Darko">Kofi Darko (020 555 0103)</option>
                    <option value="Akosua Mensah">Akosua Mensah (024 555 0106)</option>
                    <option value="Nana Agyeman">Nana Agyeman (050 555 0107)</option>
                    <option value="Efua Amoako">Efua Amoako (024 555 0188)</option>
                  </select>
                </div>

                <!-- Live Estimated Recipient Count -->
                <div class="recipient-count" id="comm-recipient-count">
                  👥 Estimated Recipients: <strong id="comm-count-value">1,195</strong>
                </div>
              `}
            </div>

            <!-- Title -->
            <div class="form-group">
              <label for="comm-title" class="form-label">Title <span class="required">*</span></label>
              <input type="text" id="comm-title" class="form-input" placeholder="e.g. Sunday Service Update" required>
            </div>

            <!-- Body -->
            <div class="form-group">
              <label for="comm-body" class="form-label">Message Body <span class="required">*</span></label>
              <textarea id="comm-body" class="form-input" rows="4" placeholder="Type your announcement here..." style="resize: vertical;" required></textarea>
            </div>

            <!-- Optional Link -->
            <div class="form-group">
              <label for="comm-link" class="form-label">Link / Attachment URL (Optional)</label>
              <input type="url" id="comm-link" class="form-input" placeholder="https://example.com/event-info">
            </div>

            <!-- Channel Toggles -->
            <div class="channel-toggle-row">
              <label class="channel-toggle">
                <input type="checkbox" id="comm-ch-push" checked>
                📱 Send as in-app / push notification
              </label>
              <div>
                <label class="channel-toggle">
                  <input type="checkbox" id="comm-ch-sms">
                  📲 Also send as SMS
                </label>
                <span class="channel-toggle__note">SMS reaches members without the app or smartphone data.</span>
              </div>
            </div>

            <!-- Schedule Option -->
            <div class="schedule-row">
              <label>
                <input type="radio" name="comm-schedule" value="now" checked id="comm-sched-now">
                Send now
              </label>
              <label>
                <input type="radio" name="comm-schedule" value="later" id="comm-sched-later">
                Schedule for later
              </label>
              <input type="datetime-local" id="comm-sched-datetime" class="form-input schedule-datetime" style="max-width: 220px;">
            </div>

            <button type="submit" class="btn btn--primary btn--block" id="comm-send-btn">
              🚀 Send Announcement
            </button>
          </form>
        </div>
      </div>
    `;

    // Wire up audience type selector events (admin/pastor only)
    if (isFullAccess) {
      const typeSelect = document.getElementById('comm-audience-type');
      if (typeSelect) {
        typeSelect.addEventListener('change', () => {
          const v = typeSelect.value;
          document.getElementById('comm-dept-selector').style.display = v === 'department' ? 'block' : 'none';
          document.getElementById('comm-filter-selector').style.display = v === 'filter' ? 'block' : 'none';
          document.getElementById('comm-individual-selector').style.display = v === 'individual' ? 'block' : 'none';
          activeFilters = [];
          document.querySelectorAll('.audience-chip').forEach(c => c.classList.remove('active'));
          updateRecipientCount();
        });
      }

      // Filter chip toggles
      document.getElementById('comm-filter-chips')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.audience-chip');
        if (!chip) return;
        const fid = chip.dataset.filterId;
        chip.classList.toggle('active');
        if (activeFilters.includes(fid)) activeFilters = activeFilters.filter(f => f !== fid);
        else activeFilters.push(fid);
        updateRecipientCount();
      });

      // Department change
      document.getElementById('comm-dept-value')?.addEventListener('change', updateRecipientCount);
      document.getElementById('comm-individual-value')?.addEventListener('change', updateRecipientCount);
    }

    // Schedule radio toggle
    document.querySelectorAll('input[name="comm-schedule"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const dt = document.getElementById('comm-sched-datetime');
        const btn = document.getElementById('comm-send-btn');
        if (document.getElementById('comm-sched-later').checked) {
          dt.classList.add('visible');
          btn.textContent = '📅 Schedule Announcement';
        } else {
          dt.classList.remove('visible');
          btn.textContent = '🚀 Send Announcement';
        }
      });
    });

    // Form submit
    document.getElementById('comm-compose-form')?.addEventListener('submit', handleComposeSend);
  }

  function updateRecipientCount() {
    const type = document.getElementById('comm-audience-type')?.value;
    let value = '';
    if (type === 'department') value = document.getElementById('comm-dept-value')?.value || '';
    if (type === 'individual') value = document.getElementById('comm-individual-value')?.value || '';
    const count = getEstimatedCount(type, value);
    const el = document.getElementById('comm-count-value');
    if (el) el.textContent = count.toLocaleString();
  }

  /* ---------------------------------------------------
     SEND SIMULATION
     --------------------------------------------------- */
  function handleComposeSend(e) {
    e.preventDefault();

    const title = document.getElementById('comm-title')?.value.trim();
    const body = document.getElementById('comm-body')?.value.trim();
    const link = document.getElementById('comm-link')?.value.trim() || '';
    const pushEnabled = document.getElementById('comm-ch-push')?.checked;
    const smsEnabled = document.getElementById('comm-ch-sms')?.checked;
    const isScheduled = document.getElementById('comm-sched-later')?.checked;
    const scheduledAt = document.getElementById('comm-sched-datetime')?.value || '';

    if (!title || !body) { _toast('Title and message body are required', 'error'); return; }
    if (!pushEnabled && !smsEnabled) { _toast('Select at least one delivery channel', 'error'); return; }
    if (isScheduled && !scheduledAt) { _toast('Please select a date and time for scheduling', 'error'); return; }

    // Determine audience
    let audienceType, audienceLabel;
    if (currentRole === 'leader') {
      audienceType = 'department';
      audienceLabel = 'Youth Ministry';
    } else {
      audienceType = document.getElementById('comm-audience-type')?.value || 'all';
      if (audienceType === 'all') audienceLabel = 'Entire Congregation';
      else if (audienceType === 'department') audienceLabel = document.getElementById('comm-dept-value')?.value || 'Department';
      else if (audienceType === 'filter') audienceLabel = 'Filtered: ' + activeFilters.map(f => FILTER_PRESETS.find(p => p.id === f)?.label.replace(/^[^\s]+\s/, '')).join(', ');
      else if (audienceType === 'individual') audienceLabel = document.getElementById('comm-individual-value')?.value || 'Individual';
    }

    const totalRecipients = currentRole === 'leader' ? 34 : getEstimatedCount(audienceType, audienceLabel);

    // Show sending overlay
    const composeBody = document.getElementById('comm-compose-body');
    const overlay = document.createElement('div');
    overlay.className = 'sending-overlay';
    overlay.innerHTML = `<div class="sending-overlay__spinner"></div><div class="sending-overlay__text">${isScheduled ? 'Scheduling...' : 'Sending...'}</div>`;
    composeBody.style.position = 'relative';
    composeBody.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();

      // Generate delivery stats
      const delivered = isScheduled ? 0 : Math.round(totalRecipients * (0.95 + Math.random() * 0.04));
      const pending = isScheduled ? 0 : Math.round(totalRecipients * (0.005 + Math.random() * 0.02));
      const failed = isScheduled ? 0 : Math.max(0, totalRecipients - delivered - pending);
      const viaPush = isScheduled ? 0 : Math.round(delivered * 0.65);
      const viaSms = isScheduled ? 0 : delivered - viaPush;

      const newMsg = {
        id: _uid(),
        title,
        body,
        link,
        audience: audienceLabel,
        audienceType,
        channels: { push: pushEnabled, sms: smsEnabled },
        scheduled: isScheduled,
        scheduledAt: isScheduled ? scheduledAt : '',
        sentAt: isScheduled ? '' : _now(),
        status: isScheduled ? 'Scheduled' : 'Sent',
        sentBy: currentRole.charAt(0).toUpperCase() + currentRole.slice(1),
        delivery: { total: totalRecipients, delivered, pending, failed, viaPush, viaSms }
      };

      messages.unshift(newMsg);
      persist();

      if (window.ChurchActivityLog) {
        window.ChurchActivityLog.logActivity({
          user: currentRole === 'pastor' ? 'Rev. Daniel Mensah' : currentRole === 'leader' ? 'Kofi Darko' : 'Admin User',
          role: currentRole,
          department: currentRole === 'leader' ? 'Youth Ministry' : 'Administration',
          action: isScheduled ? 'create' : 'send',
          module: 'Communications',
          record: `${isScheduled ? 'Scheduled' : 'Sent'} announcement "${title}" to ${audienceLabel}`,
          isMemberFacing: true,
          memberSummary: `New announcement: "${title}"`
        });
      }

      // Dispatch live notifications to Members & Sender
      if (window.NotificationsModule && typeof window.NotificationsModule.pushNotification === 'function') {
        if (!isScheduled) {
          window.NotificationsModule.pushNotification('member', {
            title: title,
            message: body.slice(0, 110) + (body.length > 110 ? '...' : ''),
            category: 'announcement',
            time: 'Just now',
            targetSection: 'announcements'
          });

          window.NotificationsModule.pushNotification(currentRole, {
            title: 'Announcement Delivery Summary',
            message: `"${title}" reached ${delivered} recipients (${viaPush} App, ${viaSms} SMS).`,
            category: 'announcement',
            time: 'Just now',
            targetSection: 'communications'
          });
        }
      }

      // Show delivery status
      if (!isScheduled) {
        showDeliveryStatus(newMsg.delivery, pushEnabled, smsEnabled);
      }

      // Reset form
      document.getElementById('comm-compose-form')?.reset();
      document.getElementById('comm-sched-datetime')?.classList.remove('visible');
      document.getElementById('comm-send-btn').textContent = '🚀 Send Announcement';
      activeFilters = [];
      document.querySelectorAll('.audience-chip').forEach(c => c.classList.remove('active'));

      // Re-render history
      renderSentHistory('comm-history-container');

      _toast(isScheduled
        ? `Announcement "${title}" scheduled for ${_formatDate(scheduledAt)} ✓`
        : `Announcement "${title}" delivered to ${delivered.toLocaleString()} recipients ✓`
      );
    }, 1500);
  }

  /* ---------------------------------------------------
     DELIVERY STATUS DISPLAY
     --------------------------------------------------- */
  function showDeliveryStatus(delivery, pushEnabled, smsEnabled) {
    const statusEl = document.getElementById('comm-delivery-status');
    if (!statusEl) return;

    statusEl.innerHTML = `
      <div class="delivery-summary">
        <div class="delivery-summary__item">
          <div class="delivery-summary__value" style="color: var(--color-success);">${delivery.delivered.toLocaleString()}</div>
          <div class="delivery-summary__label">Delivered</div>
        </div>
        <div class="delivery-summary__item">
          <div class="delivery-summary__value" style="color: var(--color-warning);">${delivery.pending}</div>
          <div class="delivery-summary__label">Pending</div>
        </div>
        <div class="delivery-summary__item">
          <div class="delivery-summary__value" style="color: var(--color-danger);">${delivery.failed}</div>
          <div class="delivery-summary__label">Failed</div>
        </div>
      </div>
      ${(pushEnabled && smsEnabled) ? `
        <div class="delivery-breakdown">
          <span>📱 <strong>${delivery.viaPush}</strong> via App Push</span>
          <span>📲 <strong>${delivery.viaSms}</strong> via SMS</span>
        </div>
      ` : ''}
    `;
    statusEl.style.display = 'block';
  }

  /* ---------------------------------------------------
     SENT HISTORY — Expandable Rows
     --------------------------------------------------- */
  function renderSentHistory(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter messages based on role
    let filteredMsgs = messages;
    if (currentRole === 'leader') {
      filteredMsgs = messages.filter(m => m.audience === 'Youth Ministry' || m.sentBy === 'Leader');
    }

    const visibleMsgs = filteredMsgs.filter(m => !m.deleted);

    if (visibleMsgs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i data-lucide="mail"></i></div><div class="empty-state__title">No active messages</div></div>';
      return;
    }

    container.innerHTML = visibleMsgs.map((m, idx) => {
      const statusClass = m.status === 'Sent' ? 'badge--success' : m.status === 'Scheduled' ? 'badge--warning' : 'badge--danger';
      const channelTags = [];
      if (m.channels.push) channelTags.push('📱 App');
      if (m.channels.sms) channelTags.push('📲 SMS');

      return `
        <div class="sent-row">
          <div class="sent-row__header" onclick="ChurchComms.toggleSentDetail('sent-detail-${idx}')">
            <span class="sent-row__title">${m.title}</span>
            <div class="sent-row__meta">
              <span class="badge ${statusClass}">${m.status}</span>
              <span>${m.status === 'Scheduled' ? _formatDate(m.scheduledAt) : _formatDate(m.sentAt)}</span>
            </div>
          </div>
          <div class="sent-row__detail" id="sent-detail-${idx}">
            <div style="padding-top: var(--space-md);">
              <div style="display: flex; gap: var(--space-lg); flex-wrap: wrap; margin-bottom: var(--space-md); font-size: var(--fs-xs);">
                <span><strong>Audience:</strong> ${m.audience}</span>
                <span><strong>Channels:</strong> ${channelTags.join(' + ')}</span>
                <span><strong>Sent by:</strong> ${m.sentBy}</span>
              </div>
              <div class="sent-row__body-preview">${m.body}</div>
              ${m.link ? `<div style="margin-top: var(--space-sm);"><a href="${m.link}" target="_blank" style="font-size: var(--fs-xs); color: var(--color-info);">🔗 ${m.link}</a></div>` : ''}
              ${m.status === 'Sent' ? `
                <div class="delivery-summary" style="margin-top: var(--space-md);">
                  <div class="delivery-summary__item">
                    <div class="delivery-summary__value" style="color: var(--color-success);">${m.delivery.delivered.toLocaleString()}</div>
                    <div class="delivery-summary__label">Delivered</div>
                  </div>
                  <div class="delivery-summary__item">
                    <div class="delivery-summary__value" style="color: var(--color-warning);">${m.delivery.pending}</div>
                    <div class="delivery-summary__label">Pending</div>
                  </div>
                  <div class="delivery-summary__item">
                    <div class="delivery-summary__value" style="color: var(--color-danger);">${m.delivery.failed}</div>
                    <div class="delivery-summary__label">Failed</div>
                  </div>
                </div>
              ` : ''}
              <div style="margin-top: var(--space-md); display: flex; gap: var(--space-xs);">
                ${m.status === 'Scheduled' ? `<button class="btn btn--danger btn--xs" onclick="ChurchComms.cancelScheduled('${m.id}')">Cancel Scheduled Message</button>` : ''}
                <button class="btn btn--danger-ghost btn--xs" onclick="ChurchComms.deleteMessage('${m.id}')">Soft Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function toggleSentDetail(detailId) {
    const el = document.getElementById(detailId);
    if (el) el.classList.toggle('open');
  }

  function cancelScheduled(msgId) {
    if (!confirm('Are you sure you want to cancel this scheduled announcement? It will be archived.')) return;
    const m = messages.find(x => x.id === msgId);
    if (m) {
      m.deleted = true;
      m.deletedAt = new Date().toISOString();
      m.status = 'Cancelled';
      persist();
      if (window.SoftDeleteUtils) window.SoftDeleteUtils.addGlobalAuditLog(currentRole, 'delete', `Cancelled scheduled announcement: ${m.title}`);
      renderSentHistory('comm-history-container');
      _toast('Scheduled message cancelled & soft-deleted ✓');
    }
  }

  function deleteMessage(msgId) {
    const m = messages.find(x => x.id === msgId);
    if (!m) return;
    if (confirm(`Soft-delete announcement "${m.title}"? It will be hidden from history but kept in audit log.`)) {
      m.deleted = true;
      m.deletedAt = new Date().toISOString();
      persist();
      if (window.SoftDeleteUtils) window.SoftDeleteUtils.addGlobalAuditLog(currentRole, 'delete', `Soft-deleted announcement: ${m.title}`);
      renderSentHistory('comm-history-container');
      _toast('Announcement soft-deleted');
    }
  }

  function restoreMessage(msgId) {
    const m = messages.find(x => x.id === msgId);
    if (!m) return;
    m.deleted = false;
    delete m.deletedAt;
    if (m.status === 'Cancelled') m.status = 'Sent';
    persist();
    if (window.SoftDeleteUtils) window.SoftDeleteUtils.addGlobalAuditLog(currentRole, 'edit', `Restored announcement: ${m.title}`);
    renderSentHistory('comm-history-container');
    _toast('Announcement restored ✓');
  }

  /* ---------------------------------------------------
     AUTOMATED MESSAGES PANEL (Admin Only)
     --------------------------------------------------- */
  function renderAutomatedPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="info-box" style="margin-bottom: var(--space-md);">
        <span>🤖</span>
        <span>These messages are sent automatically once enabled — no manual sending needed. Toggle on/off as needed.</span>
      </div>
      ${autoMessages.map(a => `
        <div class="auto-msg-card">
          <div class="auto-msg-card__info">
            <div class="auto-msg-card__name">${a.name}</div>
            <div class="auto-msg-card__desc">${a.desc}</div>
          </div>
          <label class="auto-msg-toggle">
            <input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="ChurchComms.toggleAutoMsg('${a.id}', this.checked)">
            <span class="auto-msg-toggle__slider"></span>
          </label>
        </div>
      `).join('')}
    `;
  }

  function toggleAutoMsg(id, enabled) {
    const a = autoMessages.find(x => x.id === id);
    if (a) {
      a.enabled = enabled;
      persist();
      _toast(`${a.name}: ${enabled ? 'Enabled ✓' : 'Disabled'}`);
    }
  }

  /* ---------------------------------------------------
     MEMBER ANNOUNCEMENTS FEED (Receive-Only)
     --------------------------------------------------- */
  function renderAnnouncementsFeed(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sorted = [...messages].filter(m => m.status === 'Sent').sort((a, b) => {
      const da = new Date(a.sentAt.replace(' ', 'T'));
      const db = new Date(b.sentAt.replace(' ', 'T'));
      return db - da;
    });

    if (sorted.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i data-lucide="megaphone"></i></div><div class="empty-state__title">No announcements yet</div></div>';
      return;
    }

    container.innerHTML = sorted.map(m => {
      const isRead = readMessages[m.id] === true;
      const channelTag = (m.channels.push && m.channels.sms) ? 'App + SMS' : m.channels.push ? 'App' : 'SMS';

      return `
        <div class="announcement-card ${isRead ? '' : 'announcement-card--unread'}" onclick="ChurchComms.markRead('${m.id}')" style="cursor: pointer;">
          <div class="announcement-card__meta">
            ${isRead ? '' : '<span class="announcement-card__dot"></span>'}
            <span>${_formatDateShort(m.sentAt)}</span>
            <span>•</span>
            <span>via ${channelTag}</span>
            ${isRead ? '' : '<span class="badge badge--navy" style="font-size: 0.625rem; padding: 0.1rem 0.4rem;">NEW</span>'}
          </div>
          <h4 style="color: var(--color-navy); margin-bottom: 6px; font-size: var(--fs-base);">${m.title}</h4>
          <p style="color: var(--color-gray-600); font-size: var(--fs-sm); line-height: 1.6;">${m.body}</p>
          ${m.link ? `<a href="${m.link}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; margin-top: var(--space-sm); font-size: var(--fs-xs); color: var(--color-info); text-decoration: underline;">🔗 ${m.link}</a>` : ''}
        </div>
      `;
    }).join('');
  }

  function markRead(msgId) {
    if (!readMessages[msgId]) {
      readMessages[msgId] = true;
      persist();
      renderAnnouncementsFeed('comm-announcements-feed');
      // Update unread count on member dashboard if present
      const countEl = document.getElementById('home-stat-unread');
      if (countEl) {
        const unread = messages.filter(m => m.status === 'Sent' && !readMessages[m.id]).length;
        countEl.textContent = unread;
      }
      const badge = document.getElementById('notif-badge');
      if (badge) {
        const unread = messages.filter(m => m.status === 'Sent' && !readMessages[m.id]).length;
        badge.textContent = unread > 0 ? unread : '';
      }
    }
  }

  function markAllRead() {
    messages.filter(m => m.status === 'Sent').forEach(m => { readMessages[m.id] = true; });
    persist();
    renderAnnouncementsFeed('comm-announcements-feed');
    const countEl = document.getElementById('home-stat-unread');
    if (countEl) countEl.textContent = '0';
    const badge = document.getElementById('notif-badge');
    if (badge) badge.textContent = '';
    _toast('All announcements marked as read ✓');
  }

  function getUnreadCount() {
    return messages.filter(m => m.status === 'Sent' && !readMessages[m.id]).length;
  }

  /* ---------------------------------------------------
     PUBLIC INIT — Detects role, renders appropriate UI
     --------------------------------------------------- */
  function init(role) {
    currentRole = role || 'member';

    if (role === 'admin' || role === 'pastor' || role === 'leader') {
      renderComposePanel('comm-compose-container');
      renderSentHistory('comm-history-container');

      // Delivery status container (initially hidden)
      const statusEl = document.getElementById('comm-delivery-status');
      if (statusEl) statusEl.style.display = 'none';

      // Admin gets automated messages panel
      if (role === 'admin') {
        renderAutomatedPanel('comm-automated-container');
      }
    }

    if (role === 'member') {
      renderAnnouncementsFeed('comm-announcements-feed');
    }
  }

  /* ---------------------------------------------------
     EXPOSE PUBLIC API
     --------------------------------------------------- */
  window.ChurchComms = {
    init,
    renderComposePanel,
    renderSentHistory,
    renderAutomatedPanel,
    renderAnnouncementsFeed,
    toggleSentDetail,
    cancelScheduled,
    deleteMessage,
    restoreMessage,
    toggleAutoMsg,
    markRead,
    markAllRead,
    getUnreadCount,
  };

})();
