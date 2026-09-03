# ⛪ ChurchOS — Comprehensive Church Management System

**ChurchOS** is a modern, full-featured Church Management System (ChMS) designed to manage congregation demographics, attendance tracking, multi-channel communications, financial giving & reconciliation, pastoral care, and reporting.

Built with a clean design system, ChurchOS features **role-specific dashboard portals**, a **dual-mode architecture** (supporting PHP + MySQL backend with client-side `localStorage` fallback), and responsive interfaces optimized for desktop and mobile.

---

## 🌟 Key Modules & Features

### 👤 1. Role-Based Dashboards & Access Control (RBAC)
Dedicated user interfaces tailored specifically for each church role:
- **Church Administrator (`dashboard-admin.html`)**: Complete system control, user account management, custom fields setup, SMS credit monitoring, audit logs, and system data exports.
- **Senior Pastor (`dashboard-pastor.html`)**: Spiritual health analytics, pastoral care follow-up tracking, prayer requests, member milestone tracking, and congregation vitality summaries.
- **Leader / Dept Head (`dashboard-leader.html`)**: Group & department roster management, visitor follow-up task queues, attendance logging, and weekly accountability reports.
- **Finance Team (`dashboard-finance.html`)**: Transaction recording (tithes, offerings, pledges), bulk offering entry, cashier reconciliation, transaction dispute resolution, and giving reports.
- **Church Member (`dashboard-member.html`)**: Personal profile management, attendance history, annual giving statements (PDF preview & download), prayer request submissions, group rosters, and **Notification Preferences (PRD 10.3)**.

---

### 📢 2. Shared Communications Module (`communications.js`)
- **Multi-Channel Delivery**: Supports in-app Push notifications and simulated SMS delivery.
- **Audience Targeting**: Broadcast to Entire Congregation, specific Departments/Groups, custom filter cohorts (First-time visitors, inactive members, birthdays), or individual members.
- **Scheduling**: Send immediately or schedule for future dates/times.
- **Automated Messaging (PRD 10.5)**: Pre-configured triggers for birthday greetings, membership anniversaries, new visitor welcome messages, and absence follow-ups.
- **Delivery Analytics**: Real-time stats on delivered, pending, failed messages, and push vs. SMS split.

---

### 🔔 3. Shared Notifications Module (`notifications.js`)
- **Top Bar Notification Bell**: Live unread count badge with pulse animations.
- **Role-Specific Feeds**: Custom notification feeds for Admin, Pastor, Leader, Finance, and Member.
- **Notification Panel & Drawer**: Floating desktop dropdown and mobile slide-in drawer with category tabs (**Announcements**, **Tasks**, **Pastoral**, **Financial**, **System**, **Reminders**).
- **Interactive Navigation**: Clicking a notification marks it read and auto-scrolls/navigates to the corresponding dashboard section.
- **Full Notification Center Modal**: Searchable, paginated history view with category filtering and clear/mark-all controls.
- **Member Preferences (PRD 10.3)**: Dedicated toggle controls for Announcements, Reminders, Birthday Greetings, and Prayer Updates.
- **New Member Welcome (PRD 10.5)**: Pre-seeded welcome notification for newly registered members.

---

### 📊 4. Reporting & Analytics Module (`reporting.js` & `charts.js`)
- **Custom SVG Charting Engine**: High-performance line, bar, doughnut, and area charts without external JS dependencies.
- **Comprehensive Reports**: Financial giving summaries, attendance trends, demography distributions, and group health stats.
- **Data Export & Print**: Generate downloadable CSV exports and printable PDF report previews.

---

### 🎟️ 5. Attendance & QR Check-in Module (`attendance.js`)
- Headcount recording, individual member check-ins, service session management, and QR/barcode scanning simulator.

---

## ⚡ Technical Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom CSS variables, Glassmorphism, Responsive Grid/Flexbox), Vanilla JavaScript (ES6+ Modules).
- **Backend API**: PHP 8.x (`api/config.php`, `api/login.php`, `api/signup.php`, `api/session.php`, `api/logout.php`).
- **Database**: MySQL via PDO prepared statements (`churchos_db`).
- **Offline / Standalone Fallback**: Automatic failover to client-side `localStorage` persistence if running without PHP/MySQL.

---

## 🚀 Getting Started

### Option A: Local PHP + MySQL Environment (Recommended)

1. **Prerequisites**: Ensure PHP 8.x and MySQL (XAMPP, WAMP, or standalone MySQL) are installed.
2. **Database Setup**:
   Open a terminal in the project directory and run the database initialization script:
   ```bash
   php db/setup_churchos_db.php
   ```
   *This creates the `churchos_db` database and seeds default user records.*

3. **Start Development Server**:
   Launch PHP's built-in web server:
   ```bash
   php -S localhost:8000
   ```
4. **Access ChurchOS**:
   Open your browser and navigate to `http://localhost:8000`.

---

### Option B: Static / Standalone Mode (No PHP Server Required)

ChurchOS features automatic client-side fallback:
1. Open `index.html` or `signup.html` directly in your web browser (or via VS Code Live Server / static web server).
2. The application will seamlessly run using client-side `localStorage` data persistence for signups, logins, notifications, and dashboard operations.

---

## 🔑 Demo Account Credentials

Use any of the seeded credentials below to explore different role portals:

| Role | Username / Identifier | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Church Administrator** | `admin` *or* `024 000 0001` | *(any password)* | Full System Admin (`dashboard-admin.html`) |
| **Senior Pastor** | `pastor` *or* `024 000 0002` | *(any password)* | Pastoral Oversight (`dashboard-pastor.html`) |
| **Leader / Dept Head** | `leader` *or* `024 000 0003` | *(any password)* | Group Leadership (`dashboard-leader.html`) |
| **Finance Team** | `finance` *or* `024 000 0004` | *(any password)* | Financial Portal (`dashboard-finance.html`) |
| **Church Member** | `member` *or* `024 555 0188` | *(any password)* | Member Portal (`dashboard-member.html`) |

---

## 📁 Directory Structure

```
CHURCH MGT SYSTEM/
├── index.html                 # Landing Page & Public Information
├── login.html                 # Sign In Authentication Page
├── signup.html                # Multi-Step Role-Based Registration Page
├── privacy-policy.html        # Privacy Policy Page
├── dashboard-admin.html       # Admin Portal Markup
├── dashboard-pastor.html      # Senior Pastor Portal Markup
├── dashboard-leader.html      # Group Leader Portal Markup
├── dashboard-finance.html     # Finance Portal Markup
├── dashboard-member.html      # Member Portal Markup
├── css/                       # Application Stylesheets
│   └── styles.css             # Master Application CSS & Design System Tokens
├── js/                        # JavaScript Modules & Application Logic
│   ├── app.js                 # Core Shared App Logic & Dual-Mode API Client
│   ├── dashboard-admin.js     # Admin Portal Logic & Data Handlers
│   ├── dashboard-pastor.js    # Senior Pastor Portal Logic
│   ├── dashboard-leader.js    # Group Leader Portal Logic
│   ├── dashboard-finance.js   # Finance Portal Logic
│   ├── dashboard-member.js    # Member Portal Logic
│   ├── communications.js      # Shared Communications Broadcast Module
│   ├── notifications.js       # Shared Receiving Notifications Center & Preferences
│   ├── reporting.js           # Reporting Engine, Exports & PDF Previews
│   ├── attendance.js          # Attendance Tracking & QR Check-in Engine
│   ├── charts.js              # Custom SVG Chart Rendering Engine
│   └── activityLog.js         # System Activity & Audit Logging
├── api/                       # PHP Backend API Endpoints
│   ├── config.php             # PDO DB Connection & CORS Configuration
│   ├── login.php              # Login POST Endpoint
│   ├── signup.php             # Registration POST Endpoint
│   ├── session.php            # Active Session GET Endpoint
│   └── logout.php             # Logout Endpoint
├── assets/                    # Static Assets & Icons
│   └── icons/                 # Feature & Dashboard Graphic Icons
└── db/                        # Database Setup & Schema Scripts
    ├── schema.sql             # SQL Database Schema Definition
    ├── setup_churchos_db.php  # Automated Database & Table Setup Script
    ├── check_dbs.php          # Database Health Verification
    └── test_db.php            # CLI Connection Verification Utility
```

---

## 🛡️ License & Copyright

Designed and developed for **ChurchOS Management Systems**. All rights reserved.
